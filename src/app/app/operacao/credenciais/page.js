import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
  return <AppShell><div className="content">
    <div className="project-head"><div><div className="eyebrow">Cofre criptografado</div><h1 className="page-title">Credenciais</h1><p className="subtitle">Senhas e tokens protegidos com AES-256-GCM.</p></div><Link className="btn primary" href="/app/operacao/credenciais/novo"><Plus size={15}/> Adicionar acesso</Link></div>
    {!configured && <p className="error">Cofre bloqueado: configure CREDENTIALS_ENCRYPTION_KEY no ambiente.</p>}
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <section className="panel" style={{ marginTop: 24 }}>{data?.length ? data.map((item) => <div className="item" key={item.id}><div className="item-main"><div className="item-title"><KeyRound size={16}/> {item.service_name}</div><div className="meta">{item.projects?.name || "Sem projeto"} · {item.login_identifier || "Usuário não informado"} · {item.status}</div></div><div className="actions" style={{ margin: 0 }}>{item.access_url && <a className="btn" href={item.access_url} target="_blank" rel="noreferrer">Abrir site</a>}<Link className="btn" href={`/app/operacao/credenciais/${item.id}`}>Abrir cofre</Link></div></div>) : <div className="empty">Nenhuma credencial registrada.</div>}</section>
  </div></AppShell>;
}
