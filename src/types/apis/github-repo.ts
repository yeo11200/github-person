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

// AI 요약 API 응답 타입 정의
export type SummaryData = {
  id: string;
  repository_id: string;
  branch_name: string;
  project_intro: string;
  tech_stack: {
    frontend: string[];
    backend: string[];
    database: string[];
    devops: string[];
    testing: string[];
    other: string[];
  };
  refactoring_history: string;
  collaboration_flow: string;
  resume_bullets: string[];
  performance_metrics: {
    prs_analyzed: number;
    top_languages: Array<{
      language: string;
      file_count: number;
      percentage: number;
    }>;
    files_analyzed: number;
    branch_languages: number;
    commits_analyzed: number;
    branch_total_files: number;
  };
  created_at: string;
  updated_at: string;
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
};
