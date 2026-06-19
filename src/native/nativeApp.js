/**
 * nativeApp.js — Inicialización nativa Capacitor (status bar, splash, botón
 * atrás de Android y deep links/App Links). Seguro de llamar en web: si no es
 * plataforma nativa, no hace nada.
 */

import { Capacitor } from '@capacitor/core';
import { goTo } from './navigation';

function isNative() {
  return Capacitor.isNativePlatform();
}

/** Extrae la ruta interna de una URL de deep link (https://alyto.app/foo → /foo). */
function pathFromUrl(url) {
  try {
    const u = new URL(url);
    return (u.pathname || '/') + (u.search || '') + (u.hash || '');
  } catch {
    // Esquema custom o ruta relativa
    const idx = url.indexOf('/', url.indexOf('://') + 3);
    return idx >= 0 ? url.slice(idx) : '/';
  }
}

/**
 * Configura la apariencia y los handlers nativos. Idempotente por arranque.
 */
export async function initNativeApp() {
  if (!isNative()) return;

  // ── Status bar acorde al tema CLARO (iconos oscuros sobre fondo claro) ──
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#F8FAFC' });
    }
  } catch (err) {
    console.warn('[NativeApp] StatusBar no disponible:', err?.message);
  }

  // ── Botón atrás de Android: navegar atrás o salir en la raíz ──
  try {
    const { App } = await import('@capacitor/app');

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // ── Deep links / App Links (https://alyto.app/...) ──
    App.addListener('appUrlOpen', (event) => {
      if (event?.url) goTo(pathFromUrl(event.url));
    });
  } catch (err) {
    console.warn('[NativeApp] App plugin no disponible:', err?.message);
  }

  // ── Ocultar el splash una vez la app está lista ──
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* plugin opcional */
  }
}
