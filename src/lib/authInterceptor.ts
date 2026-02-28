import {
  getAccessToken,
  clearTokens,
  isTokenExpiringSoon,
  refreshAccessToken,
} from './tokenStorage';
import { logSecurityEvent } from './security';

export class AuthInterceptor {
  private static instance: AuthInterceptor;

  static getInstance(): AuthInterceptor {
    if (!AuthInterceptor.instance) {
      AuthInterceptor.instance = new AuthInterceptor();
    }
    return AuthInterceptor.instance;
  }

  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 1
  ): Promise<Response> {
    if (isTokenExpiringSoon()) {
      await refreshAccessToken();
    }

    const token = getAccessToken();
    if (!token) {
      throw new Error('Não autenticado');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && maxRetries > 0) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        return this.makeAuthenticatedRequest(url, options, maxRetries - 1);
      }

      logSecurityEvent('TOKEN_REFRESH_FAILED_AFTER_401', { url });
      clearTokens();
      window.location.href = '/auth';

      const error = new Error('Não autorizado - Token inválido ou expirado');
      (error as any).status = 401;
      throw error;
    }

    return response;
  }

  async callExternalAPI(url: string, data?: any, method?: string): Promise<any> {
    const requestMethod = method || (data ? 'POST' : 'GET');

    const response = await this.makeAuthenticatedRequest(url, {
      method: requestMethod,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      logSecurityEvent('EXTERNAL_API_ERROR', {
        url,
        status: response.status,
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const makeAuthenticatedRequest = (url: string, options?: RequestInit) => {
  return AuthInterceptor.getInstance().makeAuthenticatedRequest(url, options);
};

export const callExternalAPI = (url: string, data?: any, method?: string) => {
  return AuthInterceptor.getInstance().callExternalAPI(url, data, method);
};
