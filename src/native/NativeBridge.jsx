/**
 * NativeBridge.jsx — Conecta el código nativo (Capacitor) con react-router.
 *
 * Se monta DENTRO del <BrowserRouter>. Rellena la referencia de navegación que
 * usan los handlers nativos (deep links, tap en push, botón atrás), inicializa
 * la apariencia/handlers nativos y consume cualquier ruta pendiente capturada
 * antes de que React montara (cold start por tap en notificación).
 *
 * No renderiza nada.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nav, consumePendingPath } from './navigation';
import { initNativeApp } from './nativeApp';
import { setupNativePushListeners, isNativePlatform } from './nativePush';

export default function NativeBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    nav.navigate = navigate;

    if (isNativePlatform()) {
      initNativeApp();
      setupNativePushListeners();

      // Cold start: si un tap en push trajo la app a primer plano antes de
      // montar el router, navegar al destino capturado.
      const pending = consumePendingPath();
      if (pending) navigate(pending);
    }

    return () => {
      if (nav.navigate === navigate) nav.navigate = null;
    };
  }, [navigate]);

  return null;
}
