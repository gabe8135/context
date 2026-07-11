import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { decryptCredential } from "@/lib/credential-crypto";
import { archiveCredentialAction, validateCredentialAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CredentialDetail({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase.from("credentials").select("id,service_name,login_identifier,access_url,secret_ciphertext,recovery_instructions,status,last_validated_at,projects(name,slug)").eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null).single();
  if (error || !data) notFound();
  let secret = null;
  let decryptError = null;
  if (query.revelar === "1") { try { secret = decryptCredential(data.secret_ciphertext); } catch { decryptError = "Não foi possível abrir: confira a chave de criptografia."; } }
  return <AppShell><div className="content narrow"><Link className="back-link" href="/app/operacao/credenciais">← Credenciais</Link><div className="eyebrow">Acesso protegido</div><h1 className="page-title">{data.service_name}</h1><section className="panel form-panel"><div className="form-grid">
    <div className="field"><span>Projeto</span><strong>{data.projects?.name || "Sem projeto"}</strong></div><div className="field"><span>Status</span><strong>{data.status}</strong></div>
    <div className="field"><span>Usuário</span><strong>{data.login_identifier || "—"}</strong></div><div className="field"><span>Última validação</span><strong>{data.last_validated_at ? new Date(data.last_validated_at).toLocaleString("pt-BR") : "Nunca"}</strong></div>
    <div className="field full"><span>Senha ou token</span>{secret ? <code style={{ overflowWrap: "anywhere", fontSize: 16 }}>{secret}</code> : <strong>••••••••••••</strong>}{decryptError && <p className="error">{decryptError}</p>}</div>
    {data.recovery_instructions && <div className="field full"><span>Recuperação e observações</span><p>{data.recovery_instructions}</p></div>}
  </div><div className="form-actions">{query.revelar === "1" ? <Link className="btn" href={`/app/operacao/credenciais/${id}`}>Ocultar</Link> : <Link className="btn primary" href={`/app/operacao/credenciais/${id}?revelar=1`}>Revelar credencial</Link>}{data.access_url && <a className="btn" href={data.access_url} target="_blank" rel="noreferrer">Abrir site</a>}<form action={validateCredentialAction.bind(null, id)}><button className="btn">Marcar como validada</button></form><form action={archiveCredentialAction.bind(null, id)}><button className="btn">Arquivar</button></form></div></section></div></AppShell>;
}
