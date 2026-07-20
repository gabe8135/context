import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const actionsPath = new URL("../src/app/app/projetos/actions.js", import.meta.url);

test("exclusão definitiva exige projeto arquivado, permissão e ausência de dependências", async () => {
  const source = await readFile(actionsPath, "utf8");
  assert.match(source, /not\("archived_at", "is", null\)/);
  assert.match(source, /\['owner', 'admin'\]\.includes\(role\)/);
  assert.match(source, /relatedItems > 0/);
  assert.match(source, /from\("projects"\)\.delete\(\)/);
});
