import { useState, useEffect } from 'react';
import { SoundType } from './useNotifications';

interface NotificationSettings {
  soundType: SoundType;
  customSoundUrl?: string;
  repeatCount: number;
}

const COOKIE_NAME = 'notification_settings';

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    soundType: 'beep',
    repeatCount: 1
  });

  // Carregar configurações do cookie na inicialização
  useEffect(() => {
    const savedSettings = getCookie(COOKIE_NAME);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.log('Erro ao carregar configurações de notificação:', error);
      }
    }
  }, []);

  // Salvar configurações no cookie
  const updateSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    setCookie(COOKIE_NAME, JSON.stringify(newSettings), 365); // Expira em 1 ano
  };

  const updateSoundType = (soundType: SoundType, customUrl?: string) => {
    const newSettings: NotificationSettings = {
      ...settings,
      soundType,
      customSoundUrl: customUrl
    };
    updateSettings(newSettings);
  };

  const updateRepeatCount = (repeatCount: number) => {
    const newSettings: NotificationSettings = {
      ...settings,
      repeatCount
    };
    updateSettings(newSettings);
  };

  return {
    settings,
    updateSoundType,
    updateRepeatCount
  };
};

// Utilitários para cookies
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}