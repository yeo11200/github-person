import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import fetchApi from "../utils/fetch-api";
import type { APIResponse, RepositorySummaryData } from "../types/apis";

/**
 * @interface MyAgentState
 * @description 내 GitHub 에이전트 데이터의 상태를 정의합니다.
 * @property {RepositorySummaryData | null} data - 저장소 요약 데이터입니다.
 * @property {boolean} loading - 데이터 로딩 상태를 나타냅니다.
 * @property {string | null} error - 발생한 에러 메시지입니다.
 */
export interface MyAgentState {
  data: RepositorySummaryData | null;
  loading: boolean;
  error: string | null;
}

/**
 * @interface MyAgentActions
 * @description 내 에이전트 상태와 관련된 액션을 정의합니다.
 * @property {() => Promise<void>} fetchMyData - 내 GitHub 데이터를 비동기적으로 가져옵니다.
 * @property {() => void} reset - 상태를 초기값으로 리셋합니다.
 */
export interface MyAgentActions {
  fetchMyData: () => Promise<void>;
  reset: () => void;
}

/**
 * @type MyAgentStore
 * @description MyAgentState와 MyAgentActions를 결합한 전체 스토어 타입입니다.
 */
export type MyAgentStore = MyAgentState & MyAgentActions;

/**
 * @const initialMyAgentState
 * @description MyAgent 스토어의 초기 상태입니다.
 */
export const initialMyAgentState: MyAgentState = {
  data: null,
  loading: false,
  error: null,
};

/**
 * @function createMyAgentSlice
 * @description MyAgent 스토어의 슬라이스를 생성하는 StateCreator 함수입니다.
 * @param {Function} set - Zustand의 set 함수.
 * @returns {MyAgentStore} MyAgent 스토어의 구현.
 */
const createMyAgentSlice: StateCreator<
  MyAgentStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  MyAgentStore
> = (set) => ({
  ...initialMyAgentState,

  /**
   * @function fetchMyData
   * @description GitHub API를 통해 내 저장소 요약 데이터를 가져옵니다.
   * 로딩 및 에러 상태를 관리합니다.
   */
  fetchMyData: async () => {
    set(
      (state) => {
        state.loading = true;
        state.error = null;
      },
      false,
      "fetchMyData/pending"
    );

    try {
      const res = await fetchApi<APIResponse<RepositorySummaryData>>(
        "/github/my"
      );

      if (res.status === "success") {
        set(
          (state) => {
            state.data = res.data;
            state.loading = false;
          },
          false,
          "fetchMyData/fulfilled"
        );
      } else {
        throw new Error(res.message || "데이터를 가져오는데 실패했습니다.");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      set(
        (state) => {
          state.loading = false;
          state.error = errorMessage;
        },
        false,
        "fetchMyData/rejected"
      );
    }
  },

  /**
   * @function reset
   * @description 스토어의 상태를 초기 상태로 리셋합니다.
   */
  reset: () => {
    set(initialMyAgentState, false, "reset");
  },
});

/**
 * @const useMyAgentStore
 * @description 내 GitHub 에이전트 데이터를 관리하는 Zustand 스토어입니다.
 * devtools와 immer 미들웨어가 적용되었습니다.
 */
export const useMyAgentStore = create<MyAgentStore>()(
  devtools(immer(createMyAgentSlice), { name: "MyAgentStore" })
);

// --- 선택적 구독을 위한 Hooks ---

/**
 * @function useMyAgentData
 * @description 저장소 요약 데이터만 구독하는 훅입니다.
 * @returns {RepositorySummaryData | null} 저장소 요약 데이터.
 */
export const useMyAgentData = (): RepositorySummaryData | null =>
  useMyAgentStore((state) => state.data);

/**
 * @function useMyAgentStatus
 * @description 데이터 로딩 상태와 에러 메시지를 구독하는 훅입니다.
 * `useShallow`를 사용하여 불필요한 리렌더링을 방지합니다.
 * @returns {{ loading: boolean; error: string | null }} 로딩 상태와 에러 객체.
 */
export const useMyAgentStatus = () =>
  useMyAgentStore(
    useShallow((state) => ({
      loading: state.loading,
      error: state.error,
    }))
  );

/**
 * @function useMyAgentActions
 * @description 스토어의 액션 함수들을 반환하는 훅입니다.
 * `useShallow`를 사용하여 액션 객체의 참조 안정성을 보장하고, 자식 컴포넌트의 불필요한 리렌더링을 방지합니다.
 * @returns {MyAgentActions} 스토어 액션 객체.
 */
export const useMyAgentActions = (): MyAgentActions =>
  useMyAgentStore(
    useShallow((state) => ({
      fetchMyData: state.fetchMyData,
      reset: state.reset,
    }))
  );
