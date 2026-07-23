import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { requireWorkspace } from "@/lib/auth-context";
import { isCredentialVaultConfigured } from "@/lib/credential-crypto";

export const dynamic = "force-dynamic";

export default async function Credentials({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase.from("credentials")
    .select("id,service_name,login_identifier,access_url,status,last_validated_at,projects(name,slug)")
    .eq("workspace_id", workspaceId).is("archived_at", null).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  const configured = isCredentialVaultConfigured();
  return <AppShell><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">Cofre criptografado</div><h1 className="page-title">Credenciais</h1><p className="subtitle">Senhas e tokens protegidos com AES-256-GCM.</p></div><Link className="btn primary" href="/app/operacao/credenciais/novo"><Plus size={15}/> Adicionar acesso</Link></div>
    {!configured && <p className="error">Cofre bloqueado: configure CREDENTIALS_ENCRYPTION_KEY no ambiente.</p>}
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <section className="panel uniform-item-list" style={{ marginTop: 24 }}>{data?.length ? data.map((item) => <div className="item" key={item.id}>
      <KeyRound size={16}/><div className="item-main"><RecordDetailsButton label="Detalhes do acesso" title={item.service_name} summary={`${item.projects?.name || "Sem projeto"} · ${item.status}`} details={[
        { label: "Projeto", value: item.projects?.name || "Sem projeto" }, { label: "Identificador", value: item.login_identifier || "Não informado" },
        { label: "Status", value: item.status }, { label: "Última validação", value: item.last_validated_at ? new Date(item.last_validated_at).toLocaleString("pt-BR") : "Nunca validada" }
      ]} primaryHref={`/app/operacao/credenciais/${item.id}`} primaryLabel="Abrir cofre">
        {item.access_url && <a className="btn" href={item.access_url} target="_blank" rel="noreferrer">Abrir site</a>}
      </RecordDetailsButton></div>
    </div>) : <div className="empty">Nenhuma credencial registrada.</div>}</section>
  </div></AppShell>;
}
