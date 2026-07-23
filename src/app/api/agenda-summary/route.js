import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/auth-context";

export async function GET(request) {
  const { supabase, workspaceId } = await requireWorkspace();
  const url = new URL(request.url);
  const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const slug = url.searchParams.get("projeto");
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Mês inválido" }, { status: 400 });

  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 1);
  let projectId = null;

  if (slug) {
    const { data } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId).eq("slug", slug).maybeSingle();
    projectId = data?.id || "00000000-0000-0000-0000-000000000000";
  }

  let events = supabase.from("calendar_events")
    .select("id,title,description,starts_at,ends_at,location,event_type,status,projects(name,slug)")
    .eq("workspace_id", workspaceId).is("archived_at", null)
    .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at");
  let tasks = supabase.from("tasks")
    .select("id,title,description,due_at,status,priority,projects(name,slug)")
    .eq("workspace_id", workspaceId).is("archived_at", null).not("status", "in", "(cancelled,archived)")
    .gte("due_at", start.toISOString()).lt("due_at", end.toISOString()).order("due_at");
  let meetings = supabase.from("meetings")
    .select("id,title,summary,scheduled_at,participants,projects(name,slug)")
    .eq("workspace_id", workspaceId).is("archived_at", null)
    .gte("scheduled_at", start.toISOString()).lt("scheduled_at", end.toISOString()).order("scheduled_at");

  if (slug) {
    events = events.eq("project_id", projectId);
    tasks = tasks.eq("project_id", projectId);
    meetings = meetings.eq("project_id", projectId);
  }

  const [eventResult, taskResult, meetingResult] = await Promise.all([events, tasks, meetings]);
  const error = eventResult.error || taskResult.error || meetingResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = [
    ...(eventResult.data || []).map((item) => ({
      id: `event-${item.id}`,
      type: item.event_type || "event",
      title: item.title,
      description: item.description,
      at: item.starts_at,
      endsAt: item.ends_at,
      location: item.location,
      project: item.projects?.name,
      meta: item.status,
      editHref: `/app/agenda${item.projects?.slug ? `?projeto=${item.projects.slug}&` : "?"}editar=${item.id}`,
    })),
    ...(taskResult.data || []).map((item) => ({
      id: `task-${item.id}`,
      type: "task",
      title: item.title,
      description: item.description,
      at: item.due_at,
      project: item.projects?.name,
      meta: `${item.status} · ${item.priority}`,
      editHref: `/app/tarefas/${item.id}`,
    })),
    ...(meetingResult.data || []).map((item) => ({
      id: `meeting-${item.id}`,
      type: "meeting",
      title: item.title,
      description: item.summary,
      at: item.scheduled_at,
      project: item.projects?.name,
      meta: item.participants ? `Participantes: ${item.participants}` : "",
      editHref: `/app/reunioes/${item.id}`,
    })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));

  return NextResponse.json({ month, items });
}
