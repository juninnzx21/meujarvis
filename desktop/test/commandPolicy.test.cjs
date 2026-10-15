const test = require("node:test");
const assert = require("node:assert/strict");
const { parseLocalCommand, safeLocalName } = require("../dist/commandPolicy.js");

test("recognizes only explicit built-in apps and known folders", () => {
  assert.deepEqual(parseLocalCommand("Jarvis, abra a calculadora"), { type: "launch-builtin", appId: "calculator" });
  assert.deepEqual(parseLocalCommand("abra pasta Documentos"), { type: "open-folder", folder: "documents" });
  assert.equal(parseLocalCommand("abra o terminal e rode qualquer comando")?.type, "blocked");
});

test("recognizes natural Steam and Rust launch requests without shell commands", () => {
  assert.deepEqual(parseLocalCommand("Jarvis, abra o Steam"), { type: "launch-shortcut", name: "steam" });
  assert.deepEqual(parseLocalCommand("abre o jogo Rust"), { type: "launch-steam-game", game: "rust" });
  assert.deepEqual(parseLocalCommand("Jarvis, iniciar Rust"), { type: "launch-steam-game", game: "rust" });
  assert.equal(parseLocalCommand("abra o terminal e execute format C:")?.type, "blocked");
});

test("requires a target and confines create/delete to safe names and known folders", () => {
  assert.deepEqual(parseLocalCommand("crie pasta Relatorios em Documentos"), { type: "create-folder", folder: "documents", name: "relatorios" });
  assert.equal(parseLocalCommand("exclua arquivo notas.txt em Downloads")?.type, "delete-file");
  assert.equal(parseLocalCommand("apague tudo no C:\\Windows")?.type, "blocked");
  assert.equal(safeLocalName("..\\autorun.inf"), null);
  assert.equal(safeLocalName("CON.txt"), null);
  assert.equal(safeLocalName("nota.txt", ".txt"), "nota.txt");
});

test("does not replace an existing file and supports user-approved text creation", () => {
  assert.deepEqual(parseLocalCommand("crie arquivo resumo.txt em Documentos com conteúdo Olá JARVIS"), {
    type: "create-text", folder: "documents", name: "resumo.txt", content: "Olá JARVIS"
  });
  assert.equal(parseLocalCommand("mostre o clima de hoje"), null);
  assert.equal(parseLocalCommand("edite arquivo notas.txt em Documentos com conteúdo Texto revisado")?.type, "edit-text");
});
