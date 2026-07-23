"use client";

import Link from "next/link";
import { Eye, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function RecordDetailsButton({ label = "Detalhes", title, summary, details = [], sections = [], editHref, primaryHref, primaryLabel = "Abrir", children, className = "" }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const escape = (event) => event.key === "Escape" && setOpen(false);
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", escape);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <>
    <button className={`record-details-trigger ${className}`} type="button" onClick={() => setOpen(true)} aria-label={`Visualizar detalhes de ${title}`}>
      <span className="record-details-title">{title}</span>
      {summary && <span className="record-details-summary">{summary}</span>}
    </button>
    {open && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="app-modal record-details-modal" role="dialog" aria-modal="true" aria-labelledby="record-details-title">
        <header className="modal-head"><div><span className="eyebrow">{label}</span><h2 id="record-details-title">{title}</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Fechar detalhes"><X size={20}/></button></header>
        {details.length > 0 && <div className="modal-grid">{details.filter((item) => item?.value !== undefined && item?.value !== null && item?.value !== "").map((item) => <div key={item.label}><span>{item.label}</span><b>{String(item.value)}</b></div>)}</div>}
        {sections.filter((section) => section?.content).map((section) => <div className="modal-section" key={section.label}><b>{section.label}</b><p>{section.content}</p></div>)}
        <footer className="modal-actions">
          {primaryHref && <Link className="btn primary" href={primaryHref}><Eye size={15}/>{primaryLabel}</Link>}
          {editHref && <Link className="btn primary" href={editHref}><Pencil size={15}/> Editar</Link>}
          {children}
          <button className="btn" type="button" onClick={() => setOpen(false)}>Fechar</button>
        </footer>
      </section>
    </div>, document.body)}
  </>;
}
