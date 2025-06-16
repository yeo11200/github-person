import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import fetchApi from "../utils/fetch-api";

export interface User {
  id: string;
  email?: string;
  name: string;
  username: string;
  avatar_url: string;
  access_token: string;
}
// 인증 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGitHub: () => Promise<void>;
  handleGitHubCallback: (code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// API 응답 타입 정의
interface GitHubAuthResponse {
  status: string;
  data: {
    auth_url: string;
  };
}

interface GitHubCallbackResponse {
  status: string;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      avatar_url: string;
    };
  };
  message?: string;
}

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// 인증 컨텍스트를 사용하는 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// 인증 프로바이더 컴포넌트
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 토큰 확인 및 사용자 정보 복원
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem("github_token");
        const savedUser = localStorage.getItem("github_user");

        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // 에러 발생 시 로컬 스토리지 정리
        localStorage.removeItem("github_token");
        localStorage.removeItem("github_user");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // GitHub OAuth 콜백 처리
  const handleGitHubCallback = useCallback(async (code: string) => {
    try {
      setIsLoading(true);

      const data = await fetchApi<GitHubCallbackResponse>("/github/callback", {
        method: "GET",
        queryParams: { code },
      });

      if (data.status === "success") {
        const { token, user: userData } = data.data;

        // 사용자 정보 구성
        const userInfo: User = {
          id: userData.id,
          name: userData.username,
          username: userData.username,
          avatar_url: userData.avatar_url,
          access_token: token,
        };

        setUser(userInfo);
        localStorage.setItem("github_token", token);
        localStorage.setItem("github_user", JSON.stringify(userInfo));
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("GitHub callback error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // GitHub OAuth 로그인 시작
  const loginWithGitHub = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // GitHub 인증 URL 가져오기
      const data = await fetchApi<GitHubAuthResponse>("/github/auth", {
        method: "GET",
      });

      if (data.status === "success") {
        // GitHub OAuth 페이지로 리다이렉트
        window.location.href = data.data.auth_url;
      } else {
        throw new Error("Failed to initiate GitHub login");
      }
    } catch (error) {
      console.error("GitHub login error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // 로그아웃 함수
  const logout = () => {
    window.location.href = "/";

    setUser(null);
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
  };

  const value: AuthContextType = {
    user,
    isLoading,
    loginWithGitHub,
    handleGitHubCallback,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
