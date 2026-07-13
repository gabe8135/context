"use client";

import Link from "next/link";
import { Archive, Pencil, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { archiveNoteAction } from "@/app/app/notas/actions";
import { ConfirmSubmitButton } from "./confirm-submit-button";

export function NoteDetailsModal({ note, onClose }) {
  useEffect(() => {
    const escape = (event) => event.key === "Escape" && onClose();
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", escape);
    return () => { document.documentElement.classList.remove("modal-open"); window.removeEventListener("keydown", escape); };
  }, [onClose]);
  if (!note) return null;
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="app-modal note-preview-modal" role="dialog" aria-modal="true" aria-labelledby="note-modal-title"><header className="modal-head"><div><span className="eyebrow">Nota do projeto</span><h2 id="note-modal-title">{note.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar nota"><X size={20}/></button></header><div className="note-preview-meta"><span className="badge">{note.status === "historical" ? "Histórica" : "Atual"}</span>{note.updated_at && <time>Atualizada em {new Date(note.updated_at).toLocaleString("pt-BR")}</time>}</div><div className="note-preview-content">{note.content || "Esta nota não possui conteúdo."}</div><footer className="modal-actions"><Link className="btn primary" href={`/app/notas/${note.id}`}><Pencil size={15}/> Editar</Link><form action={archiveNoteAction.bind(null, note.id)}><ConfirmSubmitButton message={`Arquivar a nota “${note.title}”?`}><Archive size={15}/> Arquivar</ConfirmSubmitButton></form><button className="btn" type="button" onClick={onClose}>Fechar</button></footer></section></div>, document.body);
}
