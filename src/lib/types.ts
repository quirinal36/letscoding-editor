export type ProjectFile = {
  kind: "text" | "binary" | "directory";
  content: string;
  mime: string;
  size: number;
  storagePath?: string;
};
export type Proposal = {
  id: string;
  operation: "write" | "create" | "rename" | "delete";
  path: string;
  target?: string;
  content?: string;
  file?: ProjectFile;
  requiresReview?: boolean;
  baseRevision: number;
  status: "pending" | "applied" | "rejected";
};
export type ChatMessage = {
  id: string;
  requestId?: string;
  role: "user" | "assistant";
  text: string;
  proposals: Proposal[];
  tools?: { name: string; input: unknown; output: unknown }[];
  status: "complete" | "partial" | "interrupted" | "error";
  images?: string[];
  selection?: string;
};
export type Thread = {
  id: string;
  title: string;
  autoApply: boolean;
  messages: ChatMessage[];
};
export type Deployment = {
  id: string;
  createdAt: string;
  status: "success" | "error" | "validated";
  sha256: string;
  policyVersion: string;
  url?: string;
  error?: string;
  form?: {
    title: string;
    description: string;
    category: string;
    slug: string;
    isPublished: boolean;
    isListed: boolean;
    thumbnailPath?: string;
  };
};
import type { SupabaseLink } from "./supabase-link";
export type Project = {
  id: string;
  title: string;
  template: string;
  revision: number;
  metadataRevision?: number;
  updatedAt: string;
  deletedAt?: string;
  storageBytes?: number;
  loungeId?: string;
  supabase?: SupabaseLink;
  files: Record<string, ProjectFile>;
  threads: Thread[];
  deployments: Deployment[];
};
export type SessionUser = { id: string; role: string; email?: string };
export type Usage = {
  costUsd: number;
  reservedUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  monthCostUsd?: number;
  monthReservedUsd?: number;
  promptTokens: number;
  completionTokens: number;
};
export type AppConfig = {
  demo: boolean;
  cloud: boolean;
  ai: boolean;
  image: boolean;
  deploy: boolean;
  supabaseLink: boolean;
  learningLogs?: { retentionDays: number; version: string } | null;
  models: {
    id: string;
    label: string;
    vision: boolean;
    image: boolean;
    provider?: string;
    available?: boolean;
    reason?: string;
    inputPrice?: number | null;
    outputPrice?: number | null;
  }[];
  /** Milliseconds between automatic saves while there are unsaved edits. */
  autosaveMs: number;
};
