// 커밋 데이터 타입 정의
export interface CommitData {
  [key: string]: number; // "YYYY-MM" 형식의 키와 커밋 수
}

/**
 * 커밋 데이터에서 최고값을 구하는 함수
 * @param data 커밋 데이터 객체
 * @returns 최고 커밋 수
 */
export const getMaxCount = (data: CommitData): number => {
  const values = Object.values(data);

  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
};

/**
 * 커밋 데이터에서 최고값을 가진 키(월)를 구하는 함수
 * @param data 커밋 데이터 객체
 * @returns 최고 커밋 수를 가진 월 (YYYY-MM 형식) 또는 null
 */
export const getMaxCountKey = (data: CommitData): string | null => {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return null;
  }

  // 최대값을 가진 엔트리 찾기
  const maxEntry = entries.reduce((max, current) => {
    return current[1] > max[1] ? current : max;
  });

  return maxEntry[0];
};

/**
 * 커밋 데이터에서 평균을 구하는 함수
 * @param data 커밋 데이터 객체
 * @returns 평균 커밋 수 (소수점 반올림)
 */
export const getAverageCommits = (data: CommitData): number => {
  const values = Object.values(data);

  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, count) => sum + count, 0);
  return Math.round(total / values.length);
};

/**
 * 커밋 데이터에서 총합을 구하는 함수
 * @param data 커밋 데이터 객체
 * @returns 총 커밋 수
 */
export const getTotalCommits = (data: CommitData): number => {
  const values = Object.values(data);
  return values.reduce((sum, count) => sum + count, 0);
};

/**
 * 현재 월의 커밋 수를 구하는 함수
 * @param data 커밋 데이터 객체
 * @returns 현재 월의 커밋 수
 */
export const getCurrentMonthCommits = (data: CommitData): number => {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}`;

  return data[currentMonth] || 0;
};
