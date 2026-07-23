"use client";

import Link from "next/link";
import { CalendarDays, Clock3, FolderKanban, MapPin, Pencil, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

const typeLabels = { task: "Tarefa", meeting: "Reunião", event: "Evento", deadline: "Prazo", reminder: "Lembrete" };

function dateTime(value) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
}

export function AgendaItemDetailsModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [item, onClose]);

  if (!item) return null;

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="app-modal agenda-item-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-item-title">
        <header className="modal-head">
          <div><span className="eyebrow">{typeLabels[item.type] || "Compromisso"}</span><h2 id="agenda-item-title">{item.title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={20}/></button>
        </header>
        <div className="agenda-item-facts">
          <div><CalendarDays size={17}/><span><small>Data e horário</small><b>{dateTime(item.at)}</b></span></div>
          {item.endsAt && <div><Clock3 size={17}/><span><small>Termina em</small><b>{dateTime(item.endsAt)}</b></span></div>}
          {item.project && <div><FolderKanban size={17}/><span><small>Projeto</small><b>{item.project}</b></span></div>}
          {item.location && <div><MapPin size={17}/><span><small>Local</small><b>{item.location}</b></span></div>}
        </div>
        <div className="modal-section"><strong>Detalhes</strong><p>{item.description || "Nenhum detalhe adicional foi registrado."}</p>{item.meta && <p className="meta">{item.meta}</p>}</div>
        <footer className="modal-actions">
          {item.editHref && <Link className="btn primary" href={item.editHref}><Pencil size={15}/> Editar</Link>}
          <button className="btn" type="button" onClick={onClose}>Fechar</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
