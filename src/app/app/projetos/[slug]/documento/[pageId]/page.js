import Link from "next/link";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProjectPageActions } from "@/components/project-page-actions";
import { ProjectPageTree } from "@/components/project-page-tree";
import { ProjectRichDocumentEditor } from "@/components/project-rich-document-editor";
import { sanitizeRichDocument } from "@/lib/rich-document";
import { getProjectDashboard } from "@/services/project-dashboard";
import { getProjectPage, getProjectPages } from "@/services/project-pages";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `Página · ${slug}` };
}

export default async function ProjectSubpage({ params, searchParams }) {
  const { slug, pageId } = await params;
  const query = await searchParams;
  const editing = query?.editar === "1";
  const { project, preview } = await getProjectDashboard(slug);
  const [page, pages] = await Promise.all([
    getProjectPage(project.id, pageId),
    getProjectPages(project.id),
  ]);
  const document = sanitizeRichDocument(page.content || "");

  return <AppShell preview={preview} context={{ type: "project", ...project }}>
    <div className="content project-document-page">
      <header className="project-document-page-head">
        <div>
          <Link className="back-link" href={`/app/projetos/${project.slug}/documento`}><ArrowLeft size={15}/> Documento</Link>
          <div className="eyebrow"><FileText size={14}/> Página do projeto</div>
          {!editing && <h1 className="page-title">{page.title}</h1>}
          <p className="subtitle">{editing ? "O título abaixo faz parte da página e é salvo junto com o conteúdo." : `Subpágina de ${project.name}`}</p>
        </div>
        <div className="project-document-header-actions">
          <ProjectPageTree project={project} pages={pages} activeId={page.id}/>
          <ProjectPageActions project={project} page={page} editing={editing}/>
        </div>
      </header>
      <div className="project-document-workspace">
        <div className="project-document-stage">
          {editing
            ? <ProjectRichDocumentEditor project={project} page={page}/>
            : document
              ? <article className="rich-document-viewer" dangerouslySetInnerHTML={{ __html: document }}/>
              : <section className="rich-document-empty">
                  <FileText size={28}/>
                  <h2>Página ainda vazia</h2>
                  <p>Abra o editor e digite / para adicionar o primeiro bloco.</p>
                  <Link className="btn primary" href={`/app/projetos/${project.slug}/documento/${page.id}?editar=1`}><Pencil size={15}/> Começar a escrever</Link>
                </section>}
        </div>
      </div>
    </div>
  </AppShell>;
}
