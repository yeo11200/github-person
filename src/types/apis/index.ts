export interface APIResponse<T> {
  status: string;
  data: T;
  message?: string;
}
