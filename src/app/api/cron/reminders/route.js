import webpush from "web-push";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { collectDueReminders, notificationTarget, reminderWindow } from "@/lib/push-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function configuredEnvironment() {
  const required = ["CRON_SECRET", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "SUPABASE_SECRET_KEY"];
  return required.filter((name) => !process.env[name]);
}

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const missing = configuredEnvironment();
  if (missing.length) {
    console.error("Push reminders are missing environment variables:", missing.join(", "));
    return NextResponse.json({ ok: false, error: "Push environment is incomplete", missing }, { status: 500 });
  }

  const admin = getAdminClient();
  const now = new Date();
  const { start, end } = reminderWindow(now);
  const eventsEnd = new Date(now.getTime() + 8 * 86_400_000);

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const [eventsResult, tasksResult, meetingsResult] = await Promise.all([
    admin.from("calendar_events")
      .select("id,workspace_id,created_by,title,starts_at,reminder_minutes,project_id,projects(slug)")
      .is("archived_at", null)
      .eq("status", "scheduled")
      .gte("starts_at", start.toISOString())
      .lte("starts_at", eventsEnd.toISOString()),
    admin.from("tasks")
      .select("id,workspace_id,created_by,title,due_at,reminder_at,project_id,projects(slug)")
      .is("archived_at", null)
      .not("status", "in", "(completed,cancelled,archived)")
      .gte("reminder_at", start.toISOString())
      .lt("reminder_at", end.toISOString()),
    admin.from("meetings")
      .select("id,workspace_id,created_by,title,scheduled_at,reminder_at,project_id,projects(slug)")
      .is("archived_at", null)
      .gte("reminder_at", start.toISOString())
      .lt("reminder_at", end.toISOString()),
  ]);

  const queryError = eventsResult.error || tasksResult.error || meetingsResult.error;
  if (queryError) {
    console.error("Unable to load due reminders:", queryError.message);
    return NextResponse.json({ ok: false, error: "Unable to load reminders" }, { status: 500 });
  }

  const normalize = (rows) => (rows || []).map((row) => ({
    ...row,
    project_slug: row.projects?.slug || null,
  }));
  const due = collectDueReminders({
    events: normalize(eventsResult.data),
    tasks: normalize(tasksResult.data),
    meetings: normalize(meetingsResult.data),
  }, now);

  const summary = { ok: true, due: due.length, sent: 0, failed: 0, skipped_no_subscription: 0, duplicates: 0 };

  for (const item of due) {
    if (!item.created_by) continue;

    const { data: subscriptions, error: subscriptionError } = await admin.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth_key")
      .eq("user_id", item.created_by)
      .eq("workspace_id", item.workspace_id);

    if (subscriptionError) {
      console.error("Unable to load push subscriptions:", subscriptionError.message);
      summary.failed++;
      continue;
    }
    if (!subscriptions?.length) {
      summary.skipped_no_subscription++;
      continue;
    }

    let { data: delivery, error: deliveryError } = await admin.from("notification_deliveries")
      .insert({
        workspace_id: item.workspace_id,
        user_id: item.created_by,
        source_type: item.type,
        source_id: item.id,
        scheduled_for: item.scheduled.toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (deliveryError?.code === "23505") {
      const { data: previous } = await admin.from("notification_deliveries")
        .select("id,status")
        .eq("user_id", item.created_by)
        .eq("source_type", item.type)
        .eq("source_id", item.id)
        .eq("scheduled_for", item.scheduled.toISOString())
        .maybeSingle();
      if (previous?.status === "failed") {
        delivery = { id: previous.id };
        deliveryError = null;
        await admin.from("notification_deliveries").update({ status: "pending", error: null }).eq("id", previous.id);
      } else {
        summary.duplicates++;
        continue;
      }
    } else if (deliveryError || !delivery) {
      if (deliveryError) console.error("Unable to create notification delivery:", deliveryError.message);
      continue;
    }

    let successful = 0;
    const errors = [];
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        }, JSON.stringify({
          title: item.title,
          body: `Compromisso em ${new Date(item.at).toLocaleString("pt-BR")}`,
          url: notificationTarget(item),
          tag: `${item.type}-${item.id}`,
        }));
        successful++;
        summary.sent++;
      } catch (error) {
        errors.push(error.message);
        if (error.statusCode === 404 || error.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        }
      }
    }

    const status = successful ? "sent" : "failed";
    if (!successful) summary.failed++;
    await admin.from("notification_deliveries").update({
      status,
      sent_at: successful ? new Date().toISOString() : null,
      error: errors.length ? errors.join(" | ").slice(0, 1000) : null,
    }).eq("id", delivery.id);
  }

  return NextResponse.json(summary);
}
