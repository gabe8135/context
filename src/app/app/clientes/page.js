import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClientsListClient } from "@/components/clients-list-client";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: clients, error } = await supabase.from("clients")
    .select("id,name,legal_name,email,phone,whatsapp,status,source,notes,created_at,projects(id,name,slug,status)")
    .eq("workspace_id", workspaceId).is("archived_at", null).order("name");
  if (error) throw error;
  const rows = clients.map((client) => ({ ...client, projects: client.projects || [], projectCount: client.projects?.length || 0 }));

  return <AppShell><div className="content clients-list-page">
    <div className="project-head">
      <div><div className="eyebrow">Relacionamentos</div><h1 className="page-title">Clientes</h1><p className="subtitle">Pessoas e empresas que concentram seus projetos e histórico.</p></div>
      <Link className="btn primary" href="/app/clientes/novo"><Plus size={15}/> Novo cliente</Link>
    </div>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    {!clients.length
      ? <section className="empty-state"><Users size={34}/><h2>Nenhum cliente ainda</h2><p>Crie seu primeiro cliente para começar a organizar projetos e contexto.</p><Link className="btn primary" href="/app/clientes/novo">Criar primeiro cliente</Link></section>
      : <ClientsListClient clients={rows}/>}
  </div></AppShell>;
}
