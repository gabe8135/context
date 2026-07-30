import Link from "next/link";
import { ChevronRight, FileText, Home } from "lucide-react";

export function ProjectPageTree({ project, pages, activeId = "root" }) {
  const treeMap = groupByParent(pages);
  return <details className="project-page-tree">
    <summary>
      <span><FileText size={15}/> Mapa de páginas</span>
      <ChevronRight size={15}/>
    </summary>
    <nav aria-label="Páginas do documento">
      <Link className={activeId === "root" ? "is-active" : ""} href={`/app/projetos/${project.slug}/documento`}>
        <Home size={15}/><span>Documento</span>
      </Link>
      <PageBranch project={project} treeMap={treeMap} parentId={null} activeId={activeId} depth={0}/>
      <p>Digite <kbd>/page</kbd> no editor para inserir uma subpágina no texto.</p>
    </nav>
  </details>;
}

function PageBranch({ project, treeMap, parentId, activeId, depth }) {
  return (treeMap.get(parentId) || []).map((page) => <div className="project-page-tree-node" key={page.id}>
    <Link
      className={activeId === page.id ? "is-active" : ""}
      style={{ "--page-depth": depth }}
      href={`/app/projetos/${project.slug}/documento/${page.id}`}
    >
      {(treeMap.get(page.id) || []).length ? <ChevronRight size={14}/> : <FileText size={14}/>}
      <span>{page.title}</span>
    </Link>
    <PageBranch project={project} treeMap={treeMap} parentId={page.id} activeId={activeId} depth={depth + 1}/>
  </div>);
}

function groupByParent(pages) {
  const result = new Map();
  for (const page of pages) {
    const key = page.parent_id || null;
    result.set(key, [...(result.get(key) || []), page]);
  }
  return result;
}
