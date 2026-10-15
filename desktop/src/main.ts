import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, session, shell, Tray } from "electron";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdir, lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { normalizeLocalText, parseLocalCommand, type DesktopAction, type PersonalFolder } from "./commandPolicy";

const APP_URL = "https://jarvis.juninnzxtec.com.br";
const TRUSTED_ORIGIN = new URL(APP_URL).origin;
const HOTKEY = "CommandOrControl+Shift+J";
type Outcome = { handled: boolean; message?: string; error?: string };

let windowRef: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let microphoneAuthorizedUntil = 0;
let microphonePermissionGranted = false;

function trustedSender(sender: Electron.WebContents) {
  try { return new URL(sender.getURL()).origin === TRUSTED_ORIGIN; } catch { return false; }
}

function knownFolder(key: PersonalFolder) {
  return app.getPath(key);
}

async function startAllowedApp(appId: string): Promise<Outcome> {
  const known: Record<string, string> = { calculator: "calc.exe", notepad: "notepad.exe", explorer: "explorer.exe" };
  const executable = known[appId];
  if (!executable) return { handled: true, error: "Esse aplicativo não está na lista segura de abertura rápida." };
  const child = spawn(executable, [], { detached: true, stdio: "ignore", shell: false, windowsHide: true });
  child.on("error", () => undefined);
  child.unref();
  return { handled: true, message: `Abri ${appId.replaceAll("_", " ")}.` };
}

async function findStartMenuShortcut(query: string) {
  const roots = [
    path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(process.env.ProgramData ?? "C:\\ProgramData", "Microsoft", "Windows", "Start Menu", "Programs")
  ];
  const target = normalizeLocalText(query);
  const matches: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > 5 || matches.length > 100) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(full, depth + 1);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".lnk") && normalizeLocalText(path.basename(entry.name, ".lnk")) === target) matches.push(full);
    }
  }
  for (const root of roots) await walk(root, 0);
  const unique = new Map<string, string>();
  for (const shortcutPath of matches) {
    try {
      const shortcut = shell.readShortcutLink(shortcutPath);
      const identity = `${path.resolve(shortcut.target).toLocaleLowerCase("en-US")}\0${String(shortcut.args || "").trim()}`;
      if (shortcut.target && !unique.has(identity)) unique.set(identity, shortcutPath);
    } catch { /* ignora atalhos inválidos */ }
  }
  return [...unique.values()];
}

async function findRustInstall(steamExe: string) {
  const steamRoot = path.dirname(steamExe);
  const vdfPath = path.join(steamRoot, "steamapps", "libraryfolders.vdf");
  let vdf = "";
  try { vdf = await readFile(vdfPath, "utf8"); } catch { return null; }
  const libraries = new Set<string>([steamRoot]);
  for (const match of vdf.matchAll(/"path"\s*"((?:\\\\.|[^"])*)"/g)) {
    libraries.add(match[1].replace(/\\\\/g, "\\"));
  }
  for (const library of libraries) {
    const manifest = path.join(library, "steamapps", "appmanifest_252490.acf");
    const executable = path.join(library, "steamapps", "common", "Rust", "RustClient.exe");
    try {
      const [manifestInfo, gameInfo] = await Promise.all([lstat(manifest), lstat(executable)]);
      if (manifestInfo.isFile() && gameInfo.isFile()) return executable;
    } catch { /* tenta a próxima biblioteca Steam */ }
  }
  return null;
}

