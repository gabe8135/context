import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/auth-context";

export async function GET(request) {
  const { supabase, workspaceId } = await requireWorkspace();
  const month = new URL(request.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Mês inválido" }, { status: 400 });
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 1);
  const [eventsResult, tasksResult, meetingsResult] = await Promise.all([
    supabase.from("calendar_events").select("id,title,description,starts_at,event_type,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at"),
    supabase.from("tasks").select("id,title,description,due_at,status,priority,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).not("status", "in", "(cancelled,archived)").gte("due_at", start.toISOString()).lt("due_at", end.toISOString()).order("due_at"),
    supabase.from("meetings").select("id,title,summary,scheduled_at,participants,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).gte("scheduled_at", start.toISOString()).lt("scheduled_at", end.toISOString()).order("scheduled_at")
  ]);
  const error = eventsResult.error || tasksResult.error || meetingsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = [
    ...(eventsResult.data || []).map((item) => ({ id: `event-${item.id}`, sourceId: item.id, type: item.event_type || "event", title: item.title, description: item.description, at: item.starts_at, project: item.projects?.name, href: "/app/agenda" })),
    ...(tasksResult.data || []).map((item) => ({ id: `task-${item.id}`, sourceId: item.id, type: "task", title: item.title, description: item.description, at: item.due_at, project: item.projects?.name, meta: `${item.status} · ${item.priority}`, href: `/app/tarefas/${item.id}` })),
    ...(meetingsResult.data || []).map((item) => ({ id: `meeting-${item.id}`, sourceId: item.id, type: "meeting", title: item.title, description: item.summary || item.participants, at: item.scheduled_at, project: item.projects?.name, href: `/app/reunioes/${item.id}` }))
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
  return NextResponse.json({ month, items });
}
