import Link from "next/link";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProjectRichDocumentEditor } from "@/components/project-rich-document-editor";
import { sanitizeRichDocument } from "@/lib/rich-document";
import { getProjectDashboard } from "@/services/project-dashboard";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `Documento · ${slug}` };
}

export default async function ProjectDocumentPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const editing = query?.editar === "1";
  const { project, preview } = await getProjectDashboard(slug);
  const document = sanitizeRichDocument(project.documentation_content || "");

  return <AppShell preview={preview} context={{ type: "project", ...project }}>
    <div className="content project-document-page">
      <header className="project-document-page-head">
        <div>
          <Link className="back-link" href={`/app/projetos/${project.slug}`}><ArrowLeft size={15}/> Página do projeto</Link>
          <div className="eyebrow"><FileText size={14}/> Documento do projeto</div>
          <h1 className="page-title">{project.name}</h1>
          <p className="subtitle">{editing ? "Edite, formate e aprimore a documentação deste projeto." : "Documentação completa e preservada deste projeto."}</p>
        </div>
        <div className="project-document-page-actions">
          {editing
            ? <Link className="btn" href={`/app/projetos/${project.slug}/documento`}>Concluir edição</Link>
            : <Link className="btn primary" href={`/app/projetos/${project.slug}/documento?editar=1`}><Pencil size={15}/> Editar documento</Link>}
        </div>
      </header>
      {editing
        ? <ProjectRichDocumentEditor project={project}/>
        : document
          ? <article className="rich-document-viewer" dangerouslySetInnerHTML={{ __html: document }}/>
          : <section className="rich-document-empty">
              <FileText size={28}/>
              <h2>Documento ainda vazio</h2>
              <p>Use o editor para criar a documentação completa deste projeto.</p>
              <Link className="btn primary" href={`/app/projetos/${project.slug}/documento?editar=1`}><Pencil size={15}/> Começar a escrever</Link>
            </section>}
    </div>
  </AppShell>;
}
