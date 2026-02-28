import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ConversationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Chat[];
  customerName: string;
  channel: string;
  onSelectConversations: (conversations: Chat[]) => void;
}

const ConversationHistoryDialog: React.FC<ConversationHistoryDialogProps> = ({
  open,
  onOpenChange,
  conversations,
  customerName,
  channel,
  onSelectConversations
}) => {
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

  const handleSelectAll = () => {
    onSelectConversations(conversations);
    onOpenChange(false);
  };

  const handleSelectConversation = (conversation: Chat) => {
    onSelectConversations([conversation]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={conversations[0]?.customerAvatar} />
              <AvatarFallback>{customerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-lg">{customerName}</span>
              <div className="flex items-center space-x-1 mt-1">
                {channel === 'whatsapp' && (
                  <img src="/lovable-uploads/84640d55-cdf5-4bb9-9e7b-d1c9310ed0e6.png" alt="WhatsApp" className="w-4 h-4" />
                )}
                <span className="text-sm text-muted-foreground capitalize">{channel}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-2 max-h-96">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              {conversations.length} conversa{conversations.length !== 1 ? 's' : ''} encontrada{conversations.length !== 1 ? 's' : ''}
            </span>
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              Ver Todas ({conversations.length})
            </Button>
          </div>
          
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handleSelectConversation(conversation)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(conversation.status)}
                  <span className="text-sm font-medium">
                    {getStatusText(conversation.status)}
                  </span>
                  <Badge 
                    variant={conversation.status === 'closed' ? 'secondary' : 'default'}
                    className="text-xs"
                  >
                    {conversation.status === 'closed' ? 'Encerrada' : 'Ativa'}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {conversation.timestamp}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground truncate">
                {conversation.lastMessage}
              </p>
              
              {conversation.unreadCount > 0 && (
                <div className="mt-2">
                  <Badge variant="destructive" className="text-xs">
                    {conversation.unreadCount} não lida{conversation.unreadCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationHistoryDialog;