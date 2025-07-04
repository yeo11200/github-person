/**
 * @file localStorage 유틸리티 함수 모음
 * @description 순수 함수, 타입 안전성, 명시적 에러 처리에 중점을 둔 localStorage 래퍼 함수들을 제공합니다.
 * SSR(서버 사이드 렌더링) 환경을 고려하여 window 객체의 존재 여부를 확인합니다.
 */

/**
 * 작업의 성공 또는 실패를 나타내는 제네릭 Result 타입입니다.
 * @template T 성공 시 반환될 데이터의 타입
 * @template E 실패 시 반환될 에러의 타입
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 스토리지 작업 중 발생할 수 있는 에러를 나타내는 사용자 정의 에러 클래스입니다.
 * @param context 에러가 발생한 함수명 또는 컨텍스트
 * @param message 에러 메시지
 */
export class StorageError extends Error {
  constructor(
    public readonly context: string,
    message: string,
  ) {
    super(`[${context}] ${message}`);
    this.name = 'StorageError';
  }
}

/**
 * 현재 환경이 브라우저인지 확인합니다.
 * @returns 브라우저 환경일 경우 true, 아닐 경우 false
 */
const isBrowser = typeof window !== 'undefined';

/**
 * localStorage에 값을 저장합니다. 객체는 JSON 문자열로 직렬화됩니다.
 * @template T 저장할 값의 타입
 * @param {string} key - 데이터를 저장할 키
 * @param {T} value - 저장할 데이터
 * @returns {Result<void, StorageError>} 작업 성공 시 빈 `Result` 객체, 실패 시 에러를 포함한 `Result` 객체
 */
export const setItem = <T>(
  key: string,
  value: T,
): Result<void, StorageError> => {
  if (!isBrowser) {
    return {
      success: false,
      error: new StorageError('setItem', 'localStorage is not available.'),
    };
  }
  try {
    const stringValue = JSON.stringify(value);
    localStorage.setItem(key, stringValue);
    return { success: true, data: undefined };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to serialize or save value.';
    return { success: false, error: new StorageError('setItem', message) };
  }
};

/**
 * localStorage에서 값을 가져옵니다. 값은 JSON으로 파싱됩니다.
 * @template T 가져올 값의 타입
 * @param {string} key - 데이터를 가져올 키
 * @returns {Result<T | null, StorageError>} 성공 시 저장된 값 또는 null, 실패 시 에러를 포함한 `Result` 객체
 */
export const getItem = <T>(key:string): Result<T | null, StorageError> => {
  if (!isBrowser) {
    return {
      success: false,
      error: new StorageError('getItem', 'localStorage is not available.'),
    };
  }
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return { success: true, data: null };
    }
    // 경고: 이 파싱은 런타임 타입 안전성을 보장하지 않습니다.
    // 저장된 데이터가 타입 T의 구조를 따를 것이라고 신뢰합니다.
    const parsedItem = JSON.parse(item) as T;
    return { success: true, data: parsedItem };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to parse stored value.';
    return { success: false, error: new StorageError('getItem', message) };
  }
};

/**
 * localStorage에서 특정 키의 아이템을 삭제합니다.
 * @param {string} key - 삭제할 아이템의 키
 * @returns {Result<void, StorageError>} 작업 성공 시 빈 `Result` 객체, 실패 시 에러를 포함한 `Result` 객체
 */
export const removeItem = (key: string): Result<void, StorageError> => {
  if (!isBrowser) {
    return {
      success: false,
      error: new StorageError('removeItem', 'localStorage is not available.'),
    };
  }
  try {
    localStorage.removeItem(key);
    return { success: true, data: undefined };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to remove item.';
    return { success: false, error: new StorageError('removeItem', message) };
  }
};

/**
 * localStorage의 모든 데이터를 삭제합니다.
 * @returns {Result<void, StorageError>} 작업 성공 시 빈 `Result` 객체, 실패 시 에러를 포함한 `Result` 객체
 */
export const clearStorage = (): Result<void, StorageError> => {
  if (!isBrowser) {
    return {
      success: false,
      error: new StorageError('clearStorage', 'localStorage is not available.'),
    };
  }
  try {
    localStorage.clear();
    return { success: true, data: undefined };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to clear storage.';
    return { success: false, error: new StorageError('clearStorage', message) };
  }
};

/**
 * localStorage에 특정 키가 존재하는지 확인합니다.
 * @param {string} key - 확인할 키
 * @returns {Result<boolean, StorageError>} 성공 시 키의 존재 여부(boolean), 실패 시 에러를 포함한 `Result` 객체
 */
export const hasItem = (key: string): Result<boolean, StorageError> => {
  if (!isBrowser) {
    return {
      success: false,
      error: new StorageError('hasItem', 'localStorage is not available.'),
    };
  }
  try {
    const exists = localStorage.getItem(key) !== null;
    return { success: true, data: exists };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to check for item existence.';
    return { success: false, error: new StorageError('hasItem', message) };
  }
};
