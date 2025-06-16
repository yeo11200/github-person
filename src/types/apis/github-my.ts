export interface RepositorySummaryItem {
  name: string; // 레포지토리 이름
  language: string; // 주요 언어
  owner: string; // 소유자
  updated_at: string; // 마지막 업데이트 시간
  description: string | null; // 설명 (null 가능)
  created_at: string; // 생성 시간
}

export interface RepositorySummaryData {
  count: number; // 전체 레포지토리 수
  monthCount: number; // 이번 달 레포지토리 수
  repositorySummary: RepositorySummaryItem[]; // 레포지토리 목록
  removeDuplicatesSummary: number; // 중복 제거된 수
  create_at: string;
}
