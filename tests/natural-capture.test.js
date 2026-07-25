import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const capture = readFileSync(new URL("../src/components/natural-capture.js", import.meta.url), "utf8");
const actions = readFileSync(new URL("../src/app/app/organizar/actions.js", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/components/project-dashboard.js", import.meta.url), "utf8");

test("captura natural analisa e revisa sugestoes sem abandonar a pagina", () => {
  assert.match(capture, /fetch\("\/api\/ai\/organize"/);
  assert.match(capture, /Sugest/);
  assert.match(capture, /createPortal\(modal, document\.body\)/);
  assert.doesNotMatch(capture, /router\.push\("\/app\/organizar/);
});

test("confirmacao do modal persiste os itens selecionados", () => {
  assert.match(capture, /saveOrganizedItemsAction\(\{ projectId, items: selected \}\)/);
  assert.match(actions, /export async function saveOrganizedItemsAction/);
  assert.match(actions, /await persistOrganizedItems/);
  assert.match(actions, /revalidatePath\("\/app"\)/);
});

test("captura respeita contexto pessoal ou de projeto", () => {
  assert.match(capture, /project_id: projectId/);
  assert.match(actions, /Na agenda pessoal confirme somente tarefas e notas/);
  assert.match(actions, /resolveProject/);
});

test("painel sincroniza os dados recarregados depois do salvamento", () => {
  assert.match(dashboard, /useEffect\(\(\) => \{\s*setTasks\(project\.tasks\)/);
  assert.match(capture, /router\.refresh\(\)/);
  assert.match(capture, /capture-save-success/);
});
