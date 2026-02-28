const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRES_AT: 'expires_at',
} as const;

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(KEYS.EXPIRES_AT, String(expiresAt));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.REFRESH_TOKEN);
}

export function getStoredTokens(): StoredTokens | null {
  const access_token = localStorage.getItem(KEYS.ACCESS_TOKEN);
  const refresh_token = localStorage.getItem(KEYS.REFRESH_TOKEN);
  const expires_at = localStorage.getItem(KEYS.EXPIRES_AT);

  if (!access_token || !refresh_token || !expires_at) return null;

  return { access_token, refresh_token, expires_at: Number(expires_at) };
}

export function clearTokens(): void {
  localStorage.removeItem(KEYS.ACCESS_TOKEN);
  localStorage.removeItem(KEYS.REFRESH_TOKEN);
  localStorage.removeItem(KEYS.EXPIRES_AT);
}

export function isTokenExpired(): boolean {
  const expiresAt = localStorage.getItem(KEYS.EXPIRES_AT);
  if (!expiresAt) return true;
  return Math.floor(Date.now() / 1000) >= Number(expiresAt);
}

export function isTokenExpiringSoon(bufferSeconds = 60): boolean {
  const expiresAt = localStorage.getItem(KEYS.EXPIRES_AT);
  if (!expiresAt) return true;
  return Math.floor(Date.now() / 1000) >= Number(expiresAt) - bufferSeconds;
}

const API_BASE = 'https://pluggyapi.pluggerbi.com';

let _refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      saveTokens(data.access_token, data.refresh_token, data.expires_in);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}
