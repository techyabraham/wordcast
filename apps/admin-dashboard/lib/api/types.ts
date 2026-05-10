export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  hasNextPage?: boolean;
};

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
  meta?: ApiMeta;
};

export type ApiError = {
  success: false;
  message: string;
  errorCode: string;
  details?: Record<string, unknown>;
};

export type ApiResult<T> = {
  data: T;
  meta?: ApiMeta;
};
