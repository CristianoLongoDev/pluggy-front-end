import { useEffect, useRef, useCallback, useState } from 'react';
import { useNotificationSettings } from './useNotificationSettings';

export type SoundType = 'beep' | 'ding' | 'chime' | 'pop' | 'custom' | 'silent';

interface NotificationOptions {
  originalTitle: string;
  originalFavicon: string;
  alternateTitle: string;
}

export const useNotifications = (options: NotificationOptions) => {
  const [isNotifying, setIsNotifying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleElementRef = useRef<HTMLTitleElement | null>(null);
  const faviconElementRef = useRef<HTMLLinkElement | null>(null);
  const currentStateRef = useRef<'original' | 'alternate'>('original');
  const { settings } = useNotificationSettings();

  // Inicializa elementos DOM
  useEffect(() => {
    titleElementRef.current = document.querySelector('title');
    faviconElementRef.current = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  }, []);

  const generateTone = useCallback((frequency: number, duration: number, type: OscillatorType, repeats: number = 1) => {
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
  }, []);

  const playAudioWithRepeats = useCallback((audioSrc: string, count: number) => {
    if (count > 0) {
      const audio = new Audio(audioSrc);
      audio.play().catch(e => console.log('Não foi possível tocar o som:', e));
      
      audio.onended = () => {
        if (count > 1) {
          setTimeout(() => playAudioWithRepeats(audioSrc, count - 1), 200);
        }
      };
    }
  }, []);

  const alternateDisplay = useCallback(() => {
    if (!titleElementRef.current || !faviconElementRef.current) return;

    currentStateRef.current = currentStateRef.current === 'original' ? 'alternate' : 'original';
    
    if (currentStateRef.current === 'alternate') {
      titleElementRef.current.textContent = options.alternateTitle;
      // Para o favicon alternado, usamos um ícone de notificação simples
      faviconElementRef.current.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">!</text></svg>';
    } else {
      titleElementRef.current.textContent = options.originalTitle;
      faviconElementRef.current.href = options.originalFavicon;
    }
  }, [options]);

  const startNotifications = useCallback(() => {
    if (isNotifying) return;
    
    console.log('🔔 Iniciando notificações');
    setIsNotifying(true);
    
    // Toca som de notificação repetidas vezes
    if (settings.soundType !== 'silent') {
      const repeats = settings.repeatCount || 1;
      
      switch (settings.soundType) {
        case 'beep':
          playAudioWithRepeats('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdCzeFz/LVdSIF', repeats);
          break;
        case 'ding':
          generateTone(1000, 150, 'sine', repeats);
          break;
        case 'chime':
          generateTone(800, 300, 'triangle', repeats);
          break;
        case 'pop':
          generateTone(1500, 100, 'square', repeats);
          break;
        case 'custom':
          if (settings.customSoundUrl) {
            playAudioWithRepeats(settings.customSoundUrl, repeats);
          }
          break;
      }
    }
    
    // Inicia alternância visual
    intervalRef.current = setInterval(alternateDisplay, 1000);
  }, [isNotifying, alternateDisplay, settings.soundType, settings.repeatCount, settings.customSoundUrl, generateTone, playAudioWithRepeats]);

  const stopNotifications = useCallback(() => {
    if (!isNotifying) return;
    
    console.log('🔕 Parando notificações');
    setIsNotifying(false);
    
    // Para a alternância
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Restaura estado original
    if (titleElementRef.current && faviconElementRef.current) {
      titleElementRef.current.textContent = options.originalTitle;
      faviconElementRef.current.href = options.originalFavicon;
    }
    currentStateRef.current = 'original';
  }, [isNotifying, options]);

  // Para notificações quando a página fica ativa
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isNotifying) {
        stopNotifications();
      }
    };

    const handleFocus = () => {
      if (isNotifying) {
        stopNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isNotifying, stopNotifications]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isNotifying,
    startNotifications,
    stopNotifications
  };
};