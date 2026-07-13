import Link from "next/link";
import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";
import { archiveTaskAction, deleteTaskAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Tasks({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, q.projeto);
  let query = supabase.from("tasks").select("id,title,status,priority,due_at,projects(name,slug),clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false });
  if (scope) query = query.eq("project_id", scope.id);
  if (q.status) query = query.eq("status", q.status);
  if (q.prioridade) query = query.eq("priority", q.prioridade);
  const { data, error } = await query;
  if (error) throw error;
  const base = scope ? `/app/tarefas?projeto=${scope.slug}` : "/app/tarefas";
  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className="content">
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Execução geral"}</div><h1 className="page-title">Tarefas</h1><p className="subtitle">{scope ? "Somente tarefas deste projeto." : "Tarefas de todos os projetos."}</p></div><Link className="btn primary" href={`/app/tarefas/nova${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Nova tarefa</Link></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}{q.erro && <p className="error">{q.erro}</p>}
    <form className="filter-bar"><input type="hidden" name="projeto" value={scope?.slug || ""}/><select name="status" defaultValue={q.status || ""}><option value="">Todos os status</option><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="waiting_client">Aguardando cliente</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="completed">Concluída</option></select><select name="prioridade" defaultValue={q.prioridade || ""}><option value="">Todas as prioridades</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button className="btn">Filtrar</button><Link className="btn" href={base}>Limpar</Link></form>
    <section className="panel data-panel"><table><thead><tr><th>Tarefa</th><th>Projeto</th><th>Status</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>{data.map((task) => <tr key={task.id}><td><Link href={`/app/tarefas/${task.id}`}><b>{task.title}</b></Link><div className="meta">{task.priority}</div></td><td>{task.projects?.name}</td><td><span className="badge">{task.status.replaceAll("_", " ")}</span></td><td>{task.due_at ? new Date(task.due_at).toLocaleDateString("pt-BR") : "—"}</td><td><div className="table-actions"><Link className="btn compact-action" href={`/app/tarefas/${task.id}`} aria-label={`Editar ${task.title}`} title="Editar"><Pencil size={14}/><span>Editar</span></Link><form action={archiveTaskAction.bind(null, task.id, scope?.slug || task.projects?.slug || "")}><ConfirmSubmitButton className="btn compact-action" message={`Arquivar a tarefa “${task.title}”?`}><Archive size={14}/><span>Arquivar</span></ConfirmSubmitButton></form><form action={deleteTaskAction.bind(null, task.id, scope?.slug || task.projects?.slug || "")}><ConfirmSubmitButton className="btn danger compact-action" message={`Excluir definitivamente a tarefa “${task.title}”? Esta ação não pode ser desfeita.`}><Trash2 size={14}/><span>Excluir</span></ConfirmSubmitButton></form></div></td></tr>)}</tbody></table>{!data.length && <div className="empty">Nenhuma tarefa neste contexto.</div>}</section>
  </div></AppShell>;
}
