"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { nextRecurringDate } from "@/lib/workflow";

const text = (fd, key) => String(fd.get(key) || "").trim();

export async function saveEventAction(fd) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const id = text(fd, "id");
  const slug = text(fd, "project_slug");
  const reminder = text(fd, "reminder_minutes");
  const payload = {
    workspace_id: workspaceId,
    project_id: text(fd, "project_id") || null,
    title: text(fd, "title"),
    description: text(fd, "description") || null,
    event_type: text(fd, "event_type") || "event",
    starts_at: text(fd, "starts_at"),
    ends_at: text(fd, "ends_at") || null,
    all_day: fd.get("all_day") === "on",
    location: text(fd, "location") || null,
    meeting_url: text(fd, "meeting_url") || null,
    reminder_minutes: reminder === "" ? [] : [Number(reminder)],
    status: text(fd, "status") || "scheduled",
    created_by: user.id,
    recurrence_rule: text(fd, "recurrence_rule") || null,
    recurrence_interval: Math.max(1, Number(fd.get("recurrence_interval")) || 1),
    recurrence_ends_at: text(fd, "recurrence_ends_at") || null,
  };
  if (!payload.title || !payload.starts_at) redirect(`/app/agenda?${slug ? `projeto=${slug}&` : ""}erro=Informe título e início`);

  if (id) {
    const { error } = await supabase.from("calendar_events").update(payload).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
  } else {
    const { data: root, error } = await supabase.from("calendar_events").insert(payload).select("id").single();
    if (error) throw error;
    if (payload.recurrence_rule) {
      const occurrences = [];
      let startsAt = new Date(payload.starts_at);
      let endsAt = payload.ends_at ? new Date(payload.ends_at) : null;
      for (let count = 0; count < 24; count += 1) {
        startsAt = nextRecurringDate(startsAt, payload.recurrence_rule, payload.recurrence_interval);
        if (!startsAt || (payload.recurrence_ends_at && startsAt > new Date(`${payload.recurrence_ends_at}T23:59:59`))) break;
        endsAt = endsAt ? nextRecurringDate(endsAt, payload.recurrence_rule, payload.recurrence_interval) : null;
        occurrences.push({ ...payload, starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() || null, recurrence_source_id: root.id });
      }
      if (occurrences.length) {
        const { error: seriesError } = await supabase.from("calendar_events").insert(occurrences);
        if (seriesError) throw seriesError;
      }
    }
  }
  revalidatePath("/app");
  revalidatePath("/app/agenda");
  redirect(`/app/agenda?${slug ? `projeto=${slug}&` : ""}sucesso=Evento salvo`);
}

export async function archiveEventAction(id) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { error } = await supabase.from("calendar_events").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath("/app/agenda");
}
