import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { richDocumentText } from "@/lib/rich-document";

export function ProjectDocumentation({ project }) {
  const text = richDocumentText(project.documentation_content);

  return <section className="document-section project-documentation-preview" id="documentacao">
    <div className="documentation-preview-icon"><FileText size={21}/></div>
    <div><h2>Documento do projeto</h2><p>{text ? text.slice(0, 190) : "Crie uma página completa para registrar contexto, execução, decisões, links e próximos passos."}</p></div>
    <Link className="btn" href={`/app/projetos/${project.slug}/documento`}>Abrir documento <ArrowRight size={15}/></Link>
  </section>;
}
