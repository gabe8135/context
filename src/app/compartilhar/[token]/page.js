import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, PackageCheck } from "lucide-react";
import { getAdminClient } from "@/lib/supabase/admin";
import { calculateProjectProgress } from "@/lib/project-progress";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acompanhamento do projeto · Squire", robots: { index: false, follow: false } };

export default async function PublicProject({ params }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const admin = getAdminClient();
  const { data: share, error } = await admin.from("project_public_shares").select("project_id,active,expires_at,projects(id,name,description,status,clients(name))").eq("token", token).eq("active", true).maybeSingle();
  if (error || !share || (share.expires_at && new Date(share.expires_at) < new Date())) notFound();
  const [taskResult, deliverableResult] = await Promise.all([
    admin.from("tasks").select("id,title,status,priority,due_at").eq("project_id", share.project_id).is("archived_at", null).not("status", "in", "(cancelled,archived)").order("queue_position", { ascending: true, nullsFirst: false }),
    admin.from("deliverables").select("id,title,status,due_at,public_url").eq("project_id", share.project_id).is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false }),
  ]);
  if (taskResult.error || deliverableResult.error) throw taskResult.error || deliverableResult.error;
  const tasks = taskResult.data || [];
  const progress = calculateProjectProgress(tasks, share.projects.status);
  const openTasks = tasks.filter((task) => task.status !== "completed");
  return <main className="public-share-page"><header className="public-share-brand">Squire · acompanhamento</header><article>
    <div className="eyebrow">{share.projects.clients?.name || "Projeto compartilhado"}</div><h1>{share.projects.name}</h1><p>{share.projects.description || "Acompanhamento transparente do trabalho."}</p>
    <section className="public-progress"><div><b>{progress}%</b><span>concluído</span></div><i><span style={{ width: `${progress}%` }}/></i></section>
    <div className="public-share-grid"><section className="panel"><header className="panel-head"><div className="panel-title"><Clock3/> Próximos passos</div></header>{openTasks.length ? openTasks.slice(0, 12).map((task) => <div className="public-row" key={task.id}><span>{task.title}</span><small>{task.due_at ? new Date(task.due_at).toLocaleDateString("pt-BR") : "Sem prazo"}</small></div>) : <div className="empty"><CheckCircle2/> Tudo concluído.</div>}</section>
    <section className="panel"><header className="panel-head"><div className="panel-title"><PackageCheck/> Entregáveis</div></header>{deliverableResult.data?.length ? deliverableResult.data.map((item) => <div className="public-row" key={item.id}><span>{item.title}</span><small>{item.status}</small>{item.public_url && <a href={item.public_url} target="_blank" rel="noreferrer">Abrir entrega</a>}</div>) : <div className="empty">Nenhum entregável publicado.</div>}</section></div>
  </article></main>;
}
