import { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/getAuthHeaders';

export interface Channel {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  bot_id?: string;
  active?: boolean | number;
  status?: number;
  created_at?: string;
  updated_at?: string;
}

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch('https://pluggyapi.pluggerbi.com/channels', {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar canais. Status: ${response.status}`);
      }
      
      const data = await response.json();
      setChannels(data.channels || []);
      
    } catch (err) {
      console.error('❌ useChannels - Error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  const createChannel = async (channelData: Omit<Channel, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('https://pluggyapi.pluggerbi.com/channels', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: crypto.randomUUID(),
          ...channelData
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar canal. Status: ${response.status}`);
      }
      
      await fetchChannels(); // Refresh the list
      return { success: true };
    } catch (err) {
      console.error('Error creating channel:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    } finally {
      setLoading(false);
    }
  };

  const updateChannel = async (id: string, channelData: Partial<Channel>) => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      // Remove the id field from the body since it's already in the URL
      const { id: _, ...dataToSend } = channelData as any;
      
      console.log('updateChannel - Data being sent:', dataToSend);
      console.log('updateChannel - Channel ID:', id);
      
      const response = await fetch(`https://pluggyapi.pluggerbi.com/channels/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(dataToSend)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('updateChannel - Error response:', errorText);
        throw new Error(`Erro ao atualizar canal. Status: ${response.status} - ${errorText}`);
      }
      
      await fetchChannels(); // Refresh the list
      return { success: true };
    } catch (err) {
      console.error('Error updating channel:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    } finally {
      setLoading(false);
    }
  };

  const deleteChannel = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`https://pluggyapi.pluggerbi.com/channels/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao excluir canal. Status: ${response.status}`);
      }
      
      await fetchChannels(); // Refresh the list
      return { success: true };
    } catch (err) {
      console.error('Error deleting channel:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    } finally {
      setLoading(false);
    }
  };

  // Removed automatic fetchChannels on mount to allow manual control

  return {
    channels,
    loading,
    error,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel
  };
};