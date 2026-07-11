import Link from "next/link";
import { Globe2, Plus, Server, Network, ShieldCheck, Mail, Cable } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const labels = { operational: "Operacional", attention: "Atenção", pending: "Pendente", error: "Erro", unverified: "Não verificado", not_applicable: "Não aplicável" };
const risky = new Set(["attention", "error", "pending"]);

export default async function Infrastructure({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const queries = [
    supabase.from("domains").select("id,domain,registrar,expires_at,status,projects(name,slug)").eq("workspace_id", workspaceId).order("expires_at"),
    supabase.from("hosting_accounts").select("id,provider,plan,renews_at,status,projects(name,slug)").eq("workspace_id", workspaceId),
    supabase.from("dns_records").select("id,record_type,name,value,status,projects(name,slug)").eq("workspace_id", workspaceId),
    supabase.from("ssl_certificates").select("id,issuer,expires_at,status,projects(name,slug),domains(domain)").eq("workspace_id", workspaceId),
    supabase.from("email_services").select("id,provider,status,projects(name,slug),domains(domain)").eq("workspace_id", workspaceId),
    supabase.from("integrations").select("id,name,status,projects(name,slug)").eq("workspace_id", workspaceId),
  ];
  const results = await Promise.all(queries);
  const failed = results.find(result => result.error);
  if (failed) throw failed.error;
  const [domains, hosting, dns, ssl, email, integrations] = results.map(result => result.data || []);
  const all = [...domains, ...hosting, ...dns, ...ssl, ...email, ...integrations];
  const attention = all.filter(item => risky.has(item.status) || expiresSoon(item.expires_at || item.renews_at)).length;

  return <AppShell><div className="content">
    <div className="project-head"><div><div className="eyebrow">Operação técnica</div><h1 className="page-title">Infraestrutura</h1><p className="subtitle">Todos os ativos técnicos organizados por projeto.</p></div><div className="actions"><Link className="btn" href="/app/infraestrutura/novo-dominio"><Globe2 size={15}/> Novo domínio</Link><Link className="btn primary" href="/app/infraestrutura/novo"><Plus size={15}/> Adicionar item</Link></div></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}
    <section className="metrics"><Metric label="Domínios" value={domains.length}/><Metric label="Itens técnicos" value={all.length}/><Metric label="Operacionais" value={all.filter(x => x.status === "operational").length}/><Metric label="Exigem atenção" value={attention}/></section>
    <AssetSection icon={Globe2} title="Domínios" items={domains} add="/app/infraestrutura/novo-dominio" render={x => [x.domain, x.registrar || "Registrador não informado", x.expires_at]}/>
    <AssetSection icon={Server} title="Hospedagens" items={hosting} add="/app/infraestrutura/novo/hosting" render={x => [x.provider, x.plan || "Plano não informado", x.renews_at]}/>
    <AssetSection icon={Network} title="Registros DNS" items={dns} add="/app/infraestrutura/novo/dns" render={x => [`${x.record_type} · ${x.name}`, x.value, null]}/>
    <AssetSection icon={ShieldCheck} title="Certificados SSL" items={ssl} add="/app/infraestrutura/novo/ssl" render={x => [x.domains?.domain || "Domínio não informado", x.issuer || "Emissor não informado", x.expires_at]}/>
    <AssetSection icon={Mail} title="Serviços de e-mail" items={email} add="/app/infraestrutura/novo/email" render={x => [x.domains?.domain || x.provider || "Serviço de e-mail", x.provider || "Provedor não informado", null]}/>
    <AssetSection icon={Cable} title="Integrações" items={integrations} add="/app/infraestrutura/novo/integration" render={x => [x.name, "Integração externa", null]}/>
  </div></AppShell>;
}

function AssetSection({ icon: Icon, title, items, add, render }) {
  return <section className="panel data-panel" style={{marginTop:20}}><div className="panel-head"><div className="panel-title"><Icon size={17}/> {title} <span className="badge">{items.length}</span></div><Link className="btn" href={add}><Plus size={14}/> Adicionar</Link></div>{items.length ? <table><thead><tr><th>Item</th><th>Projeto</th><th>Status</th><th>Vencimento</th></tr></thead><tbody>{items.map(item => { const [name, detail, date] = render(item); return <tr key={item.id}><td><b>{name}</b><div className="meta">{detail}</div></td><td>{item.projects?.slug ? <Link href={`/app/projetos/${item.projects.slug}`}>{item.projects.name}</Link> : "—"}</td><td><span className="badge">{labels[item.status] || item.status}</span></td><td>{date ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td></tr>})}</tbody></table> : <div className="empty">Nenhum registro. Use “Adicionar” para cadastrar.</div>}</section>;
}

function Metric({ label, value }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono">{value}</div></div> }
function expiresSoon(date) { if (!date) return false; const days = (new Date(`${date}T23:59:59`) - new Date()) / 86400000; return days <= 30; }
