import { z } from "zod";

export const planSchema = z.object({
  decision: z.enum(["execute", "blocked", "approval_required"]),
  taskId: z.string().regex(/^[A-Z]+-\d{3}$/).nullable(),
  objective: z.string().min(1).max(500),
  instructions: z.string().max(5000),
  acceptanceCriteria: z.array(z.string().min(1).max(300)).max(10),
  risk: z.enum(["low", "medium", "high"]),
  reason: z.string().max(1000)
}).strict().superRefine((plan, context) => {
  if (plan.decision === "execute" && !plan.taskId) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "A execução exige um taskId." });
  }
  if (plan.decision !== "execute" && plan.taskId !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Uma decisão bloqueada não pode apontar uma tarefa executável." });
  }
});

export const reviewSchema = z.object({
  decision: z.enum(["continue", "stop", "approval_required"]),
  summary: z.string().min(1).max(1500),
  findings: z.array(z.string().min(1).max(500)).max(20),
  testsPassed: z.boolean(),
  approvalReason: z.string().max(1000)
}).strict();

export type PlannedTask = z.infer<typeof planSchema>;
export type CycleReview = z.infer<typeof reviewSchema>;

export type EligibleTask = {
  id: string;
  priority: string;
  dependencies: string[];
  scope: string;
  status: string;
};

export type CycleInput = {
  task: EligibleTask;
  objective: string;
  instructions: string;
  acceptanceCriteria: string[];
  developerReport: string;
  gitDiffStat: string;
  gitDiff: string;
  tests: string;
  testsPassed: boolean;
};

export type ValidationRun = { passed: boolean; evidence: string };

export type AgentSyncProviders = {
  plan: (context: string) => Promise<PlannedTask>;
  develop: (task: PlannedTask) => Promise<string>;
  test: () => Promise<ValidationRun>;
  diffStat: () => Promise<string>;
  diff: () => Promise<string>;
  review: (input: CycleInput) => Promise<CycleReview>;
};

export type CycleRecord = {
  runId: string;
  taskId: string;
  result: "reviewed_continue" | "blocked" | "approval_required" | "validation_failed" | "no_changes" | "review_rejected";
  summary: string;
  findings: string[];
  testsPassed: boolean;
  completedAt: string;
};
