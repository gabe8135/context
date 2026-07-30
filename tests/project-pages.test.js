import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/202607290002_add_project_pages.sql", "utf8");
const rlsFix = readFileSync("supabase/migrations/202607290003_fix_project_pages_parent_rls.sql", "utf8");
const editor = readFileSync("src/components/project-rich-document-editor.js", "utf8");
const actions = readFileSync("src/app/app/projetos/actions.js", "utf8");
const subpage = readFileSync("src/app/app/projetos/[slug]/documento/[pageId]/page.js", "utf8");
const sanitizer = readFileSync("src/lib/rich-document.js", "utf8");
const tree = readFileSync("src/components/project-page-tree.js", "utf8");

test("páginas do projeto têm hierarquia, RLS, grants e isolamento", () => {
  assert.match(migration, /create table if not exists public\.project_pages/);
  assert.match(migration, /parent_id uuid references public\.project_pages/);
  assert.match(migration, /grant select, insert, update, delete on public\.project_pages to authenticated/);
  assert.match(migration, /revoke all on public\.project_pages from anon/);
  assert.match(migration, /alter table public\.project_pages enable row level security/);
  assert.match(migration, /private\.is_workspace_member/);
  assert.match(migration, /parent\.project_id = project_id/);
  assert.match(rlsFix, /security definer/);
  assert.match(rlsFix, /set search_path = ''/);
  assert.match(rlsFix, /private\.is_valid_project_page_parent/);
});

test("ações de páginas mantêm workspace e projeto em todas as gravações", () => {
  assert.match(actions, /createProjectPageAction/);
  assert.match(actions, /saveProjectPageAction/);
  assert.match(actions, /\.eq\("workspace_id", workspaceId\)/);
  assert.match(actions, /\.eq\("project_id", projectId\)/);
  assert.match(actions, /parent_id: parent/);
});

test("editor oferece comandos essenciais pela barra e rota de subpágina", () => {
  for (const command of ["page", "todo", "h1", "h2", "h3", "bullet", "numbered", "quote", "divider"]) {
    assert.match(editor, new RegExp(`id: "${command}"`));
  }
  assert.match(editor, /createProjectPageAction/);
  assert.match(editor, /pageInsertionRangeRef/);
  assert.match(editor, /data-project-page-id/);
  assert.match(editor, /slashQueryRef/);
  assert.match(editor, /slashIndexRef/);
  assert.match(editor, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
  assert.match(editor, /event\.key === "Tab"/);
  assert.match(editor, /event\.key === "Home"/);
  assert.match(editor, /event\.key === "End"/);
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(actions, /title: data\.title/);
  assert.match(subpage, /getProjectPage/);
  assert.match(subpage, /ProjectPageTree/);
  assert.match(sanitizer, /type="checkbox"/);
});

test("subpágina vira link no ponto do comando e o mapa fica recolhido", () => {
  assert.match(actions, /viewHref: `\/app\/projetos\/\$\{projectSlug\}\/documento\/\$\{data\.id\}`/);
  assert.match(editor, /insertionRange\.insertNode\(pageLink\)/);
  assert.match(editor, /insertPlainParagraphAfterPageLink\(pageLink\)/);
  assert.match(editor, /paragraph\.appendChild\(document\.createElement\("br"\)\)/);
  assert.match(editor, /event\.key === "Enter"/);
  assert.match(editor, /pageLinkAtCaret/);
  assert.match(editor, /saveProjectDocumentationAction/);
  assert.match(editor, /saveProjectPageAction/);
  assert.match(sanitizer, /data-project-page-id/);
  assert.match(tree, /<details className="project-page-tree">/);
});
