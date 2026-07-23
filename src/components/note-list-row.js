"use client";

import { useState } from "react";
import { NoteDetailsModal } from "@/components/note-details-modal";
import { StatusBadge } from "@/components/status-badge";

export function NoteListRow({ note }) {
  const [open, setOpen] = useState(false);
  const showDetails = () => setOpen(true);

  return <>
    <tr className="note-list-row" onClick={showDetails} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetails();
      }
    }} role="button" tabIndex={0} aria-label={`Visualizar a nota ${note.title}`}>
      <td data-label="Nota">
        <span className="note-list-title"><b>{note.title}</b></span>
        <div className="meta note-list-preview">{note.content.slice(0, 120)}</div>
      </td>
      <td data-label="Contexto">{note.projects?.name || <span className="badge">Pessoal</span>}</td>
      <td data-label="Estado"><StatusBadge status={note.status}/></td>
    </tr>
    {open && <NoteDetailsModal note={note} projectSlug={note.projects?.slug || ""} onClose={() => setOpen(false)}/>}
  </>;
}
