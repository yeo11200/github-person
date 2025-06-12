import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import fetchApi from "../utils/fetch-api";
import { useAuth } from "./AuthContext";
import type {
  GitHubReposResponse,
  Repository,
} from "../types/apis/github-repo";

interface RepositoryContextType {
  repositories: Repository[];
  loading: boolean;
  error: string;
  repoCount: number;
  fetchRepositories: () => Promise<void>;
  refreshRepositories: () => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(
  undefined
);

interface RepositoryProviderProps {
  children: ReactNode;
}

export const RepositoryProvider: React.FC<RepositoryProviderProps> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // 레포지토리 가져오기
  const fetchRepositories = useCallback(async () => {
    if (!isAuthenticated) {
      setRepositories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetchApi<GitHubReposResponse>("/github/repos", {
        method: "GET",
      });

      if (response.status === "success") {
        setRepositories(response.data);
      } else {
        setError(response.message || "레포지토리를 불러오는데 실패했습니다.");
        setRepositories([]);
      }
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      setError(
        error instanceof Error
          ? error.message
          : "레포지토리를 불러오는데 실패했습니다."
      );
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 레포지토리 새로고침
  const refreshRepositories = useCallback(async () => {
    await fetchRepositories();
  }, [fetchRepositories]);

  // 인증 상태 변경 시 레포지토리 가져오기
  useEffect(() => {
    if (isAuthenticated) {
      fetchRepositories();
    } else {
      setRepositories([]);
      setError("");
    }
  }, [isAuthenticated, fetchRepositories]);

  const value: RepositoryContextType = {
    repositories,
    loading,
    error,
    repoCount: repositories.length,
    fetchRepositories,
    refreshRepositories,
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};

// 커스텀 훅
export const useRepository = (): RepositoryContextType => {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error("useRepository must be used within a RepositoryProvider");
  }
  return context;
};

export type { Repository };
