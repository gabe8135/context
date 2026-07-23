import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../src/app/app/page.js", import.meta.url), "utf8");

test("home oculta hoje e atrasados quando não há conteúdo", () => {
  assert.match(home, /today\.length > 0 \|\| overdue\.length > 0/);
  assert.match(home, /today\.length > 0 && <FocusList/);
  assert.match(home, /overdue\.length > 0 && <FocusList/);
});

test("tarefas da home podem ser concluídas por Server Action", () => {
  assert.match(home, /toggleTaskAction\.bind/);
  assert.match(home, /aria-label={`Marcar \$\{task\.title\} como concluída`}/);
});
