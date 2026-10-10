# Alyto Android — Insumos para Play Console

Paquete: **`com.avfinance.alyto`** (inmutable, ya registrado en Play Console).
Complementa `docs/ANDROID_RELEASE.md`, que cubre el build, la firma y los
App Links.

> **Cómo leer este documento.** Todo lo marcado **`verificar`** NO se pudo
> confirmar leyendo el código y requiere comprobación humana antes de declararlo
> en Play. Lo demás sale de una verificación concreta, con el archivo indicado.
> No rellenes un formulario regulatorio copiando esto a ciegas.

---

## 1. Manifiesto: permisos y banderas

### 1.1 Permisos

El manifiesto **fuente** declara 3 permisos, pero el APK compilado ship**a 6 más
uno interno**, inyectados por las dependencias en el merge del manifiesto. Para
Play cuenta el conjunto fusionado. Verificado con
`aapt2 dump permissions app-debug.apk`:

| Permiso | Origen | Para qué se usa |
|---|---|---|
| `INTERNET` | nuestro | Llamadas a la API (`api.alyto.app`) y carga del WebView |
| `CAMERA` | nuestro | **Solo** leer códigos QR de pago. Decodificación en el dispositivo con `jsQR` sobre un canvas (`WalletQRScreen.jsx`); la imagen no se sube ni se guarda. El selfie y el documento de KYC los captura Stripe Identity en su propio entorno |
| `POST_NOTIFICATIONS` | nuestro | Avisos de estado de transacciones (Android 13+) |
| `ACCESS_NETWORK_STATE` | inyectado (Firebase/Capacitor) | Detectar conectividad antes de reintentar |
| `WAKE_LOCK` | inyectado (Firebase Messaging) | Procesar un push entrante con la pantalla apagada |
| `com.google.android.c2dm.permission.RECEIVE` | inyectado (Firebase Messaging) | Recibir mensajes FCM |
| `com.avfinance.alyto.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | inyectado (AndroidX) | Permiso propio de la app para que sus receivers dinámicos no queden exportados. No es un permiso de usuario y no se declara en Play |

Ningún permiso es de los clasificados como sensibles por Play salvo `CAMERA`,
que sí exige justificación en el formulario. La justificación es la de la tabla:
lectura de QR de pago, procesada en el dispositivo.

### 1.2 Banderas de seguridad

| Bandera | Valor | Comprobación |
|---|---|---|
| `usesCleartextTraffic` | **`false`**, declarado explícitamente | No estaba declarado: con `targetSdk` 36 el default de plataforma ya es `false`, pero se hizo explícito para que la promesa de "cifrado en tránsito" de Data Safety sea auditable |
| `targetSdkVersion` | `36` | Cumple el mínimo vigente de Play |
| `allowBackup` | **`false`** | Desactivado a propósito. Ver la nota de abajo |
| `networkSecurityConfig` | no definido | No hay excepciones de dominio ni anclaje de certificados |
| `debuggable` | solo en el build debug | El release no lo lleva |

> **Nota sobre `allowBackup="false"`.** Se desactivó la copia de seguridad por
> decisión explícita. El motivo: la sesión viaja como **token Bearer guardado en
> el `localStorage` del WebView** (`docs/ANDROID_RELEASE.md` §6), así que con la
> copia activada una sesión válida podría salir del dispositivo por Google Drive
> o `adb backup`. El coste es que al cambiar de teléfono el usuario no recupera
> datos locales y tiene que iniciar sesión de nuevo, que para una billetera es el
> comportamiento deseable. Verificado en el manifiesto fusionado del APK.

### 1.3 App Link

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="alyto.app" />
</intent-filter>
```
`autoVerify="true"` presente y host `alyto.app` confirmados en el manifiesto
fusionado del APK. Las rutas se enrutan in-app con el listener `appUrlOpen`
(`src/native/nativeApp.js`).

⚠️ **Hoy NO verifica**: `public/.well-known/assetlinks.json` sigue con el
placeholder `REEMPLAZAR_CON_SHA256_DE_PLAY_APP_SIGNING`. Procedimiento en
`docs/ANDROID_RELEASE.md` §7.4.

No hay ningún `intent-filter` con esquema propio. `custom_url_scheme` existe en
`strings.xml` por plantilla de Capacitor, pero ningún filtro lo referencia: no
hay deep link por esquema custom.

