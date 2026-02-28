
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Bot, User } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

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

interface GroupedChat {
  groupKey: string;
  customerName: string;
  customerAvatar?: string;
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'widget';
  lastMessage: string;
  timestamp: string;
  status: 'ai' | 'human' | 'pending' | 'closed' | 'waiting';
  unreadCount: number;
  conversationCount: number;
  conversations: Chat[];
  latestConversation: Chat;
  hasClosedConversations: boolean;
}

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (groupKey: string, conversations: Chat[]) => void;
  onLoadMoreConversations: (groupKey: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onChatSelect, onLoadMoreConversations }) => {
  // Agrupar conversas por customerName + channel - mostrando apenas a mais recente
  const groupedChats = React.useMemo(() => {
    // Primeiro ordenar todas as conversas por timestamp (mais recente primeiro)
    const sortedChats = [...chats].sort((a, b) => {
      // Parse do timestamp - pode estar em formato dd/MM/yyyy ou ISO
      let dateA: Date, dateB: Date;
      
      if (a.timestamp.includes('/')) {
        // Formato dd/MM/yyyy HH:mm - converter para ISO
        const [datePart, timePart] = a.timestamp.split(' ');
        const [day, month, year] = datePart.split('/');
        dateA = new Date(`${year}-${month}-${day}${timePart ? `T${timePart}:00` : 'T00:00:00'}`);
      } else {
        dateA = new Date(a.timestamp);
      }
      
      if (b.timestamp.includes('/')) {
        // Formato dd/MM/yyyy HH:mm - converter para ISO
        const [datePart, timePart] = b.timestamp.split(' ');
        const [day, month, year] = datePart.split('/');
        dateB = new Date(`${year}-${month}-${day}${timePart ? `T${timePart}:00` : 'T00:00:00'}`);
      } else {
        dateB = new Date(b.timestamp);
      }
      
      return dateB.getTime() - dateA.getTime();
    });
    
    const groups: { [key: string]: GroupedChat } = {};
    
    sortedChats.forEach(chat => {
      const groupKey = `${chat.customerName}-${chat.channel}`;
      
      if (!groups[groupKey]) {
        // Primeira conversa do grupo (que já é a mais recente devido ao sort)
        groups[groupKey] = {
          groupKey,
          customerName: chat.customerName,
          customerAvatar: chat.customerAvatar,
          channel: chat.channel,
          lastMessage: chat.lastMessage,
          timestamp: chat.timestamp,
          status: chat.status,
          unreadCount: chat.unreadCount,
          conversationCount: 1,
          conversations: [chat],
          latestConversation: chat,
          hasClosedConversations: chat.status === 'closed'
        };
      } else {
        // Adicionar conversa ao grupo existente
        groups[groupKey].conversationCount += 1;
        groups[groupKey].conversations.push(chat);
        
        // Verificar se há conversas encerradas
        if (chat.status === 'closed') {
          groups[groupKey].hasClosedConversations = true;
        }
        
        // Somar unreadCount apenas de conversas ativas
        if (chat.status !== 'closed') {
          groups[groupKey].unreadCount += chat.unreadCount;
        }
      }
    });
    
    // Retornar grupos ordenados por timestamp da última mensagem
    return Object.values(groups).sort((a, b) => {
      // Parse do timestamp para ordenação correta
      let dateA: Date, dateB: Date;
      
      if (a.timestamp.includes('/')) {
        const [datePart, timePart] = a.timestamp.split(' ');
        const [day, month, year] = datePart.split('/');
        dateA = new Date(`${year}-${month}-${day}${timePart ? `T${timePart}:00` : 'T00:00:00'}`);
      } else {
        dateA = new Date(a.timestamp);
      }
      
      if (b.timestamp.includes('/')) {
        const [datePart, timePart] = b.timestamp.split(' ');
        const [day, month, year] = datePart.split('/');
        dateB = new Date(`${year}-${month}-${day}${timePart ? `T${timePart}:00` : 'T00:00:00'}`);
      } else {
        dateB = new Date(b.timestamp);
      }
      
      return dateB.getTime() - dateA.getTime();
    });
  }, [chats]);
  const getChannelColor = (channel: string) => {
    const colors = {
      whatsapp: 'bg-green-500',
      instagram: 'bg-pink-500',
      facebook: 'bg-blue-500',
      widget: 'bg-purple-500',
    };
    return colors[channel as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ai':
        return <Bot className="w-3 h-3 text-blue-500" />;
      case 'human':
        return <User className="w-3 h-3 text-green-500" />;
      default:
        return <MessageSquare className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      ai: 'IA',
      human: 'Humano',
      pending: 'Pendente',
      closed: 'Finalizado',
      waiting: 'Aguardando'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Se já está formatado (contém "/"), retorna como está
      if (timestamp.includes('/')) {
        return timestamp;
      }
      // Se é uma data ISO, formata para o fuso correto
      const date = new Date(timestamp);
      return formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return timestamp; // Fallback para o valor original caso haja erro
    }
  };

  return (
    <div className="space-y-2">
      {groupedChats.map((group) => (
        <div
          key={group.groupKey}
          className={`p-4 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
            selectedChatId === group.groupKey ? 'bg-muted' : ''
          }`}
          onClick={() => onChatSelect(group.groupKey, [group.latestConversation])}
        >
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={group.customerAvatar} />
                <AvatarFallback>{group.customerName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div 
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${
                  group.conversations.some(conv => conv.status !== 'closed') 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                } flex items-center justify-center`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  group.conversations.some(conv => conv.status !== 'closed') 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}></div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium truncate">{group.customerName}</h4>
                <span className="text-xs text-muted-foreground">{formatTimestamp(group.timestamp)}</span>
              </div>
              
              <div className="flex items-center space-x-1 mb-2">
                {group.channel === 'whatsapp' && (
                  <img src="/lovable-uploads/84640d55-cdf5-4bb9-9e7b-d1c9310ed0e6.png" alt="WhatsApp" className="w-4 h-4" />
                )}
                {group.channel === 'instagram' && (
                  <MessageSquare className="w-3 h-3 text-pink-500" />
                )}
                {group.channel === 'facebook' && (
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                )}
                {group.channel === 'widget' && (
                  <MessageSquare className="w-3 h-3 text-purple-500" />
                )}
                <span className="text-sm text-muted-foreground capitalize">
                  {group.channel}
                </span>
                {group.conversationCount > 1 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {group.conversationCount}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground truncate mb-2">
                {group.lastMessage}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(group.status)}
                  <span className="text-xs text-muted-foreground">
                    {getStatusText(group.status)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {group.hasClosedConversations && group.conversationCount > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔄 Clicando para carregar mais conversas do grupo:', group.groupKey);
                        onLoadMoreConversations(group.groupKey);
                      }}
                      className="text-xs text-primary hover:text-primary/80 underline font-medium"
                    >
                      +{group.conversationCount - 1} antigas
                    </button>
                  )}
                  
                  {group.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                      {group.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;
