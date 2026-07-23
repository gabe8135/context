import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { createMeetingAction } from "../actions";

export default async function NewMeeting({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: projects } = await supabase.from("projects")
    .select("id,name,slug")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");
  const selected = projects?.find((project) => project.slug === query.projeto);

  return <AppShell><div className="content narrow">
    <Link className="back-link" href={query.projeto ? `/app/projetos/${query.projeto}` : "/app/reunioes"}>← Voltar</Link>
    <div className="eyebrow">Registro de contexto</div>
    <h1 className="page-title">Nova reunião</h1>
    <form action={createMeetingAction} className="panel form-panel">
      <div className="form-grid">
        <label className="field"><span>Projeto</span><select name="project_id" defaultValue={selected?.id || ""} required>{projects?.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
        <label className="field"><span>Data e horário</span><input type="datetime-local" name="scheduled_at" required/></label>
        <label className="field"><span>Notificar em</span><input type="datetime-local" name="reminder_at"/></label>
        <label className="field full"><span>Título</span><input name="title" required/></label>
        <label className="field full"><span>Participantes</span><input name="participants"/></label>
        <label className="field"><span>Pauta</span><textarea name="agenda" rows="5"/></label>
        <label className="field"><span>Notas</span><textarea name="notes" rows="5"/></label>
        <label className="field full"><span>Resumo</span><textarea name="summary" rows="5"/></label>
        <label className="field"><span>Próxima reunião</span><input type="datetime-local" name="next_meeting_at"/></label>
      </div>
      <div className="form-actions"><button className="btn primary">Registrar reunião</button></div>
    </form>
  </div></AppShell>;
}
