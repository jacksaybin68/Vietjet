// HTTP client for API requests
import { ApiError, ErrorResponse, formatError } from '../utils/errorHandler';

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
}

export interface ResponseData<T> {
  data: T;
  status: number;
  message?: string;
}

class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4029') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    config?: RequestConfig & { data?: unknown }
  ): Promise<T> {
    const fullUrl = new URL(url, this.baseURL).toString();

    const headers = {
      ...this.defaultHeaders,
      ...config?.headers,
    };

    // Add authorization token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchConfig: RequestInit = {
      method,
      headers,
      signal: config?.timeout ? AbortSignal.timeout(config.timeout) : undefined,
    };

    if (config?.data && (method === 'POST' || method === 'PUT')) {
      fetchConfig.body = JSON.stringify(config.data);
    }

    try {
      const response = await fetch(fullUrl, fetchConfig);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.code || 'HTTP_ERROR',
          errorData.message || response.statusText
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'NETWORK_ERROR', 'Lỗi kết nối mạng');
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', url, config);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', url, { ...config, data });
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', url, { ...config, data });
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, config);
  }
}

// Export singleton instance
export const httpClient = new HttpClient();

// Export class for testing
export { HttpClient };
