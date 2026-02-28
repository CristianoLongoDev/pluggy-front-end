import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pluggerBiLogo from '@/assets/plugger-bi-logo.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, User, Search, Moon, Sun, LogOut, MessageSquare, FileText, Bot, Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { runAuthDiagnostics } from '@/lib/authValidation';
import { getAccessToken } from '@/lib/tokenStorage';
import { toast } from '@/hooks/use-toast';
import { NotificationSoundSelector } from '@/components/NotificationSoundSelector';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
const Header: React.FC = () => {
  const {
    profile,
    signOut,
    isAdmin
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const navigate = useNavigate();
  const { settings, updateSoundType, updateRepeatCount } = useNotificationSettings();
  const [showSoundSelector, setShowSoundSelector] = useState(false);
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const handleAuthDiagnostics = async () => {
    console.log('🚀 Executando diagnóstico de autenticação manual...');
    await runAuthDiagnostics();
  };
  const copyTokenToClipboard = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await navigator.clipboard.writeText(token);
        toast({
          title: "Token copiado!",
          description: "Token de acesso copiado para a área de transferência."
        });
      } else {
        toast({
          title: "Erro",
          description: "Nenhum token encontrado.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o token.",
        variant: "destructive"
      });
    }
  };
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  return <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <img src="/lovable-uploads/3c727f6b-bf73-4d50-b695-32da2dab5698.png" alt="Pluggy Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Pluggy</h1>
        </div>
        
        
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Online
        </Badge>
      </div>


      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0">
            3
          </Badge>
        </Button>
        
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 ml-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-left">
                <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Administrador' : 'Agente'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAuthDiagnostics}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Testar Autenticação</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyTokenToClipboard}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Copiar Token (Postman)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSoundSelector(!showSoundSelector)}>
              <Volume2 className="mr-2 h-4 w-4" />
              <span>Sons de Notificação</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {showSoundSelector && (
          <div className="absolute top-16 right-6 z-50">
            <NotificationSoundSelector
              currentSound={settings.soundType}
              customSoundUrl={settings.customSoundUrl}
              repeatCount={settings.repeatCount || 1}
              onSoundChange={updateSoundType}
              onRepeatChange={updateRepeatCount}
              onClose={() => setShowSoundSelector(false)}
            />
          </div>
        )}
      </div>
    </header>;
};
export default Header;