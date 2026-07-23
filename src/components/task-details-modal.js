"use client";

import Link from "next/link";
import { Archive, Pencil, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { archiveTaskAction, deleteTaskAction } from "@/app/app/tarefas/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/task-labels";

const formatDate = (value) => value ? new Date(value).toLocaleString("pt-BR") : "Não informado";

export function TaskDetailsModal({ task, projectSlug, onClose }) {
  useEffect(() => {
    const escape = (event) => event.key === "Escape" && onClose();
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", escape);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  if (!task) return null;
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <header className="modal-head"><div><span className="eyebrow">Detalhes da tarefa</span><h2 id="task-modal-title">{task.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={20}/></button></header>
      <div className="modal-grid"><Detail label="Status" value={taskStatusLabel(task.status)}/><Detail label="Prioridade" value={taskPriorityLabel(task.priority)}/><Detail label="Início" value={formatDate(task.starts_at)}/><Detail label="Prazo" value={formatDate(task.due_at)}/><Detail label="Criada em" value={formatDate(task.created_at)}/><Detail label="Concluída em" value={formatDate(task.completed_at)}/></div>
      <div className="modal-section"><b>Descrição</b><p>{task.description || "Nenhuma descrição informada."}</p></div>
      <div className="modal-section"><b>Próxima ação</b><p>{task.next_action || "Nenhuma próxima ação informada."}</p></div>
      <footer className="modal-actions"><Link className="btn primary" href={`/app/tarefas/${task.id}`}><Pencil size={15}/> Editar</Link><form action={archiveTaskAction.bind(null, task.id, projectSlug)}><ConfirmSubmitButton message={`Arquivar a tarefa “${task.title}”?`}><Archive size={15}/> Arquivar</ConfirmSubmitButton></form><form action={deleteTaskAction.bind(null, task.id, projectSlug)}><ConfirmSubmitButton className="btn danger" message={`Excluir definitivamente a tarefa “${task.title}”? Esta ação não pode ser desfeita.`}><Trash2 size={15}/> Excluir</ConfirmSubmitButton></form><button className="btn" type="button" onClick={onClose}>Fechar</button></footer>
    </section>
  </div>, document.body);
}

function Detail({ label, value }) {
  return <div><span>{label}</span><b>{value}</b></div>;
}
