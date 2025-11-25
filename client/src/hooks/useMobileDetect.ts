import { useEffect } from 'react';

export function useMobileDetect() {
  useEffect(() => {
    // Función para detectar si es mobile
    const isMobile = () => {
      // Método 1: Detectar por viewport width
      const isMobileByWidth = window.innerWidth <= 768;
      
      // Método 2: Detectar por user-agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileByUA = mobileRegex.test(userAgent.toLowerCase());
      
      // Método 3: Detectar por media query
      const isMobileByMediaQuery = window.matchMedia('(max-width: 768px)').matches;
      
      // Si cumple al menos 2 de los 3 métodos, es mobile
      const methods = [isMobileByWidth, isMobileByUA, isMobileByMediaQuery];
      const mobileCount = methods.filter(Boolean).length;
      
      return mobileCount >= 2;
    };

    // Si no es mobile, redirigir a Google
    if (!isMobile()) {
      window.location.href = 'https://www.google.com';
      return;
    }
  }, []);
}
