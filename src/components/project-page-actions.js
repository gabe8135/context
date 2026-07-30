"use client";

import { Archive, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveProjectPageAction } from "@/app/app/projetos/actions";

export function ProjectPageActions({ project, page, editing }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const viewHref = `/app/projetos/${project.slug}/documento/${page.id}`;
  const editHref = `${viewHref}?editar=1`;

  function archivePage() {
    if (!window.confirm(`Arquivar a página “${page.title}” e suas subpáginas?`)) return;
    startTransition(async () => {
      setError("");
      const result = await archiveProjectPageAction(page.id, project.id, project.slug);
      if (!result.ok) return setError(result.message || "Não foi possível arquivar a página.");
      router.push(result.href);
      router.refresh();
    });
  }

  return <div className="project-page-actions-wrap">
    <div className="project-document-page-actions">
      {editing
        ? <Link className="btn" href={viewHref}>Concluir edição</Link>
        : <Link className="btn primary" href={editHref}><Pencil size={15}/> Editar página</Link>}
      <button className="btn" type="button" disabled={pending} onClick={archivePage}>
        <Archive size={15}/>{pending ? "Arquivando..." : "Arquivar"}
      </button>
    </div>
    {error && <p className="error">{error}</p>}
  </div>;
}
