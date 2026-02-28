import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Volume2, VolumeX, X } from 'lucide-react';
import { SoundType } from '@/hooks/useNotifications';

interface NotificationSoundSelectorProps {
  currentSound: SoundType;
  customSoundUrl?: string;
  repeatCount: number;
  onSoundChange: (soundType: SoundType, customUrl?: string) => void;
  onRepeatChange: (count: number) => void;
  onClose?: () => void;
}

export const NotificationSoundSelector: React.FC<NotificationSoundSelectorProps> = ({
  currentSound,
  customSoundUrl,
  repeatCount,
  onSoundChange,
  onRepeatChange,
  onClose
}) => {
  const [testSound, setTestSound] = useState<SoundType>(currentSound);
  const [customUrl, setCustomUrl] = useState(customSoundUrl || '');
  const cardRef = useRef<HTMLDivElement>(null);

  // Fechar quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // Verificar se o clique foi em um elemento do select (portal)
        const target = event.target as Element;
        const isSelectContent = target.closest('[data-radix-select-content]') || 
                               target.closest('[data-radix-popper-content-wrapper]') ||
                               target.closest('[role="listbox"]');
        
        if (!isSelectContent) {
          onClose?.();
        }
      }
    };

    // Delay para evitar fechamento imediato ao abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const soundOptions = [
    { value: 'beep', label: 'Beep (Padrão)', description: 'Som tradicional de notificação' },
    { value: 'ding', label: 'Ding', description: 'Som agudo e rápido' },
    { value: 'chime', label: 'Chime', description: 'Som suave e melodioso' },
    { value: 'pop', label: 'Pop', description: 'Som tipo "pop"' },
    { value: 'custom', label: 'Personalizado', description: 'Use seu próprio arquivo de áudio' },
    { value: 'silent', label: 'Silencioso', description: 'Sem som de notificação' }
  ];

  const playTestSound = (soundType: SoundType, customUrl?: string, testRepeatCount?: number) => {
    if (soundType === 'silent') return;
    
    const repeats = testRepeatCount || repeatCount || 1;
    console.log('🔊 Tocando som:', soundType, 'repetições:', repeats);
    
    const playAudioWithRepeats = (audioSrc: string, count: number) => {
      if (count > 0) {
        const audio = new Audio(audioSrc);
        audio.play().catch(e => console.log('Erro ao tocar som:', e));
        
        audio.onended = () => {
          if (count > 1) {
            setTimeout(() => playAudioWithRepeats(audioSrc, count - 1), 200);
          }
        };
      }
    };
    
    switch (soundType) {
      case 'beep':
        playAudioWithRepeats('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIF', repeats);
        break;
      case 'ding':
        generateTone(1000, 150, 'sine', repeats);
        return;
      case 'chime':
        generateTone(800, 300, 'triangle', repeats);
        return;
      case 'pop':
        generateTone(1500, 100, 'square', repeats);
        return;
      case 'custom':
        if (customUrl) {
          playAudioWithRepeats(customUrl, repeats);
        }
        break;
    }
  };

  const generateTone = (frequency: number, duration: number, type: OscillatorType, repeats: number = 1) => {
    const playTone = (count: number) => {
      if (count > 0) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
        
        setTimeout(() => {
          audioContext.close();
          if (count > 1) {
            setTimeout(() => playTone(count - 1), 200);
          }
        }, duration);
      }
    };
    
    playTone(repeats);
  };

  const handleSoundChange = (value: string) => {
    const soundType = value as SoundType;
    setTestSound(soundType);
    
    if (soundType === 'custom') {
      onSoundChange(soundType, customUrl);
    } else {
      onSoundChange(soundType);
    }
    
    // Não fechar a janela automaticamente para permitir testar o som
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
    if (testSound === 'custom') {
      onSoundChange('custom', url);
    }
  };

  return (
    <Card ref={cardRef} className="w-full max-w-md shadow-lg border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Som de Notificação
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Escolha o som que será tocado quando receber novas mensagens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sound-select">Tipo de Som</Label>
          <Select value={testSound} onValueChange={handleSoundChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um som" />
            </SelectTrigger>
            <SelectContent>
              {soundOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {testSound === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="custom-url">URL do Arquivo de Áudio</Label>
            <Input
              id="custom-url"
              type="url"
              placeholder="https://exemplo.com/som.mp3"
              value={customUrl}
              onChange={(e) => handleCustomUrlChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Formatos suportados: MP3, WAV, OGG
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="repeat-count">Repetir Som</Label>
          <Select 
            value={(repeatCount || 1).toString()} 
            onValueChange={(value) => onRepeatChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Número de repetições" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 vez</SelectItem>
              <SelectItem value="2">2 vezes</SelectItem>
              <SelectItem value="3">3 vezes</SelectItem>
              <SelectItem value="4">4 vezes</SelectItem>
              <SelectItem value="5">5 vezes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Quantas vezes tocar o som a cada nova mensagem
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => playTestSound(testSound, customUrl, repeatCount)}
            disabled={testSound === 'silent'}
            className="flex-1"
          >
            {testSound === 'silent' ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Silencioso
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Testar Som
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};