---

## 2. Seguridad de los datos (Data safety)

**Cifrado en tránsito: sí, en todos los casos.** TLS en las llamadas a la API y
`usesCleartextTraffic="false"`.

**Cifrado en reposo, dos niveles distintos que no hay que confundir:**

- **A nivel de campo** (AES-256-GCM con clave envuelta en AWS KMS, `piiCrypto.js`):
  solo el número de documento, el secreto del segundo factor y la clave secreta
  Stellar. ⚠️ **`verificar`**: este cifrado está gobernado por
  `PII_ENCRYPTION_ENABLED`. Si el flag no está activo en producción, el número de
  documento se guarda **en claro**. Hay que confirmarlo antes de declarar el campo
  como cifrado.
- **A nivel de almacenamiento**: lo que aplique MongoDB Atlas por defecto.
  **`verificar`** en la consola de Atlas; no se deduce del código.

| Tipo de dato | Se recopila | Se comparte con | Oblig./Opc. | En tránsito | En reposo |
|---|---|---|---|---|---|
| Nombre y apellidos | Sí | Stripe (verificación) | Obligatorio | Cifrado | Sin cifrado de campo |
| Correo electrónico | Sí | Stripe, SendGrid | Obligatorio | Cifrado | Sin cifrado de campo |
| Teléfono | Sí | **No se comparte** (verificado: no viaja a Stripe) | Obligatorio | Cifrado | Sin cifrado de campo |
| Documento de identidad (nº) | Sí | Stripe (verificación) | Obligatorio | Cifrado | **`verificar`**: AES-256-GCM + KMS **solo si** `PII_ENCRYPTION_ENABLED` está activo |
| Selfie / biometría | **Lo captura Stripe Identity, Alyto NO lo almacena** | Stripe | Obligatorio para operar | Cifrado | No aplica (no se guarda; solo el resultado y el id de sesión) |
| Dirección y fecha de nacimiento | Sí, pero **las devuelve Stripe, no se las enviamos** | No se comparten | Obligatorio | Cifrado | Sin cifrado de campo |
| Nacionalidad y país de residencia | Sí (declarados por el usuario) | No se comparten | Obligatorio | Cifrado | Sin cifrado de campo |
| Historial de transacciones | Sí | Vita Wallet, OwlPay Harbor, Banco Económico (según corredor) y **red Stellar, que es pública** | Obligatorio | Cifrado | Sin cifrado de campo |
| Datos de beneficiarios | Sí | Vita Wallet, OwlPay Harbor | Obligatorio para enviar | Cifrado | Sin cifrado de campo |
| Comprobantes de pago | Sí | No se comparten | Opcional (según corredor) | Cifrado | Archivo inmutable en S3 Object Lock, 5 años |
| Identificadores de dispositivo (IP, user-agent) | Sí (`AccessLog`, `KycAttempt`, `tosAcceptance`) | No se comparten | Obligatorio (registro de accesos) | Cifrado | Sin cifrado de campo |
| Token de notificaciones push | Sí | Firebase / Google | Opcional (si acepta notificaciones) | Cifrado | Sin cifrado de campo |
| Registros de acceso y de intentos de verificación | Sí | No se comparten | Obligatorio | Cifrado | Sin cifrado de campo |
| Contraseña | Sí | No se comparte | Obligatorio | Cifrado | Hash bcrypt (no reversible) |
| Ubicación precisa / GPS | **No** | — | — | — | — |
| Contactos del teléfono, SMS, archivos | **No** | — | — | — | — |

### 2.1 Qué se le envía realmente a Stripe (y qué no)

Importa para rellenar "se comparte con" sin exagerar. Verificado en
`kycController.js` (creación de la sesión) y `stripeWebhook.js` (lectura del
resultado):

- **Lo único que le enviamos** al crear la `VerificationSession` es el
  `metadata`: `userId`, `legalEntity` y `email`. Nada más.
- **El teléfono NO viaja a Stripe.** No aparece en los parámetros de la sesión ni
  en la integración de pagos.
- **La dirección y la fecha de nacimiento van en sentido contrario**: no se las
  mandamos, Stripe las **devuelve** en `verified_outputs` tras leer el documento,
  y la app las persiste solo si el usuario aún no tenía dirección
  (`stripeWebhook.js`, rama `hasAddr`). En el formulario de Play esto se declara
  como dato *recopilado*, no como dato *compartido con un tercero*.
