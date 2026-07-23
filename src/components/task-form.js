export function TaskForm({ action, projects, selectedSlug, error }) {
  const selected = projects.find((project) => project.slug === selectedSlug);
  return <form action={action} className="panel form-panel">
    {error && <p className="error">{error}</p>}
    <input type="hidden" name="project_slug" value={selectedSlug || ""}/>
    <div className="form-grid">
      <label className="field"><span>Contexto</span><select name="project_id" defaultValue={selected?.id || ""}><option value="">Pessoal · sem projeto</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name} · {project.clients?.name || "Sem cliente"}</option>)}</select></label>
      <label className="field"><span>Título *</span><input name="title" required/></label>
      <label className="field"><span>Status</span><select name="status" defaultValue="todo"><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="waiting_client">Aguardando cliente</option><option value="waiting_third_party">Aguardando terceiro</option><option value="blocked">Bloqueada</option><option value="review">Em revisão</option><option value="completed">Concluída</option></select></label>
      <label className="field"><span>Prioridade</span><select name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
      <label className="field"><span>Início</span><input name="starts_at" type="datetime-local"/></label>
      <label className="field"><span>Prazo</span><input name="due_at" type="datetime-local"/></label>
      <label className="field"><span>Notificar em</span><input name="reminder_at" type="datetime-local"/></label>
      <label className="field full"><span>Próxima ação</span><input name="next_action"/></label>
      <label className="field full"><span>Descrição</span><textarea name="description" rows="5"/></label>
    </div>
    <div className="form-actions"><button className="btn primary">Criar tarefa</button></div>
  </form>;
}
