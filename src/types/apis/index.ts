export interface APIResponse<T> {
  status: string;
  data: T;
  message?: string;
}
export * from "./github-repo"; // 또는 "githubRepo"
export * from "./github-my";
export * from "./github-commit";
