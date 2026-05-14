export type User = { id: string; name: string; email: string; role: string };
export type ApiList<T, K extends string> = Record<K, T[]>;
export type Task = { id: string; title: string; description?: string; status: string; priority: string; dueDate?: string; createdAt: string };
export type Memory = { id: string; type: string; title: string; content: string; tags: string[]; importance: number; createdAt: string };
export type Automation = { id: string; name: string; description?: string; actionType: string; triggerType: string; enabled: boolean; config: Record<string, unknown> };
export type SystemLog = { id: string; level: string; module: string; action: string; message: string; createdAt: string };
export type Message = { id: string; role: "user" | "assistant" | "system" | "tool"; content: string; createdAt: string };
export type Conversation = { id: string; title: string; messages?: Message[]; createdAt: string; updatedAt: string };
