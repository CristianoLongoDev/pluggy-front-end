import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountData } from '@/hooks/useAccountData';
import { useChannels } from '@/hooks/useChannels';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { useNotifications } from '@/hooks/useNotifications';
import { useConversationSearch } from '@/hooks/useConversationSearch';
import Header from '@/components/Header';
import ChatSidebar from '@/components/ChatSidebar';
import ChatList from '@/components/ChatList';
import ChatArea from '@/components/ChatArea';
import ChatInfo from '@/components/ChatInfo';
import ConversationHistoryDialog from '@/components/ConversationHistoryDialog';
import { ChannelForm } from '@/components/ChannelForm';
import { BotList } from '@/components/BotList';
import PromptsManagement from '@/pages/PromptsManagement';
import IntentionsManagement from '@/pages/IntentionsManagement';
import FunctionsManagement from '@/pages/FunctionsManagement';
import IntegrationsManagement from '@/pages/IntegrationsManagement';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/getAuthHeaders';
import { MessageSquare, Plus, Edit, Trash2, MoreHorizontal, User, UserPlus, MoreVertical, Users, Search, Bot } from 'lucide-react';

// Interfaces para usuários
interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  avatar_url: string;
  account_id: string;
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  department: string;
}

// Componente de Gerenciamento de Usuários
const UsersTabContent: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'agent',
    department: ''
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch('https://pluggyapi.pluggerbi.com/users', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users || data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const headers = await getAuthHeaders();

      if (editingUser) {
        const res = await fetch(`https://pluggyapi.pluggerbi.com/users/${editingUser.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            full_name: formData.full_name,
            role: formData.role,
            department: formData.department,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        toast({
          title: "Usuário atualizado",
          description: "Dados do usuário foram atualizados com sucesso."
        });
      } else {
        const res = await fetch('https://pluggyapi.pluggerbi.com/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            department: formData.department,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || 'Erro ao criar usuário');
        }

        toast({
          title: "Usuário criado",
          description: "Novo usuário foi criado com sucesso."
        });
      }

      // Reset form and reload users
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'agent',
        department: ''
      });
      setEditingUser(null);
      setShowForm(false);
      loadUsers();

    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o usuário.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      role: user.role || 'agent',
      department: user.department || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (user: Profile) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.full_name}?`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`https://pluggyapi.pluggerbi.com/users/${user.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast({
        title: "Usuário excluído",
        description: "Usuário foi removido com sucesso."
      });

      loadUsers();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Administrador', variant: 'destructive' as const },
      manager: { label: 'Gerente', variant: 'default' as const },
      agent: { label: 'Agente', variant: 'secondary' as const }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, variant: 'outline' as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const openForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'agent',
      department: ''
    });
    setShowForm(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Acesso Negado</h3>
        <p className="text-muted-foreground text-center">
          Você não tem permissão para gerenciar usuários.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-semibold">Usuários Cadastrados</h3>
          <p className="text-muted-foreground">
            {users.length} usuário{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={openForm}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Função</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ex: Vendas, Suporte, etc."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? 'Atualizar' : 'Criar'} Usuário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando o primeiro usuário da sua conta.
            </p>
            <Button onClick={openForm}>
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Primeiro Usuário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {user.full_name || 'Nome não informado'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(user)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Função:</span>
                    {getRoleBadge(user.role)}
                  </div>
                  {user.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Departamento:</span>
                      <span className="text-xs font-medium">{user.department}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Criado em:</span>
                    <span className="text-xs">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

const Index = () => {
  const { profile, isAdmin } = useAuth();
  const { accountData, loading: accountLoading } = useAccountData();
  const { channels, loading: channelsLoading, fetchChannels, createChannel, updateChannel, deleteChannel } = useChannels();
  const { chats, messages, isConnected, sendMessage, transferToHuman, closeConversation, refreshConversations, fetchMessages, markAsRead } = useRealtimeConversations();
  const { toast } = useToast();
  
  // Configuração do sistema de notificações
  const notificationSystem = useNotifications({
    originalTitle: 'Pluggy',
    originalFavicon: '/lovable-uploads/3c727f6b-bf73-4d50-b695-32da2dab5698.png',
    alternateTitle: 'Nova Mensagem'
  });
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedConversations, setSelectedConversations] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState('conversations');
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Estados para histórico de conversas
  const [conversationHistoryOpen, setConversationHistoryOpen] = useState(false);
  const [historyGroupKey, setHistoryGroupKey] = useState('');
  const [historyConversations, setHistoryConversations] = useState<any[]>([]);
  const [historyCustomerName, setHistoryCustomerName] = useState('');
  const [historyChannel, setHistoryChannel] = useState('');
  
  // Hook de busca de conversas
  const { searchConversations, clearResults, results: searchResults, loading: searchLoading, error: searchError } = useConversationSearch();
  
  // Channel management states
  const [isChannelFormOpen, setIsChannelFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelFormMode, setChannelFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);

  // Controle de mensagens já processadas para notificação
  const [lastNotifiedMessages, setLastNotifiedMessages] = useState<{[chatId: number]: string}>({});

  // Monitorar mensagens para notificações
  useEffect(() => {
    if (chats.length === 0) {
      return;
    }

    let foundNewMessage = false;

    // Verificar se há nova mensagem de cliente em qualquer conversa quando a aba não está focada
    chats.forEach(chat => {
      const chatMessages = messages[chat.id] || [];
      const lastMessage = chatMessages[chatMessages.length - 1];
      
      if (lastMessage && lastMessage.sender === 'customer') {
        const messageKey = `${lastMessage.timestamp}-${lastMessage.content}`;
        const lastNotifiedKey = lastNotifiedMessages[chat.id];
        
        // Só notifica se for uma mensagem realmente nova (não processada antes)
        const isNewMessage = messageKey !== lastNotifiedKey;
        const shouldNotify = isNewMessage && document.hidden && !notificationSystem.isNotifying;
        
        if (shouldNotify) {
          console.log('🔔 NOVA MENSAGEM! Disparando notificação para chat:', chat.id);
          foundNewMessage = true;
          notificationSystem.startNotifications();
          
          // Atualizar controle de mensagens processadas
          setLastNotifiedMessages(prev => ({
            ...prev,
            [chat.id]: messageKey
          }));
        }
      }
    });

  }, [messages, chats, notificationSystem, lastNotifiedMessages]);
  
  // Fetch channels when entering channels section
  useEffect(() => {
    if (selectedSection === 'channels') {
      console.log('🔍 Index.tsx - Fetching channels para selectedSection:', selectedSection);
      fetchChannels();
    }
  }, [selectedSection]);

  // Debug do estado dos canais
  useEffect(() => {
    console.log('🔍 Index.tsx - Channels state:', { 
      channels, 
      channelsLength: channels.length, 
      channelsLoading,
      selectedSection 
    });
  }, [channels, channelsLoading, selectedSection]);
  
  // Atualizar selectedConversations quando chats mudarem
  useEffect(() => {
    if (selectedChatId) {
      const updatedConversations = chats.filter(chat => chat.id === selectedChatId);
      if (updatedConversations.length > 0) {
        const currentStatus = selectedConversations[0]?.status;
        const newStatus = updatedConversations[0].status;
        
        console.log('🔄 Verificando mudança de status:', {
          chatId: selectedChatId,
          hasSelectedConversations: selectedConversations.length > 0,
          currentStatus: currentStatus,
          newStatus: newStatus,
          needsUpdate: currentStatus !== newStatus
        });
        
        if (currentStatus !== newStatus) {
          console.log('🔄 Atualizando selectedConversations devido a mudança no chat:', {
            chatId: selectedChatId,
            oldStatus: currentStatus,
            newStatus: newStatus
          });
          setSelectedConversations(updatedConversations);
        }
      }
    }
  }, [chats, selectedChatId]);
  
  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  
  // Conversas para exibir - busca via API ou WebSocket
  const displayChats = isSearchMode ? 
    searchResults.map(result => ({
      id: result.conversation_id.toString(),
      customerName: result.contact_name,
      lastMessage: result.message_preview,
      timestamp: result.last_message_at,
      channel: 'whatsapp' as const,
      status: result.status as 'ai' | 'human' | 'pending' | 'closed' | 'waiting',
      unreadCount: 0,
      isActive: false
    })) : 
    chats;
  
  const filteredChats = displayChats.filter(chat => {
    const matchesFilter = selectedFilter === 'all' || chat.status === selectedFilter;
    const matchesSearch = !isSearchMode && (
      chat.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesFilter && (isSearchMode || matchesSearch);
  });

  const handleSendMessage = (message: string) => {
    console.log('📋 Index.tsx - handleSendMessage chamado com:', message);
    console.log('📋 Index.tsx - selectedChatId:', selectedChatId);
    if (selectedChatId) {
      console.log('📋 Index.tsx - executando sendMessage...');
      sendMessage(selectedChatId, message);
      console.log('📋 Index.tsx - sendMessage executado');
    } else {
      console.log('📋 Index.tsx - ERRO: selectedChatId é null');
    }
  };

  const handleSearchSubmit = async (term: string) => {
    setIsSearchMode(true);
    await searchConversations(term);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setIsSearchMode(false);
    clearResults();
    setSelectedChatId(null);
  };

  const handleCloseConversation = async () => {
    console.log('🚀 Index.tsx - handleCloseConversation chamado para selectedChatId:', selectedChatId);
    console.log('🚀 Index.tsx - selectedConversations:', selectedConversations);
    
    if (selectedChatId && selectedConversations.length > 0) {
      try {
        // Usar o ID numérico da primeira conversa ativa ao invés do selectedChatId
        const activeConversation = selectedConversations.find(conv => conv.status !== 'closed');
        const conversationIdToClose = activeConversation ? activeConversation.id : selectedConversations[0].id;
        
        console.log('🔄 Index.tsx - ID da conversa a ser encerrada:', conversationIdToClose);
        console.log('🔄 Index.tsx - Antes de fechar - selectedConversations:', selectedConversations.map(c => ({ id: c.id, status: c.status })));
        
        await closeConversation(conversationIdToClose);
        
        console.log('🔄 Index.tsx - Após fechar - forçando atualização de selectedConversations');
        
        // Forçar atualização imediata do selectedConversations
        setSelectedConversations(prevConvs => 
          prevConvs.map(conv => 
            conv.id === conversationIdToClose ? { ...conv, status: 'closed' } : conv
          )
        );
        
        toast({
          title: "Conversa encerrada",
          description: "A conversa foi encerrada com sucesso.",
        });
      } catch (error) {
        console.error('❌ Erro ao encerrar conversa:', error);
        toast({
          title: "Erro",
          description: "Não foi possível encerrar a conversa.",
          variant: "destructive"
        });
      }
    }
  };

  // Channel management handlers
  const handleCreateChannel = () => {
    setChannelFormMode('create');
    setEditingChannel(null);
    setIsChannelFormOpen(true);
  };

  const handleEditChannel = (channel: any) => {
    setChannelFormMode('edit');
    setEditingChannel(channel);
    setIsChannelFormOpen(true);
  };

  const handleDeleteChannel = (channelId: string) => {
    setChannelToDelete(channelId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteChannel = async () => {
    if (channelToDelete) {
      const result = await deleteChannel(channelToDelete);
      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Canal excluído com sucesso"
        });
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao excluir canal",
          variant: "destructive"
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setChannelToDelete(null);
  };

  const handleChannelSubmit = async (channelData: any) => {
    if (channelFormMode === 'edit' && editingChannel) {
      return await updateChannel(channelData.id, channelData);
    } else {
      return await createChannel(channelData);
    }
  };

  const renderMainContent = () => {
    switch (selectedSection) {
      case 'conversations':
        if (!isConnected) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-lg font-medium text-destructive">Conexão perdida</div>
                <div className="text-sm text-muted-foreground">Tentando reconectar...</div>
              </div>
            </div>
          );
        }

        if (chats.length === 0) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
                <div className="text-lg font-medium">Nenhuma conversa ativa</div>
                <div className="text-sm text-muted-foreground">As conversas aparecerão aqui quando chegarem</div>
              </div>
            </div>
          );
        }

        return (
          <>
            <div className="w-[480px] border-r border-border bg-card overflow-y-auto">
              {/* Conversation search and filters */}
              <div className="p-4 border-b border-border space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar nas conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={selectedFilter === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter('all')}
                    className="flex-1 justify-start"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Todas
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {displayChats.length}
                    </Badge>
                  </Button>
                  <Button
                    variant={selectedFilter === 'ai' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter('ai')}
                    className="flex-1 justify-start"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    IA
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {displayChats.filter(chat => chat.status === 'ai').length}
                    </Badge>
                  </Button>
                  <Button
                    variant={selectedFilter === 'human' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter('human')}
                    className="flex-1 justify-start"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Humano
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {displayChats.filter(chat => chat.status === 'human').length}
                    </Badge>
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border-b border-border">
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  TODAS CONVERSAS ({filteredChats.length})
                </h3>
              </div>
              <div className="p-2">
                <ChatList
                  chats={filteredChats}
                  selectedChatId={selectedChatId}
                  onChatSelect={(groupKey, conversations) => {
                    console.log('🎯 GROUP SELECTED:', groupKey, conversations);
                    setSelectedChatId(groupKey);
                    setSelectedConversations(conversations);
                    
                    // Marcar todas as conversas como lidas e buscar mensagens de todas
                    conversations.forEach(chat => {
                      console.log('🎯 CALLING markAsRead for chat:', chat.id);
                      markAsRead(chat.id);
                      console.log('🎯 CALLING fetchMessages for chat:', chat.id);
                      fetchMessages(chat.id);
                    });
                  }}
                  onLoadMoreConversations={(groupKey) => {
                    console.log('Carregando mais conversas para o grupo:', groupKey);
                    
                    // Separar customer name e channel
                    const [customerName, channel] = groupKey.split('-');
                    const groupConversations = chats.filter(chat => 
                      chat.customerName === customerName && chat.channel === channel
                    );
                    
                    // Preparar dados para o diálogo
                    setHistoryGroupKey(groupKey);
                    setHistoryConversations(groupConversations);
                    setHistoryCustomerName(customerName);
                    setHistoryChannel(channel);
                    setConversationHistoryOpen(true);
                  }}
                />
              </div>
            </div>

            <ChatArea
              selectedChat={(() => {
                const chat = selectedConversations.length > 0 ? {
                  ...selectedConversations[0],
                  conversationCount: selectedConversations.length
                } : null;
                console.log('🎯 ChatArea recebendo selectedChat:', {
                  chatId: chat?.id,
                  status: chat?.status,
                  hasSelectedConversations: selectedConversations.length > 0,
                  selectedConversationsStatus: selectedConversations.map(c => c.status)
                });
                return chat;
              })()}
              conversations={selectedConversations}
              messages={selectedConversations.length > 0 ? 
                // Pegar apenas as mensagens da conversa mais recente (primeira do array)
                (messages[selectedConversations[0].id] || [])
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                : []
              }
              allMessages={messages}
              onSendMessage={(message) => {
                // Enviar para a conversa mais recente do grupo
                if (selectedConversations.length > 0) {
                  const mostRecentConv = selectedConversations[0];
                  sendMessage(mostRecentConv.id, message);
                }
              }}
              onTransferToHuman={async () => {
                // Transferir todas as conversas ativas do grupo
                const promises = selectedConversations
                  .filter(conv => conv.status !== 'closed')
                  .map(conv => transferToHuman(conv.id));
                
                await Promise.all(promises);
                
                // Atualizar imediatamente o selectedConversations após sucesso
                setSelectedConversations(prevConvs => 
                  prevConvs.map(conv => 
                    conv.status !== 'closed' ? { ...conv, status: 'human' } : conv
                  )
                );
                
                toast({
                  title: "Conversas transferidas",
                  description: "As conversas ativas foram transferidas para atendimento humano.",
                });
              }}
              onCloseConversation={handleCloseConversation}
              isInfoExpanded={isInfoExpanded}
              onToggleInfoExpanded={() => setIsInfoExpanded(!isInfoExpanded)}
            />

            {isInfoExpanded && (
              <ChatInfo 
                selectedChat={selectedChat} 
                isExpanded={isInfoExpanded} 
              />
            )}
          </>
        );

      case 'account':
        return (
          <div className="flex-1 p-6">
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Conta</TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-4">
                <PageHeader 
                  title="Informações da Conta" 
                  description="Visualize e gerencie as configurações da sua conta" 
                />
                <Card>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">ID da Conta</label>
                      {accountLoading ? (
                        <Skeleton className="h-6 w-48 mt-1" />
                      ) : (
                        <p className="text-lg mt-1 font-mono">{accountData?.id || 'Não informado'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Nome da Conta</label>
                      {accountLoading ? (
                        <Skeleton className="h-6 w-64 mt-1" />
                      ) : (
                        <p className="text-lg mt-1">{accountData?.name || 'Nome não disponível'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="users" className="space-y-4">
                <UsersTabContent />
              </TabsContent>
            </Tabs>
          </div>
        );

      case 'channels':
        return (
          <div className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <PageHeader 
                  title="Canais de Atendimento" 
                  description="Configure e gerencie os canais de comunicação com seus clientes" 
                />
              </div>
              <Button onClick={handleCreateChannel}>
                <Plus className="w-4 h-4 mr-2" />
                Incluir Novo
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                {channelsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : channels.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum canal encontrado
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data Criação</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {channels.map((channel) => (
                          <TableRow key={channel.id}>
                            <TableCell className="font-mono text-sm">
                              {channel.id?.substring(0, 8) + '...'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {channel.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {channel.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={Number(channel.active) === 1 ? "default" : "destructive"}>
                                {Number(channel.active) === 1 ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {channel.created_at ? new Date(channel.created_at).toLocaleDateString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditChannel(channel)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteChannel(channel.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Channel Form Modal */}
            <ChannelForm
              open={isChannelFormOpen}
              onOpenChange={setIsChannelFormOpen}
              channel={editingChannel}
              mode={channelFormMode}
              onSubmit={handleChannelSubmit}
            />
            
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteChannel}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );

      case 'agent-bots':
        return (
          <div className="flex-1 p-6">
            <BotList />
          </div>
        );

      case 'prompts':
        return (
          <div className="flex-1 h-full overflow-hidden p-6">
            <PromptsManagement />
          </div>
        );

      case 'intents':
        return (
          <div className="flex-1 h-full overflow-hidden p-6">
            <IntentionsManagement />
          </div>
        );

      case 'roles':
        return (
          <div className="flex-1 h-full overflow-hidden p-6">
            <FunctionsManagement />
          </div>
        );

      case 'integrations':
        return <IntegrationsManagement />;

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={handleSearchClear}
          selectedSection={selectedSection}
          onSectionChange={setSelectedSection}
          chats={chats}
        />
        
        {renderMainContent()}
      </div>

      <ConversationHistoryDialog
        open={conversationHistoryOpen}
        onOpenChange={setConversationHistoryOpen}
        conversations={historyConversations}
        customerName={historyCustomerName}
        channel={historyChannel}
        onSelectConversations={(conversations) => {
          setSelectedChatId(historyGroupKey);
          setSelectedConversations(conversations);
          
          // Buscar mensagens de todas as conversas selecionadas
          conversations.forEach(chat => {
            markAsRead(chat.id);
            fetchMessages(chat.id);
          });
        }}
      />
    </div>
  );
};

export default Index;