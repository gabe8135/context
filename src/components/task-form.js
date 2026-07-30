"use client";

import { useState } from "react";

export function TaskForm({ action, projects, tasks = [], selectedSlug, error }) {
  const selected = projects.find((project) => project.slug === selectedSlug);
  const [projectId, setProjectId] = useState(selected?.id || "");
  const queueTasks = tasks.filter((task) => (task.project_id || "") === projectId);

  return <form action={action} className="panel form-panel">
    {error && <p className="error">{error}</p>}
    <input type="hidden" name="project_slug" value={selectedSlug || ""}/>
    <div className="form-grid">
      <label className="field"><span>Contexto</span><select name="project_id" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Pessoal · sem projeto</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name} · {project.clients?.name || "Sem cliente"}</option>)}</select></label>
      <label className="field"><span>Título *</span><input name="title" required/></label>
      <label className="field"><span>Status</span><select name="status" defaultValue="todo"><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="waiting_client">Aguardando cliente</option><option value="waiting_third_party">Aguardando terceiro</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="completed">Concluída</option></select></label>
      <label className="field"><span>Prioridade</span><select name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
      <label className="field"><span>Início</span><input name="starts_at" type="datetime-local"/></label>
      <label className="field"><span>Prazo</span><input name="due_at" type="datetime-local"/></label>
      <label className="field"><span>Notificar em</span><input name="reminder_at" type="datetime-local"/></label>
      <label className="field"><span>Posição na fila (opcional)</span><select name="queue_placement" defaultValue="end"><option value="end">No fim da fila</option><option value="top">No início da fila</option>{queueTasks.flatMap((task) => [<option value={`before:${task.id}`} key={`before-${task.id}`}>Antes de: {task.title}</option>, <option value={`after:${task.id}`} key={`after-${task.id}`}>Depois de: {task.title}</option>])}</select><small>Você também poderá arrastar a tarefa depois.</small></label>
      <label className="field full"><span>Próxima ação</span><input name="next_action"/></label>
      <label className="field"><span>Disponível depois de (opcional)</span><select name="depends_on_task_id" defaultValue=""><option value="">Sem dependência</option>{queueTasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select><small>Fica bloqueada até a tarefa escolhida ser concluída.</small></label>
      <label className="field"><span>Recorrência</span><select name="recurrence_rule" defaultValue=""><option value="">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label>
      <label className="field"><span>Repetir a cada</span><input name="recurrence_interval" type="number" min="1" max="365" defaultValue="1"/></label>
      <label className="field"><span>Encerrar recorrência em</span><input name="recurrence_ends_at" type="date"/></label>
      <label className="field full"><span>Descrição</span><textarea name="description" rows="5"/></label>
    </div>
    <div className="form-actions"><button className="btn primary">Criar tarefa</button></div>
  </form>;
}
