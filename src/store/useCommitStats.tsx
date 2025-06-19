import { create } from "zustand";
import fetchApi from "../utils/fetch-api";
import type { APIResponse, GitHubCommitStats } from "../types/apis";
import { memoize } from "proxy-memoize"; // 경량 memo 라이브러리 추천
import {
  getAverageCommits,
  getCurrentMonthCommits,
  getMaxCount,
  getMaxCountKey,
  getTotalCommits,
} from "../utils";

export interface UseCommitStats {
  commitStats?: GitHubCommitStats;
  isLoading: boolean;
  fetctCommitStats: () => Promise<void>;
}

// Selector 함수들 (computed 값)

export const selectMonthlyData = memoize((state: UseCommitStats) => {
  if (!state.commitStats?.monthlyStats) return [];

  return Object.entries(state.commitStats.monthlyStats)
    .map(([month, commits]) => ({ month, commits }))
    .sort(
      (a, b) =>
        new Date(a.month + "-01").getTime() -
        new Date(b.month + "-01").getTime()
    );
});

export const selectStats = memoize((state: UseCommitStats) => {
  if (!state.commitStats?.monthlyStats) {
    return { total: 0, average: 0, max: 0, thisMonth: 0 };
  }

  const monthlyStats = state.commitStats.monthlyStats;
  return {
    total: getTotalCommits(monthlyStats),
    average: getAverageCommits(monthlyStats),
    max: getMaxCount(monthlyStats),
    thisMonth: getCurrentMonthCommits(monthlyStats),
  };
});

export const selectLanguage = memoize((state: UseCommitStats) => {
  if (!state.commitStats?.languageStats) return "";

  const languageStats = state.commitStats.languageStats;

  return getMaxCountKey(languageStats);
});

export const useCommitStats = create<UseCommitStats>((set, get) => ({
  commitStats: undefined,
  isLoading: false,

  fetctCommitStats: async () => {
    const state = get();

    // 이미 로딩 중이면 중복 호출 방지
    if (state.isLoading) {
      return;
    }

    // 로딩 시작
    set({ isLoading: true });

    try {
      const res = await fetchApi<APIResponse<GitHubCommitStats>>(
        "/github/commits/stats"
      );

      if (res.status === "success") {
        set({
          commitStats: res.data,
        });
      }
    } finally {
      set({
        isLoading: false,
      });
    }
  },
}));
