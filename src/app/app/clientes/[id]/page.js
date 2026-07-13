import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveClientAction } from "../actions";

export default async function ClientDetail({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: client, error } = await supabase.from("clients").select("*,projects(id,name,slug,status,progress)").eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null).single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const archive = archiveClientAction.bind(null, id);
  return <AppShell context={{ type: "client", ...client }}><div className="content">
    <Link className="back-link" href="/app/clientes">← Clientes</Link>
    <div className="project-head"><div><div className="eyebrow">Cliente · {client.status === "active" ? "Ativo" : "Inativo"}</div><h1 className="page-title">{client.name}</h1><p className="subtitle">{client.legal_name || "Contexto central do relacionamento"}</p></div><div className="actions"><Link className="btn primary" href={`/app/clientes/${id}/editar`}>Editar cliente</Link><form action={archive}><button className="btn" type="submit">Arquivar</button></form></div></div>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <div className="dashboard-grid" style={{ marginTop: 25 }}><section className="panel"><header className="panel-head"><div className="panel-title">Contato</div></header><div className="panel-body"><Info label="E-mail" value={client.email}/><Info label="Telefone" value={client.phone}/><Info label="WhatsApp" value={client.whatsapp}/><Info label="Origem" value={client.source}/></div></section><section className="panel"><header className="panel-head"><div className="panel-title">Projetos</div><span className="badge">{client.projects.length}</span></header><div className="panel-body">{client.projects.length ? client.projects.map((project) => <Link className="item" style={{ textDecoration: "none", color: "inherit" }} href={`/app/projetos/${project.slug}`} key={project.id}><div className="item-main"><div className="item-title">{project.name}</div><div className="meta">{project.status} · {project.progress}%</div></div></Link>) : <p className="meta">Nenhum projeto vinculado.</p>}</div></section></div>
    {client.notes && <section className="panel" style={{ marginTop: 20 }}><header className="panel-head"><div className="panel-title">Observações</div></header><div className="panel-body"><p>{client.notes}</p></div></section>}
  </div></AppShell>;
}

function Info({ label, value }) {
  return <div className="item"><div className="item-main"><div className="meta">{label}</div><div className="item-title">{value || "Não informado"}</div></div></div>;
}
