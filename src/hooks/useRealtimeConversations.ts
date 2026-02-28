import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useUserProfiles } from './useUserProfiles';
import { validateAndSanitizeMessage, webSocketMessageSchema, conversationIdSchema, isValidUUID } from '@/lib/validation';
import { formatInTimeZone } from 'date-fns-tz';
import { callExternalAPI } from '@/lib/authInterceptor';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationApiResponse {
  status: string;
  data: {
    conversations: Array<{
      conversation_id: number;
      status: string;
      status_attendance: string;
      started_at: string;
      ended_at: string | null;
      message_count: number;
      last_message: {
        text: string;
        sender: string;
        timestamp: string;
      };
      contact: {
        id: string;
        name: string;
        phone: string;
        email: string;
      };
      channel: {
        id: string;
        name: string;
        type: string;
      };
      bot: {
        name: string;
        agent_name: string;
      };
    }>;
    pagination: {
      limit: number;
      total: number;
      include_closed: boolean;
    };
    account_id: string;
  };
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'customer' | 'ai' | 'agent' | 'human';
  senderName?: string;
  channel?: string;
  message_type?: string;
  tokens?: number;
  user_id?: string;
  metadata?: {
    contact?: {
      id?: string;
      name?: string;
      phone?: string;
    };
    bot?: {
      name?: string;
      agent_name?: string;
    };
  };
}

interface Chat {
  id: string;
  customerName: string;
  customerAvatar?: string;
  customerPhone?: string;
  customerEmail?: string;
  lastMessage: string;
  timestamp: string;
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'widget';
  status: 'ai' | 'human' | 'pending' | 'closed' | 'waiting';
  unreadCount: number;
  isActive: boolean;
  botAgentName?: string;
  metadata?: any;
}

interface UseRealtimeConversationsReturn {
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  isConnected: boolean;
  sendMessage: (chatId: string, content: string) => void;
  transferToHuman: (chatId: string) => void;
  closeConversation: (chatId: string) => void;
  refreshConversations: () => void;
  fetchMessages: (conversationId: string | number) => void;
  markAsRead: (chatId: string) => void;
}

