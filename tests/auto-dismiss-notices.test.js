import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const notices = readFileSync(new URL("../src/components/auto-dismiss-notices.js", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/app-shell.js", import.meta.url), "utf8");

test("mensagens temporarias desaparecem e deixam de persistir na URL", () => {
  assert.match(notices, /setTimeout/);
  assert.match(notices, /notice-leaving/);
  assert.match(notices, /url\.searchParams\.delete\(key\)/);
  assert.match(notices, /history\.replaceState/);
  assert.match(shell, /<AutoDismissNotices\/>/);
});
