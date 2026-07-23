"use client";

import Link from "next/link";
import { FolderKanban, Mail, MessageCircle, Pencil, Phone, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ClientsListClient({ clients }) {
  const [selected, setSelected] = useState(null);
  return <>
    <section className="panel data-panel clients-compact-list">
      <table>
        <thead><tr><th>Cliente</th><th>Contato</th><th>Projetos</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>{clients.map((client) => <tr key={client.id}>
          <td data-label="Cliente"><button className="client-preview-trigger" type="button" onClick={() => setSelected(client)}><b>{client.name}</b><span>{client.projectCount} {client.projectCount === 1 ? "projeto" : "projetos"}</span></button></td>
          <td data-label="Contato">{client.email || client.whatsapp || "—"}</td>
          <td data-label="Projetos" className="mono">{client.projectCount}</td>
          <td data-label="Status"><span className="badge">{client.status === "active" ? "Ativo" : "Inativo"}</span></td>
          <td data-label="Ações"><button className="btn" type="button" onClick={() => setSelected(client)}>Visualizar</button></td>
        </tr>)}</tbody>
      </table>
    </section>
    {selected && <ClientDetailsModal client={selected} onClose={() => setSelected(null)}/>}
  </>;
}

function ClientDetailsModal({ client, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="app-modal client-details-modal" role="dialog" aria-modal="true" aria-labelledby="client-details-title">
        <header className="modal-head"><div><span className="eyebrow">Cliente</span><h2 id="client-details-title">{client.name}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={20}/></button></header>
        <div className="client-modal-facts">
          <Fact icon={UserRound} label="Nome legal" value={client.legal_name}/>
          <Fact icon={Mail} label="E-mail" value={client.email}/>
          <Fact icon={Phone} label="Telefone" value={client.phone}/>
          <Fact icon={MessageCircle} label="WhatsApp" value={client.whatsapp}/>
        </div>
        {client.notes && <div className="modal-section"><strong>Observações</strong><p>{client.notes}</p></div>}
        <div className="modal-section"><strong>Projetos</strong><div className="client-modal-projects">
          {client.projects.length ? client.projects.map((project) => <Link href={`/app/projetos/${project.slug}`} key={project.id}><FolderKanban size={16}/><span><b>{project.name}</b><small>{project.status === "active" ? "Projeto ativo" : project.status}</small></span></Link>) : <p className="meta">Nenhum projeto vinculado.</p>}
        </div></div>
        <footer className="modal-actions">
          <Link className="btn primary" href={`/app/clientes/${client.id}`}><FolderKanban size={15}/> Abrir pasta do cliente</Link>
          <Link className="btn" href={`/app/clientes/${client.id}/editar`}><Pencil size={15}/> Editar</Link>
          <button className="btn" type="button" onClick={onClose}>Fechar</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function Fact({ icon: Icon, label, value }) {
  return <div><Icon size={17}/><span><small>{label}</small><b>{value || "Não informado"}</b></span></div>;
}
