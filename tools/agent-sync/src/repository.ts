import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { EligibleTask } from "./contracts.js";

const execFileAsync = promisify(execFile);
const stateSchema = z.object({
  tasks: z.array(z.object({ id: z.string(), status: z.string() })),
  activeTaskId: z.string().nullable().optional(),
  nextTaskId: z.string().nullable().optional()
}).passthrough();
const taskIdPattern = /^[A-Z]+-\d{3}$/;

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function parseAgentState(input: unknown) {
  return stateSchema.parse(input);
}

export function gitExecutable() {
  return process.env.JARVIS_AGENT_SYNC_GIT_EXECUTABLE?.trim() || (process.platform === "win32" ? "git.exe" : "git");
}

export async function readTaskContext(root = repositoryRoot) {
  const [plan, progress, stateText, branch, sha, status] = await Promise.all([
    readFile(path.join(root, "JARVIS_MASTER_PLAN.md"), "utf8"),
    readFile(path.join(root, "JARVIS_PROGRESS.md"), "utf8"),
    readFile(path.join(root, "docs/jarvis/STATE.json"), "utf8"),
    git(root, ["branch", "--show-current"]),
    git(root, ["rev-parse", "--short", "HEAD"]),
    git(root, ["status", "--short"])
  ]);
  const state = parseAgentState(JSON.parse(stateText));
  const statusById = new Map(state.tasks.map((task) => [task.id, task.status]));
  const eligibleTasks = parseBacklog(plan)
    .filter((task) => ["TODO", "READY"].includes(statusById.get(task.id) ?? ""))
    .filter((task) => task.dependencies.every((dependency) => statusById.get(dependency) === "DONE_VERIFIED"));

  const progressHeadings = progress.split(/\r?\n/).filter((line) => /^#{1,3}\s/.test(line)).slice(-20).join("\n");
  const compactState = state.tasks.map((task) => `${task.id}=${task.status}`).join("\n");
  const context = [
    "Plano mestre JARVIS (fonte local):",
    plan,
    "Títulos recentes do progresso (sem detalhes operacionais):",
    progressHeadings,
    "Estado resumido:",
    compactState,
    `Tarefa ativa: ${state.activeTaskId ?? "nenhuma"}; próxima: ${state.nextTaskId ?? "não definida"}.`,
    `Branch atual: ${branch}; commit: ${sha}; árvore ${status ? "tem alterações" : "limpa"}.`,
    "Tarefas elegíveis calculadas localmente:",
    JSON.stringify(eligibleTasks)
  ].join("\n\n");
  return { text: context, eligibleTasks, branch, sha, dirty: Boolean(status) };
}

export function parseBacklog(markdown: string): EligibleTask[] {
  const tasks: EligibleTask[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim().replaceAll("`", ""));
    if (cells.length !== 5 || !taskIdPattern.test(cells[0])) continue;
    const dependencies = cells[2] === "—" ? [] : cells[2].match(/[A-Z]+-\d{3}/g) ?? [];
    if (cells[2] !== "—" && dependencies.length === 0) continue;
    tasks.push({
      id: cells[0],
      priority: cells[1],
      dependencies,
      scope: cells[3],
      status: cells[4]
    });
  }
  return tasks;
}

export async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(gitExecutable(), args, { cwd: root, timeout: 10_000, windowsHide: true });
  return stdout.trim();
}