- El documento y el selfie los captura Stripe en su propia página alojada: nunca
  pasan por nuestros servidores.

### 2.2 Cómo comprobar el cifrado de campo sin leer secretos

Tres formas, de la más fiable a la más cómoda:

1. **La evidencia en la base de datos** (no depende de la bandera):
   ```js
   db.users.countDocuments({ 'identityDocument.numberCiphertext': { $exists: true } })
   db.users.countDocuments({ 'identityDocument.number': 'ENCRYPTED' })
   ```
   Si los registros **recientes** tienen `numberCiphertext`, las escrituras se
   están cifrando de verdad. Esta es la única comprobación que distingue "la
   bandera está en true" de "el cifrado funciona": la bandera puede estar activa y
   la DEK fallar.

2. **El script de estado** `scripts/estado-produccion.mjs`, que imprime la
   bandera y el recuento juntos (`bandera=true · N usuarios con el campo
   cifrado`). Solo saca un booleano y un número, ningún secreto:
   ```bash
   docker compose exec alyto-backend node scripts/estado-produccion.mjs
   ```

3. **El log de arranque**. `src/app.js` precalienta la DEK y emite
   `[Alyto Server] PII field-encryption: DEK precalentada ✅` **solo** si la
   bandera está activa y la DEK se resuelve:
   ```bash
   docker compose logs alyto-backend | grep "PII field-encryption"
   ```

⚠️ **`docker compose exec ... printenv | grep PII` NO sirve** para esto. Los
secretos se cargan en el proceso en tiempo de ejecución con
`loadSecretsIntoEnv()` desde AWS Secrets Manager, así que un `exec` nuevo
muestra el entorno estático del contenedor, no el entorno real del proceso que
atiende las peticiones. Leer `/proc/1/environ` sí lo mostraría, pero volcaría
además todos los secretos: no hacerlo.

**Para cifrar los documentos ya guardados** existe
`scripts/migrate-encrypt-identity-numbers.mjs`. Es idempotente y arranca en
**dry-run**, que lista a quién migraría con el CI enmascarado:
```bash
# 1) simulacro
docker compose exec alyto-backend node scripts/migrate-encrypt-identity-numbers.mjs
# 2) ejecución real
docker compose exec -e MIGRATE_CONFIRM=true alyto-backend \
  node scripts/migrate-encrypt-identity-numbers.mjs
```
Orden obligatorio, según la cabecera del propio script: provisionar la DEK
(`scripts/provision-pii-dek.mjs`) → `PII_ENCRYPTION_ENABLED=true` → redeploy →
migrar, **primero en staging**.

**Otras respuestas del formulario:**
- ¿Se recopilan datos? **Sí.**
- ¿Se comparten con terceros? **Sí**, con los proveedores de la tabla.
- ¿El usuario puede pedir la eliminación? **Sí**: `DELETE /api/v1/auth/account`
  in-app y URL pública. Declarar que **parte de los datos se retiene 5 años por
  obligación AML/CFT** (es un borrado con retención, no un borrado total; ver
  sección 10 de la Política de Privacidad).
- ¿Hay cifrado en tránsito? **Sí.**
- ⚠️ `verificar` antes de marcar "los datos están cifrados en reposo": depende de
  los dos niveles explicados arriba.

---

## 3. Funciones financieras (Financial features)

Marcar las tres y adjuntar documentación. Una línea cada una:

- **Pagos y carteras digitales**: la app permite mantener un saldo en bolivianos
  y en USDC, y pagar o cobrar entre usuarios de la red Alyto mediante código QR.
- **Transferencias de dinero**: la app permite ordenar pagos transfronterizos
  desde Bolivia y Chile hacia cuentas bancarias de terceros países, liquidados a
  través de proveedores de pago autorizados en cada destino.
- **Cartera de criptomonedas**: la app administra una cuenta Stellar por usuario
  con saldo en USDC, usado como activo de tránsito para liquidar las
  transferencias; no se ofrece compraventa especulativa ni custodia de inversión.

⚠️ Play pide documentación regulatoria por país. El registro PSAV ante ASFI está
**en trámite, no emitido**. No declarar una habilitación vigente que no exista, y
alinear los países de distribución con lo que esté realmente permitido. Esto es
decisión de Alvaro, no técnica.

