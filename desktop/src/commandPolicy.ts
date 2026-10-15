export type PersonalFolder = "documents" | "downloads" | "desktop" | "pictures" | "music" | "videos";

export type DesktopAction =
  | { type: "launch-builtin"; appId: "calculator" | "notepad" | "explorer" }
  | { type: "launch-steam-game"; game: "rust" }
  | { type: "open-folder"; folder: PersonalFolder }
  | { type: "launch-shortcut"; name: string }
  | { type: "list-files"; folder: PersonalFolder }
  | { type: "create-folder"; folder: PersonalFolder; name: string }
  | { type: "create-text"; folder: "documents" | "downloads" | "desktop"; name: string; content: string }
  | { type: "edit-text"; folder: "documents" | "downloads" | "desktop"; name: string; content: string }
  | { type: "delete-file"; folder: PersonalFolder; name: string }
  | { type: "open-file"; folder: PersonalFolder; name: string }
  | { type: "blocked"; message: string };

export function normalizeLocalText(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[,!?;:]/g, " ").replace(/\s+/g, " ").trim().replace(/^jarvis[, ]*/, "").replace(/[.]+$/, "").trim();
}

export function safeLocalName(value: string, extension?: string) {
  const name = value.trim();
  if (!name || name.length > 100 || name === "." || name === ".." || /[\\/:*?"<>|\u0000-\u001f]/.test(name) || /[. ]$/.test(name)) return null;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(name)) return null;
  if (extension && !name.toLowerCase().endsWith(extension)) return null;
  return name;
}

export function folderKey(value: string): PersonalFolder | null {
  const key = normalizeLocalText(value);
  const aliases: Record<string, PersonalFolder> = {
    documentos: "documents", documento: "documents", documents: "documents",
    downloads: "downloads", baixados: "downloads", desktop: "desktop", "area de trabalho": "desktop", mesa: "desktop",
    imagens: "pictures", fotos: "pictures", pictures: "pictures", musicas: "music", musica: "music",
    videos: "videos", video: "videos"
  };
  return aliases[key] ?? null;
}

export function parseLocalCommand(raw: string): DesktopAction | null {
  if (typeof raw !== "string" || raw.length < 2 || raw.length > 500) return { type: "blocked", message: "O comando local deve ter entre 2 e 500 caracteres." };
  const text = normalizeLocalText(raw);
  const builtin = text.match(/^(?:abra|abrir|abre|inicie|iniciar|execute|executar) (?:o |a )?(?:aplicativo )?(calculadora|calculator|bloco de notas|notepad|explorador de arquivos|explorador|explorer)$/);
  if (builtin) {
    const appId = /calculadora|calculator/.test(builtin[1]) ? "calculator" : /notepad|bloco/.test(builtin[1]) ? "notepad" : "explorer";
    return { type: "launch-builtin", appId };
  }
  const launchNamed = text.match(/^(?:abra|abrir|abre|inicie|iniciar|execute|executar) (?:o |a )?(?:jogo |aplicativo |programa )?(.{2,80})$/);
  if (launchNamed && /\b(?:e\s+(?:rode|rodar|execute|executar|apague|apagar)|comando|powershell|cmd(?:\.exe)?|format\s+[a-z]:)\b/.test(launchNamed[1])) {
    return { type: "blocked", message: "Posso abrir um aplicativo pelo nome, mas não executo comandos nem sequências de terminal." };
  }
  if (launchNamed && /^(?:rust|rust game|jogo rust)$/.test(launchNamed[1].trim())) {
    return { type: "launch-steam-game", game: "rust" };
  }
  const openFolder = text.match(/^(?:abra|abrir|abre|mostre|mostrar) (?:a )?(?:pasta |diretorio |local )?(documentos|downloads|desktop|area de trabalho|mesa|imagens|fotos|musicas|videos)$/);
  if (openFolder) return { type: "open-folder", folder: folderKey(openFolder[1])! };
  if (launchNamed) return { type: "launch-shortcut", name: launchNamed[1].trim() };
  const listFiles = text.match(/^(?:liste|listar|mostre|mostrar) arquivos (?:da pasta )?(documentos|downloads|desktop|area de trabalho|imagens|fotos|musicas|videos)$/);
  if (listFiles) return { type: "list-files", folder: folderKey(listFiles[1])! };
  const createFolder = text.match(/^crie (?:uma )?pasta (.{1,80}) em (documentos|downloads|desktop|area de trabalho|imagens|fotos|musicas|videos)$/);
  if (createFolder) {
    const name = safeLocalName(createFolder[1]);
    const folder = folderKey(createFolder[2]);
    return name && folder ? { type: "create-folder", folder, name } : { type: "blocked", message: "Nome ou destino inválido. Use apenas pastas pessoais conhecidas." };
  }
  const createText = text.match(/^crie (?:um )?arquivo (.{1,80}\.txt) em (documentos|downloads|desktop|area de trabalho) com conteudo (.{1,400})$/);
  if (createText) {
    const originalContent = raw.trim().match(/^(?:jarvis[, ]*)?crie (?:um )?arquivo .{1,80}\.txt em (?:documentos|downloads|desktop|área de trabalho|area de trabalho) com conte[uú]do (.{1,400})$/i)?.[1]?.replace(/[.!?]$/, "");
    const name = safeLocalName(createText[1], ".txt");
    const folder = folderKey(createText[2]);
    return name && folder && ["documents", "downloads", "desktop"].includes(folder)
      ? { type: "create-text", folder: folder as "documents" | "downloads" | "desktop", name, content: originalContent ?? createText[3] }
      : { type: "blocked", message: "Arquivo inválido. Posso criar arquivos .txt apenas nas pastas Documentos, Downloads ou Área de Trabalho." };
  }
  const editText = text.match(/^edite arquivo (.{1,80}\.txt) em (documentos|downloads|desktop|area de trabalho) com conteudo (.{1,400})$/);
  if (editText) {
    const originalContent = raw.trim().match(/^(?:jarvis[, ]*)?edite arquivo .{1,80}\.txt em (?:documentos|downloads|desktop|área de trabalho|area de trabalho) com conte[uú]do (.{1,400})$/i)?.[1]?.replace(/[.!?]$/, "");
    const name = safeLocalName(editText[1], ".txt");
    const folder = folderKey(editText[2]);
    return name && folder && ["documents", "downloads", "desktop"].includes(folder)
      ? { type: "edit-text", folder: folder as "documents" | "downloads" | "desktop", name, content: originalContent ?? editText[3] }
      : { type: "blocked", message: "Arquivo inválido. Posso editar apenas arquivos .txt em pastas pessoais conhecidas." };
  }
  const deleteFile = text.match(/^exclua arquivo (.{1,100}) em (documentos|downloads|desktop|area de trabalho|imagens|fotos|musicas|videos)$/);
  if (deleteFile) {
    const name = safeLocalName(deleteFile[1]);
    const folder = folderKey(deleteFile[2]);
    return name && folder ? { type: "delete-file", folder, name } : { type: "blocked", message: "Nome ou pasta inválidos. Só posso mandar um arquivo de uma pasta pessoal conhecida para a Lixeira." };
  }
  const openFile = text.match(/^(?:abra|abrir|abre|edite|editar) arquivo (.{1,100}) em (documentos|downloads|desktop|area de trabalho|imagens|fotos|musicas|videos)$/);
  if (openFile) {
    const name = safeLocalName(openFile[1]);
    const folder = folderKey(openFile[2]);
    return name && folder ? { type: "open-file", folder, name } : { type: "blocked", message: "Nome ou pasta inválidos." };
  }
  if (/\b(apague|apagar|exclua|excluir|delete|remova|remover)\b/.test(text)) {
    return { type: "blocked", message: "Especifique o nome do arquivo e uma pasta pessoal. Exemplo: 'Jarvis, exclua arquivo notas.txt em Documentos'. O Windows pedirá confirmação." };
  }
  if (/\b(abra|abrir|abre|inicie|iniciar|execute|executar|crie|criar|edite|editar|liste|listar)\b/.test(text)) {
    return { type: "blocked", message: "Não reconheci essa ação. Posso abrir apps conhecidos, atalhos do menu Iniciar e pastas pessoais, criar pastas/arquivos de texto e abrir ou mandar arquivos para a Lixeira." };
  }
  return null;
}
