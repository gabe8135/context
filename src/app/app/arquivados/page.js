import Link from "next/link";
import { Archive, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { restoreClientAction } from "@/app/app/clientes/actions";
import { restoreProjectAction } from "@/app/app/projetos/actions";

export const dynamic = "force-dynamic";

export default async function Archived({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const requests = [
    supabase.from("clients").select("id,name,archived_at").eq("workspace_id", workspaceId).not("archived_at", "is", null),
    supabase.from("projects").select("id,name,slug,archived_at,clients(name,archived_at)").eq("workspace_id", workspaceId).not("archived_at", "is", null),
    supabase.from("tasks").select("id,title,archived_at").eq("workspace_id", workspaceId).not("archived_at", "is", null),
    supabase.from("notes").select("id,title,archived_at").eq("workspace_id", workspaceId).not("archived_at", "is", null),
    supabase.from("meetings").select("id,title,archived_at").eq("workspace_id", workspaceId).not("archived_at", "is", null),
  ];
  const results = await Promise.all(requests);
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  const [clients, projects, tasks, notes, meetings] = results.map((result) => result.data || []);
  return <AppShell><div className="content"><div className="eyebrow">Memória preservada</div><h1 className="page-title">Arquivados</h1><p className="subtitle">Itens arquivados não entram na operação nem nos totais financeiros. Restaure quando precisar.</p>{query.sucesso && <p className="success-note">{query.sucesso}</p>}{query.erro && <p className="error">{query.erro}</p>}<div className="archive-grid">
    <ArchiveSection title="Clientes" items={clients} render={(item) => <><div className="item-main"><div className="item-title">{item.name}</div><ArchiveDate value={item.archived_at}/></div><form action={restoreClientAction.bind(null, item.id)}><button className="btn"><RotateCcw size={14}/> Desarquivar</button></form></>}/>
    <ArchiveSection title="Projetos" items={projects} render={(item) => <><div className="item-main"><div className="item-title">{item.name}</div><div className="meta">Cliente: {item.clients?.name || "—"}{item.clients?.archived_at ? " · desarquive o cliente primeiro" : ""}</div><ArchiveDate value={item.archived_at}/></div><div className="table-actions"><Link className="btn" href={`/app/projetos/${item.slug}`}>Consultar</Link><form action={restoreProjectAction.bind(null, item.id)}><button className="btn" disabled={Boolean(item.clients?.archived_at)}><RotateCcw size={14}/> Desarquivar</button></form></div></>}/>
    <ArchiveSection title="Tarefas" items={tasks} render={(item) => <><div className="item-main"><div className="item-title">{item.title}</div><ArchiveDate value={item.archived_at}/></div><Link className="btn" href={`/app/tarefas/${item.id}`}>Consultar</Link></>}/>
    <ArchiveSection title="Notas" items={notes} render={(item) => <><div className="item-main"><div className="item-title">{item.title}</div><ArchiveDate value={item.archived_at}/></div><Link className="btn" href={`/app/notas/${item.id}`}>Consultar</Link></>}/>
    <ArchiveSection title="Reuniões" items={meetings} render={(item) => <><div className="item-main"><div className="item-title">{item.title}</div><ArchiveDate value={item.archived_at}/></div><Link className="btn" href={`/app/reunioes/${item.id}`}>Consultar</Link></>}/>
  </div></div></AppShell>;
}

function ArchiveSection({ title, items, render }) {
  return <section className="panel"><div className="panel-head"><div className="panel-title"><Archive size={16}/>{title}</div><span className="badge">{items.length}</span></div>{items.length ? items.map((item) => <div className="item" key={item.id}>{render(item)}</div>) : <div className="empty">Nenhum item arquivado.</div>}</section>;
}

function ArchiveDate({ value }) {
  return <div className="meta">Arquivado em {new Date(value).toLocaleString("pt-BR")}</div>;
}
