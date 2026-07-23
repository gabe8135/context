"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, CheckSquare, Circle, CircleDollarSign, Clock3, FileText, FolderOpen, GripVertical, Lightbulb, PackageCheck, Pencil, Plus, Server, Video } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { reorderTaskQueueAction, toggleTaskAction } from "@/app/app/tarefas/actions";
import { NaturalCapture } from "./natural-capture";
import { NoteDetailsModal } from "./note-details-modal";
import { ProjectInfoModal } from "./project-info-modal";
import { TaskDetailsModal } from "./task-details-modal";
import { calculateProjectProgress } from "@/lib/project-progress";
import { taskPriorityLabel } from "@/lib/task-labels";

const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
const due = (date) => date ? new Date(date).toLocaleDateString("pt-BR") : "Sem prazo";

export function ProjectDashboard({ project }) {
  const [tasks, setTasks] = useState(project.tasks);
  const tasksRef = useRef(project.tasks);
  const draggedIdRef = useRef(null);
  const [draggedId, setDraggedId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [busy, startTransition] = useTransition();
  const completed = tasks.filter((task) => task.status === "completed").length;
  const open = tasks.filter((task) => task.status !== "completed");
  const progress = calculateProjectProgress(tasks, project.status);

  function toggle(task) {
    const markCompleted = task.status !== "completed";
    const next = tasksRef.current.map((item) => item.id === task.id ? { ...item, status: markCompleted ? "completed" : "todo" } : item);
    tasksRef.current = next;
    setTasks(next);
    startTransition(() => toggleTaskAction(task.id, project.id, project.slug));
  }

  function startDrag(event, taskId) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedIdRef.current = taskId;
    setDraggedId(taskId);
  }

  function dragOver(event, taskId) {
    const activeId = draggedIdRef.current;
    if (!activeId || activeId === taskId) return;
    event.preventDefault();
    const items = tasksRef.current;
    const openTasks = items.filter((item) => item.status !== "completed");
    const from = openTasks.findIndex((item) => item.id === activeId);
    const to = openTasks.findIndex((item) => item.id === taskId);
    if (from < 0 || to < 0) return;
    const reordered = [...openTasks];
    const [moving] = reordered.splice(from, 1);
    reordered.splice(to, 0, moving);
    const next = [...reordered, ...items.filter((item) => item.status === "completed")];
    tasksRef.current = next;
    setTasks(next);
  }

  function dragMove(event) {
    if (!draggedIdRef.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-task-id]");
    if (target?.dataset.taskId) dragOver(event, target.dataset.taskId);
  }

  function finishDrag() {
    if (!draggedIdRef.current) return;
    const orderedIds = tasksRef.current.filter((item) => item.status !== "completed").map((item) => item.id);
    draggedIdRef.current = null;
    setDraggedId(null);
    startTransition(() => reorderTaskQueueAction(orderedIds, project.slug));
  }

  return <article className="content project-document">
    <header className="project-document-hero">
      <div><div className="eyebrow">{project.client_name} · Projeto {project.status}</div><h1 className="page-title">{project.name}</h1><p className="subtitle">Uma página viva para entender, executar e preservar este projeto.</p></div>
      <div className="project-hero-tools"><Link className="btn icon-btn" href={`/app/projetos/${project.slug}/editar`}><Pencil size={15}/> Editar</Link><div className="document-progress"><span><b>{progress}%</b> concluído</span><div className="progress"><i style={{ width: `${progress}%` }}/></div></div></div>
    </header>

    <NaturalCapture projectSlug={project.slug}/>

    {project.alerts.length > 0 && <section className="document-callout warning"><AlertTriangle size={19}/><div><b>Precisa de atenção</b>{project.alerts.map((alert) => <p key={alert.id}>{alert.title} — {alert.recommended_action}</p>)}</div></section>}

    <div className="document-work-grid"><section className="document-section" id="proximos-passos">
      <SectionTitle icon={CheckSquare} title="Próximos passos" action={`/app/tarefas/nova?projeto=${project.slug}`} actionLabel="Nova tarefa"/>
      <p className="section-description">Fila manual de execução: o primeiro item é o próximo a ser feito, mesmo sem prazo.</p>
      <div className="document-checklist">{open.length ? open.slice(0, 8).map((task, index) => <TaskRow key={task.id} task={task} rank={index + 1} busy={busy} dragging={draggedId === task.id} onToggle={() => toggle(task)} onOpen={() => setSelectedTask(task)} onDragStart={(event) => startDrag(event, task.id)} onDragMove={dragMove} onDragEnd={finishDrag}/>) : <Empty text="Nada pendente. Defina o próximo passo quando precisar."/>}</div>
    </section>

    <section className="document-section" id="etapas">
      <SectionTitle icon={CheckCircle2} title="Etapas do trabalho"/>
      <div className="stage-grid"><Stage label="A fazer" count={tasks.filter((task) => task.status === "todo").length}/><Stage label="Em andamento" count={tasks.filter((task) => ["doing", "in_progress", "review"].includes(task.status)).length}/><Stage label="Concluído" count={completed}/></div>
      {completed > 0 && <details className="completed-work"><summary>Ver {completed} item(ns) concluído(s)</summary><div>{tasks.filter((task) => task.status === "completed").map((task) => <TaskRow key={task.id} task={task} busy={busy} onToggle={() => toggle(task)} onOpen={() => setSelectedTask(task)}/>)}</div></details>}
    </section></div>

    <section className="document-section" id="contexto">
      <SectionTitle icon={BookOpen} title="Caderno do projeto" action={`/app/notas/nova?projeto=${project.slug}`} actionLabel="Nova nota"/>
      <p className="section-description">Notas, decisões e encontros que explicam por que o projeto está assim.</p>
      <div className="knowledge-grid">
        <KnowledgeBlock icon={FileText} title="Notas" href={`/app/notas?projeto=${project.slug}`} rows={project.notes} onSelect={setSelectedNote} render={(note) => ({ title: note.title, meta: note.content?.slice(0, 100) })}/>
        <KnowledgeBlock icon={Lightbulb} title="Decisão atual" href={`/app/decisoes?projeto=${project.slug}`} rows={project.last_decision?.id ? [project.last_decision] : []} onSelect={(decision) => setSelectedInfo({ label: "Decisão do projeto", title: decision.title || "Decisão registrada", content: decision.content, meta: decision.responsible, href: `/app/decisoes/${decision.id}/editar`, actionLabel: "Editar decisão" })} render={(decision) => ({ title: decision.title || "Decisão registrada", meta: decision.content })}/>
        <KnowledgeBlock icon={Video} title="Reuniões" href={`/app/reunioes?projeto=${project.slug}`} rows={project.meetings} onSelect={(meeting) => setSelectedInfo({ label: "Reunião do projeto", title: meeting.title, content: meeting.summary, meta: due(meeting.scheduled_at), href: `/app/reunioes/${meeting.id}`, actionLabel: "Abrir reunião" })} render={(meeting) => ({ title: meeting.title, meta: due(meeting.scheduled_at) })}/>
      </div>
    </section>

    {(project.deliverables.length > 0 || project.files.length > 0) && <section className="document-section" id="documentos">
      <SectionTitle icon={FolderOpen} title="Documentos internos"/>
      <div className="knowledge-grid two"><KnowledgeBlock icon={PackageCheck} title="Entregáveis" href={`/app/operacao/entregaveis?projeto=${project.slug}`} rows={project.deliverables} onSelect={(item) => setSelectedInfo({ label: "Entregável", title: item.name, content: `Status: ${item.status}`, meta: item.due_at ? `Prazo: ${due(item.due_at)}` : "Sem prazo", href: `/app/operacao/entregaveis?projeto=${project.slug}` })} render={(item) => ({ title: item.name, meta: item.status })}/><KnowledgeBlock icon={FileText} title="Arquivos" href={`/app/operacao/arquivos?projeto=${project.slug}`} rows={project.files} onSelect={(file) => setSelectedInfo({ label: "Arquivo do projeto", title: file.logical_name, content: `Versão atual: ${file.version}`, meta: file.created_at ? new Date(file.created_at).toLocaleString("pt-BR") : "", href: `/app/operacao/arquivos?projeto=${project.slug}` })} render={(file) => ({ title: file.logical_name, meta: `Versão ${file.version}` })}/></div>
    </section>}

    <section className="document-section structured-summary" id="dados">
      <SectionTitle icon={Server} title="Dados estruturados"/>
      <p className="section-description">Aparecem aqui somente quando ajudam a entender este projeto.</p>
      <div className="structured-cards">
        <SummaryButton icon={CircleDollarSign} label="Financeiro" title={`${money(project.financial.received_cents)} recebido`} detail={`${money(project.financial.pending_cents)} pendente · ${money(project.financial.expense_cents)} em despesas`} onClick={() => setSelectedInfo({ label: "Financeiro do projeto", title: "Resumo financeiro", content: `${money(project.financial.received_cents)} recebido\n${money(project.financial.pending_cents)} pendente\n${money(project.financial.expense_cents)} em despesas`, href: `/app/financeiro?projeto=${project.slug}`, actionLabel: "Abrir financeiro" })}/>
        {project.infrastructure.length > 0 && <SummaryButton icon={Server} label="Infraestrutura" title={`${project.infrastructure.length} item(ns)`} detail={project.infrastructure.slice(0, 2).map((item) => item.detail).join(" · ")} onClick={() => setSelectedInfo({ label: "Infraestrutura do projeto", title: "Resumo técnico", content: project.infrastructure.map((item) => `${item.name}: ${item.detail} (${item.status})`).join("\n"), href: `/app/infraestrutura?projeto=${project.slug}`, actionLabel: "Abrir infraestrutura" })}/>} 
        <SummaryButton icon={Clock3} label="Linha do tempo" title={project.last_activity.description} detail="Ver histórico completo" onClick={() => setSelectedInfo({ label: "Atividade mais recente", title: project.last_activity.description, content: `${project.last_activity.actor_name} · ${new Date(project.last_activity.created_at).toLocaleString("pt-BR")}`, href: `/app/projetos/${project.slug}/historico`, actionLabel: "Abrir linha do tempo" })}/>
      </div>
    </section>
    {selectedTask && <TaskDetailsModal task={selectedTask} projectSlug={project.slug} onClose={() => setSelectedTask(null)}/>} 
    {selectedNote && <NoteDetailsModal note={selectedNote} onClose={() => setSelectedNote(null)}/>} 
    {selectedInfo && <ProjectInfoModal item={selectedInfo} onClose={() => setSelectedInfo(null)}/>} 
  </article>;
}

