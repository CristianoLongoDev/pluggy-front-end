import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, Bot, User, MoreVertical, UserPlus, MessageSquare, Info, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateAndSanitizeMessage } from '@/lib/validation';
import { formatInTimeZone } from 'date-fns-tz';
import { useUserProfiles } from '@/hooks/useUserProfiles';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: 'customer' | 'ai' | 'agent' | 'human';
  senderName?: string;
  conversationId?: string;
  user_id?: string;
}

interface ChatAreaProps {
  selectedChat: any;
  conversations?: any[];
  messages: Message[];
  allMessages?: { [chatId: string]: Message[] }; // Todas as mensagens organizadas por conversa
  onSendMessage: (message: string) => void;
  onTransferToHuman: () => void;
  onCloseConversation: () => void;
  isInfoExpanded?: boolean;
  onToggleInfoExpanded?: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedChat,
  conversations = [],
  messages,
  allMessages = {},
  onSendMessage,
  onTransferToHuman,
  onCloseConversation,
  isInfoExpanded = false,
  onToggleInfoExpanded,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [openConversations, setOpenConversations] = useState<string[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<{ [userId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fetchUserProfile, getUserName, loadedUserIds } = useUserProfiles();

  // Manter ordem natural das mensagens (mais antiga primeiro, mais recente por último)
  const sortedMessages = [...messages];
  
  // Inverter ordem das conversas também (mais antiga primeiro, mais recente por último)
  const sortedConversations = [...conversations].reverse();

  // Definir qual conversa está expandida (apenas a última/mais recente)
  useEffect(() => {
    if (conversations.length > 0) {
      const lastConversationId = conversations[0]?.id?.toString();
      if (lastConversationId) {
        setOpenConversations([lastConversationId]);
      }
    }
  }, [conversations]);

  // Buscar nomes dos usuários para mensagens com user_id
  useEffect(() => {
    const processMessages = async () => {
      const messagesWithUserId = messages.filter(msg => msg.user_id);
      const allUserIds = [
        ...messagesWithUserId.map(msg => msg.user_id!),
        ...Object.values(allMessages).flat().filter(msg => msg.user_id).map(msg => msg.user_id!)
      ];
      
      const uniqueUserIds = [...new Set(allUserIds)];
      
      for (const userId of uniqueUserIds) {
        if (!profilesLoaded[userId]) {
          await fetchUserProfile(userId);
          setProfilesLoaded(prev => ({ ...prev, [userId]: true }));
        }
      }
    };

    processMessages();
  }, [messages, allMessages, fetchUserProfile, profilesLoaded, loadedUserIds]);

  // Auto-scroll to bottom when messages change or chat is selected
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChat]);

  const handleSendMessage = () => {
    console.log('🎯 ChatArea - handleSendMessage chamado, messageInput:', messageInput);
    if (messageInput.trim()) {
      try {
        const sanitizedMessage = validateAndSanitizeMessage(messageInput);
        console.log('🎯 ChatArea - mensagem sanitizada:', sanitizedMessage);
        console.log('🎯 ChatArea - chamando onSendMessage...');
        onSendMessage(sanitizedMessage);
        setMessageInput('');
        console.log('🎯 ChatArea - onSendMessage executado, input limpo');
      } catch (error) {
        console.error('Invalid message:', error);
        return;
      }
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
          <p className="text-muted-foreground">
            Escolha uma conversa da lista para começar a visualizar e responder mensagens.
          </p>
        </div>
      </div>
    );
  }

  // Verificar se todas as conversas estão encerradas
  const hasActiveConversations = conversations.some(conv => conv.status !== 'closed');
  const isAllClosed = !hasActiveConversations && conversations.length > 0;

