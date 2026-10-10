# Alyto Android — Build & Release Runbook (Google Play)

App empaquetada con **Capacitor** sobre el frontend Vite existente. `appId` =
`com.avfinance.alyto` (**INMUTABLE**: el paquete ya está registrado en Play
Console y no se puede cambiar ni reutilizar). Cuenta Play = Organización
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
2. Package name: `com.avfinance.alyto`. Registrar **SHA-256** (de la upload key y
   de la clave de Play App Signing — ver §4).
3. Descargar **`google-services.json`** → colocar en `android/app/`.
   - ⚠️ El `google-services.json` está atado al package name. Si ya existía uno
     emitido para el paquete anterior (`app.alyto.android`), **no sirve**: el
     plugin `com.google.gms.google-services` aborta el build con
     *"No matching client found for package name"*. Hay que registrar una app
     Android nueva en Firebase con `com.avfinance.alyto` y descargar el archivo
     de nuevo.
   - El plugin `com.google.gms.google-services` se aplica solo si el archivo
     existe (guard `servicesJSON.exists()` al final de `android/app/build.gradle`).
     Sin él el build funciona, avisa por log y el push nativo no opera.
   - `google-services.json` **está en `android/.gitignore`**, así que no se
     commitea y cada entorno inyecta el suyo. No es un secreto criptográfico (su
     clave de API está restringida por package name + SHA-256 de firma), pero se
     mantiene fuera del repo para no fijar un proyecto Firebase concreto.
     Verificar tras colocarlo: `git status --short` no debe listarlo.
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
2. Crear `android/keystore.properties` copiando `android/keystore.properties.example`
   (el real está en `.gitignore`) y completar con los datos reales.
3. ✅ Ya está wired: `android/app/build.gradle` lee `keystore.properties` y firma
   el build de release **sólo si el archivo existe** (`signingConfigs.release`).
   No requiere más cambios de Gradle; sin el archivo, el build sigue funcionando
   sin firmar.
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
  `adb shell pm verify-app-links --re-verify com.avfinance.alyto`.

## 6. Sesión en el WebView (Bearer, no cookies)
- El WebView corre en origin fijo `https://app.alyto.app`; las cookies
  cross-domain a `api.alyto.app` no fluyen. El backend es **Bearer-first** y el
  token se guarda en `localStorage` (`api.js`) → la sesión funciona sin cambios.
- No se requiere `@capacitor/preferences`: `localStorage` del WebView persiste
  entre reinicios.

## 7. Build del AAB de release

### 7.1 Prerrequisitos del build
Ambos son **condicionales por existencia de archivo**, así que el build nunca se
rompe por su ausencia, solo degrada:

| Archivo | Si falta | Dónde se decide |
|---|---|---|
| `android/app/google-services.json` | el plugin `com.google.gms.google-services` no se aplica y **el push nativo no funciona** | `android/app/build.gradle`, al final |
| `android/keystore.properties` | el AAB sale **sin firmar** y Play lo rechaza | `signingConfigs.release` |

Estado actual del repo: **ninguno de los dos existe**. Hay que colocarlos antes
de generar el AAB que se sube. Los dos están en `.gitignore`.

### 7.2 Generar el AAB
```bash
npm run cap:sync            # vite build + inyecta SW + npx cap sync android
cd android
./gradlew bundleRelease
```
El AAB queda en:
```
android/app/build/outputs/bundle/release/app-release.aab
```
Para un APK instalable de prueba (no sirve para Play): `./gradlew assembleRelease`
→ `android/app/build/outputs/apk/release/app-release.apk`.

- `versionCode` debe subir en **cada** envío a Play. Hoy: `versionCode 1`,
  `versionName "2.0.0"`.
- `targetSdk`/`compileSdk` = 36 (Android 16), cumple el mínimo de Play.
- `minifyEnabled` está en **false** a propósito en el primer release (R8 no se ha
  validado contra el WebView y los plugins). Activarlo exige probar un AAB
  minificado de punta a punta antes.

### 7.3 Verificar paquete y firma del artefacto
`BT` apunta a las build-tools del SDK (ej. `$ANDROID_HOME/build-tools/36.0.0`).

**Paquete** (debe decir exactamente `com.avfinance.alyto`):
```bash
# sobre un APK
$BT/aapt2 dump packagename app/build/outputs/apk/release/app-release.apk

# sobre el AAB (el manifiesto va en formato protobuf dentro del bundle)
unzip -p app/build/outputs/bundle/release/app-release.aab base/manifest/AndroidManifest.xml \
  | strings | grep -m1 com.avfinance.alyto
```

**Firma** (solo aplica al APK; el AAB lo refirma Play App Signing):
```bash
$BT/apksigner verify --print-certs --verbose \
  app/build/outputs/apk/release/app-release.apk
```
Comprobar en la salida que el **SHA-256 del certificado** coincide con el de tu
upload key, y que dice `Verifies`. Para ver el SHA-256 de la upload key sin
compilar nada:
```bash
keytool -list -v -keystore alyto-upload.jks -alias alyto-upload | grep SHA256
```

### 7.4 El SHA-256 de Play App Signing hay que copiarlo a DOS sitios
⚠️ Este es el paso que se olvida y rompe el push y los App Links en producción.

Play App Signing **refirma** tu AAB con una clave que custodia Google, distinta
de tu upload key. Esa es la firma que ven los dispositivos. Se obtiene en
**Play Console → Release → Setup → App integrity → App signing** (en español,
"Firma de apps"), campo *SHA-256 certificate fingerprint*.

Hay que pegar ese valor en:

1. **Firebase** (si no, el push nativo no llega a los builds de Play):
   Firebase Console → proyecto `alyto-14283` → app Android `com.avfinance.alyto`
   → Add fingerprint. Registrar **tanto el de Play App Signing como el de la
   upload key**, porque los builds locales van firmados con el segundo.
   Después hay que **volver a descargar `google-services.json`**.

2. **`public/.well-known/assetlinks.json`** (si no, los App Links de `alyto.app`
   no verifican y los enlaces abren en el navegador en vez de la app):
   reemplazar el placeholder `REEMPLAZAR_CON_SHA256_DE_PLAY_APP_SIGNING` por el
   SHA-256 **de Play App Signing**, en el formato de dos puntos que da la consola
   (`AB:CD:EF:...`). Luego desplegar el frontend para que quede servido en
   `https://alyto.app/.well-known/assetlinks.json` y verificar con:
   ```bash
   curl -s https://alyto.app/.well-known/assetlinks.json | jq .
   adb shell pm verify-app-links --re-verify com.avfinance.alyto
   adb shell pm get-app-links com.avfinance.alyto   # debe decir "verified"
   ```
   Ese archivo se copia a `android/app/src/main/assets/` en el `cap sync`, así que
   hay que **re-sincronizar y recompilar** después de editarlo.

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
