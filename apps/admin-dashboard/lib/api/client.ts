import type { ApiError, ApiResult, ApiSuccess } from './types';

const API_PREFIX = '/api/admin';

const buildQuery = (params?: object) => {
  if (!params) {
    return '';
  }

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry === undefined || entry === null || entry === '') {
          return;
        }
        search.append(key, String(entry));
      });
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

class ApiRequestError extends Error {
  code: string;
  details: Record<string, unknown> | undefined;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.details = details;
  }
}

const parsePayload = async <T>(response: Response): Promise<ApiSuccess<T> | ApiError> => {
  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;
  if (!payload) {
    return {
      success: false,
      message: 'Empty response',
      errorCode: 'EMPTY_RESPONSE',
    };
  }
  return payload;
};

const request = async <T>(path: string, init?: RequestInit): Promise<ApiResult<T>> => {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = await parsePayload<T>(response);

  if (!response.ok || payload.success === false) {
    const error = payload as ApiError;
    throw new ApiRequestError(error.message ?? 'Request failed', error.errorCode ?? 'REQUEST_FAILED', error.details);
  }

  return payload.meta ? { data: payload.data, meta: payload.meta } : { data: payload.data };
};

export const apiClient = {
  get: <T>(path: string, params?: object) => request<T>(`${path}${buildQuery(params)}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, body !== undefined ? { method: 'POST', body: JSON.stringify(body) } : { method: 'POST' }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, body !== undefined ? { method: 'PATCH', body: JSON.stringify(body) } : { method: 'PATCH' }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};

export type { ApiRequestError };
