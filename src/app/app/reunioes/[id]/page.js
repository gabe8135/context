import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveMeetingAction, updateMeetingAction } from "../actions";

export const dynamic = "force-dynamic";
const dateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default async function MeetingDetail({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: meeting, error } = await supabase.from("meetings")
    .select("*,projects(id,name,slug,clients(name))")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const project = meeting.projects;

  return <AppShell context={project ? { type: "project", ...project } : null}><div className="content narrow">
    <Link className="back-link" href={project ? `/app/projetos/${project.slug}` : "/app/reunioes"}>← {project ? project.name : "Reuniões"}</Link>
    <div className="eyebrow">Contexto registrado</div>
    <h1 className="page-title">Editar reunião</h1>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <form action={updateMeetingAction.bind(null, id)} className="panel form-panel">
      <div className="form-grid">
        <Field name="scheduled_at" label="Data e horário" type="datetime-local" value={dateTime(meeting.scheduled_at)} required/>
        <Field name="reminder_at" label="Notificar em" type="datetime-local" value={dateTime(meeting.reminder_at)}/>
        <Field name="title" label="Título" value={meeting.title} required/>
        <Field name="participants" label="Participantes" value={meeting.participants || ""} full/>
        {[["agenda", "Pauta"], ["notes", "Notas"], ["summary", "Resumo"]].map(([name, label]) => <label className="field full" key={name}><span>{label}</span><textarea name={name} rows="5" defaultValue={meeting[name] || ""}/></label>)}
        <Field name="next_meeting_at" label="Próxima reunião" type="datetime-local" value={dateTime(meeting.next_meeting_at)}/>
      </div>
      <div className="form-actions"><button className="btn primary">Salvar alterações</button></div>
    </form>
    <form action={archiveMeetingAction.bind(null, id)}><button className="btn" style={{ marginTop: 12 }}>Arquivar reunião</button></form>
  </div></AppShell>;
}

function Field({ name, label, value, type = "text", required = false, full = false }) {
  return <label className={`field${full ? " full" : ""}`}><span>{label}</span><input name={name} type={type} defaultValue={value} required={required}/></label>;
}
