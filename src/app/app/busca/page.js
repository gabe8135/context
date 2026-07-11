import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }) {
  const { q = "" } = await searchParams;
  const term = String(q).trim().slice(0, 80);
  const { supabase, workspaceId } = await requireWorkspace();
  let groups = [];
  if (term.length >= 2) {
    const pattern = `%${term.replaceAll("%", "").replaceAll(",", " ")}%`;
    const results = await Promise.all([
      supabase.from("projects").select("id,name,slug,status,clients(name)").eq("workspace_id",workspaceId).ilike("name",pattern).is("archived_at",null).limit(10),
      supabase.from("clients").select("id,name,email,status").eq("workspace_id",workspaceId).or(`name.ilike.${pattern},email.ilike.${pattern}`).is("archived_at",null).limit(10),
      supabase.from("tasks").select("id,title,status,projects(name,slug)").eq("workspace_id",workspaceId).ilike("title",pattern).limit(10),
      supabase.from("notes").select("id,title,content,projects(name,slug)").eq("workspace_id",workspaceId).or(`title.ilike.${pattern},content.ilike.${pattern}`).is("archived_at",null).limit(10),
      supabase.from("procedures").select("id,title,category,projects(name,slug)").eq("workspace_id",workspaceId).ilike("title",pattern).is("archived_at",null).limit(10),
      supabase.from("deliverables").select("id,name,status,projects(name,slug)").eq("workspace_id",workspaceId).ilike("name",pattern).is("archived_at",null).limit(10),
      supabase.from("credentials").select("id,service_name,status,projects(name,slug)").eq("workspace_id",workspaceId).ilike("service_name",pattern).is("archived_at",null).limit(10),
      supabase.from("files").select("id,logical_name,category,projects(name,slug)").eq("workspace_id",workspaceId).ilike("logical_name",pattern).is("archived_at",null).limit(10),
      supabase.from("inbox_items").select("id,content,status,projects(name,slug)").eq("workspace_id",workspaceId).ilike("content",pattern).is("archived_at",null).limit(10),
    ]);
    const failed = results.find(result => result.error);
    if (failed) throw failed.error;
    groups = [
      ["Projetos",results[0].data,x=>x.name,x=>x.clients?.name || x.status,x=>`/app/projetos/${x.slug}`],
      ["Clientes",results[1].data,x=>x.name,x=>x.email || x.status,x=>`/app/clientes/${x.id}`],
      ["Tarefas",results[2].data,x=>x.title,x=>`${x.projects?.name || "Sem projeto"} · ${x.status}`,x=>x.projects?.slug ? `/app/projetos/${x.projects.slug}` : "/app/tarefas"],
      ["Notas",results[3].data,x=>x.title,x=>x.projects?.name || "Nota",x=>x.projects?.slug ? `/app/projetos/${x.projects.slug}` : "/app/notas"],
      ["Procedimentos",results[4].data,x=>x.title,x=>x.category||x.projects?.name||"Procedimento",()=>"/app/operacao/procedimentos"],
      ["Entregáveis",results[5].data,x=>x.name,x=>`${x.projects?.name||"Sem projeto"} · ${x.status}`,()=>"/app/operacao/entregaveis"],
      ["Credenciais",results[6].data,x=>x.service_name,x=>`${x.projects?.name||"Sem projeto"} · ${x.status}`,()=>"/app/operacao/credenciais"],
      ["Arquivos",results[7].data,x=>x.logical_name,x=>x.category||x.projects?.name||"Arquivo",()=>"/app/operacao/arquivos"],
      ["Caixa de entrada",results[8].data,x=>x.content,x=>x.projects?.name||x.status,()=>"/app/operacao/entrada"],
    ];
  }
  const total = groups.reduce((sum, group) => sum + (group[1]?.length || 0), 0);
  return <AppShell><div className="content"><div className="eyebrow">Busca global</div><h1 className="page-title">Resultados para “{term}”</h1><p className="subtitle">{term.length < 2 ? "Digite ao menos dois caracteres." : `${total} resultado(s) encontrado(s).`}</p><div style={{display:"grid",gap:20,marginTop:24}}>{groups.map(([title,items,name,meta,href]) => <section className="panel" key={title}><div className="panel-head"><div className="panel-title">{title}</div><span className="badge">{items?.length || 0}</span></div>{items?.length ? items.map(item => <Link className="item" href={href(item)} key={item.id}><div className="item-main"><div className="item-title">{name(item)}</div><div className="meta">{meta(item)}</div></div></Link>) : <div className="empty">Nenhum resultado nesta categoria.</div>}</section>)}</div></div></AppShell>;
}