export const useRealtimeConversations = (): UseRealtimeConversationsReturn => {
  const { profile } = useAuth();
  const { fetchUserProfile } = useUserProfiles();
  console.log('🚀 useRealtimeConversations INICIADO');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  
  const { isConnected, sendMessage: wsSendMessage, subscribe } = useWebSocket('wss://pluggyapi.pluggerbi.com/ws');
  
  console.log('🔌 STATUS DO WEBSOCKET:', { isConnected });

  // Função para carregar conversas iniciais via API REST
  const loadInitialConversations = useCallback(async () => {
    if (!profile?.account_id) {
      console.log('❌ Cannot load conversations - No account_id available');
      return;
    }

    try {
      console.log('🔄 Loading initial conversations via API REST...');
      
      const response: ConversationApiResponse = await callExternalAPI(
        'https://pluggyapi.pluggerbi.com/api/conversations/recent?limit=50&include_closed=true',
        undefined,
        'GET'
      );

      console.log('✅ Conversas carregadas via API:', response);

      if (response.status === 'success' && response.data.conversations) {
        // Mapear conversas da API para o formato do estado local
        const mappedChats: Chat[] = response.data.conversations.map((conv): Chat => ({
          id: conv.conversation_id.toString(),
          customerName: conv.contact.name || `Cliente ${conv.conversation_id}`,
          customerPhone: conv.contact.phone,
          customerEmail: conv.contact.email,
          customerAvatar: undefined, // Não disponível na API atual
          lastMessage: conv.last_message.text || 'Sem mensagens',
          timestamp: (() => {
            try {
              const date = new Date(conv.last_message.timestamp + (conv.last_message.timestamp.includes('Z') ? '' : 'Z'));
              return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
            } catch (error) {
              console.error('Error formatting timestamp:', error, conv.last_message.timestamp);
              return formatInTimeZone(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
            }
          })(),
          channel: conv.channel.type === 'whatsapp' ? 'whatsapp' : 'widget',
          status: (() => {
            if (conv.status === 'closed') {
              return 'closed' as const;
            }
            if (conv.status === 'active') {
              return conv.status_attendance === 'human' ? 'human' : 'ai';
            }
            return 'pending';
          })(),
          unreadCount: 0, // API não retorna unread count, será atualizado via WebSocket
          isActive: conv.status === 'active',
          botAgentName: conv.bot.agent_name,
          metadata: {
            contact: conv.contact,
            bot: conv.bot,
            channel: conv.channel
          }
        }));

        console.log('🔄 Setting initial chats from API:', mappedChats.length, 'conversations');
        setChats(mappedChats);
      }
    } catch (error) {
      console.error('❌ Error loading initial conversations:', error);
    }
  }, [profile?.account_id]);

  const refreshConversations = useCallback(async () => {
    console.log('🔄 Refreshing conversations via API REST...');
    console.log('🔄 Profile account_id para refresh:', profile?.account_id);
    
    if (!profile?.account_id) {
      console.log('❌ Cannot refresh - No account_id available');
      return;
    }

    // Recarregar via API REST
    await loadInitialConversations();

    // Depois reconectar ao WebSocket para updates
    if (isConnected) {
      const refreshPayload = {
        type: 'subscribe_conversations',
        data: {
          account_id: profile.account_id,
          conversation_ids: [] // Empty array = all conversations
        }
      };

      console.log('📤 Sending subscription with account_id:', refreshPayload);
      wsSendMessage(refreshPayload);
    } else {
      console.warn('WebSocket not connected. Cannot subscribe for real-time updates.');
    }
  }, [isConnected, wsSendMessage, profile?.account_id, loadInitialConversations]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    console.log('🌐 WEBSOCKET: Configurando subscription...');
    console.log('🌐 WEBSOCKET: isConnected =', isConnected);
    
    const unsubscribe = subscribe((message) => {
      console.log('🔥 WEBSOCKET MESSAGE RECEIVED:', message.type, message);
      console.log('📊 Message data:', JSON.stringify(message, null, 2));
      
      console.log('📨 RAW WEBSOCKET MESSAGE RECEIVED:', {
        type: message.type,
        hasData: !!message.data,
        fullMessage: message
      });

      switch (message.type) {
        case 'new_message':
        case 'message_received':
        case 'message_created':
        case 'conversation_message':
        case 'message_update':
          console.log('📩 Handling new message event:', message.type);
          console.log('🔍 RAW message data:', JSON.stringify(message, null, 2));
          console.log('🚨 ANTES DE CHAMAR handleNewMessage - conversation_id:', (message as any).conversation_id);
          console.log('🚨 ANTES DE CHAMAR handleNewMessage - data.conversation_id:', message.data?.conversation_id);
          handleNewMessage(message);
          break;
        case 'subscription_updated':
        case 'conversations_updated':
          console.log('📊 Handling subscription update event:', message.type);
          handleSubscriptionUpdate(message.data);
          break;
        case 'messages_response':
          console.log('💬 Handling messages_response event', message);
          handleMessagesResponse(message);
          break;
        case 'conversations_response':
          console.log('💼 Handling conversations_response event');
          handleSubscriptionUpdate(message.data);
          break;
        case 'conversation_updated':
        case 'conversation_status_changed':
          console.log('🔄 Handling conversation update event (processando via subscription_updated):', message.type);
          // Não recarregar aqui - o evento subscription_updated já será enviado
          break;
        case 'connection_confirmed':
          console.log('✅ Connection confirmed - aguardando subscription_updated automático');
          // Não reinscrever aqui - o servidor já envia subscription_updated automaticamente
          break;
        case 'pong':
          console.log('🏓 Pong received - conexão ativa');
          break;
        default:
          console.log('❓ Unknown message type:', message.type);
          console.log('🔍 Full unknown message:', JSON.stringify(message, null, 2));
          
          // Para debug: tentar processar mensagens desconhecidas como possíveis novas mensagens
          if (message.data && (message.data.conversation_id || message.data.id)) {
            console.log('🚨 Mensagem desconhecida com dados - tentando processar como nova mensagem');
            handleNewMessage(message);
          }
          break;
      }
    });

    return unsubscribe;
  }, [subscribe, refreshConversations, profile?.account_id, wsSendMessage]);

  // Auto-refresh conversations when WebSocket connects - Load API first, then WebSocket
  useEffect(() => {
    console.log('🔄 EFFECT: WebSocket status changed to:', isConnected);
    console.log('🔄 Profile account_id:', profile?.account_id);
    
    if (profile?.account_id) {
      // Primeiro carregar conversas via API REST
      loadInitialConversations().then(() => {
        // Depois conectar ao WebSocket para updates em tempo real
        if (isConnected) {
          console.log('🔄 WebSocket conectado após carregar API, iniciando subscrição...');
          setTimeout(() => {
            console.log('🔄 TIMEOUT: Verificando se ainda está conectado:', isConnected);
            if (isConnected) {
              const refreshPayload = {
                type: 'subscribe_conversations',
                data: {
                  account_id: profile.account_id,
                  conversation_ids: [] // Empty array = all conversations
                }
              };
              console.log('📤 ENVIANDO subscribe_conversations com account_id (APÓS API):', refreshPayload);
              wsSendMessage(refreshPayload);
              console.log('📤 Enviado subscribe_conversations - SUCESSO');
            } else {
              console.log('❌ WebSocket desconectou durante timeout');
            }
          }, 1000);
        }
      });
    } else {
      console.log('❌ Sem account_id:', { accountId: profile?.account_id });
    }
  }, [isConnected, wsSendMessage, profile?.account_id, loadInitialConversations]);

  const handleNewMessage = useCallback(async (message: any) => {
    console.log('🔔 NEW MESSAGE RECEIVED - FULL MESSAGE:', JSON.stringify(message, null, 2));
    console.log('🔍 CHECANDO USER_ID na mensagem recebida...');
    console.log('🚨 DEBUG ESPECÍFICO - message.conversation_id:', (message as any).conversation_id);
    console.log('🚨 DEBUG ESPECÍFICO - message.data:', message.data);
    console.log('🚨 DEBUG ESPECÍFICO - message.data?.conversation_id:', message.data?.conversation_id);
    
    // Estrutura pode variar - tentar diferentes formatos
    let data = message.data || message;
    let conversation_id = (message as any).conversation_id || data.conversation_id;
    
    console.log('🚨 DEPOIS DO PROCESSING - data:', data);
    console.log('🚨 DEPOIS DO PROCESSING - conversation_id:', conversation_id);
    
    if (!data) {
      console.log('❌ No message data found in any format');
      return;
    }

    // Se data.data existe, usar essa estrutura
    if (data.data) {
      conversation_id = data.conversation_id || conversation_id;
      data = data.data;
    }
    
    console.log('🔍 Processed data:', { data, conversation_id });

    const messageData = data;
    
    // Extract data according to API structure
    const message_id = messageData.id;
    const content = messageData.content;
    const originalSender = messageData.sender; // "customer" ou "agent"
    
    console.log('🔍 DEBUG messageData completo:', JSON.stringify(messageData, null, 2));
    console.log('🔍 DEBUG sender original:', originalSender);
    console.log('🔍 DEBUG profile?.email:', profile?.email);
    
    // Determinar o sender baseado no campo sender da API
    let sender;
    let senderName = '';
    
    console.log('🔍 DEBUG SENDER LOGIC:', {
      originalSender,
      messageUserId: messageData.user_id,
      profileId: profile?.id
    });
    
    if (originalSender === 'customer' || originalSender === 'user') {
      // Cliente/Usuário (não logado)
      sender = 'customer';
      senderName = messageData.metadata?.contact?.name || messageData.senderName || 'Cliente';
      console.log('✅ Mensagem identificada como CLIENTE - senderName:', senderName);
    } else if (originalSender === 'agent') {
      // Bot/IA
      sender = 'ai';
      const agentName = messageData.metadata?.bot?.agent_name;
      senderName = agentName || 'IA';
      console.log('✅ Mensagem identificada como IA - senderName FINAL:', senderName);
    } else if (originalSender === 'human') {
      // Mensagem enviada por um humano - usar user_id para buscar o nome
      sender = 'human';
      
      if (messageData.user_id) {
        // Buscar o nome do usuário usando o user_id
        const userName = await fetchUserProfile(messageData.user_id);
        senderName = userName;
        console.log('✅ Mensagem identificada como HUMANO - user_id:', messageData.user_id, 'senderName:', senderName);
      } else {
        senderName = messageData.senderName || 'Atendente';
        console.log('✅ Mensagem identificada como HUMANO (sem user_id) - senderName:', senderName);
      }
    } else {
      // Fallback - se não conseguir determinar
      sender = 'ai';
      senderName = messageData.metadata?.bot?.agent_name || 'IA';
      console.log('✅ Mensagem identificada como BOT - senderName:', senderName);
    }
    
    console.log('🎯 SENDER FINAL:', sender, 'SENDERNAME FINAL:', senderName);
    
    // Log adicional para debug
    console.log('🔍 PROFILE no handleNewMessage:', JSON.stringify(profile, null, 2));
    console.log('🔍 USER_ID na mensagem:', messageData.user_id);
    
    const timestamp = messageData.timestamp;
    const channel = messageData.channel;
    const message_type = messageData.message_type;
    const tokens = messageData.tokens;
    const metadata = messageData.metadata;
    
    console.log('📍 Processing new message for conversation:', conversation_id);
    console.log('💬 Message details:', { message_id, content, sender, timestamp, channel, user_id: messageData.user_id });

    if (!conversation_id) {
      console.error('❌ No conversation_id found - cannot process message');
      return;
    }

    // Add new message to the messages state
    setMessages(prev => {
      const currentMessages = prev[conversation_id] || [];
      const newMessage: Message = {
        id: message_id || `msg_${Date.now()}`,
        content: content,
        sender: sender,
        senderName: senderName,
        timestamp: timestamp ? (() => {
          const date = new Date(timestamp + (timestamp.includes('Z') ? '' : 'Z'));
          return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
        })() : formatInTimeZone(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
        channel,
        message_type,
        tokens,
        user_id: messageData.user_id,
        metadata
      };
      
      console.log('🔄 Adding message to conversation:', conversation_id, newMessage);
      console.log('📚 Current messages count:', currentMessages.length);
      
      const updatedMessages = {
        ...prev,
        [conversation_id]: [...currentMessages, newMessage]
      };
      
      console.log('📝 Updated messages state:', updatedMessages[conversation_id]);
      return updatedMessages;
    });

    // Update chat list with new last message
    setChats(prev => {
      const updatedChats = prev.map(chat => {
        if (chat.id === conversation_id) {
          console.log('🔄 Updating chat:', chat.id, 'with new message');
          return {
            ...chat,
            lastMessage: content,
            timestamp: timestamp ? (() => {
              const date = new Date(timestamp + (timestamp.includes('Z') ? '' : 'Z'));
              return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
            })() : formatInTimeZone(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
            unreadCount: chat.unreadCount + 1,
            status: sender === 'customer' || sender === 'user' ? 'pending' : chat.status
          };
        }
        return chat;
      });
      
      console.log('💼 Updated chats with new message');
      return updatedChats;
    });
  }, [fetchUserProfile]);

  const handleSubscriptionUpdate = useCallback((data: any) => {
    console.log('🔥 Processing subscription update:', data);
    
    if (data.conversations) {
      console.log('🔍 TOTAL CONVERSAS RECEBIDAS:', data.conversations.length);
      
      // Log each conversation to see channel data
      data.conversations.forEach((conv: any, index: number) => {
        console.log(`📋 CONVERSA ${index + 1}:`, {
          id: conv.id,
          channel: conv.channel,
          channel_type: conv.channel_type,
          contact_name: conv.contact_name,
          customer_name: conv.customer_name,
          last_message: conv.last_message,
          conversation_status: conv.conversation_status,
          status: conv.status,
          isActiveStatus: conv.conversation_status === 'active'
        });
        
        // Debug específico para ANA CAROLINE
        if (conv.customer_name && conv.customer_name.includes('Ana Caroline')) {
          console.log('🚨 ANA CAROLINE DEBUG - RAW DATA:', {
            id: conv.id,
            customer_name: conv.customer_name,
            status: conv.status,
            conversation_status: conv.conversation_status,
            channel: conv.channel,
            last_message: conv.last_message,
            updated_at: conv.updated_at,
            metadata: conv.metadata,
            FULL_OBJECT: conv
          });
        }
      });
      
      // Agrupar conversas por cliente e canal para verificar status ativo
      const conversationsByCustomer: { [key: string]: any[] } = {};
      
      data.conversations.forEach((conv: any) => {
        const customerKey = `${conv.customer_name || `Cliente ${conv.id}`}-${conv.channel}`;
        if (!conversationsByCustomer[customerKey]) {
          conversationsByCustomer[customerKey] = [];
        }
        conversationsByCustomer[customerKey].push(conv);
      });

      // Update chats list - mesclar com conversas existentes para manter as fechadas
      const updatedChats = data.conversations.map((conv: any): Chat => {
        const customerKey = `${conv.customer_name || `Cliente ${conv.id}`}-${conv.channel}`;
        const customerConversations = conversationsByCustomer[customerKey];
        
        // Verificar se há pelo menos uma conversa ativa para este cliente
        const hasActiveConversation = customerConversations.some((c: any) => c.conversation_status === 'active');
        
         // Log para debug de todos os usuários
         console.log('🔍 DEBUG CONVERSA:', {
           id: conv.id,
           customer_name: conv.customer_name,
           status: conv.status,
           channel: conv.channel,
           hasActiveConversation: hasActiveConversation,
           customerConversations: customerConversations.map((c: any) => ({ id: c.id, status: c.status, conversation_status: c.conversation_status }))
         });
         
         // Debug específico para ANA CAROLINE após agrupamento
         if (conv.customer_name && conv.customer_name.includes('Ana Caroline')) {
           console.log('🚨 ANA CAROLINE APÓS AGRUPAMENTO:', {
             customerKey: customerKey,
             hasActiveConversation: hasActiveConversation,
             customerConversations: customerConversations,
             totalConversationsForCustomer: customerConversations.length,
              statusArray: customerConversations.map(c => c.status),
              conversationStatusArray: customerConversations.map(c => c.conversation_status),
              activeConversations: customerConversations.filter(c => c.conversation_status === 'active')
           });
         }
        
        return {
          id: conv.id,
          customerName: conv.customer_name || `Cliente ${conv.id}`,
          customerPhone: conv.metadata?.contact?.phone,
          customerEmail: conv.metadata?.contact?.email,
          customerAvatar: conv.metadata?.contact?.avatar,
          lastMessage: conv.last_message || 'Sem mensagens',
          timestamp: conv.updated_at ? (() => {
            try {
              // Se já está formatado (DD/MM/YYYY), retorna como está
              if (typeof conv.updated_at === 'string' && conv.updated_at.includes('/')) {
                return conv.updated_at;
              }
              
              // Garantir que a data seja interpretada como UTC antes de converter para timezone de SP
              let date;
              if (typeof conv.updated_at === 'string') {
                // Se for string, garantir que seja interpretada como UTC
                date = new Date(conv.updated_at + (conv.updated_at.includes('Z') ? '' : 'Z'));
              } else {
                date = new Date(conv.updated_at);
              }
              
              // Verifica se a data é válida
              if (isNaN(date.getTime())) {
                console.warn('Invalid date from backend:', conv.updated_at);
                return formatInTimeZone(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
              }
              
              return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
            } catch (error) {
              console.error('Error formatting timestamp:', error, conv.updated_at);
              return formatInTimeZone(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
            }
          })() : '',
          channel: conv.channel === 'whatsapp' ? 'whatsapp' : 'widget',
          status: (() => {
            // Mapear conversation_status para nosso status
            if (conv.conversation_status === 'closed') {
              return 'closed' as const;
            }
            // Se esta conversa específica está ativa, usar seu próprio status
            if (conv.conversation_status === 'active') {
              return conv.status === 'human' ? 'human' : 'ai';
            }
            // Para outras situações, usar pending
            return 'pending';
          })(),
          unreadCount: conv.unread_count || 0,
          isActive: hasActiveConversation, // Usar verificação se há conversa ativa para este cliente
          botAgentName: conv.metadata?.bot?.agent_name,
          metadata: conv.metadata
        };
      });
      
      // Mesclar conversas do WebSocket com as existentes, mantendo conversas fechadas
      setChats(prevChats => {
        console.log('🔄 Mesclando conversas do WebSocket com existentes...');
        console.log('🔍 Conversas existentes:', prevChats.length);
        console.log('🔍 Conversas do WebSocket:', updatedChats.length);
        
        // Criar um mapa das conversas existentes
        const existingChatsMap = new Map(prevChats.map(chat => [chat.id, chat]));
        
        // Adicionar/atualizar conversas do WebSocket
        updatedChats.forEach(newChat => {
          existingChatsMap.set(newChat.id, newChat);
        });
        
        // Converter de volta para array e ordenar por timestamp
        const mergedChats = Array.from(existingChatsMap.values()).sort((a, b) => {
          // Converter timestamp para Date para comparação
          const dateA = new Date(a.timestamp.split('/').reverse().join('-'));
          const dateB = new Date(b.timestamp.split('/').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log('✅ Conversas mescladas:', mergedChats.length);
        console.log('📊 Status das conversas:', mergedChats.reduce((acc, chat) => {
          acc[chat.status] = (acc[chat.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>));
        
        return mergedChats;
      });
    }

    if (data.messages) {
      // Update messages for specific conversations
      const messagesByConversation: { [chatId: string]: Message[] } = {};
      
      data.messages.forEach((msg: any) => {
        const conversationId = msg.conversation_id;
        if (!messagesByConversation[conversationId]) {
          messagesByConversation[conversationId] = [];
        }
        
        // Extrair senderName dos metadados
        let senderName: string | undefined;
        if (msg.sender === 'agent' && msg.metadata?.bot?.agent_name) {
          senderName = msg.metadata.bot.agent_name;
        }
        
        messagesByConversation[conversationId].push({
          id: msg.id,
          content: msg.content,
          sender: msg.sender === 'user' ? 'customer' : msg.sender,
          senderName,
          timestamp: (() => {
            const date = new Date(msg.timestamp + (msg.timestamp.includes('Z') ? '' : 'Z'));
            return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
          })(),
          channel: msg.channel,
          message_type: msg.message_type,
          tokens: msg.tokens,
          metadata: msg.metadata
        });
      });

      setMessages(prev => ({
        ...prev,
        ...messagesByConversation
      }));
    }
  }, []);

  const handleMessagesResponse = useCallback((message: any) => {
    console.log('💬 Processing messages response:', message);
    console.log('🔍 FULL WebSocket Response Structure:', JSON.stringify(message, null, 2));
    
    if (message.conversation_id && message.data) {
      // Extrair conversation_status se disponível
      const conversationStatus = message.data.conversation_status;
      const isActive = conversationStatus === 'active';
      
      console.log(`🔍 MESSAGES RESPONSE - Conversation ${message.conversation_id}:`, {
        conversation_status: conversationStatus,
        isActive: isActive
      });
      
      if (message.data.messages) {
        console.log('📨 RAW Messages from WebSocket:', JSON.stringify(message.data.messages, null, 2));
        
        message.data.messages.forEach((msg: any, index: number) => {
          console.log(`📧 Message ${index + 1} RAW Data:`, {
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            user_id: msg.user_id,
            timestamp: msg.timestamp,
            channel: msg.channel,
            message_type: msg.message_type,
            metadata: msg.metadata,
            fullMessage: JSON.stringify(msg, null, 2)
          });
        });
        
        const conversationMessages = message.data.messages.map((msg: any): Message => {
          // Extrair senderName dos metadados
          let senderName: string | undefined;
          if (msg.sender === 'agent' && msg.metadata?.bot?.agent_name) {
            senderName = msg.metadata.bot.agent_name;
          }
          
          return {
            id: msg.id,
            content: msg.content,
            sender: msg.sender === 'user' ? 'customer' : msg.sender,
            senderName,
            timestamp: (() => {
              const date = new Date(msg.timestamp + (msg.timestamp.includes('Z') ? '' : 'Z'));
              return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
            })(),
            channel: msg.channel,
            message_type: msg.message_type,
            tokens: msg.tokens,
            user_id: msg.user_id,
            metadata: msg.metadata
          };
        });

        console.log('📝 Setting messages for conversation:', message.conversation_id, conversationMessages);

        setMessages(prev => ({
          ...prev,
          [message.conversation_id]: conversationMessages
        }));
      }
      
      // Atualizar o status da conversa baseado no conversation_status
      setChats(prev => prev.map(chat => {
        if (chat.id === message.conversation_id.toString()) {
          console.log(`🔄 Updating chat ${chat.id} isActive from ${chat.isActive} to ${isActive}`);
          return {
            ...chat,
            isActive: isActive,
            status: isActive ? 'ai' : 'closed'
          };
        }
        return chat;
      }));
    }
  }, []);

  const sendMessage = useCallback(async (chatId: string, content: string) => {
    if (!chatId) {
      console.warn('❌ No chat ID provided. Cannot send message.');
      return;
    }

    console.log('📤 SENDING MESSAGE to chat:', chatId, 'content:', content);

    // Verificar conectividade antes de tentar enviar
    if (!isConnected) {
      console.warn('❌ WebSocket não conectado. Mensagem pode não ser entregue.');
    }

    let messageSuccessfullySent = false;

    try {
      const payload = {
        content,
        user_id: profile?.id,
        sender: 'human'
      };
      console.log('🚀 ENVIANDO VIA API - payload completo:', JSON.stringify(payload, null, 2));
      
      const response = await callExternalAPI(
        `https://atendimento.pluggerbi.com/conversations/${chatId}/send-message`,
        payload,
        'POST'
      );
      console.log('✅ Message sent successfully via API:', response);
      messageSuccessfullySent = true;
    } catch (error) {
      console.error('❌ Error sending message via API:', error);
      
      // Tentar via WebSocket se disponível como fallback
      if (isConnected) {
        try {
          console.log('🔄 Tentando enviar via WebSocket como fallback...');
          const wsPayload = {
            type: 'send_message',
            data: {
              conversation_id: parseInt(chatId),
              content,
              user_id: profile?.id,
              sender: 'human'
            }
          };
          console.log('🚀 ENVIANDO VIA WEBSOCKET - payload completo:', JSON.stringify(wsPayload, null, 2));
          wsSendMessage(wsPayload);
          console.log('✅ Message sent via WebSocket fallback');
          messageSuccessfullySent = true;
        } catch (wsError) {
          console.error('❌ WebSocket fallback also failed:', wsError);
        }
      }
      
      if (!messageSuccessfullySent) {
        console.error('❌ Todas as tentativas de envio falharam');
        // TODO: Adicionar toast de erro para o usuário
        return;
      }
    }
    
    // Não adicionar mensagem otimística - deixar o WebSocket atualizar
    console.log('✅ Mensagem enviada com sucesso, aguardando confirmação via WebSocket');

  }, [profile, isConnected, wsSendMessage]);

  const transferToHuman = useCallback(async (chatId: string) => {
    console.log('🚀 INICIANDO transferToHuman para chat:', chatId);
    
    // Atualizar status local IMEDIATAMENTE para feedback visual instantâneo
    console.log('🔄 Atualizando status local IMEDIATAMENTE para feedback visual');
    setChats(prevChats => prevChats.map(chat => 
      chat.id === chatId ? { ...chat, status: 'human' } : chat
    ));
    
    try {
      // Primeiro tenta via API REST
      try {
        console.log('📡 Tentando API REST...');
        const response = await callExternalAPI(
          `https://atendimento.pluggerbi.com/conversations/${chatId}/status`,
          { status_attendance: "human" },
          'PUT'
        );
        console.log('✅ Status alterado para humano via API REST:', response);
        
        // Forçar atualização do chat específico na lista
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId ? { ...chat, status: 'human' } : chat
          )
        );
        
        return; // Se funcionou, para aqui
      } catch (apiError) {
        console.log('⚠️ Falha na API REST, tentando via WebSocket:', apiError);
        
        // Se falhar, tenta via WebSocket
        if (isConnected) {
          // Tenta diferentes formatos de mensagem
          const statusPayloads = [
            {
              type: 'change_status',
              data: {
                conversation_id: parseInt(chatId),
                status_attendance: 'human'
              }
            },
            {
              type: 'update_conversation_status',
              data: {
                conversation_id: parseInt(chatId),
                status: 'human'
              }
            },
            {
              type: 'conversation_status_update',
              conversation_id: parseInt(chatId),
              status_attendance: 'human'
            }
          ];
          
          // Tenta todos os formatos
          for (const payload of statusPayloads) {
            console.log('📤 Tentando formato de mensagem via WebSocket:', payload);
            wsSendMessage(payload);
            await new Promise(resolve => setTimeout(resolve, 500)); // Aguarda um pouco entre tentativas
          }
          
          console.log('✅ Todas as tentativas de WebSocket enviadas');
        } else {
          console.error('❌ WebSocket não conectado e API REST falhou');
          // Reverter status local se tudo falhar
          setChats(prevChats => prevChats.map(chat => 
            chat.id === chatId ? { ...chat, status: 'ai' } : chat
          ));
          throw new Error('WebSocket não conectado e API REST falhou');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao transferir para humano:', error);
      // Reverter status local em caso de erro
      setChats(prevChats => prevChats.map(chat => 
        chat.id === chatId ? { ...chat, status: 'ai' } : chat
      ));
      throw error;
    }
  }, [isConnected, wsSendMessage, callExternalAPI]);

  const fetchMessages = useCallback((conversationId: string | number) => {
    console.log('🔍 FETCH MESSAGES CALLED for conversation:', conversationId);
    console.log('🌐 WebSocket connected:', isConnected);
    
    // Convert to string if it's a number
    const conversationIdStr = String(conversationId);
    
    // Validate conversation ID
    try {
      conversationIdSchema.parse(conversationId);
    } catch (error) {
      console.error('Invalid conversation ID:', error);
      return;
    }
    
    if (!isConnected) {
      console.warn('❌ WebSocket not connected. Cannot fetch messages.');
      return;
    }

    console.log('🔍 FETCHING MESSAGES for conversation:', conversationIdStr);
    
    const fetchPayload = {
      type: 'get_messages',
      data: {
        conversation_id: parseInt(conversationIdStr),
        limit: 50,
        offset: 0
      }
    };

    console.log('📤 Sending get_messages payload:', fetchPayload);
    wsSendMessage(fetchPayload);
  }, [isConnected, wsSendMessage]);

  const closeConversation = useCallback(async (chatId: string) => {
    console.log('🚀 INICIANDO closeConversation para chat:', chatId);
    
    try {
      // Primeiro tenta via API REST
      try {
        console.log('📡 Tentando fechar conversa via API REST...');
        const response = await callExternalAPI(
          `https://atendimento.pluggerbi.com/conversations/${chatId}/close`,
          { user_id: profile?.id },
          'PUT'
        );
        console.log('✅ Conversa encerrada via API REST:', response);
        
        // Atualizar status local do chat imediatamente após sucesso da API
        console.log('🔄 Atualizando status local para closed após sucesso da API');
        setChats(prevChats => prevChats.map(chat => 
          chat.id === chatId ? { ...chat, status: 'closed', isActive: false } : chat
        ));
        
        return; // Se funcionou, para aqui
      } catch (apiError) {
        console.log('⚠️ Falha na API REST, tentando via WebSocket:', apiError);
        
        // Se falhar, tenta via WebSocket
        if (isConnected) {
          // Tenta diferentes formatos de mensagem para fechar conversa
          const closePayloads = [
            {
              type: 'close_conversation',
              data: {
                conversation_id: parseInt(chatId),
                user_id: profile?.id
              }
            },
            {
              type: 'update_conversation_status',
              data: {
                conversation_id: parseInt(chatId),
                status: 'closed'
              }
            },
            {
              type: 'conversation_status_update',
              conversation_id: parseInt(chatId),
              status: 'closed'
            }
          ];
          
          // Tenta todos os formatos
          for (const payload of closePayloads) {
            console.log('📤 Tentando formato de mensagem via WebSocket:', payload);
            wsSendMessage(payload);
            await new Promise(resolve => setTimeout(resolve, 500)); // Aguarda um pouco entre tentativas
          }
          
          console.log('✅ Todas as tentativas de WebSocket enviadas');
          
          // Atualizar status local do chat após tentativas via WebSocket
          console.log('🔄 Atualizando status local para closed após WebSocket');
          setChats(prevChats => prevChats.map(chat => 
            chat.id === chatId ? { ...chat, status: 'closed', isActive: false } : chat
          ));
        } else {
          console.error('❌ WebSocket não conectado e API REST falhou');
          throw new Error('WebSocket não conectado e API REST falhou');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao encerrar conversa:', error);
      throw error;
    }
  }, [isConnected, wsSendMessage, callExternalAPI, profile]);

  const markAsRead = useCallback((chatId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          unreadCount: 0
        };
      }
      return chat;
    }));
  }, []);

  return {
    chats,
    messages,
    isConnected,
    sendMessage,
    transferToHuman,
    closeConversation,
    refreshConversations,
    fetchMessages,
    markAsRead
  };
};