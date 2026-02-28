import { useState, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/getAuthHeaders';

export interface Integration {
  id: string;
  name: string;
  integration_type: 'movidesk' | 'whatsapp' | 'instagram' | 'chat_widget';
  is_active: number;
  phone_number?: string;
  created_at: string;
}

export interface CreateIntegrationData {
  name: string;
  integration_type: string;
  is_active: number;
  phone_number?: string;
  access_token?: string;
  client_id?: string;
  client_secret?: string;
}

export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('https://pluggyapi.pluggerbi.com/integrations', { headers });

      if (response.ok) {
        const data = await response.json();
        const integrationsList = data.integrations || [];
        setIntegrations(Array.isArray(integrationsList) ? integrationsList : []);
      } else {
        setIntegrations([]);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createIntegration = useCallback(async (integrationData: CreateIntegrationData) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('https://pluggyapi.pluggerbi.com/integrations', {
        method: 'POST',
        headers,
        body: JSON.stringify(integrationData),
      });

      if (response.ok) {
        await fetchIntegrations();
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Erro ao criar integração' };
      }
    } catch (error) {
      console.error('Error creating integration:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  }, [fetchIntegrations]);

  const updateIntegration = useCallback(async (id: string, integrationData: Partial<CreateIntegrationData>) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`https://pluggyapi.pluggerbi.com/integrations/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(integrationData),
      });

      if (response.ok) {
        await fetchIntegrations();
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Erro ao atualizar integração' };
      }
    } catch (error) {
      console.error('Error updating integration:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  }, [fetchIntegrations]);

  const deleteIntegration = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`https://pluggyapi.pluggerbi.com/integrations/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        await fetchIntegrations();
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Erro ao excluir integração' };
      }
    } catch (error) {
      console.error('Error deleting integration:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  }, [fetchIntegrations]);

  return {
    integrations,
    loading,
    fetchIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
  };
};
