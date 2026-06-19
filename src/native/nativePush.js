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

let listenersReady = false;

/** Carga diferida del plugin (evita romper el bundle web). */
async function getPlugin() {
  const mod = await import('@capacitor/push-notifications');
  return mod.PushNotifications;
}

/**
 * Registra los listeners de push una sola vez (token, errores, recepción y tap).
 * Llamar al arranque de la app nativa. No solicita permisos por sí mismo.
 */
export async function setupNativePushListeners() {
  if (!isNativePlatform() || listenersReady) return;
  listenersReady = true;

  const PushNotifications = await getPlugin();

  // Token FCM nativo → backend (idempotente: el backend usa $addToSet).
  await PushNotifications.addListener('registration', (token) => {
    if (token?.value) {
      registerFcmToken(token.value).catch((err) =>
        console.error('[NativePush] registerFcmToken falló:', err?.message),
      );
    }
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[NativePush] Error de registro:', err?.error ?? err);
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
