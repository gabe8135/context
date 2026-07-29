import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("project documentation has schema, scoped persistence and dashboard UI", () => {
  const migration = read("supabase/migrations/202607290001_add_project_documentation.sql");
  const actions = read("src/app/app/projetos/actions.js");
  const service = read("src/services/project-dashboard.js");
  const component = read("src/components/project-documentation.js");
  const dashboard = read("src/components/project-dashboard.js");

  assert.match(migration, /documentation_content text not null default ''/);
  assert.match(migration, /documentation_updated_at timestamptz/);
  assert.match(actions, /saveProjectDocumentationAction/);
  assert.match(actions, /\.eq\("workspace_id", workspaceId\)/);
  assert.match(actions, /\.eq\("slug", slug\)/);
  assert.match(actions, /sanitizeRichDocument/);
  assert.match(service, /documentation_content,documentation_updated_at/);
  assert.match(component, /Documento do projeto/);
  assert.match(component, /Abrir documento/);
  assert.match(dashboard, /<ProjectDocumentation project=\{project\}\/>/);
});

test("light sidebar follows the cream and leaf-green palette", () => {
  const css = read("src/app/theme-polish.css");

  assert.match(css, /\[data-theme="light"\] \.sidebar\{--sidebar:#eee8da/);
  assert.match(css, /background:linear-gradient\(180deg,#f2ede3 0%,#e9e2d4 100%\)/);
  assert.doesNotMatch(css, /\[data-theme="light"\] \.sidebar\{--sidebar:#f3f2fa/);
});

test("project document has a dedicated route, rich editor and contextual AI", () => {
  const shell = read("src/components/app-shell.js");
  const page = read("src/app/app/projetos/[slug]/documento/page.js");
  const editor = read("src/components/project-rich-document-editor.js");
  const aiRoute = read("src/app/api/ai/document/route.js");
  const sanitizer = read("src/lib/rich-document.js");

  assert.match(shell, /\/documento/);
  assert.match(page, /ProjectRichDocumentEditor/);
  assert.match(page, /query\?\.editar === "1"/);
  assert.match(page, /Editar documento/);
  assert.match(page, /rich-document-viewer/);
  assert.match(editor, /contentEditable/);
  assert.match(editor, /Heading1/);
  assert.match(editor, /createLink/);
  assert.match(editor, /foreColor/);
  assert.match(editor, /\/api\/ai\/document/);
  assert.match(aiRoute, /\.eq\("workspace_id", workspaceId\)/);
  assert.match(aiRoute, /\.eq\("project_id", project\.id\)/);
  assert.match(sanitizer, /script\|style\|iframe/);
});
