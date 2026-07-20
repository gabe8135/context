import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { createNoteAction } from "../actions";

export default async function NewNote({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase.from("projects").select("id,name,slug").eq("workspace_id", workspaceId).is("archived_at", null).order("name");
  if (error) throw error;
  const selected = data?.find((project) => project.slug === query.projeto);
  return <AppShell><div className="content narrow">
    <Link className="back-link" href={query.projeto ? `/app/projetos/${query.projeto}` : "/app"}>← Voltar</Link>
    <div className="eyebrow">Memória pessoal ou projeto</div><h1 className="page-title">Nova nota</h1>
    <p className="subtitle">Registre uma lembrança pessoal ou associe a nota a um projeto.</p>
    <form action={createNoteAction} className="panel form-panel">{query.erro && <p className="error">{query.erro}</p>}<div className="form-grid">
      <label className="field"><span>Contexto</span><select name="project_id" defaultValue={selected?.id || ""}><option value="">Pessoal · sem projeto</option>{data?.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
      <label className="field"><span>Estado</span><select name="status"><option value="active">Atual</option><option value="historical">Histórica</option></select></label>
      <label className="field full"><span>Título</span><input name="title" required/></label>
      <label className="field full"><span>Conteúdo</span><textarea name="content" rows="12" required/></label>
    </div><div className="form-actions"><button className="btn primary">Salvar nota</button></div></form>
  </div></AppShell>;
}
