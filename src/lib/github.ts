export type GitHubRepository = {
  id: number;
  installationId: number;
  owner: string;
  name: string;
  defaultBranch: string;
  private: boolean;
  canPush: boolean;
};
export type GitHubLink = GitHubRepository & {
  githubUserId: number;
  branch: string;
  baseSha: string;
  files: Record<string, { sha: string; mode: string }>;
};
export type GitHubChange = {
  path: string;
  kind: "added" | "modified" | "deleted";
};
export type GitHubStatus = {
  enabled: boolean;
  connected: boolean;
  login?: string;
  installUrl?: string;
  link?: Omit<GitHubLink, "files">;
  changes?: GitHubChange[];
  remoteAhead?: boolean;
  canPull?: boolean;
  revision?: number;
  head?: string;
  version?: string;
  ignoredCount?: number;
};