---

## 4. Ficha de tienda

### 4.1 Español (es-419)

**Nombre:** `Alyto`

**Descripción corta** (66/80):
```
Pagos transfronterizos, billetera digital y liquidación en Stellar
```

**Descripción larga** (1.394/4.000):
```
Alyto es una plataforma de pagos transfronterizos y una billetera digital
construida sobre la red Stellar.

ENVÍA PAGOS AL EXTERIOR
Ordena transferencias desde Bolivia y Chile hacia cuentas bancarias de más de
veinte destinos. Antes de confirmar ves el monto exacto que recibe el
destinatario, el tipo de cambio aplicado y cada comisión por separado, sin
cargos ocultos.

BILLETERA DIGITAL
Mantén saldo en bolivianos y en USDC. Cobra y paga entre usuarios de la red
Alyto con código QR, y consulta cada movimiento con su comprobante.

LIQUIDACIÓN SOBRE STELLAR
Cada operación se liquida con USDC sobre la red Stellar y queda registrada en
su libro público, de modo que puedes rastrear el identificador de tu
transacción de forma independiente.

TOKENIZACIÓN Y TESORERÍA
Para clientes empresariales, Alyto ofrece infraestructura de pagos
institucionales en dólares y tokenización de valor sobre Stellar.

VERIFICACIÓN DE IDENTIDAD
La verificación de identidad se realiza con Stripe Identity. Alyto no almacena
las imágenes de tu documento ni tu selfie.

IMPORTANTE
Los activos virtuales que administra Alyto son instrumentos de tránsito para
liquidar pagos. No generan intereses, no son depósitos bancarios y no están
cubiertos por ningún fondo de garantía de depósitos.

Operado por AV Finance SRL (Bolivia), AV Finance SpA (Chile) y
AV Finance, LLC (Estados Unidos).
Soporte: soporte@alyto.app
```

### 4.2 Inglés (en-US)

**Nombre:** `Alyto`

**Descripción corta** (63/80):
```
Cross-border payments, digital wallet and settlement on Stellar
```

**Descripción larga** (1.326/4.000):
```
Alyto is a cross-border payments platform and digital wallet built on the
Stellar network.

SEND PAYMENTS ABROAD
Order transfers from Bolivia and Chile to bank accounts in more than twenty
destinations. Before you confirm, you see the exact amount the recipient will
get, the exchange rate applied and every fee itemised separately, with no
hidden charges.

DIGITAL WALLET
Hold a balance in Bolivian bolivianos and in USDC. Send and receive payments
between Alyto users with a QR code, and review every movement with its
receipt.

SETTLEMENT ON STELLAR
Each operation settles in USDC over the Stellar network and is recorded on its
public ledger, so you can trace your transaction identifier independently.

TOKENISATION AND TREASURY
For business clients, Alyto provides institutional US dollar payment
infrastructure and value tokenisation on Stellar.

IDENTITY VERIFICATION
Identity verification is performed by Stripe Identity. Alyto does not store
your ID document images or your selfie.

IMPORTANT
The virtual assets Alyto administers are transit instruments used to settle
payments. They do not earn interest, they are not bank deposits and they are
not covered by any deposit guarantee scheme.

Operated by AV Finance SRL (Bolivia), AV Finance SpA (Chile) and
AV Finance, LLC (United States).
Support: soporte@alyto.app
```

### 4.3 Afirmaciones que se evitaron a propósito

| Lo que NO dice | Por qué |
|---|---|
| "remesa", "remesas", "remittance" | Prohibido por la regla de compliance de `CLAUDE.md`. Se usa "pago transfronterizo" y "transferencia internacional" |
| "regulado por ASFI", "licencia PSAV", "autorizado por ASFI" | El registro PSAV está **en trámite**. No se afirma una habilitación no emitida |
| "registrado ante la CMF", "autorizado por la CMF" | Misma razón del lado chileno |
| "supervisado", "licenciado", "regulado" a secas | Sin la licencia emitida, cualquiera de las tres induce a error |
| "tus fondos están asegurados / protegidos / garantizados" | No hay seguro de depósitos. Se dice lo contrario de forma explícita |
| "FDIC", "FOPEBA", "fondo de garantía" como cobertura propia | No aplica. Solo se menciona para negar la cobertura |
| "inversión", "rendimiento", "ahorra y gana", "intereses" | El USDC es instrumento de tránsito, no producto de inversión |
| "SOC 2", "ISO 27001", "certificado", "auditado" | No hay certificación emitida |
| "instantáneo", "en segundos", "el mejor tipo de cambio" | Los tiempos dependen de bancos externos; prometerlos es una afirmación que no se puede sostener |
| "sin comisiones" | Hay spread del 2% y tarifa fija por corredor |
| Cifras concretas de usuarios, volumen o países "activos" | No verificadas; una cifra desactualizada en la ficha es una afirmación falsa |

