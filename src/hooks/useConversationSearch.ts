import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/getAuthHeaders';

interface SearchResult {
  conversation_id: number;
  contact_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  account_id: string;
  contact_name: string;
  contact_phone: string;
  account_name: string;
  total_messages: number;
  last_message_at: string;
  message_preview: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    conversations: SearchResult[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_next: boolean;
    };
    search_info: {
      term: string;
      results_count: number;
    };
  };
  status: string;
}

export const useConversationSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const searchConversations = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 3) {
      setError('Termo de busca deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('https://pluggyapi.pluggerbi.com/api/conversations/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          search_term: searchTerm,
          limit: 50,
          offset: 0,
          account_id: profile?.account_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      
      if (data.success) {
        setResults(data.data.conversations);
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      console.error('Erro na busca:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido na busca');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return {
    searchConversations,
    clearResults,
    results,
    loading,
    error,
  };
};