async function launchRust(): Promise<Outcome> {
  const shortcuts = await findStartMenuShortcut("steam");
  if (shortcuts.length !== 1) return { handled: true, error: "Não encontrei uma instalação única do Steam no Menu Iniciar." };
  let steamExe = "";
  try { steamExe = shell.readShortcutLink(shortcuts[0]).target; } catch { /* atalho inválido */ }
  if (!steamExe || path.basename(steamExe).toLowerCase() !== "steam.exe") return { handled: true, error: "O atalho do Steam não aponta para Steam.exe; não executei nada." };
  const game = await findRustInstall(steamExe);
  if (!game) return { handled: true, error: "Não encontrei o Rust instalado nas bibliotecas registradas do Steam. Confira se o jogo terminou de instalar e tente novamente." };
  const confirmation = await dialog.showMessageBox(windowRef!, { type: "question", buttons: ["Cancelar", "Abrir Rust no Steam"], defaultId: 0, cancelId: 0, title: "Confirmar abertura do jogo", message: "Abrir Rust pelo Steam?", detail: `Instalação detectada: ${game}` });
  if (confirmation.response !== 1) return { handled: true, message: "Abertura cancelada." };
  try {
    const child = spawn(steamExe, ["-applaunch", "252490"], { detached: true, stdio: "ignore", shell: false, windowsHide: false });
    child.on("error", () => undefined);
    child.unref();
    return { handled: true, message: "Enviei ao Steam o pedido para iniciar Rust. O Steam pode levar alguns segundos para abrir o jogo." };
  } catch { return { handled: true, error: "Não consegui iniciar o cliente Steam." }; }
}

