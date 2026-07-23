import webpush from "web-push";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/auth-context";

export async function POST() {
  const { supabase, user, workspaceId } = await requireWorkspace();
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "As chaves de notificação não estão configuradas." }, { status: 500 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: subscriptions, error } = await supabase.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth_key")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscriptions?.length) return NextResponse.json({ error: "Este dispositivo ainda não está inscrito." }, { status: 409 });

  let sent = 0;
  const failures = [];
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      }, JSON.stringify({
        title: "Teste do Squire",
        body: "As notificações estão configuradas corretamente neste dispositivo.",
        url: "/app/agenda",
        tag: `squire-test-${Date.now()}`,
      }));
      sent++;
    } catch (pushError) {
      failures.push(pushError.message);
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }

  if (!sent) return NextResponse.json({ error: failures.join(" | ") || "O envio de teste falhou." }, { status: 502 });
  return NextResponse.json({ ok: true, sent });
}
