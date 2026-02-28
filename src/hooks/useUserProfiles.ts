import { useState } from 'react';
import { getAuthHeaders } from '@/lib/getAuthHeaders';

const API_BASE = 'https://pluggyapi.pluggerbi.com';

export const useUserProfiles = () => {
  const [userProfiles, setUserProfiles] = useState<{ [userId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [loadedUserIds, setLoadedUserIds] = useState<Set<string>>(new Set());

  const fetchUserProfile = async (userId: string): Promise<string> => {
    if (userProfiles[userId]) {
      return userProfiles[userId];
    }

    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/users/${userId}`, { headers });

      if (!res.ok) throw new Error('Falha ao buscar perfil');

      const data = await res.json();
      const userName = data?.full_name || data?.name || 'Atendente';

      setUserProfiles(prev => ({ ...prev, [userId]: userName }));
      setLoadedUserIds(prev => new Set([...prev, userId]));
      return userName;
    } catch {
      const fallbackName = 'Atendente';
      setUserProfiles(prev => ({ ...prev, [userId]: fallbackName }));
      setLoadedUserIds(prev => new Set([...prev, userId]));
      return fallbackName;
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string): string => {
    return userProfiles[userId] || 'Carregando...';
  };

  return {
    fetchUserProfile,
    getUserName,
    loading,
    loadedUserIds: Array.from(loadedUserIds)
  };
};
