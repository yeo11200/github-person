// API 기본 URL을 환경 변수에서 가져옵니다.
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

/**
 * @description HTTP 요청 상태를 포함하는 커스텀 에러 클래스입니다.
 *              호출부에서 에러 발생 시 `instanceof HttpError`로 확인하고,
 *              `error.response`를 통해 전체 응답 객체에 접근할 수 있습니다.
 */
export class HttpError extends Error {
  public readonly response: Response;

  constructor(response: Response) {
    super(`HTTP 오류! 상태: ${response.status}`);
    this.name = 'HttpError';
    this.response = response;
  }
}

/**
 * @description fetch API 요청에 사용될 옵션 타입입니다.
 *              표준 `RequestInit`과 호환성을 유지하면서 커스텀 옵션을 추가합니다.
 */
export interface FetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  // 요청 헤더
  headers?: Record<string, string>;
  // 요청 본문 (body). 객체는 자동으로 JSON으로 변환됩니다.
  body?: Record<string, unknown> | string | FormData | null;
  // URL에 추가될 쿼리 파라미터입니다.
  queryParams?: Record<string, string | number | boolean>;
  // 인증 토큰 포함 여부를 결정합니다. (기본값: true)
  includeAuth?: boolean;
}

/**
 * @description API 요청을 위한 범용 fetch 래퍼 함수입니다.
 * @template T - API 응답으로 기대되는 데이터의 타입입니다.
 * @param {string} endpoint - API 엔드포인트 (예: '/users')
 * @param {FetchOptions} [options={}] - fetch 요청에 대한 설정 객체입니다.
 * @returns {Promise<T>} API 응답 데이터를 담은 프로미스를 반환합니다.
 * @throws {HttpError} - HTTP 응답 상태가 'ok'가 아닐 경우 발생합니다.
 * @throws {Error} - 네트워크 오류 또는 기타 예외 발생 시 발생합니다.
 */
const fetchApi = async <T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const {
    method = 'GET',
    headers: customHeaders = {},
    body,
    queryParams,
    includeAuth = true,
    ...restOptions
  } = options;

  const headers = new Headers();

  // body가 FormData가 아닐 경우, Content-Type을 application/json으로 설정합니다.
  if (!(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 인증이 필요하고 로컬 스토리지에 토큰이 있는 경우, Authorization 헤더를 추가합니다.
  if (includeAuth) {
    const token = localStorage.getItem('github_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // 사용자 정의 헤더를 추가합니다.
  Object.entries(customHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // 쿼리 파라미터를 URL 문자열로 변환합니다.
  const queryString = queryParams
    ? `?${new URLSearchParams(
        Object.entries(queryParams).reduce(
          (acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          },
          {} as Record<string, string>
        )
      ).toString()}`
    : '';

  // 최종 요청 URL을 조합합니다.
  const fullUrl = `${BASE_URL}${endpoint}${queryString}`;

  // 요청 본문을 준비합니다. FormData는 그대로 사용하고, 객체는 JSON 문자열로 변환합니다.
  const requestBody =
    body instanceof FormData ? body : body ? JSON.stringify(body) : null;

  try {
    const response = await fetch(fullUrl, {
      ...restOptions,
      method,
      headers,
      body: requestBody,
    });

    // 응답 상태가 'ok'가 아닌 경우 에러를 처리합니다.
    if (!response.ok) {
      // 401 Unauthorized 에러 발생 시, 인증 정보를 초기화하고 로그인 페이지로 리디렉션합니다.
      if (response.status === 401) {
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
        // 현재 경로가 '/callback'이 아닐 때만 리디렉션하여 무한 루프를 방지합니다.
        if (!window.location.pathname.includes('/callback')) {
          window.location.href = '/';
        }
      }
      // 커스텀 HttpError를 발생시켜, 호출부에서 response 객체에 접근할 수 있도록 합니다.
      throw new HttpError(response);
    }

    // 응답 본문이 없는 경우(예: 204 No Content) null을 반환합니다.
    const contentLength = response.headers.get('Content-Length');
    if (response.status === 204 || (contentLength && parseInt(contentLength, 10) === 0)) {
      return null as T;
    }

    // 응답 데이터를 JSON으로 파싱하여 반환합니다.
    return response.json() as Promise<T>;
  } catch (error) {
    // 네트워크 에러 또는 위에서 발생시킨 HttpError를 콘솔에 기록하고 다시 던집니다.
    if (error instanceof HttpError) {
      console.error(`HTTP ${error.response.status} ${error.response.statusText} from ${error.response.url}`);
    } else {
      console.error('Fetch API 오류:', error);
    }
    throw error;
  }
};

export default fetchApi;

