import { create } from "zustand";
import fetchApi from "../utils/fetch-api";
import type { APIResponse, RepositorySummaryData } from "../types/apis";

export interface UseMyAgent {
  myData: RepositorySummaryData;
  fetchMyData: () => void;
}

export const useMyAgent = create<UseMyAgent>((set) => ({
  myData: {
    count: 0,
    monthCount: 0,
    repositorySummary: [],
    removeDuplicatesSummary: 0,
    create_at: "",
  } as RepositorySummaryData,
  fetchMyData: async () => {
    const res = await fetchApi<APIResponse<RepositorySummaryData>>(
      "/github/my"
    );

    if (res.status === "success") {
      set({ myData: res.data });
    }
  },
}));
