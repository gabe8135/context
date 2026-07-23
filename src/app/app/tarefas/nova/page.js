import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { requireWorkspace } from "@/lib/auth-context";
import { createTaskAction } from "../actions";

export default async function NewTask({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [{ data: projects, error }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from("projects").select("id,name,slug,clients(name)").eq("workspace_id", workspaceId).in("status", ["planned", "active", "waiting"]).is("archived_at", null).order("name"),
    supabase.from("tasks").select("id,title,project_id,queue_position").eq("workspace_id", workspaceId).is("archived_at", null).not("status", "in", "(completed,cancelled,archived)").order("queue_position", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
  ]);
  if (error || tasksError) throw error || tasksError;

  return <AppShell><div className="content narrow">
    <Link className="back-link" href={query.projeto ? `/app/projetos/${query.projeto}` : "/app/tarefas"}>← Voltar</Link>
    <div className="eyebrow">Próxima ação</div>
    <h1 className="page-title">Criar tarefa</h1>
    <TaskForm projects={projects} tasks={tasks} selectedSlug={query.projeto} error={query.erro} action={createTaskAction}/>
  </div></AppShell>;
}
