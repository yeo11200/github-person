import { create } from "zustand";
import fetchApi from "../utils/fetch-api";
import type { APIResponse, GitHubCommitStats } from "../types/apis";

export interface UseCommitStats {
  commitStats?: GitHubCommitStats;
  isLoading: boolean;
  fetctCommitStats: () => Promise<void>;
}

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
