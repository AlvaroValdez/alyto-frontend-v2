import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración Capacitor — app Android Alyto (Google Play).
 *
 * - `appId` es INMUTABLE una vez publicado en Play (= applicationId Gradle).
 * - `androidScheme: 'https'` + `hostname` fijan el origin del WebView en
 *   `https://app.alyto.app`, así las llamadas a la API (api.alyto.app) son
 *   cross-origin predecibles → el backend debe permitir ese origin en
 *   ALLOWED_ORIGINS. La sesión viaja por header Bearer (localStorage), no por
 *   cookie (las cookies cross-domain no fluyen dentro del WebView).
 * - Los assets web se sirven desde el bundle local (dist/), NO desde un server
 *   remoto: no se define `server.url`.
 */
const config: CapacitorConfig = {
  appId: 'app.alyto.android',
  appName: 'Alyto',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'app.alyto.app',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#F8FAFC',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
