/**
 * legalTerms.js — Contratos de Términos de Servicio por Entidad Legal
 *
 * Cada contrato es una cadena de texto lista para renderizar en la vista KYC.
 * La entidad se determina por el campo legalEntity del usuario (SpA | SRL | LLC).
 *
 * NOTA COMPLIANCE: Ningún texto aquí usa los términos prohibidos
 * "remesa", "remesas" ni "remittances".
 */

// ── Contrato SpA (Chile — AV Finance SpA) ──────────────────────────────────

const TERMS_SPA = `TÉRMINOS DE SERVICIO Y POLÍTICA DE PRIVACIDAD
AV Finance SpA — Antofagasta, Chile

Versión vigente: 19 de marzo de 2026

1. PARTES Y OBJETO
Estos Términos de Servicio regulan la relación entre el Usuario y AV Finance SpA (RUT pendiente de inscripción), sociedad por acciones constituida bajo las leyes de la República de Chile, con domicilio en Antofagasta, Región de Antofagasta, Chile (en adelante "la Compañía"), para el uso de la plataforma financiera digital Alyto.

2. SUJECIÓN A LA LEY FINTEC
AV Finance SpA opera en plena conformidad con la Ley N° 21.521 sobre Fomento a la Competencia e Inclusión Financiera a través de la Innovación Tecnológica (Ley Fintec) y la normativa complementaria emitida por la Comisión para el Mercado Financiero (CMF). La Compañía se compromete a registrar sus actividades ante los organismos regulatorios competentes y a cumplir con todos los estándares de seguridad, interoperabilidad y protección al consumidor financiero exigidos por dicha ley.

3. OPEN BANKING Y RECAUDACIÓN LOCAL (PAY-IN)
El Usuario autoriza expresamente a AV Finance SpA a utilizar la infraestructura de Open Banking, incluyendo el motor de iniciación de pagos Fintoc, para procesar operaciones de recaudación cuenta a cuenta (A2A) desde sus cuentas bancarias chilenas. Esta autorización es revocable en cualquier momento desde la configuración de la cuenta.

4. CROSS-BORDER PAYMENTS Y TOKENIZACIÓN
La plataforma facilita la conversión de fondos locales (CLP) a activos digitales sobre la red Stellar (USDC, CLPX) y su liquidación en otras jurisdicciones. Estas operaciones corresponden a servicios de pago internacional y tokenización de valor, no constituyendo en ningún caso servicios de cambio de divisas regulados por el Banco Central de Chile más allá de las exenciones aplicables.

5. PROTECCIÓN DE DATOS
El tratamiento de datos personales se rige por la Ley N° 19.628 sobre Protección de la Vida Privada y sus modificaciones. El Usuario consiente el procesamiento de sus datos de identidad (nombre, RUT, domicilio) para fines de verificación KYC/KYB y prevención de lavado de activos (AML/CFT).

6. JURISDICCIÓN Y LEY APLICABLE
Cualquier controversia derivada de estos Términos se someterá a la jurisdicción de los Tribunales Ordinarios de Justicia con asiento en Santiago de Chile o Antofagasta, a elección de la Compañía, y se regirá por la legislación chilena vigente.

7. MODIFICACIONES
La Compañía se reserva el derecho de modificar estos Términos con un aviso previo de 30 días calendario, notificado al correo electrónico registrado por el Usuario.

Al aceptar, el Usuario declara haber leído, entendido y aceptado íntegramente los presentes Términos de Servicio y la Política de Privacidad de AV Finance SpA.`

// ── Contrato SRL (Bolivia — AV Finance SRL) ────────────────────────────────

const TERMS_SRL = `TÉRMINOS DE SERVICIO Y POLÍTICA DE PRIVACIDAD
AV Finance SRL — La Paz / Cochabamba, Bolivia

Versión vigente: 19 de marzo de 2026

1. PARTES Y OBJETO
Estos Términos de Servicio regulan la relación entre el Usuario y AV Finance SRL (NIT en proceso de inscripción), sociedad de responsabilidad limitada constituida bajo las leyes del Estado Plurinacional de Bolivia (en adelante "la Compañía"), para el uso de la plataforma financiera digital Alyto.

2. CALIDAD DE PROVEEDOR DE SERVICIOS DE ACTIVOS VIRTUALES (PSAV)
AV Finance SRL opera en proceso de obtención de licencia como Empresa de Tecnología Financiera (ETF) y Proveedor de Servicios de Activos Virtuales (PSAV) ante la Autoridad de Supervisión del Sistema Financiero (ASFI) de Bolivia. Hasta la obtención formal de dicha licencia, las operaciones se realizan bajo el marco normativo transitorio aplicable a operadores de tecnología financiera.

3. LIQUIDACIÓN DE ACTIVOS VIRTUALES
La plataforma permite al Usuario recibir el equivalente en bolivianos (BOB) de activos digitales (USDC) liquidados a través de la red Stellar. Cada operación de liquidación genera automáticamente un "Comprobante Oficial de Transacción" con valor documental para efectos impositivos, que incluye: datos de la SRL, identificación fiscal del cliente (NIT/CI), identificador de transacción en la red Stellar (TXID) y desglose financiero detallado.

4. OBLIGACIONES FISCALES
Las liquidaciones realizadas a través de AV Finance SRL pueden estar sujetas al Impuesto al Valor Agregado (IVA) e Impuesto sobre las Utilidades de las Empresas (IUE) de acuerdo con la normativa tributaria boliviana vigente. Los Comprobantes Oficiales de Transacción generados por la plataforma son documentos de respaldo válidos para la deducción de impuestos según la Ley N° 2492 (Código Tributario Boliviano) y sus disposiciones reglamentarias.

5. VERIFICACIÓN DE IDENTIDAD (KYC)
El Usuario acepta proporcionar su Cédula de Identidad boliviana (CI) vigente y datos biométricos (selfie de liveness) para cumplir con los procedimientos de conocimiento del cliente (KYC) exigidos por la normativa AML/CFT boliviana. La Compañía no procesará operaciones de liquidación sin la previa aprobación del perfil de identidad.

6. PROTECCIÓN DE DATOS
El tratamiento de datos personales se rige por la Ley N° 1682 de Privacidad de Bolivia. Los datos del Usuario se almacenan en servidores seguros y no se comparten con terceros salvo por requerimiento de autoridad competente boliviana.

7. JURISDICCIÓN Y LEY APLICABLE
Cualquier controversia se someterá a la jurisdicción de los Tribunales Ordinarios de Bolivia conforme a la legislación boliviana vigente.

Al aceptar, el Usuario declara haber leído, entendido y aceptado íntegramente los presentes Términos de Servicio y la Política de Privacidad de AV Finance SRL.`

