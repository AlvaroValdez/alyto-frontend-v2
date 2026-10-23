/**
 * nativePush.js — Notificaciones push NATIVAS (Capacitor + FCM) en Android.
 *
 * En el WebView de Capacitor el push web (Service Worker + VAPID) no es fiable,
 * así que usamos el plugin nativo @capacitor/push-notifications, que se apoya en
 * FCM del lado nativo (requiere google-services.json en android/app/). El token
 * que entrega es un registration token de FCM válido → se registra en el mismo
 * endpoint del backend (POST /auth/fcm-token) que el push web, y firebase-admin
 * puede enviarle igual.
 */

import { Capacitor } from '@capacitor/core';
import { registerFcmToken } from '../services/api';
import { goTo } from './navigation';
import { resolveNotificationUrl } from './notificationRoutes';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Misma clave que usa el camino web. El token nativo lo entrega el plugin por
 * un listener asíncrono, así que sin guardarlo aquí el resto de la app no tenía
 * forma de conocerlo: el hook lo dejaba en null para siempre y, con él, el
 * interruptor de ajustes no podía mostrarse activo ni se podía desvincular el
 * dispositivo, porque ambas cosas se apoyan en tener el token a mano.
 */
export const FCM_TOKEN_KEY = 'alyto_fcm_token';
/** Aviso de token recién emitido, para quien ya esté montado cuando llegue. */
export const PUSH_TOKEN_EVENT = 'alyto:push-token';

/**
 * Canal al que el backend dirige TODAS las push de Android: manda
 * `android.notification.channelId = 'payments'` (services/notifications.js).
 *
 * Desde Android 8 toda notificación necesita un canal existente, y **el canal lo
 * crea la app, no el servidor**. Sin crearlo, el nombre que manda el backend no
 * apunta a nada y la notificación queda a merced del canal de reserva del SDK de
 * Firebase, fuera de nuestro control y sin la importancia ni la privacidad que
 * definimos acá.
 *
 * El id tiene que coincidir EXACTAMENTE con el del backend y con el
 * `default_notification_channel_id` del manifiesto.
 *
 * Las propiedades de un canal son inmutables tras crearlo: para cambiar el sonido
 * o la importancia hay que cambiar el id, en los tres lugares a la vez.
 */
const CHANNEL_ID = 'payments';

let listenersReady = false;

/** Carga diferida del plugin (evita romper el bundle web). */
async function getPlugin() {
  const mod = await import('@capacitor/push-notifications');
  return mod.PushNotifications;
}

/**
 * Crea el canal de notificaciones de pagos. Idempotente: volver a crearlo con el
 * mismo id no duplica nada ni pisa las preferencias que haya elegido el usuario.
 */
async function ensureChannel(PushNotifications) {
  try {
    await PushNotifications.createChannel({
      id:          CHANNEL_ID,
      name:        'Pagos y movimientos',
      description: 'Avisos de cobros, envíos y movimientos de tu cuenta.',
      importance:  4,  // HIGH — suena y aparece como aviso emergente
      // visibility PRIVATE: en la pantalla bloqueada se ve que llegó un aviso de
      // Alyto, pero no su contenido. El cuerpo de estas notificaciones lleva
      // importes ("Recibiste Bs 240"), y eso no debe quedar legible para
      // cualquiera que levante el teléfono.
      visibility:  0,
      vibration:   true,
      // `sound` se omite a propósito: espera el nombre de un archivo en res/raw,
      // no la cadena 'default'. Sin él el canal usa el sonido del sistema.
    });
  } catch (err) {
    console.error('[NativePush] No se pudo crear el canal de notificaciones:', err?.message ?? err);
  }
}

/**
 * Registra los listeners de push una sola vez (token, errores, recepción y tap).
 * Llamar al arranque de la app nativa. No solicita permisos por sí mismo.
 */
export async function setupNativePushListeners() {
  if (!isNativePlatform() || listenersReady) return;
  listenersReady = true;

  const PushNotifications = await getPlugin();

  // El canal tiene que existir ANTES de que llegue la primera notificación.
  await ensureChannel(PushNotifications);

  // Token FCM nativo → backend (idempotente: el backend usa $addToSet).
  await PushNotifications.addListener('registration', (token) => {
    if (token?.value) {
      try { localStorage.setItem(FCM_TOKEN_KEY, token.value); } catch { /* modo privado */ }
      window.dispatchEvent(new CustomEvent(PUSH_TOKEN_EVENT, { detail: token.value }));
      registerFcmToken(token.value).catch((err) =>
        console.error('[NativePush] registerFcmToken falló:', err?.message),
      );
    }
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[NativePush] Error de registro:', err?.error ?? err);
  });

  // Push recibida con la app ABIERTA. Android no pinta la notificación del
  // sistema en ese caso, y el camino web (onMessage del SDK de Firebase) no se
  // dispara nunca en el WebView, así que sin esto el aviso se perdía entero:
  // ni toast, ni actualización del contador de no leídas. Se reemite como el
  // mismo evento de toast que ya escucha AppNotifications, con la forma de
  // payload que espera NotificationToast.
  await PushNotifications.addListener('pushNotificationReceived', (notif) => {
    window.dispatchEvent(new CustomEvent('alyto:show-toast', {
      detail: {
        notification: { title: notif?.title, body: notif?.body },
        data:         notif?.data ?? {},
      },
    }));
  });

  // Tap en una notificación (app en background o cerrada) → deep link interno.
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action?.notification?.data ?? {};
    goTo(resolveNotificationUrl(data));
  });
}

/**
 * Solicita permiso de notificaciones y registra el dispositivo en FCM.
 * @returns {Promise<'granted'|'denied'|'prompt'>}
 */
export async function requestNativePushPermission() {
  if (!isNativePlatform()) return 'denied';

  const PushNotifications = await getPlugin();
  await setupNativePushListeners();

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }

  if (perm.receive !== 'granted') return 'denied';

  // Dispara el evento 'registration' → token al backend.
  await PushNotifications.register();
  return 'granted';
}

/** Devuelve el estado actual del permiso nativo ('granted'|'denied'|'prompt'). */
export async function checkNativePushPermission() {
  if (!isNativePlatform()) return 'denied';
  const PushNotifications = await getPlugin();
  const perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') return 'prompt';
  return perm.receive; // 'granted' | 'denied'
}
