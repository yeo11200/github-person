// GitHub 커밋 통계 데이터 타입
export interface GitHubCommitStats {
  totalCommits: number;
  repositoriesWithCommits: number;
  languageStats: {
    [language: string]: number;
  };
  dailyStats: {
    [date: string]: number; // "YYYY-MM-DD" 형식
  };
  monthlyStats: {
    [month: string]: number; // "YYYY-MM" 형식
  };
}
