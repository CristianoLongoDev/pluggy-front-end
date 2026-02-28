import { getAccessToken, isTokenExpiringSoon, refreshAccessToken } from './tokenStorage';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (isTokenExpiringSoon()) {
    await refreshAccessToken();
  }

  const token = getAccessToken();
  if (!token) {
    throw new Error('Token de acesso não encontrado');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
