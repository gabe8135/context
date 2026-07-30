import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { disableProjectShareAction, enableProjectShareAction, renewProjectShareAction } from "./actions";

export default async function ShareProject({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: project, error } = await supabase.from("projects").select("id,name,slug,clients(name)").eq("workspace_id", workspaceId).eq("slug", slug).single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const { data: share, error: shareError } = await supabase.from("project_public_shares").select("token,active,created_at").eq("workspace_id", workspaceId).eq("project_id", project.id).maybeSingle();
  if (shareError) throw shareError;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = share?.active ? `${baseUrl}/compartilhar/${share.token}` : "";
  return <AppShell context={{ type: "project", ...project }}><div className="content narrow">
    <Link className="back-link" href={`/app/projetos/${slug}`}>← {project.name}</Link>
    <div className="eyebrow">Acompanhamento externo</div><h1 className="page-title">Compartilhar somente leitura</h1>
    <p className="subtitle">O cliente verá progresso, próximos passos e entregáveis. Finanças, notas, credenciais e dados internos permanecem privados.</p>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <section className="panel share-panel"><header className="panel-head"><div className="panel-title">{share?.active ? "Link ativo" : "Compartilhamento desativado"}</div><span className={`badge ${share?.active ? "success" : ""}`}>{share?.active ? "Seguro" : "Inativo"}</span></header>
      {share?.active ? <><label className="field"><span>Link do cliente</span><input readOnly value={publicUrl}/></label><div className="actions"><a className="btn primary" href={publicUrl} target="_blank" rel="noreferrer">Visualizar como cliente</a><form action={renewProjectShareAction.bind(null, slug)}><button className="btn">Gerar outro link</button></form><form action={disableProjectShareAction.bind(null, slug)}><button className="btn danger">Desativar</button></form></div></> : <form action={enableProjectShareAction.bind(null, slug)}><button className="btn primary">Gerar link seguro</button></form>}
    </section>
  </div></AppShell>;
}
