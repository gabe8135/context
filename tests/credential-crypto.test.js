import test from "node:test";
import assert from "node:assert/strict";
import { decryptCredential, encryptCredential } from "../src/lib/credential-crypto.js";

const key = "a".repeat(64);

test("protege e recupera uma credencial", () => {
  const encrypted = encryptCredential("senha-secreta", key);
  assert.notEqual(encrypted, "senha-secreta");
  assert.equal(decryptCredential(encrypted, key), "senha-secreta");
});

test("não abre uma credencial com outra chave", () => {
  const encrypted = encryptCredential("senha-secreta", key);
  assert.throws(() => decryptCredential(encrypted, "b".repeat(64)));
});
