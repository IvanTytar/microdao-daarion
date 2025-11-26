/**
 * PWA utilities for DAARION
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return;
  }
  
  // Only register in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PWA] Skipping SW registration in development');
    return;
  }
  
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[PWA] Service Worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              console.log('[PWA] New content available, refresh to update');
              // Could show a toast notification here
            }
          });
        }
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });
}

export function unregisterServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister().then((success) => {
      if (success) {
        console.log('[PWA] Service Worker unregistered');
      }
    });
  });
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if app can be installed
 */
export function canInstall(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if already installed
  if (isStandalone()) return false;
  
  // Check for beforeinstallprompt support
  return 'BeforeInstallPromptEvent' in window || 
         'onbeforeinstallprompt' in window;
}