function SectionTitle({ icon: Icon, title, action, actionLabel }) { return <header className="document-section-title"><div><Icon size={19}/><h2>{title}</h2></div>{action && <Link className="btn" href={action}><Plus size={14}/>{actionLabel}</Link>}</header>; }
function TaskRow({ task, rank, busy, dragging, onToggle, onOpen, onDragStart, onDragMove, onDragEnd }) { return <div className={`document-task ${dragging ? "is-dragging" : ""}`} data-task-id={task.id}>{rank && <span className="task-rank" aria-label={`Posição ${rank} na fila`}>{rank}</span>}<button className="task-state" disabled={busy} onClick={onToggle} aria-label={task.status === "completed" ? "Reabrir tarefa" : "Concluir tarefa"}>{task.status === "completed" ? <CheckCircle2/> : <Circle/>}</button><button className="task-content" onClick={onOpen}><b className={task.status === "completed" ? "done" : ""}>{task.title}</b><span>{taskPriorityLabel(task.priority)} · {due(task.due_at)}</span></button>{rank && <button type="button" className="task-drag-handle" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} aria-label={`Arrastar ${task.title} para outra posição`} title="Segure e arraste para reorganizar"><GripVertical/></button>}</div>; }
function Stage({ label, count }) { return <div className="stage"><span>{label}</span><b>{count}</b></div>; }
function KnowledgeBlock({ icon: Icon, title, href, rows = [], render, onSelect }) { return <div className="knowledge-block"><header><div><Icon size={16}/><b>{title}</b></div><Link href={href}>Abrir tudo</Link></header>{rows.length ? rows.slice(0, 4).map((row) => { const item = render(row); return onSelect ? <button type="button" className="knowledge-row" onClick={() => onSelect(row)} key={row.id}><b>{item.title}</b><span>{item.meta || "Sem detalhes"}</span></button> : <Link className="knowledge-row" href={item.href} key={row.id}><b>{item.title}</b><span>{item.meta || "Sem detalhes"}</span></Link>; }) : <Empty text={`Nenhum item em ${title.toLowerCase()}.`}/>}</div>; }
function Empty({ text }) { return <div className="document-empty">{text}</div>; }
function SummaryButton({ icon: Icon, label, title, detail, onClick }) { return <button type="button" onClick={onClick}><Icon/><span>{label}</span><b>{title}</b><small>{detail}</small></button>; }
