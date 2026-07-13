"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ProjectInfoModal({ item, onClose }) {
  useEffect(() => {
    const escape = (event) => event.key === "Escape" && onClose();
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", escape);
    return () => { document.documentElement.classList.remove("modal-open"); window.removeEventListener("keydown", escape); };
  }, [onClose]);
  if (!item) return null;
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="app-modal project-info-modal" role="dialog" aria-modal="true" aria-labelledby="project-info-title"><header className="modal-head"><div><span className="eyebrow">{item.label}</span><h2 id="project-info-title">{item.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={20}/></button></header>{item.meta && <div className="project-info-meta">{item.meta}</div>}<div className="project-info-content">{item.content || "Nenhuma informação adicional registrada."}</div><footer className="modal-actions">{item.href && <Link className="btn primary" href={item.href}><ArrowUpRight size={15}/>{item.actionLabel || "Abrir seção completa"}</Link>}<button className="btn" type="button" onClick={onClose}>Fechar</button></footer></section></div>, document.body);
}
