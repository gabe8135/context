import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AgendaPageClient } from "@/components/agenda-page-client";
import { PushNotificationControl } from "@/components/push-notification-control";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";
import { saveEventAction } from "./actions";

export const dynamic = "force-dynamic";

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function Agenda({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, query.projeto);
  const [{ data: projects }, eventResult] = await Promise.all([
    supabase.from("projects").select("id,name,slug").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
    query.editar
      ? supabase.from("calendar_events").select("*").eq("workspace_id", workspaceId).eq("id", query.editar).is("archived_at", null).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (eventResult.error) throw eventResult.error;
  const event = eventResult.data;
  const reminder = Array.isArray(event?.reminder_minutes) ? event.reminder_minutes[0] : "";

  return <AppShell context={scope ? { type: "project", ...scope } : null}>
    <div className="content">
      <div className="project-head">
        <div>
          <div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Tempo e compromissos"}</div>
          <h1 className="page-title">Agenda</h1>
          <p className="subtitle">{scope ? "Prazos, reuniões e eventos somente deste projeto." : "Eventos, reuniões e tarefas em um calendário único."}</p>
        </div>
        <PushNotificationControl/>
      </div>
      {query.sucesso && <p className="success-note">{query.sucesso}</p>}
      <AgendaPageClient projectSlug={scope?.slug || ""}/>
      <details className="agenda-create panel" open={Boolean(event)}>
        <summary><Plus size={16}/> {event ? "Editar evento" : "Adicionar evento"}</summary>
        <form action={saveEventAction} className="form-panel">
          <input type="hidden" name="id" value={event?.id || ""}/>
          <input type="hidden" name="project_slug" value={scope?.slug || event?.projects?.slug || ""}/>
          <div className="form-grid">
            <label className="field"><span>Título</span><input name="title" required defaultValue={event?.title || ""}/></label>
            <label className="field"><span>Tipo</span><select name="event_type" defaultValue={event?.event_type || "event"}><option value="event">Evento</option><option value="meeting">Reunião</option><option value="deadline">Prazo</option><option value="reminder">Lembrete</option></select></label>
            <label className="field"><span>Projeto</span><select name="project_id" defaultValue={event?.project_id || scope?.id || ""}><option value="">Pessoal · sem projeto</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label className="field"><span>Início</span><input name="starts_at" type="datetime-local" required defaultValue={localDateTime(event?.starts_at)}/></label>
            <label className="field"><span>Fim</span><input name="ends_at" type="datetime-local" defaultValue={localDateTime(event?.ends_at)}/></label>
            <label className="field"><span>Notificar antes</span><select name="reminder_minutes" defaultValue={reminder === undefined || reminder === null ? "" : String(reminder)}><option value="">Sem notificação</option><option value="0">Na hora</option><option value="5">5 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="1440">1 dia</option></select></label>
            <label className="field"><span>Local</span><input name="location" defaultValue={event?.location || ""}/></label>
            <label className="field full"><span>Descrição</span><textarea name="description" rows="3" defaultValue={event?.description || ""}/></label>
          </div>
          <button className="btn primary">{event ? "Salvar alterações" : "Salvar evento"}</button>
        </form>
      </details>
    </div>
  </AppShell>;
}
