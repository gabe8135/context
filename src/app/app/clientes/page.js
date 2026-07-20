import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: clients, error } = await supabase.from("clients").select("id,name,email,whatsapp,status,created_at,projects(count)").eq("workspace_id", workspaceId).is("archived_at", null).order("name");
  if (error) throw error;

  return <AppShell><div className="content clients-list-page">
    <div className="project-head"><div><div className="eyebrow">Relacionamentos</div><h1 className="page-title">Clientes</h1><p className="subtitle">Pessoas e empresas que concentram seus projetos e histórico.</p></div><Link className="btn primary" href="/app/clientes/novo"><Plus size={15}/> Novo cliente</Link></div>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    {!clients.length ? <section className="empty-state"><Users size={34}/><h2>Nenhum cliente ainda</h2><p>Crie seu primeiro cliente para começar a organizar projetos e contexto.</p><Link className="btn primary" href="/app/clientes/novo">Criar primeiro cliente</Link></section> : <section className="panel data-panel"><table><thead><tr><th>Cliente</th><th>Contato</th><th>Projetos</th><th>Status</th><th></th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><b>{client.name}</b><div className="meta">Desde {new Date(client.created_at).toLocaleDateString("pt-BR")}</div></td><td>{client.email || client.whatsapp || "—"}</td><td className="mono">{client.projects?.[0]?.count || 0}</td><td><span className="badge">{client.status === "active" ? "Ativo" : "Inativo"}</span></td><td><Link className="btn" href={`/app/clientes/${client.id}`}>Abrir</Link></td></tr>)}</tbody></table></section>}
  </div></AppShell>;
}
