export const LEGAL_DOCS = {
  terms: {
    es: {
      title: 'Términos y Condiciones de Uso — v2.2',
      lastUpdated: 'Octubre 2026',
      sections: [
        {
          title: '1. Identificación de las Entidades Operadoras',
          content: `Alyto Wallet es operado por tres entidades legales diferenciadas:

▸ AV Finance SRL — Bolivia (Entidad PSAV)
Domicilio legal: Av. Ramiro Castillo N° 13, La Paz, Bolivia | soporte@alyto.app
Domicilio operativo: Calle Otero de la Vega N° 295, La Paz, Bolivia
Opera como Proveedor de Servicios de Activos Virtuales (PSAV) conforme al Decreto Supremo N° 5384 y la Circular ASFI 885/2025. Registro PSAV ante ASFI en trámite.

▸ AV Finance SpA — Chile (Intermediario de Pagos)
Maipú 378, Antofagasta, Chile | RUT: 78028602-4 | soporte@alyto.app
Opera como intermediario de pagos transfronterizos bajo normativa chilena (CMF).

▸ AV Finance, LLC — Delaware, EE.UU. (Entidad corporativa matriz / Infraestructura)
Dirección registrada: 131 Continental Dr, Suite 305, Newark, DE 19713, Estados Unidos
EIN: 37-2216801 | Tel: +1 (302) 601-5864 | pagos@alyto.app
Industria: Financial Technology — Cross-border payments and digital asset infrastructure.
Entidad matriz del grupo; provee infraestructura tecnológica SaaS para pagos institucionales en USD.`,
        },
        {
          title: '2. Servicios Prestados',
          content: `Usuarios bolivianos (AV Finance SRL):
- Envío de dinero internacional desde Bolivia (BOB) a más de 23 destinos.
- Conversión BOB → USDC (activo virtual estable) para liquidar transferencias.
- Wallet digital USDC custodiada por AV Finance SRL en red Stellar.
- Pagos P2P en bolivianos mediante código QR dentro de la red Alyto.

Usuarios chilenos (AV Finance SpA):
- Envío de dinero internacional desde Chile (CLP) a LatAm y Bolivia.

Usuarios institucionales (AV Finance, LLC):
- Transferencias USD a destinos globales vía OwlPay Harbor.`,
        },
        {
          title: '3. Naturaleza Jurídica de los Activos Virtuales',
          content: `Conforme al Decreto Supremo N° 5384 y la Resolución Ministerial N° 055/2025 del MEFP de Bolivia, los activos virtuales estables (USDC en red Stellar) utilizados por Alyto Wallet son:

- Un mecanismo alternativo de pago para obligaciones en moneda extranjera.
- Un activo virtual de tipo transaccional con valor constante vinculado al USD.
- Un instrumento de tránsito temporal — NO un producto de inversión.

⚠️ IMPORTANTE: Los activos virtuales custodiados por AV Finance SRL son instrumentos de tránsito. No generan intereses, no son depósitos bancarios y no están cubiertos por el Fondo de Protección al Ahorrista (FOPEBA) de Bolivia.`,
        },
        {
          title: '4. Custodia de Fondos y Activos Virtuales',
          content: `AV Finance SRL actúa como custodio temporal de:

- Fondos BOB: recibidos en cuenta bancaria regulada por ASFI, custodiados durante el procesamiento de la transferencia (generalmente menos de 24 horas hábiles).
- USDC: custodiado en wallet Stellar de AV Finance SRL para liquidar pagos a proveedores internacionales.
- Saldo USDC del usuario: administrado en la wallet digital de la plataforma.

⚠️ IMPORTANTE: La custodia de AV Finance SRL es de carácter operativo y transitorio. AV Finance SRL NO es una entidad de intermediación financiera de captación (banco, cooperativa o mutual) y no está autorizada a captar depósitos del público en moneda nacional conforme a la Ley 393 de Servicios Financieros de Bolivia.`,
        },
        {
          title: '5. Elegibilidad y KYC/AML',
          content: `Para usar la Plataforma debes:
- Ser mayor de 18 años.
- Proporcionar información veraz y completa.
- Completar verificación de identidad (KYC) vía Stripe Identity.
- No estar en listas de sanciones internacionales (OFAC, ONU, GAFI/FATF).

Como PSAV, AV Finance SRL tiene obligación legal de:
- Verificar la identidad y el origen lícito de los fondos.
- Reportar operaciones sospechosas a la UAF Bolivia (sin previo aviso al usuario).
- Conservar registros de transacciones por mínimo 5 años (normativa ASFI).
- Aplicar Debida Diligencia Ampliada para personas políticamente expuestas (PEPs).`,
        },
        {
          title: '6. Tarifas y Tipo de Cambio',
          content: `• Spread: 2% sobre el tipo de cambio interbancario de mercado.
- Tarifa fija: según el corredor seleccionado (visible antes de confirmar).
- Tasa BOB/USD: referenciada al mercado libre Binance P2P.

⚠️ La tasa BOB/USD utilizada es la tasa libre de mercado (P2P), que puede diferir de la tasa oficial del Banco Central de Bolivia (BCB). Esta diferencia es inherente al modelo de pagos internacionales con activos virtuales y está incluida dentro del spread declarado.`,
        },
        {
          title: '7. Tiempos de Transferencia',
          content: `• LatAm via Vita Wallet: pocas horas a 1 día hábil.
- China (CNY) y Nigeria (NGN) via OwlPay Harbor: 1 a 3 días hábiles.
- Bolivia manual (corredor cl-bo): hasta 24 horas hábiles.

Los tiempos son estimativos y dependen de sistemas bancarios externos.`,
        },
        {
          title: '8. Cancelaciones y Reembolsos',
          content: `Una transferencia puede cancelarse solo si no ha sido procesada por el proveedor. Errores atribuibles a Alyto serán reembolsados en BOB o USDC dentro de 5 días hábiles.`,
        },
        {
          title: '9. Usos Prohibidos',
          content: `Queda estrictamente prohibido:
- Lavado de dinero o financiamiento del terrorismo (Ley 1762 / GAFI).
- Evasión de controles cambiarios del BCB/ASFI.
- Transferencias de fondos de origen no declarado o ilegal.
- Fragmentación de operaciones para eludir límites de reporte (structuring).
- Actividades sancionadas por OFAC, ONU o GAFI.`,
        },
        {
          title: '10. Suspensión, Congelamiento y Reporte',
          content: `AV Finance SRL podrá, en cumplimiento de sus obligaciones como PSAV:
- Suspender o cancelar cuentas por actividad sospechosa o requerimiento de autoridades.
- Congelar fondos o activos virtuales cuando lo requieran la UAF Bolivia o ASFI.
- Reportar operaciones sospechosas sin previo aviso al usuario (Ley 1762).
- Retener fondos durante procesos de verificación de origen.`,
        },
        {
          title: '11. Limitación de Responsabilidad',
          content: `Alyto no es responsable por: retrasos en sistemas bancarios externos, variaciones en el tipo de cambio BOB/USD entre cotización y ejecución, información incorrecta del usuario, fuerza mayor, o devaluación de activos virtuales por factores externos. La responsabilidad máxima se limita al monto de la transacción.`,
        },
        {
          title: '12. Ley Aplicable',
          content: `• AV Finance SRL: Ley boliviana. La Paz, Bolivia. ASFI supervisora.
- AV Finance SpA: Ley chilena. Antofagasta, Chile. CMF supervisora.
- AV Finance, LLC: Ley de Delaware, EE.UU. Arbitraje AAA.

Reclamaciones: soporte@alyto.app (respondemos en 5 días hábiles).
Autoridades: ASFI Bolivia (asfi.gob.bo) | CMF Chile (cmfchile.cl) | FTC EE.UU. (ftc.gov)`,
        },
        {
          title: '13. Modificaciones',
          content: `Podemos modificar estos Términos con 15 días de anticipación. Cambios regulatorios urgentes pueden aplicarse de inmediato con notificación simultánea. La versión vigente siempre está disponible en la Plataforma. Versión actual: 2.1 — Abril 2026.`,
        },
      ],
    },
    en: {
      title: 'Terms of Service — v2.2',
      lastUpdated: 'October 2026',
      sections: [
        {
          title: '1. Operating Entities and Regulatory Framework',
          content: `Alyto Wallet is operated by three distinct legal entities:

▸ AV Finance SRL — Bolivia (VASP Entity)
Legal address: Av. Ramiro Castillo N° 13, La Paz, Bolivia | soporte@alyto.app
Operational address: Calle Otero de la Vega N° 295, La Paz, Bolivia
Operates as a Virtual Asset Service Provider (VASP) under Bolivian Supreme Decree N° 5384 and ASFI Circular 885/2025. VASP registration pending before ASFI.

▸ AV Finance SpA — Chile (Payment Intermediary)
Maipú 378, Antofagasta, Chile | RUT: 78028602-4 | soporte@alyto.app
Operates as a cross-border payment intermediary under Chilean CMF regulations.

▸ AV Finance, LLC — Delaware, USA (Corporate parent / Infrastructure Provider)
Registered address: 131 Continental Dr, Suite 305, Newark, DE 19713, United States
EIN: 37-2216801 | Phone: +1 (302) 601-5864 | pagos@alyto.app
Industry: Financial Technology — Cross-border payments and digital asset infrastructure.
Group parent company; provides SaaS technology infrastructure for institutional USD payments.`,
        },
        {
          title: '2. Legal Nature of Virtual Assets',
          content: `Under Bolivian Supreme Decree N° 5384 and Ministerial Resolution N° 055/2025, the stablecoins used by Alyto Wallet (USDC on Stellar) are transitional payment instruments — not investment products and not bank deposits.

⚠️ IMPORTANT: USDC held by AV Finance SRL is a transit instrument. It does not earn interest and is not covered by Bolivian deposit protection schemes (FOPEBA).`,
        },
        {
          title: '3. Custody of Funds and Virtual Assets',
          content: `AV Finance SRL acts as temporary custodian of BOB funds (in an ASFI-regulated bank account) and USDC virtual assets (in a Stellar wallet) during transfer processing.

⚠️ IMPORTANT: AV Finance SRL's custody is operational and transitory. It is NOT a deposit-taking institution and is not authorized to accept public savings deposits under Bolivia's Financial Services Law 393.`,
        },
        {
          title: '4. Eligibility and KYC/AML',
          content: `You must be at least 18 years old, provide truthful information, and complete KYC via Stripe Identity. You must not appear on OFAC, UN, or FATF sanctions lists.

As a VASP, AV Finance SRL is legally required to verify identity and source of funds, report suspicious transactions to Bolivia's UAF (without prior notice to the user), and retain records for a minimum of 5 years.`,
        },
        {
          title: '5. Fees and Exchange Rates',
          content: `• Spread: 2% over interbank market rate.
- Fixed fee: per selected corridor (shown before confirmation).
- BOB/USD rate: referenced to the Binance P2P free market rate.

⚠️ The BOB/USD rate used is the free market (P2P) rate, which may differ from the official Banco Central de Bolivia rate. This is inherent to international payments with virtual assets.`,
        },
        {
          title: '6. Prohibited Uses',
          content: `Strictly prohibited: money laundering, terrorist financing, evasion of BCB/ASFI exchange controls, transfer of funds of illegal origin, structuring to evade reporting thresholds, and activities sanctioned by OFAC, UN, or FATF.`,
        },
        {
          title: '7. Suspension and Reporting',
          content: `AV Finance SRL may suspend accounts, freeze assets, and report suspicious transactions to UAF Bolivia without prior notice, as required by Law 1762 and ASFI regulations.`,
        },
        {
          title: '8. Governing Law',
          content: `• AV Finance SRL: Bolivian law. La Paz jurisdiction. ASFI supervisor.
- AV Finance SpA: Chilean law. Antofagasta courts. CMF supervisor.
- AV Finance, LLC: Delaware law. AAA arbitration.

Claims: soporte@alyto.app — we respond within 5 business days.
Regulatory authorities: ASFI (asfi.gob.bo) | CMF (cmfchile.cl) | FTC (ftc.gov)`,
        },
      ],
    },
    pt: {
      title: 'Termos de Serviço — v2.2',
      lastUpdated: 'Outubro 2026',
      sections: [
        {
          title: '1. Entidades Operadoras',
          content: `▸ AV Finance SRL — Bolívia (Entidade PSAV)
Opera como Provedora de Serviços de Ativos Virtuais (PSAV) sob o DS N° 5384 e Circular ASFI 885/2025. Registro PSAV pendente perante a ASFI.

▸ AV Finance SpA — Chile (Intermediário de Pagamentos)
Maipú 378, Antofagasta, Chile | RUT: 78028602-4

▸ AV Finance, LLC — Delaware, EUA (Entidade matriz / Infraestrutura)
Endereço registrado: 131 Continental Dr, Suite 305, Newark, DE 19713, Estados Unidos
EIN: 37-2216801 | Tel: +1 (302) 601-5864 | pagos@alyto.app
Setor: Financial Technology — Cross-border payments and digital asset infrastructure.
Empresa matriz do grupo; provê infraestrutura tecnológica SaaS para pagamentos institucionais em USD.`,
        },
        {
          title: '2. Custódia de Fundos e Ativos Virtuais',
          content: `A AV Finance SRL atua como custodiante temporária de fundos BOB (em conta bancária regulada pela ASFI) e ativos USDC (em wallet Stellar) durante o processamento de transferências.

⚠️ IMPORTANTE: A AV Finance SRL NÃO é uma instituição captadora de depósitos e não está autorizada a captar poupança pública conforme a Lei 393 de Serviços Financeiros da Bolívia. A custódia é operacional e transitória.`,
        },
        {
          title: '3. Natureza Jurídica dos Ativos Virtuais',
          content: `O USDC utilizado é um instrumento de pagamento transitório — não é produto de investimento nem depósito bancário. Não gera juros e não está coberto por esquemas de proteção de depósitos bolivianos (FOPEBA).`,
        },
        {
          title: '4. Taxas e Câmbio',
          content: `• Spread: 2% sobre a taxa interbancária.
- Taxa fixa: por corredor (exibida antes da confirmação).
- Taxa BOB/USD: mercado livre Binance P2P (pode diferir da taxa oficial do BCB).`,
        },
        {
          title: '5. Compliance AML/KYC',
          content: `Como PSAV, a AV Finance SRL é legalmente obrigada a verificar identidade e origem dos fundos, reportar operações suspeitas à UAF Bolívia e manter registros por mínimo 5 anos.`,
        },
        {
          title: '6. Lei Aplicável',
          content: `• AV Finance SRL: lei boliviana, foro La Paz, supervisão ASFI.
- AV Finance SpA: lei chilena, foro Antofagasta, supervisão CMF.
- AV Finance, LLC: lei de Delaware, arbitragem AAA.

Contato: soporte@alyto.app | alyto.app`,
        },
      ],
    },
  },
  privacy: {
    es: {
      title: 'Política de Privacidad',
      lastUpdated: 'Octubre 2026',
      sections: [
        {
          title: '1. Responsable del Tratamiento',
          content: `AV Finance, LLC (131 Continental Dr, Suite 305, Newark, DE 19713, EE.UU.), AV Finance SpA (Maipú 378, Antofagasta, Chile) y AV Finance SRL (Av. Ramiro Castillo N° 13, La Paz, Bolivia). Contacto: soporte@alyto.app`,
        },
        {
          title: '2. Datos que Recopilamos',
          content: `Identidad: nombre y apellidos, fecha de nacimiento, nacionalidad, país de residencia, dirección, y tipo y número de documento (CI, NIT, pasaporte, RUT o EIN) con su país emisor y su fecha de vencimiento.

Verificación biométrica: selfie y fotografía del documento, capturadas y evaluadas por Stripe Identity. Alyto NO conserva esas imágenes: solo guarda el resultado de la verificación y el identificador de la sesión.

Contacto: email, teléfono, alias Alyto y foto de perfil.

Financieros: historial de transacciones, saldos, comisiones y tasas aplicadas, origen declarado de los fondos, datos de los beneficiarios que registras (nombre, cuenta, país) y comprobantes de pago.

Empresa (solo cuentas business): razón social, identificación fiscal, representante legal, giro y documentos societarios.

Técnicos y de acceso: dirección IP, identificador del navegador o dispositivo, registros de inicio de sesión e intentos fallidos, la IP y el dispositivo con que aceptaste estos términos, el token de notificaciones push y la clave pública de tu cuenta Stellar.

Seguridad: hash de la contraseña, secreto del segundo factor y códigos de recuperación.

NO recopilamos geolocalización por GPS. El país de residencia y el país emisor del documento no permiten derivar tu ubicación precisa.`,
        },
        {
          title: '3. Finalidades',
          content: `Prestación del servicio, cumplimiento KYC/AML (ASFI/UAF/FinCEN), prevención del fraude, notificaciones transaccionales y soporte.`,
        },
        {
          title: '4. Proveedores',
          content: `Stripe Identity (verificación de identidad y cobros con tarjeta), Vita Wallet (pagos LatAm), OwlPay Harbor (pagos globales), Banco Económico (cobro por QR en Bolivia), Amazon Web Services (alojamiento, gestión de claves de cifrado y archivo inmutable de comprobantes), Anthropic (asistente de soporte y análisis de documentos de empresa, cuando esas funciones están habilitadas), SendGrid (correo transaccional), Firebase (notificaciones push), Stellar Network (registro de liquidación) y Sentry (diagnóstico de errores técnicos).

Cada proveedor recibe únicamente los datos necesarios para la función que presta.`,
        },
        {
          title: '5. Transferencia Internacional de Datos',
          content: `Tus datos personales se almacenan y se tratan FUERA de Bolivia y de Chile:

- Base de datos: MongoDB Atlas, región sa-east-1 (São Paulo, Brasil). Ahí residen tu identidad, tus transacciones y los datos de tus beneficiarios.
- Infraestructura, claves de cifrado y archivo de comprobantes: Amazon Web Services, región us-east-1 (Virginia, Estados Unidos).
- Servidor de la aplicación y de la API: alojado en Estados Unidos.

Bolivia y Chile son el domicilio legal de AV Finance SRL y AV Finance SpA, no el lugar donde se procesan los datos. La única operación que se procesa localmente en Bolivia es el cobro por QR a través de Banco Económico.

Los demás proveedores reciben solo los datos necesarios para su función: verificación de identidad, correo, notificaciones push y diagnóstico de errores operan desde Estados Unidos, y la dispersión de fondos desde Estados Unidos y Uruguay.

⚠️ IMPORTANTE: la red Stellar es un registro público y distribuido. El identificador de cada transacción, los montos y las claves públicas de las cuentas quedan visibles de forma permanente para cualquiera y NO se pueden borrar ni rectificar. En la red NO publicamos tu nombre, tu documento ni tus datos de contacto.`,
        },
        {
          title: '6. Decisiones Automatizadas',
          content: `Algunas decisiones se toman sin intervención humana:

- Aprobación o rechazo de la verificación de identidad, según el resultado que devuelve Stripe Identity. Determinados motivos (documento vencido, el rostro no coincide con el del documento) se aplican como rechazo definitivo.
- Cotejo contra listas de sanciones internacionales, que puede marcar tu cuenta y bloquear operaciones.
- Bloqueo de una operación concreta por superar límites, por falta de liquidez en el corredor o por tener la cuenta marcada.

Tienes derecho a pedir la revisión humana de cualquiera de estas decisiones, a conocer sus motivos y a impugnarla escribiendo a soporte@alyto.app.`,
        },
        {
          title: '7. Retención de Datos',
          content: `Identidad y verificación: 5 años desde el cierre de la cuenta.

Transacciones y comprobantes: 5 años. Los comprobantes se archivan en almacenamiento inmutable, que impide borrarlos o alterarlos antes de cumplirse el plazo.

Registros de acceso e intentos de verificación: se conservan como respaldo de la debida diligencia y no se eliminan de forma automática.

Notificaciones: 5 años. Telemetría de procesos internos: 180 días.`,
        },
        {
          title: '8. Seguridad y Sesión',
          content: `Cifrado: el número de tu documento, el secreto del segundo factor y la clave secreta de tu cuenta Stellar se guardan cifrados con AES-256-GCM, bajo claves gestionadas en el servicio de claves de AWS. Las contraseñas se guardan con bcrypt, nunca en claro. Todo el tráfico viaja por TLS.

Sesión: en la web la sesión viaja en una cookie "alyto_token" marcada HttpOnly y Secure, con SameSite Lax o None según el despliegue, y caduca a las 24 horas (7 días si eliges mantener la sesión abierta). En la app Android la sesión NO usa cookies: viaja en el encabezado Authorization como token Bearer guardado en el almacenamiento local del dispositivo, porque las cookies entre dominios no circulan dentro del WebView.

Cerramos la sesión por inactividad (10 minutos por defecto), revocamos todas las sesiones abiertas cuando cambias la contraseña y bloqueamos la cuenta de forma temporal tras varios intentos fallidos de acceso.

NO usamos cookies de analítica, de publicidad ni de rastreo de terceros.`,
        },
        {
          title: '9. Permisos del Dispositivo',
          content: `Cámara: se usa únicamente para leer códigos QR de pago. La lectura ocurre dentro de tu propio dispositivo: la imagen NO se envía a nuestros servidores ni se almacena, solo se transmite el contenido ya descifrado del código. La captura del selfie y del documento para la verificación de identidad la realiza Stripe Identity en su propio entorno.

Notificaciones: se usan para avisarte del estado de tus operaciones.

Puedes revocar ambos permisos en cualquier momento desde los ajustes de tu sistema operativo. La app sigue funcionando sin ellos, salvo las funciones que dependen de la cámara.`,
        },
        {
          title: '10. Sus Derechos',
          content: `Puedes ejercer acceso, rectificación, portabilidad y oposición escribiendo a soporte@alyto.app. Respondemos en 30 días.

Supresión (derecho limitado por obligación legal): al solicitar la eliminación de tu cuenta la desactivamos, revocamos todas tus sesiones, liberamos tu alias, borramos los tokens de notificaciones y anonimizamos los datos de contacto que no están sujetos a conservación obligatoria.

⚠️ Sin embargo, como proveedor de servicios de activos virtuales sujeto a la normativa AML/CFT boliviana, NO podemos borrar los registros de identidad, verificación, aceptación de términos y transacciones: se conservan durante 5 años y solo se purgan al cumplirse ese plazo. Tampoco podemos procesar la solicitud mientras te queden fondos en la plataforma u operaciones en curso.

Puedes reclamar ante ASFI (Bolivia), CMF/CNDP (Chile) o FTC (EE.UU.).`,
        },
        {
          title: '11. Contacto',
          content: `soporte@alyto.app | alyto.app`,
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'October 2026',
      sections: [
        {
          title: '1. Data Controller',
          content: `AV Finance, LLC (131 Continental Dr, Suite 305, Newark, DE 19713, USA), AV Finance SpA (Maipú 378, Antofagasta, Chile), AV Finance SRL (Av. Ramiro Castillo N° 13, La Paz, Bolivia). Contact: soporte@alyto.app`,
        },
        {
          title: '2. Data We Collect',
          content: `Identity: first and last name, date of birth, nationality, country of residence, address, and ID document type and number (CI, NIT, passport, RUT or EIN) with its issuing country and expiry date.

Biometric verification: selfie and photograph of the ID document, captured and assessed by Stripe Identity. Alyto does NOT retain those images: we store only the verification outcome and the session identifier.

Contact: email, phone, Alyto alias and profile picture.

Financial: transaction history, balances, fees and rates applied, declared source of funds, the beneficiary details you save (name, account, country) and payment receipts.

Business (business accounts only): legal name, tax ID, legal representative, line of business and corporate documents.

Technical and access: IP address, browser or device identifier, sign-in records and failed attempts, the IP and device used to accept these terms, the push notification token and the public key of your Stellar account.

Security: password hash, second-factor secret and recovery codes.

We do NOT collect GPS geolocation. Country of residence and the document's issuing country do not allow your precise location to be derived.`,
        },
        {
          title: '3. Purposes',
          content: `Service delivery, KYC/AML compliance (ASFI/UAF/FinCEN), fraud prevention, transactional notifications and support.`,
        },
        {
          title: '4. Providers',
          content: `Stripe Identity (identity verification and card payments), Vita Wallet (LatAm payouts), OwlPay Harbor (global payouts), Banco Económico (QR collection in Bolivia), Amazon Web Services (hosting, encryption key management and immutable archiving of receipts), Anthropic (support assistant and business document analysis, when those features are enabled), SendGrid (transactional email), Firebase (push notifications), Stellar Network (settlement ledger) and Sentry (technical error diagnostics).

Each provider receives only the data required for the function it performs.`,
        },
        {
          title: '5. International Data Transfers',
          content: `Your personal data is stored and processed OUTSIDE Bolivia and Chile:

- Database: MongoDB Atlas, sa-east-1 region (São Paulo, Brazil). This holds your identity, your transactions and your beneficiary details.
- Infrastructure, encryption keys and receipt archive: Amazon Web Services, us-east-1 region (Virginia, United States).
- Application and API server: hosted in the United States.

Bolivia and Chile are the registered domiciles of AV Finance SRL and AV Finance SpA, not the place where data is processed. The only operation processed locally in Bolivia is QR collection through Banco Económico.

The remaining providers receive only the data required for their function: identity verification, email, push notifications and error diagnostics operate from the United States, and payouts from the United States and Uruguay.

⚠️ IMPORTANT: the Stellar network is a public, distributed ledger. Each transaction identifier, the amounts and the account public keys remain permanently visible to anyone and CANNOT be deleted or rectified. We do NOT publish your name, ID document or contact details on the network.`,
        },
        {
          title: '6. Automated Decision-Making',
          content: `Some decisions are made without human intervention:

- Approval or rejection of identity verification, based on the outcome returned by Stripe Identity. Certain reasons (expired document, face does not match the document) are applied as a final rejection.
- Screening against international sanctions lists, which may flag your account and block transactions.
- Blocking of a specific transaction for exceeding limits, for lack of corridor liquidity, or because the account is flagged.

You have the right to request human review of any of these decisions, to be told the reasons for them, and to contest them by writing to soporte@alyto.app.`,
        },
        {
          title: '7. Data Retention',
          content: `Identity and verification: 5 years from account closure.

Transactions and receipts: 5 years. Receipts are archived in immutable storage, which prevents deletion or alteration before the retention period elapses.

Access records and verification attempts: retained as evidence of due diligence and not deleted automatically.

Notifications: 5 years. Internal process telemetry: 180 days.`,
        },
        {
          title: '8. Security and Sessions',
          content: `Encryption: your ID document number, your second-factor secret and your Stellar account secret key are stored encrypted with AES-256-GCM, under keys managed in the AWS key service. Passwords are stored with bcrypt, never in plaintext. All traffic travels over TLS.

Sessions: on the web, the session travels in an "alyto_token" cookie marked HttpOnly and Secure, with SameSite Lax or None depending on the deployment, expiring after 24 hours (7 days if you choose to stay signed in). In the Android app the session does NOT use cookies: it travels in the Authorization header as a Bearer token held in the device's local storage, because cross-domain cookies do not flow inside the WebView.

We close the session on inactivity (10 minutes by default), revoke all open sessions when you change your password, and temporarily lock the account after repeated failed sign-in attempts.

We do NOT use analytics, advertising or third-party tracking cookies.`,
        },
        {
          title: '9. Device Permissions',
          content: `Camera: used solely to read payment QR codes. Reading happens on your own device: the image is NOT sent to our servers and is not stored, only the decoded content of the code is transmitted. The selfie and document capture for identity verification is performed by Stripe Identity in its own environment.

Notifications: used to inform you of the status of your transactions.

You can revoke both permissions at any time from your operating system settings. The app keeps working without them, except for the features that depend on the camera.`,
        },
        {
          title: '10. Your Rights',
          content: `You may exercise access, rectification, portability and objection by writing to soporte@alyto.app. We respond within 30 days.

Erasure (right limited by legal obligation): when you request deletion of your account we deactivate it, revoke all your sessions, release your alias, delete your notification tokens and anonymise the contact data that is not subject to mandatory retention.

⚠️ However, as a virtual asset service provider subject to Bolivian AML/CFT regulations, we CANNOT delete identity, verification, terms-acceptance and transaction records: they are retained for 5 years and purged only once that period elapses. Nor can we process the request while you still hold funds on the platform or have transactions in progress.

You may lodge a complaint with ASFI (Bolivia), CMF/CNDP (Chile) or the FTC (USA).`,
        },
        {
          title: '11. Contact',
          content: `soporte@alyto.app | alyto.app`,
        },
      ],
    },
    pt: {
      title: 'Política de Privacidade',
      lastUpdated: 'Outubro 2026',
      sections: [
        {
          title: '1. Controlador dos Dados',
          content: `AV Finance, LLC (131 Continental Dr, Suite 305, Newark, DE 19713, EUA), AV Finance SpA (Maipú 378, Antofagasta, Chile) e AV Finance SRL (Av. Ramiro Castillo N° 13, La Paz, Bolívia). Contato: soporte@alyto.app`,
        },
        {
          title: '2. Dados Coletados',
          content: `Identidade: nome e sobrenome, data de nascimento, nacionalidade, país de residência, endereço, e tipo e número do documento (CI, NIT, passaporte, RUT ou EIN) com o país emissor e a data de validade.

Verificação biométrica: selfie e fotografia do documento, capturadas e avaliadas pela Stripe Identity. A Alyto NÃO conserva essas imagens: guarda apenas o resultado da verificação e o identificador da sessão.

Contato: email, telefone, alias Alyto e foto de perfil.

Financeiros: histórico de transações, saldos, taxas e câmbios aplicados, origem declarada dos fundos, dados dos beneficiários que você cadastra (nome, conta, país) e comprovantes de pagamento.

Empresa (apenas contas business): razão social, identificação fiscal, representante legal, ramo de atividade e documentos societários.

Técnicos e de acesso: endereço IP, identificador do navegador ou dispositivo, registros de login e tentativas falhadas, o IP e o dispositivo com que você aceitou estes termos, o token de notificações push e a chave pública da sua conta Stellar.

Segurança: hash da senha, segredo do segundo fator e códigos de recuperação.

NÃO coletamos geolocalização por GPS. O país de residência e o país emissor do documento não permitem derivar a sua localização precisa.`,
        },
        {
          title: '3. Finalidades',
          content: `Prestação do serviço, cumprimento KYC/AML (ASFI/UAF/FinCEN), prevenção de fraude, notificações transacionais e suporte.`,
        },
        {
          title: '4. Fornecedores',
          content: `Stripe Identity (verificação de identidade e cobranças com cartão), Vita Wallet (pagamentos LatAm), OwlPay Harbor (pagamentos globais), Banco Económico (cobrança por QR na Bolívia), Amazon Web Services (hospedagem, gestão de chaves de criptografia e arquivo imutável de comprovantes), Anthropic (assistente de suporte e análise de documentos de empresa, quando essas funções estão habilitadas), SendGrid (email transacional), Firebase (notificações push), Stellar Network (registro de liquidação) e Sentry (diagnóstico de erros técnicos).

Cada fornecedor recebe apenas os dados necessários para a função que presta.`,
        },
        {
          title: '5. Transferência Internacional de Dados',
          content: `Seus dados pessoais são armazenados e tratados FORA da Bolívia e do Chile:

- Banco de dados: MongoDB Atlas, região sa-east-1 (São Paulo, Brasil). É onde residem sua identidade, suas transações e os dados dos seus beneficiários.
- Infraestrutura, chaves de criptografia e arquivo de comprovantes: Amazon Web Services, região us-east-1 (Virgínia, Estados Unidos).
- Servidor do aplicativo e da API: hospedado nos Estados Unidos.

A Bolívia e o Chile são o domicílio legal da AV Finance SRL e da AV Finance SpA, não o lugar onde os dados são processados. A única operação processada localmente na Bolívia é a cobrança por QR através do Banco Económico.

Os demais fornecedores recebem apenas os dados necessários para a sua função: verificação de identidade, email, notificações push e diagnóstico de erros operam a partir dos Estados Unidos, e a dispersão de fundos a partir dos Estados Unidos e do Uruguai.

⚠️ IMPORTANTE: a rede Stellar é um registro público e distribuído. O identificador de cada transação, os montantes e as chaves públicas das contas ficam visíveis de forma permanente para qualquer pessoa e NÃO podem ser apagados nem retificados. Na rede NÃO publicamos o seu nome, o seu documento nem os seus dados de contato.`,
        },
        {
          title: '6. Decisões Automatizadas',
          content: `Algumas decisões são tomadas sem intervenção humana:

- Aprovação ou recusa da verificação de identidade, conforme o resultado devolvido pela Stripe Identity. Determinados motivos (documento vencido, o rosto não corresponde ao do documento) são aplicados como recusa definitiva.
- Checagem contra listas de sanções internacionais, que pode sinalizar a sua conta e bloquear operações.
- Bloqueio de uma operação específica por exceder limites, por falta de liquidez no corredor ou por a conta estar sinalizada.

Você tem direito a pedir a revisão humana de qualquer uma destas decisões, a conhecer os seus motivos e a contestá-la escrevendo para soporte@alyto.app.`,
        },
        {
          title: '7. Retenção',
          content: `Identidade e verificação: 5 anos a contar do encerramento da conta.

Transações e comprovantes: 5 anos. Os comprovantes são arquivados em armazenamento imutável, que impede apagá-los ou alterá-los antes de cumprido o prazo.

Registros de acesso e tentativas de verificação: conservados como lastro da devida diligência e não eliminados automaticamente.

Notificações: 5 anos. Telemetria de processos internos: 180 dias.`,
        },
        {
          title: '8. Segurança e Sessão',
          content: `Criptografia: o número do seu documento, o segredo do segundo fator e a chave secreta da sua conta Stellar são guardados criptografados com AES-256-GCM, sob chaves geridas no serviço de chaves da AWS. As senhas são guardadas com bcrypt, nunca em texto claro. Todo o tráfego trafega por TLS.

Sessão: na web a sessão trafega num cookie "alyto_token" marcado HttpOnly e Secure, com SameSite Lax ou None conforme o ambiente, e expira em 24 horas (7 dias se você optar por manter a sessão aberta). No app Android a sessão NÃO usa cookies: trafega no cabeçalho Authorization como token Bearer guardado no armazenamento local do dispositivo, porque cookies entre domínios não circulam dentro do WebView.

Encerramos a sessão por inatividade (10 minutos por padrão), revogamos todas as sessões abertas quando você troca a senha e bloqueamos a conta temporariamente após várias tentativas falhadas de acesso.

NÃO usamos cookies de analítica, de publicidade nem de rastreamento de terceiros.`,
        },
        {
          title: '9. Permissões do Dispositivo',
          content: `Câmera: usada apenas para ler códigos QR de pagamento. A leitura ocorre dentro do seu próprio dispositivo: a imagem NÃO é enviada aos nossos servidores nem armazenada, apenas o conteúdo decodificado do código é transmitido. A captura da selfie e do documento para a verificação de identidade é feita pela Stripe Identity no seu próprio ambiente.

Notificações: usadas para avisá-lo do estado das suas operações.

Você pode revogar ambas as permissões a qualquer momento nas configurações do seu sistema operacional. O app continua funcionando sem elas, exceto nas funções que dependem da câmera.`,
        },
        {
          title: '10. Seus Direitos',
          content: `Você pode exercer acesso, retificação, portabilidade e oposição escrevendo para soporte@alyto.app. Respondemos em 30 dias.

Exclusão (direito limitado por obrigação legal): ao solicitar a exclusão da sua conta, nós a desativamos, revogamos todas as suas sessões, liberamos o seu alias, apagamos os tokens de notificações e anonimizamos os dados de contato que não estão sujeitos a conservação obrigatória.

⚠️ No entanto, como provedora de serviços de ativos virtuais sujeita à regulamentação AML/CFT boliviana, NÃO podemos apagar os registros de identidade, verificação, aceitação de termos e transações: são conservados por 5 anos e só são purgados ao cumprir-se esse prazo. Também não podemos processar o pedido enquanto você tiver fundos na plataforma ou operações em curso.

Você pode reclamar perante a ASFI (Bolívia), a CMF/CNDP (Chile) ou a FTC (EUA).`,
        },
        {
          title: '11. Contato',
          content: `soporte@alyto.app | alyto.app`,
        },
      ],
    },
  },
};

export const LEGAL_VERSION = '2.2';
