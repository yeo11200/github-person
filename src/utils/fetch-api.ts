const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string | FormData | null;
  queryParams?: Record<string, string | number>;
  includeAuth?: boolean; // 인증 토큰 포함 여부 (기본값: true)
};

const fetchApi = async <T>(
  endpoint: string, // 기존 url 대신 endpoint만 받음
  options: FetchOptions = {}
): Promise<T> => {
  try {
    const {
      method = "GET",
      headers = {},
      body,
      queryParams,
      includeAuth = true, // 기본적으로 인증 토큰 포함
    } = options;

    // 기본 헤더 설정
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Authorization 헤더 추가 (토큰이 있고 includeAuth가 true인 경우)
    if (includeAuth) {
      const token = localStorage.getItem("github_token");
      if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
      }
    }

    // 사용자 정의 헤더와 병합
    const finalHeaders = {
      ...defaultHeaders,
      ...headers,
    };

    // Query Params 처리
    const queryString = queryParams
      ? "?" +
        new URLSearchParams(
          Object.entries(queryParams).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: String(value),
            }),
            {}
          )
        ).toString()
      : "";

    // Base URL과 endpoint 결합
    const fullUrl = `${BASE_URL}${endpoint}${queryString}`;

    const response = await fetch(fullUrl, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      // 401 에러 시 토큰 정리 및 로그아웃 처리
      if (response.status === 401) {
        localStorage.removeItem("github_token");
        localStorage.removeItem("github_user");
        // 현재 페이지가 콜백이 아닌 경우에만 리다이렉트
        if (!window.location.pathname.includes("/callback")) {
          window.location.href = "/";
        }
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.error("Fetch API error:", error);
    throw error;
  }
};

export default fetchApi;
