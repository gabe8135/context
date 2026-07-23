import Link from "next/link";
import { Cable, Globe2, Mail, Network, Plus, Server, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { StatusBadge } from "@/components/status-badge";
import { requireWorkspace } from "@/lib/auth-context";
import { statusLabel } from "@/lib/status-labels";
import { archiveInfrastructureAction } from "./[tipo]/[id]/editar/actions";

export const dynamic = "force-dynamic";
const specs = [
  ["domain", "domains", Globe2, "Domínios", "domain,registrar,expires_at,status,projects(name,slug)", "domain", "registrar", "expires_at", "/app/infraestrutura/novo-dominio"],
  ["hosting", "hosting_accounts", Server, "Hospedagens", "provider,plan,renews_at,status,projects(name,slug)", "provider", "plan", "renews_at", "/app/infraestrutura/novo/hosting"],
  ["dns", "dns_records", Network, "Registros DNS", "record_type,name,value,status,projects(name,slug)", "name", "value", null, "/app/infraestrutura/novo/dns"],
  ["ssl", "ssl_certificates", ShieldCheck, "Certificados SSL", "issuer,expires_at,status,projects(name,slug)", "issuer", "issuer", "expires_at", "/app/infraestrutura/novo/ssl"],
  ["email", "email_services", Mail, "Serviços de e-mail", "provider,status,projects(name,slug)", "provider", "provider", null, "/app/infraestrutura/novo/email"],
  ["integration", "integrations", Cable, "Integrações", "name,status,projects(name,slug)", "name", "name", null, "/app/infraestrutura/novo/integration"]
];
const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "Sem vencimento";

export default async function Infrastructure({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const results = await Promise.all(specs.map((spec) => supabase.from(spec[1]).select(`id,${spec[4]}`).eq("workspace_id", workspaceId).is("archived_at", null)));
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  const all = results.flatMap((result) => result.data);
  return <AppShell><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">Operação técnica</div><h1 className="page-title">Infraestrutura</h1><p className="subtitle">Abra um item para consultar seus detalhes ou alterá-lo.</p></div><Link className="btn primary" href="/app/infraestrutura/novo"><Plus size={15}/> Adicionar item</Link></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}
    <section className="metrics"><Metric label="Itens ativos" value={all.length}/><Metric label="Operacionais" value={all.filter((item) => item.status === "operational").length}/><Metric label="Exigem atenção" value={all.filter((item) => ["attention", "error", "pending"].includes(item.status)).length}/></section>
    {specs.map((spec, index) => <AssetSection key={spec[0]} spec={spec} items={results[index].data}/>)}
  </div></AppShell>;
}

function AssetSection({ spec, items }) {
  const [type, , Icon, title, , nameKey, detailKey, dateKey, add] = spec;
  return <section className="panel data-panel" style={{ marginTop: 20 }}><header className="panel-head"><div className="panel-title"><Icon size={17}/>{title}<span className="badge">{items.length}</span></div><Link className="btn" href={add}><Plus size={14}/> Adicionar</Link></header>{items.length ? <table className="uniform-compact-list"><thead><tr><th>Item</th><th>Projeto</th><th>Status</th><th>Vencimento</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
    <td data-label="Item"><RecordDetailsButton label={title} title={item[nameKey] || "Sem nome"} summary={item[detailKey] || statusLabel(item.status)} details={[
      { label: "Projeto", value: item.projects?.name || "Sem projeto" }, { label: "Status", value: statusLabel(item.status) },
      { label: "Detalhe", value: item[detailKey] }, { label: "Vencimento", value: dateKey ? formatDate(item[dateKey]) : null }
    ]} editHref={`/app/infraestrutura/${type}/${item.id}/editar`}>
      <form action={archiveInfrastructureAction.bind(null, type, item.id)}><button className="btn">Arquivar</button></form>
    </RecordDetailsButton></td>
    <td data-label="Projeto" data-mobile="secondary">{item.projects?.name || "—"}</td><td data-label="Status" data-mobile="key"><StatusBadge status={item.status}/></td><td data-label="Vencimento" data-mobile="secondary">{dateKey ? formatDate(item[dateKey]) : "—"}</td>
  </tr>)}</tbody></table> : <div className="empty">Nenhum registro.</div>}</section>;
}
function Metric({ label, value }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono">{value}</div></div>; }
