export interface GitHubReposResponse {
  status: string;
  data: Repository[];
  message?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
  owner: {
    login: string;
  };
}

export interface GitHubBranchResponse {
  status: string;
  data: Branch;
  message?: string;
}

export type Branch = string[];

// GitHub API Repository interface that matches the actual response
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  clone_url: string;
  html_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}