async function executeLocalCommand(raw: string): Promise<Outcome> {
  const action = parseLocalCommand(raw);
  if (!action) return { handled: false };
  if (action.type === "blocked") return { handled: true, error: action.message };
  if (action.type === "launch-builtin") return startAllowedApp(action.appId);
  if (action.type === "launch-steam-game") return launchRust();
  if (action.type === "open-folder") {
    const result = await shell.openPath(knownFolder(action.folder));
    return result ? { handled: true, error: "O Windows não conseguiu abrir essa pasta." } : { handled: true, message: `Abri a pasta ${action.folder}.` };
  }
  if (action.type === "launch-shortcut") {
    const matches = await findStartMenuShortcut(action.name);
    if (matches.length !== 1) return { handled: true, error: matches.length ? "Encontrei mais de um atalho com esse nome. Abra pelo menu Iniciar e tente novamente com o nome completo." : "Não encontrei esse aplicativo/jogo pelo nome no menu Iniciar." };
    const confirmation = await dialog.showMessageBox(windowRef!, { type: "question", buttons: ["Cancelar", "Abrir aplicativo"], defaultId: 0, cancelId: 0, title: "Confirmar abertura", message: `Abrir ${action.name}?`, detail: `Atalho: ${path.basename(matches[0])}` });
    if (confirmation.response !== 1) return { handled: true, message: "Abertura cancelada." };
    const result = await shell.openPath(matches[0]);
    return result ? { handled: true, error: "O Windows não conseguiu abrir o atalho." } : { handled: true, message: `Iniciei ${action.name}.` };
  }
  if (action.type === "list-files") {
    const entries = await readdir(knownFolder(action.folder), { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && !entry.isSymbolicLink()).slice(0, 40).map((entry) => entry.name);
    const display = files.length ? files.join("\n") : "Nenhum arquivo encontrado.";
    await dialog.showMessageBox(windowRef!, { type: "info", title: `Arquivos em ${action.folder}`, message: `Mostrando até 40 arquivos diretamente nesta pasta.`, detail: display, buttons: ["Fechar"] });
    return { handled: true, message: `${files.length} arquivo(s) listado(s) em uma janela local do Windows.` };
  }
  if (action.type === "create-folder") {
    const confirmation = await dialog.showMessageBox(windowRef!, { type: "question", buttons: ["Cancelar", "Criar pasta"], defaultId: 0, cancelId: 0, title: "Confirmar criação", message: `Criar a pasta ${action.name} em ${action.folder}?` });
    if (confirmation.response !== 1) return { handled: true, message: "Criação cancelada." };
    try { await mkdir(path.join(knownFolder(action.folder), action.name)); }
    catch (error) { return { handled: true, error: error instanceof Error && "code" in error && error.code === "EEXIST" ? "Já existe uma pasta com esse nome." : "Não foi possível criar a pasta." }; }
    return { handled: true, message: `Criei a pasta ${action.name}.` };
  }
  if (action.type === "create-text") {
    const destination = path.join(knownFolder(action.folder), action.name);
    const confirmation = await dialog.showMessageBox(windowRef!, { type: "question", buttons: ["Cancelar", "Criar arquivo"], defaultId: 0, cancelId: 0, title: "Confirmar criação no computador", message: `Criar ${action.name} em ${action.folder}?`, detail: `Conteúdo: ${action.content.slice(0, 120)}` });
    if (confirmation.response !== 1) return { handled: true, message: "Criação cancelada." };
    try { await writeFile(destination, `${action.content}\n`, { flag: "wx", encoding: "utf8" }); }
    catch { return { handled: true, error: "O arquivo já existe ou o Windows não permitiu criá-lo. Nenhum arquivo foi substituído." }; }
    return { handled: true, message: `Criei ${action.name}.` };
  }
  if (action.type === "edit-text") {
    const target = path.join(knownFolder(action.folder), action.name);
    let info;
    try { info = await lstat(target); } catch { return { handled: true, error: "Não encontrei o arquivo .txt na pasta informada." }; }
    if (!info.isFile() || info.size > 1_000_000) return { handled: true, error: "O arquivo não é um .txt regular ou excede 1 MB; não alterei nada." };
    const currentContent = await readFile(target, "utf8");
    const backup = `${target}.jarvis-backup-${Date.now()}.bak`;
    const temporary = `${target}.jarvis-${randomUUID()}.tmp`;
    const confirmation = await dialog.showMessageBox(windowRef!, { type: "warning", buttons: ["Cancelar", "Salvar edição"], defaultId: 0, cancelId: 0, title: "Confirmar edição de arquivo", message: `Substituir o conteúdo de ${action.name}?`, detail: `Conteúdo atual: ${currentContent.slice(0, 500)}\n\nNovo conteúdo: ${action.content.slice(0, 500)}\n\nUma cópia .bak do original será criada na mesma pasta.` });
    if (confirmation.response !== 1) return { handled: true, message: "Edição cancelada." };
    try {
      await writeFile(backup, currentContent, { flag: "wx", encoding: "utf8" });
      await writeFile(temporary, `${action.content}\n`, { flag: "wx", encoding: "utf8" });
      await rename(temporary, target);
    } catch {
      try { await unlink(temporary); } catch { /* arquivo temporário não existe */ }
      return { handled: true, error: `Não consegui salvar com segurança. O original permanece; se a cópia foi criada, ela está em ${path.basename(backup)}.` };
    }
    return { handled: true, message: `Atualizei ${action.name}; o original foi preservado em ${path.basename(backup)}.` };
  }
  if (action.type === "delete-file") {
    const target = path.join(knownFolder(action.folder), action.name);
    let info;
    try { info = await lstat(target); } catch { return { handled: true, error: "Não encontrei esse arquivo na pasta informada." }; }
    if (!info.isFile()) return { handled: true, error: "Por segurança, o JARVIS não remove pastas, links ou executáveis." };
    const confirmation = await dialog.showMessageBox(windowRef!, { type: "warning", buttons: ["Cancelar", "Mover para a Lixeira"], defaultId: 0, cancelId: 0, title: "Confirmar exclusão", message: `Mover ${action.name} para a Lixeira?`, detail: `Destino: ${action.folder}` });
    if (confirmation.response !== 1) return { handled: true, message: "Exclusão cancelada." };
    try { await shell.trashItem(target); } catch { return { handled: true, error: "O Windows não conseguiu mover esse arquivo para a Lixeira." }; }
    return { handled: true, message: `${action.name} foi movido para a Lixeira do Windows.` };
  }
  if (action.type === "open-file") {
    const target = path.join(knownFolder(action.folder), action.name);
    let info;
    try { info = await lstat(target); } catch { return { handled: true, error: "Não encontrei esse arquivo na pasta informada." }; }
    const extension = path.extname(action.name).toLowerCase();
    const safeExtensions = new Set([".txt", ".md", ".bak", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp3", ".wav", ".mp4", ".zip"]);
    if (!info.isFile() || !safeExtensions.has(extension)) return { handled: true, error: "Só posso abrir documentos e mídias comuns, não atalhos, páginas web, scripts ou executáveis." };
    const confirmation = await dialog.showMessageBox(windowRef!, { type: "question", buttons: ["Cancelar", "Abrir arquivo"], defaultId: 0, cancelId: 0, title: "Confirmar abertura", message: `Abrir ${action.name} no aplicativo associado?`, detail: `Pasta: ${action.folder}` });
    if (confirmation.response !== 1) return { handled: true, message: "Abertura cancelada." };
    const result = await shell.openPath(target);
    return result ? { handled: true, error: "O Windows não encontrou um aplicativo associado a esse arquivo." } : { handled: true, message: `Abri ${action.name} no aplicativo associado.` };
  }
  const exhaustive: never = action satisfies DesktopAction;
  return { handled: true, error: `Ação não suportada: ${String(exhaustive)}` };
}

function showAssistant() {
  if (!windowRef) return;
  if (windowRef.isMinimized()) windowRef.restore();
  windowRef.show();
  windowRef.focus();
}

function createWindow() {
  windowRef = new BrowserWindow({
    width: 880, height: 760, minWidth: 380, minHeight: 540, show: false,
    title: "JARVIS 2.0 Desktop", backgroundColor: "#050816", autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  windowRef.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  windowRef.webContents.on("will-navigate", (event, url) => {
    try { if (new URL(url).origin !== TRUSTED_ORIGIN) event.preventDefault(); } catch { event.preventDefault(); }
  });
  windowRef.webContents.on("will-redirect", (event, url) => {
    try { if (new URL(url).origin !== TRUSTED_ORIGIN) event.preventDefault(); } catch { event.preventDefault(); }
  });
  windowRef.on("close", (event) => {
    if (!quitting) { event.preventDefault(); windowRef?.hide(); }
  });
  void windowRef.loadURL(APP_URL);
  windowRef.once("ready-to-show", () => windowRef?.show());
}

function createTray() {
  const icon = readFileSync(path.resolve(__dirname, "../assets/jarvis.png"));
  tray = new Tray(nativeImage.createFromBuffer(icon));
  tray.setToolTip("JARVIS Desktop — Ctrl+Shift+J para abrir");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir JARVIS", click: showAssistant },
    { label: `Atalho: ${HOTKEY}`, enabled: false },
    { type: "separator" },
    { label: "Sair", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("click", showAssistant);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return Boolean(webContents && trustedSender(webContents)) && requestingOrigin === TRUSTED_ORIGIN && permission === "media" && (microphonePermissionGranted || Date.now() < microphoneAuthorizedUntil);
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const trusted = trustedSender(webContents) && ("isMainFrame" in details ? details.isMainFrame : false);
    const mediaTypes = "mediaTypes" in details ? details.mediaTypes ?? [] : [];
    const audioOnly = permission === "media" && mediaTypes.includes("audio") && !mediaTypes.includes("video");
    const allowed = trusted && audioOnly && Date.now() < microphoneAuthorizedUntil;
    if (allowed) { microphoneAuthorizedUntil = 0; microphonePermissionGranted = true; }
    callback(allowed);
  });
  ipcMain.handle("jarvis:show-assistant", (event) => {
    if (!trustedSender(event.sender) || event.senderFrame !== event.sender.mainFrame) return false;
    showAssistant();
    return true;
  });
  ipcMain.handle("jarvis:authorize-microphone", (event) => {
    if (!trustedSender(event.sender) || event.senderFrame !== event.sender.mainFrame) return false;
    microphoneAuthorizedUntil = Date.now() + 60_000;
    return true;
  });
  ipcMain.handle("jarvis:local-command", (event, text: unknown) => {
    if (!trustedSender(event.sender) || event.senderFrame !== event.sender.mainFrame) return { handled: true, error: "Origem não autorizada." } satisfies Outcome;
    return executeLocalCommand(typeof text === "string" ? text : "");
  });
  createWindow();
  createTray();
  if (!globalShortcut.register(HOTKEY, showAssistant)) dialog.showErrorBox("Atalho indisponível", `Não foi possível registrar ${HOTKEY}.`);
  app.on("activate", showAssistant);
});

app.on("will-quit", () => globalShortcut.unregisterAll());