---

## 5. Clasificación de contenido y audiencia

**Cuestionario IARC — respuestas sugeridas** (todas "No" salvo lo indicado):

| Pregunta | Respuesta |
|---|---|
| Categoría de la app | Utilidad / Productividad / Comunicación → **Finanzas** |
| Violencia, sangre, lenguaje soez, contenido sexual, desnudez | No |
| Drogas, alcohol, tabaco | No |
| Juegos de azar, apuestas o simulación de apuestas | No |
| Contenido generado por usuarios compartido públicamente | No |
| Comunicación entre usuarios sin moderar | No (solo transferencias y QR entre usuarios, sin mensajería) |
| Comparte la ubicación del usuario | No |
| Permite comprar bienes digitales | No (no hay compras integradas; es un servicio financiero) |
| Acceso a sitios web sin filtrar | No |

**Público objetivo:** **solo mayores de 18 años.** Es un requisito de los propios
Términos (sección 5: elegibilidad) y del KYC, así que la ficha debe coincidir. No
marcar ninguna franja infantil ni participar en "Diseñado para familias".

**Anuncios:** **No.** La app no muestra publicidad ni integra redes de anuncios.
Hay que dejar sin marcar "Contiene anuncios" en la ficha.

**Otras declaraciones obligatorias de App content:**
- URL de política de privacidad: `https://alyto.app/privacy`
- Eliminación de cuenta: URL pública `https://alyto.app/eliminar-cuenta` + ruta
  in-app. Declarar que es borrado **con retención legal de 5 años**.
- App de acceso gubernamental: No.

---

## 6. Assets que faltan

Ninguno de estos está listo para producción.

| Asset | Requisito de Play | Estado |
|---|---|---|
| Ícono | PNG 512×512, 32 bits | ⚠️ El actual se generó con `@capacitor/assets` desde `resources/icon.png` y es **provisional**: es el wordmark horizontal centrado, no un isotipo. Para producción hace falta un **símbolo cuadrado** |
| Feature graphic | 1024×500, JPG o PNG de 24 bits, **sin canal alfa** | **No existe** |
| Capturas de teléfono | Mínimo 2, lado corto ≥ 320 px y lado largo ≤ 3840 px | **No existen** |
| Capturas de tablet | Opcionales, pero mejoran la ficha | No existen |
| Vídeo promocional | Opcional (enlace de YouTube) | No existe |

### 6.1 Qué pantallas conviene capturar, y con qué datos

⚠️ **Nunca capturar con datos reales de clientes.** Usar una cuenta de prueba con
nombre ficticio, y revisar que no se cuele un saldo, un alias, un correo, un
número de documento ni un identificador de transacción real. Play revisa las
capturas y además quedan públicas de forma permanente.

Orden sugerido (las dos primeras son las que más se ven):

1. **Inicio / billetera**: saldo en bolivianos con montos redondos y ficticios.
   Transmite "billetera" de un vistazo.
2. **Cotización antes de confirmar**: es el diferenciador real, porque muestra
   monto recibido, tipo de cambio y comisiones desglosadas.
3. **Cobro con QR**: ilustra la función P2P. Usar un QR de prueba.
4. **Detalle de transacción con el comprobante**: transmite trazabilidad. Tapar o
   falsear el TXID de Stellar y el nombre del beneficiario.
5. **Verificación de identidad**: la pantalla **previa** a Stripe Identity, nunca
   la captura del documento ni el selfie.

Sugerencia: añadir un rótulo corto sobre cada captura (una frase, sin afirmar
nada de la sección 4.3) y mantener el marco del dispositivo consistente.