// ── Contrato LLC (EE.UU. / Global — AV Finance LLC) ────────────────────────

const TERMS_LLC = `TERMS OF SERVICE AND PRIVACY POLICY
AV Finance LLC — Wilmington, Delaware, USA

Effective Date: March 19, 2026

1. PARTIES AND SCOPE
These Terms of Service govern the relationship between the User and AV Finance LLC, a limited liability company incorporated under the laws of the State of Delaware, United States of America (hereinafter "the Company"), for access to and use of the Alyto institutional financial platform.

2. B2B SERVICES AND INSTITUTIONAL TOKENIZATION
AV Finance LLC provides institutional-grade cross-border payment services, treasury management, and asset tokenization infrastructure over the Stellar network. Services are directed exclusively at business entities (B2B) and qualified institutional clients. Retail consumer services are not available under this entity. The Company does not provide consumer lending, deposit-taking, or money transmission services regulated under U.S. state money transmitter laws unless explicitly licensed in the applicable jurisdiction.

3. DELAWARE JURISDICTION AND CORPORATE GOVERNANCE
AV Finance LLC is governed by the Delaware Limited Liability Company Act (6 Del. C. § 18-101 et seq.). The principal place of business and registered agent is located in Wilmington, Delaware. All corporate records, financial reporting, and regulatory filings are maintained in accordance with Delaware law and applicable U.S. federal regulations.

4. AML/CFT COMPLIANCE
The Company maintains a comprehensive Anti-Money Laundering (AML) and Counter-Financing of Terrorism (CFT) program in accordance with the Bank Secrecy Act (BSA), FinCEN guidance, and applicable FATF recommendations. The Company reserves the right to file Suspicious Activity Reports (SARs) as required by law. Users must complete institutional KYB (Know Your Business) verification before accessing on-ramp/off-ramp infrastructure through OwlPay Harbor or Stellar network settlement.

5. CROSS-BORDER PAYMENT SERVICES
The platform facilitates international fund transfers and liquidity management through institutional-grade rails including OwlPay Harbor and the Stellar blockchain network. These services are provided pursuant to applicable federal and state regulations governing cross-border payment processing for business clients.

6. SANCTIONS COMPLIANCE
The Company complies with all OFAC sanctions programs, EU sanctions regulations, and UN Security Council sanctions lists. Users represent and warrant that they are not located in, organized under the laws of, or owned or controlled by entities in sanctioned jurisdictions.

7. PRIVACY AND DATA
Data processing is governed by the California Consumer Privacy Act (CCPA) and applicable U.S. federal privacy laws. For users subject to GDPR, the Company applies equivalent protections as described in the separate EU Privacy Addendum available upon request.

8. DISPUTE RESOLUTION
Any dispute arising from these Terms shall be subject to binding arbitration under the JAMS Comprehensive Arbitration Rules, with proceedings conducted in Wilmington, Delaware, applying the laws of the State of Delaware.

By accepting, the User acknowledges having read, understood, and agreed to these Terms of Service and the Privacy Policy of AV Finance LLC.`

// ── Exportación ──────────────────────────────────────────────────────────────

/**
 * Mapa de contratos legales por entidad.
 * Uso: LEGAL_TERMS[user.legalEntity]
 * @type {{ SpA: string, SRL: string, LLC: string }}
 */
export const LEGAL_TERMS = {
  SpA: TERMS_SPA,
  SRL: TERMS_SRL,
  LLC: TERMS_LLC,
}

/**
 * Nombre completo de cada entidad para mostrar en UI.
 * @type {{ SpA: string, SRL: string, LLC: string }}
 */
export const ENTITY_NAMES = {
  SpA: 'AV Finance SpA',
  SRL: 'AV Finance SRL',
  LLC: 'AV Finance LLC',
}

/**
 * País/jurisdicción de cada entidad.
 * @type {{ SpA: string, SRL: string, LLC: string }}
 */
export const ENTITY_JURISDICTIONS = {
  SpA: 'Chile',
  SRL: 'Bolivia',
  LLC: 'Delaware, EE.UU.',
}
