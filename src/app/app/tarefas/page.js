import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TaskListRows } from "@/components/task-list-row";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";

export const dynamic = "force-dynamic";

export default async function Tasks({ searchParams }) {
  const queryParams = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, queryParams.projeto);
  let query = supabase.from("tasks").select("id,title,description,status,priority,starts_at,due_at,next_action,completed_at,created_at,queue_position,projects(name,slug),clients(name)").eq("workspace_id", workspaceId).is("archived_at", null);
  if (scope) query = query.eq("project_id", scope.id);
  if (queryParams.status) query = query.eq("status", queryParams.status);
  if (queryParams.prioridade) query = query.eq("priority", queryParams.prioridade);
  query = scope
    ? query.order("queue_position", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true })
    : query.order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  const base = scope ? `/app/tarefas?projeto=${scope.slug}` : "/app/tarefas";
  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className={`content tasks-list-page ${scope ? "scoped-list-page" : ""}`}>
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Execução geral"}</div><h1 className="page-title">Tarefas</h1><p className="subtitle">{scope ? "Somente tarefas deste projeto." : "Afazeres pessoais e tarefas de todos os projetos."}</p></div><Link className="btn primary" href={`/app/tarefas/nova${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Nova tarefa</Link></div>
    {queryParams.sucesso && <p className="success-note">{queryParams.sucesso}</p>}{queryParams.erro && <p className="error">{queryParams.erro}</p>}
    <form className="filter-bar"><input type="hidden" name="projeto" value={scope?.slug || ""}/><select name="status" defaultValue={queryParams.status || ""}><option value="">Todos os status</option><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="waiting_client">Aguardando cliente</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="completed">Concluída</option></select><select name="prioridade" defaultValue={queryParams.prioridade || ""}><option value="">Todas as prioridades</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button className="btn">Filtrar</button><Link className="btn" href={base}>Limpar</Link></form>
    <section className="panel data-panel tasks-compact-list"><table><thead><tr>{scope && <th>Fila</th>}<th>Tarefa</th><th>Contexto</th><th>Status</th><th>Prazo</th><th>Ações</th></tr></thead><TaskListRows initialTasks={data} scope={scope}/></table>{!data.length && <div className="empty">Nenhuma tarefa neste contexto.</div>}</section>
  </div></AppShell>;
}
