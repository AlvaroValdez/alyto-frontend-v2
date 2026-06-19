# Alyto Android — Build & Release Runbook (Google Play)

App empaquetada con **Capacitor** sobre el frontend Vite existente. `appId` =
`app.alyto.android` (**INMUTABLE** tras publicar). Cuenta Play = Organización
(AV Finance). Doc complementario: plan `shimmying-hatching-llama.md`.

> El código y la config nativa ya están en el repo (`android/`,
> `capacitor.config.ts`, `src/native/*`). Este runbook cubre los pasos que
> requieren herramientas locales (Android SDK), consolas externas (Firebase,
> Play) y secretos (keystore) — todo lo que NO se puede commitear.

---

## 0. Prerrequisitos locales (máquina de build o CI)
- **JDK 21** (Android Gradle Plugin 8.13 lo requiere).
- **Android Studio** + Android SDK (Platform 35/36, build-tools).
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` exportados.
- Node 20+ (este repo usa 22).

## 1. Build web + sync nativo
```bash
npm install
npm run cap:sync        # = vite build + inject SW + npx cap sync android
# abrir en Android Studio:
npm run cap:open        # o: npx cap open android
```
`npm run cap:run` instala y corre en un emulador/dispositivo conectado.

⚠️ **Variables `VITE_*` de PRODUCCIÓN** deben estar en el `.env` al hacer
`vite build` (la app embebe el bundle). En particular `VITE_API_URL` debe
apuntar a `https://api.alyto.app/api/v1`. La sesión viaja por **Bearer**
(localStorage), no por cookie (ver §6).

## 2. Firebase / Push nativo (FCM)
1. Firebase Console → proyecto **alyto-14283** → Add app → **Android**.
2. Package name: `app.alyto.android`. Registrar **SHA-256** (de la upload key y
   de la clave de Play App Signing — ver §4).
3. Descargar **`google-services.json`** → colocar en `android/app/`.
   - Capacitor aplica el plugin `com.google.gms.google-services` automáticamente
     solo si el archivo existe (`android/app/build.gradle` líneas 47-54). Sin él
     el build funciona pero el push nativo no.
   - `google-services.json` **no** está en `.gitignore` por defecto (es config
     pública de Firebase); si se prefiere mantenerlo fuera del repo, añadirlo al
     `.gitignore` e inyectarlo en CI.
4. El token FCM nativo se registra solo vía `src/native/nativePush.js` →
   `POST /api/v1/auth/fcm-token` (mismo endpoint que el push web).

## 3. Backend — pasos de entorno (repo alyto-backend-v2)
- **CORS:** añadir `https://app.alyto.app` (y `https://localhost` por si acaso)
  a `ALLOWED_ORIGINS` en el `.env` del VPS prod. Sin código.
- **Eliminación de cuenta:** ✅ ya implementado `DELETE /api/v1/auth/account`.
- **assetlinks.json:** servir en `https://alyto.app/.well-known/assetlinks.json`
  (ver §5).

## 4. Firma — keystore + Play App Signing
1. Generar **upload keystore** (una sola vez, guardarlo FUERA del repo, en bóveda
   de secretos):
   ```bash
   keytool -genkey -v -keystore alyto-upload.jks -alias alyto-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crear `android/keystore.properties` (ya en `.gitignore`):
   ```properties
   storeFile=/ruta/segura/alyto-upload.jks
   storePassword=...
   keyAlias=alyto-upload
   keyPassword=...
   ```
3. Configurar `signingConfigs` en `android/app/build.gradle` leyendo
   `keystore.properties` (solo para el build de release; no commitear secretos).
4. Activar **Play App Signing** en Play Console (Google custodia la clave final;
   tú firmas con la upload key). Tomar el **SHA-256 de la clave de firma de la
   app** desde Play Console → registrarlo en Firebase (§2.2) y en
   `assetlinks.json` (§5).

## 5. App Links (deep links)
- `public/.well-known/assetlinks.json` ya existe como **plantilla** — reemplazar
  `REEMPLAZAR_CON_SHA256_DE_PLAY_APP_SIGNING` por el SHA-256 real (§4.4).
- Se sirve en `alyto.app/.well-known/assetlinks.json` al desplegar el frontend en
  el VPS (Docker+nginx). ⚠️ Verificar que nginx NO bloquee dotfiles (`.well-known`
  debe ser accesible públicamente, `Content-Type: application/json`).
- El `intent-filter android:autoVerify="true"` (host `alyto.app`) ya está en
  `AndroidManifest.xml`. Verificar con:
  `adb shell pm verify-app-links --re-verify app.alyto.android`.

## 6. Sesión en el WebView (Bearer, no cookies)
- El WebView corre en origin fijo `https://app.alyto.app`; las cookies
  cross-domain a `api.alyto.app` no fluyen. El backend es **Bearer-first** y el
  token se guarda en `localStorage` (`api.js`) → la sesión funciona sin cambios.
- No se requiere `@capacitor/preferences`: `localStorage` del WebView persiste
  entre reinicios.

## 7. Build del AAB de release
```bash
cd android
./gradlew bundleRelease      # genera app/build/outputs/bundle/release/app-release.aab
```
- Confirmar `versionCode`/`versionName` en `android/app/build.gradle` (cada
  subida a Play requiere `versionCode` incremental).
- `targetSdk`/`compileSdk` = 36 (Android 16) — cumple el mínimo de Play.

## 8. Play Console — App content (todas obligatorias)
- **Privacy Policy URL** pública (`https://alyto.app/privacy`).
- **Account deletion**: URL pública (`https://alyto.app/eliminar-cuenta`) +
  ruta in-app (usa `DELETE /auth/account`).
- **Data safety**: declarar KYC (documento+selfie Stripe Identity), datos
  financieros, PII, cifrado en tránsito, borrado. Debe coincidir con el flujo
  real.
- **Financial features / Crypto Exchanges & Software Wallets**: declarar regiones
  y adjuntar documentación regulatoria (SRL ETF/PSAV ASFI, SpA Ley Fintec).
  ⚠️ Bloqueante mientras la licencia SRL esté en proceso — alinear países de
  distribución con la habilitación vigente.
- **Content rating** (IARC), **Target audience** (solo adultos), **Ads** (no),
  **Permisos sensibles**: justificar `CAMERA` (escaneo QR de pago).

## 9. Store listing (es-419 + en-US)
- Nombre, descripción corta (80) y larga (4000) — **sin "remesa/remittance"**
  (regla compliance CLAUDE.md). Ícono 512×512, feature graphic 1024×500, ≥2
  screenshots de teléfono. Categoría: Finanzas.

## 10. Tracks
Internal testing → revisar **Pre-launch report** → Closed testing → Production
(rollout escalonado). Sentry (`@sentry/react`) ya integrado — verificar captura
dentro del WebView.

## 11. Íconos y splash (PROVISIONAL generado)
Ya hay íconos + splash generados con `@capacitor/assets` desde `resources/`
(`icon.png` 1024², `splash.png`/`splash-dark.png` 2732²) — **provisionales**: el
wordmark `ISO_Logo.png` centrado sobre fondo claro (#F8FAFC). Sirven para
internal testing. Para producción, reemplazar `resources/icon.png` por un
**isotipo cuadrado** (símbolo Alyto, no el wordmark horizontal) y regenerar:
```bash
# reemplazar resources/icon.png (1024x1024) y opcionalmente resources/splash*.png
npx capacitor-assets generate --android
```
Marca en `/home/avf/Desarrollo/Logos` (variante Alyto retail; el ícono de tienda
NO usa la variante Business). Tema **claro** (#F8FAFC), no oscuro.
