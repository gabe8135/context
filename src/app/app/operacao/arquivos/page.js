import Link from "next/link";
import { Download, Plus, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveFileAction, restoreFileAction } from "./actions";

const formatSize = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

export default async function Files({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [{ data, error }, { data: archived, error: archivedError }] = await Promise.all([
    supabase.from("files").select("id,logical_name,category,description,storage_path,mime_type,size_bytes,version,is_current,created_at,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
    supabase.from("files").select("id,logical_name,version,archived_at,projects(name)").eq("workspace_id", workspaceId).not("archived_at", "is", null).order("archived_at", { ascending: false })
  ]);
  if (error || archivedError) throw error || archivedError;
  const rows = await Promise.all(data.map(async (item) => {
    const { data: signed } = await supabase.storage.from("workspace-files").createSignedUrl(item.storage_path, 300, { download: true });
    return { ...item, url: signed?.signedUrl };
  }));
  return <AppShell><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">Storage privado</div><h1 className="page-title">Arquivos</h1><p className="subtitle">Versões, metadados e arquivamento sem apagar o conteúdo físico.</p></div><Link className="btn primary" href="/app/operacao/arquivos/novo"><Plus size={15}/> Enviar arquivo</Link></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}
    <section className="panel data-panel" style={{ marginTop: 24 }}><table className="uniform-compact-list"><thead><tr><th>Arquivo</th><th>Projeto</th><th>Versão</th><th>Tamanho</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} style={{ opacity: item.is_current ? 1 : .65 }}>
      <td data-label="Arquivo"><RecordDetailsButton label="Detalhes do arquivo" title={item.logical_name} summary={`${item.category || item.mime_type} · v${item.version}`} details={[
        { label: "Projeto", value: item.projects?.name }, { label: "Categoria", value: item.category }, { label: "Tipo", value: item.mime_type },
        { label: "Versão", value: `v${item.version}${item.is_current ? " · atual" : ""}` }, { label: "Tamanho", value: formatSize(item.size_bytes) },
        { label: "Enviado em", value: new Date(item.created_at).toLocaleString("pt-BR") }
      ]} sections={[{ label: "Descrição", content: item.description }]} editHref={`/app/operacao/arquivos/${item.id}/editar`} primaryHref={item.url} primaryLabel="Baixar arquivo">
        <form action={archiveFileAction.bind(null, item.id)}><button className="btn">Arquivar</button></form>
      </RecordDetailsButton></td>
      <td data-label="Projeto" data-mobile="secondary">{item.projects?.name}</td><td data-label="Versão" data-mobile="key"><span className="badge">v{item.version}</span></td><td data-label="Tamanho" data-mobile="secondary">{formatSize(item.size_bytes)}</td>
    </tr>)}</tbody></table>{!rows.length && <div className="empty">Nenhum arquivo enviado.</div>}</section>
    {archived.length > 0 && <section className="panel uniform-item-list" style={{ marginTop: 24 }}><header className="panel-head"><div className="panel-title">Arquivos arquivados</div><span className="badge">{archived.length}</span></header>{archived.map((item) => <div className="item" key={item.id}><div className="item-main"><b>{item.logical_name} · v{item.version}</b><div className="meta">{item.projects?.name} · {new Date(item.archived_at).toLocaleString("pt-BR")}</div></div><form action={restoreFileAction.bind(null, item.id)}><button className="btn"><RotateCcw size={14}/> Restaurar</button></form></div>)}</section>}
  </div></AppShell>;
}