  const getChannelBadge = (channel: string) => {
    const channelConfig = {
      whatsapp: { label: 'WhatsApp', color: 'bg-green-500' },
      instagram: { label: 'Instagram', color: 'bg-pink-500' },
      facebook: { label: 'Facebook', color: 'bg-blue-500' },
      widget: { label: 'Widget', color: 'bg-purple-500' },
    };
    const config = channelConfig[channel as keyof typeof channelConfig];
    return (
      <Badge variant="secondary" className="text-xs">
        <div className="flex items-center space-x-1">
          {channel === 'whatsapp' && (
            <img src="/lovable-uploads/84640d55-cdf5-4bb9-9e7b-d1c9310ed0e6.png" alt="WhatsApp" className="w-3 h-3" />
          )}
          {channel === 'instagram' && (
            <MessageSquare className="w-3 h-3 text-pink-500" />
          )}
          {channel === 'facebook' && (
            <MessageSquare className="w-3 h-3 text-blue-500" />
          )}
          {channel === 'widget' && (
            <MessageSquare className="w-3 h-3 text-purple-500" />
          )}
          <span>{config.label}</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedChat.customerAvatar} />
              <AvatarFallback>{selectedChat.customerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{selectedChat.customerName}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {getChannelBadge(selectedChat.channel)}
                {selectedChat.conversationCount > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {selectedChat.conversationCount} conversas
                  </Badge>
                )}
                <Badge variant={selectedChat.status === 'ai' ? 'default' : 'destructive'} className={`text-xs ${selectedChat.status === 'ai' ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                  {selectedChat.status === 'ai' ? (
                    <>
                      <Bot className="w-3 h-3 mr-1" />
                      IA Ativa
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 mr-1" />
                      IA Inativa
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedChat.status !== 'ai' && selectedChat.status !== 'closed' && hasActiveConversations && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={onCloseConversation}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Encerrar Conversa
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {onToggleInfoExpanded && (
                  <DropdownMenuItem onClick={onToggleInfoExpanded}>
                    <Info className="w-4 h-4 mr-2" />
                    {isInfoExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Ocultar informações
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Exibir informações
                      </>
                    )}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mensagem para exibir</p>
            </div>
          </div>
        ) : conversations.length <= 1 ? (
          // Exibir mensagens normalmente se apenas uma conversa
          <div className="space-y-3">
            {sortedMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] ${
                    message.sender === 'customer'
                      ? 'bg-muted/80 text-foreground rounded-l-lg rounded-tr-lg rounded-br-sm'
                      : message.sender === 'ai' || message.sender === 'agent'
                      ? 'bg-black text-white rounded-r-lg rounded-tl-lg rounded-bl-sm'
                      : message.sender === 'human'
                      ? 'bg-blue-600 text-white rounded-r-lg rounded-tl-lg rounded-bl-sm'
                      : 'bg-blue-600 text-white rounded-r-lg rounded-tl-lg rounded-bl-sm'
                  } p-3 shadow-sm`}
                >
                  {message.sender !== 'customer' && (
                    <div className="flex items-center space-x-1 mb-1">
                      {message.sender === 'ai' || message.sender === 'agent' ? (
                        <Bot className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                       <span className="text-xs opacity-80">
                         {message.user_id ? getUserName(message.user_id) : (message.sender === 'ai' || message.sender === 'agent') ? (message.senderName || 'IA') : message.sender === 'human' ? (message.senderName || 'Atendente') : (selectedChat.botAgentName || 'Atendente')}
                       </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">{message.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Agrupar mensagens por conversa quando múltiplas conversas com componente colapsível
          <div className="space-y-4">
            {sortedConversations.map((conversation, index) => {
              const conversationId = conversation.id?.toString();
              const isOpen = openConversations.includes(conversationId);
              const isFirstConversation = index === sortedConversations.length - 1; // Última conversa na ordem invertida (mais recente)
              
              // Usar as mensagens específicas desta conversa do allMessages
              const conversationMessages = allMessages[conversationId] ? 
                [...allMessages[conversationId]]
                : [];
              const lastMessage = conversationMessages[conversationMessages.length - 1];
              
              // Usar o timestamp da conversa que já está formatado
              const conversationDate = conversation.timestamp || 'Data não disponível';
              
              const toggleConversation = () => {
                setOpenConversations(prev => 
                  isOpen 
                    ? prev.filter(id => id !== conversationId)
                    : [...prev, conversationId]
                );
              };

              return (
                <Collapsible 
                  key={conversation.id} 
                  open={isOpen}
                  onOpenChange={toggleConversation}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <CollapsibleTrigger className={`w-full p-3 transition-colors ${
                    conversation.status === 'closed' 
                      ? 'bg-muted/30 hover:bg-muted/50' 
                      : 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {conversation.status === 'closed' ? 'Conversa encerrada' : 'Conversa ativa'}
                        </span>
                        {lastMessage && (
                          <Badge variant="outline" className="text-xs">
                            Última: {lastMessage.timestamp}
                          </Badge>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="p-4">
                    <div className="space-y-3">
                      {conversationMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[70%] ${
                              message.sender === 'customer'
                                ? 'bg-muted/80 text-foreground rounded-l-lg rounded-tr-lg rounded-br-sm'
                                : message.sender === 'ai' || message.sender === 'agent'
                                ? 'bg-black text-white rounded-r-lg rounded-tl-lg rounded-bl-sm'
                                : message.sender === 'human'
                                ? 'bg-blue-600 text-white rounded-r-lg rounded-tl-lg rounded-bl-sm'
                                : 'bg-blue-600 text-white rounded-r-lg rounded-tl-lg rounded-bl-sm'
                            } p-3 shadow-sm`}
                          >
                            {message.sender !== 'customer' && (
                              <div className="flex items-center space-x-1 mb-1">
                                {message.sender === 'ai' || message.sender === 'agent' ? (
                                  <Bot className="w-3 h-3" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                 <span className="text-xs opacity-80">
                                   {message.user_id ? getUserName(message.user_id) : (message.sender === 'ai' || message.sender === 'agent') ? (message.senderName || 'IA') : message.sender === 'human' ? (message.senderName || 'Atendente') : (selectedChat.botAgentName || 'Atendente')}
                                 </span>
                              </div>
                            )}
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <span className="text-xs opacity-70 mt-1 block">{message.timestamp}</span>
                          </div>
                        </div>
                      ))}
                      
                      {!isFirstConversation && conversationMessages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-4">
                          Conversa sem mensagens carregadas
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input / Attend Button */}
      <div className="p-4 border-t border-border bg-card">
        {selectedChat.status === 'closed' || isAllClosed ? (
          // Mostrar mensagem quando conversa está encerrada
          <div className="flex justify-center">
            <div className="text-center text-muted-foreground">
              <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Conversa encerrada</p>
              <p className="text-xs opacity-70">Não é possível enviar mensagens</p>
            </div>
          </div>
        ) : selectedChat.status === 'ai' ? (
          // Mostrar apenas botão "Atender" quando IA está ativa
          <div className="flex justify-center">
            <Button 
              className="bg-accent hover:bg-accent/80 text-accent-foreground border-accent px-8" 
              onClick={onTransferToHuman}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Atender Conversa
            </Button>
          </div>
        ) : (
          // Mostrar campo de mensagem quando humano está atendendo
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="sm">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;