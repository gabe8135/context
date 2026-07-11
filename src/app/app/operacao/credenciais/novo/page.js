import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { createCredentialAction } from "../actions";

export default async function NewCredential({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: projects } = await supabase.from("projects").select("id,name").eq("workspace_id", workspaceId).is("archived_at", null).order("name");
  return <AppShell><div className="content narrow"><Link className="back-link" href="/app/operacao/credenciais">← Credenciais</Link><div className="eyebrow">Cofre seguro</div><h1 className="page-title">Adicionar credencial</h1><p className="subtitle">A senha é criptografada antes de chegar ao banco e nunca aparece nas listagens.</p><form action={createCredentialAction} className="panel form-panel">{query.erro && <p className="error">{query.erro}</p>}<div className="form-grid">
    <label className="field"><span>Projeto (opcional)</span><select name="project_id" defaultValue=""><option value="">Sem projeto</option>{projects?.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
    <label className="field"><span>Serviço *</span><input name="service_name" required placeholder="Hostinger, WordPress, Google..."/></label>
    <label className="field"><span>Usuário ou e-mail</span><input name="login_identifier" autoComplete="off"/></label>
    <label className="field"><span>Senha ou token *</span><input name="secret" type="password" required autoComplete="new-password"/></label>
    <label className="field full"><span>URL de acesso</span><input name="access_url" type="url" placeholder="https://"/></label>
    <label className="field full"><span>Recuperação e observações</span><textarea name="recovery_instructions" rows="5"/></label>
  </div><div className="form-actions"><button className="btn primary">Criptografar e salvar</button></div></form></div></AppShell>;
}
