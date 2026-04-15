export const LEGAL_DOCS = {
  terms: {
    es: {
      title: 'Términos y Condiciones de Uso — v2.1',
      lastUpdated: 'Abril 2026',
      sections: [
        {
          title: '1. Identificación de las Entidades Operadoras',
          content: `Alyto Wallet es operado por tres entidades legales diferenciadas:

▸ AV Finance SRL — Bolivia (Entidad PSAV)
Av. Saavedra 1001, La Paz, Bolivia | soporte@alyto.app
Opera como Proveedor de Servicios de Activos Virtuales (PSAV) conforme al Decreto Supremo N° 5384 y la Circular ASFI 885/2025. Registro PSAV ante ASFI en trámite.

▸ AV Finance SpA — Chile (Intermediario de Pagos)
Maipú 378, Antofagasta, Chile | RUT: 78028602-4 | soporte@alyto.app
Opera como intermediario de pagos transfronterizos bajo normativa chilena (CMF).

▸ AV Finance LLC — Delaware, EE.UU. (Infraestructura)
131 Continental Dr, Dover, Delaware, EE.UU. | EIN: 37-2216801 | soporte@alyto.app
Provee infraestructura tecnológica SaaS para pagos institucionales en USD.`,
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
- Iniciación de pagos CLP vía Fintoc (débito bancario directo).

Usuarios institucionales (AV Finance LLC):
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
- AV Finance LLC: Ley de Delaware, EE.UU. Arbitraje AAA.

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
      title: 'Terms of Service — v2.1',
      lastUpdated: 'April 2026',
      sections: [
        {
          title: '1. Operating Entities and Regulatory Framework',
          content: `Alyto Wallet is operated by three distinct legal entities:

▸ AV Finance SRL — Bolivia (VASP Entity)
Av. Saavedra 1001, La Paz, Bolivia | soporte@alyto.app
Operates as a Virtual Asset Service Provider (VASP) under Bolivian Supreme Decree N° 5384 and ASFI Circular 885/2025. VASP registration pending before ASFI.

▸ AV Finance SpA — Chile (Payment Intermediary)
Maipú 378, Antofagasta, Chile | RUT: 78028602-4 | soporte@alyto.app
Operates as a cross-border payment intermediary under Chilean CMF regulations.

▸ AV Finance LLC — Delaware, USA (Infrastructure Provider)
131 Continental Dr, Dover, Delaware, USA | EIN: 37-2216801 | soporte@alyto.app
Provides SaaS technology infrastructure for institutional USD payments.`,
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
- AV Finance LLC: Delaware law. AAA arbitration.

Claims: soporte@alyto.app — we respond within 5 business days.
Regulatory authorities: ASFI (asfi.gob.bo) | CMF (cmfchile.cl) | FTC (ftc.gov)`,
        },
      ],
    },
    pt: {
      title: 'Termos de Serviço — v2.1',
      lastUpdated: 'Abril 2026',
      sections: [
        {
          title: '1. Entidades Operadoras',
          content: `▸ AV Finance SRL — Bolívia (Entidade PSAV)
Opera como Provedora de Serviços de Ativos Virtuais (PSAV) sob o DS N° 5384 e Circular ASFI 885/2025. Registro PSAV pendente perante a ASFI.

▸ AV Finance SpA — Chile (Intermediário de Pagamentos)
Maipú 378, Antofagasta, Chile | RUT: 78028602-4

▸ AV Finance LLC — Delaware, EUA (Infraestrutura)
131 Continental Dr, Dover, Delaware, EUA | EIN: 37-2216801`,
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
- AV Finance LLC: lei de Delaware, arbitragem AAA.

Contato: soporte@alyto.app | alyto.app`,
        },
      ],
    },
  },
  privacy: {
    es: {
      title: 'Política de Privacidad',
      lastUpdated: 'Abril 2026',
      sections: [
        {
          title: '1. Responsable del Tratamiento',
          content: `AV Finance LLC (131 Continental Dr, Dover, Delaware, EE.UU.), AV Finance SpA (Maipú 378, Antofagasta, Chile) y AV Finance SRL (Av. Saavedra 1001, La Paz, Bolivia). Contacto: soporte@alyto.app`,
        },
        {
          title: '2. Datos que Recopilamos',
          content: `Identidad: nombre, fecha de nacimiento, documento, datos biométricos (Stripe Identity). Contacto: email, teléfono, país. Financieros: historial de transacciones, datos de beneficiarios. Técnicos: IP, dispositivo, token FCM (servidor).`,
        },
        {
          title: '3. Finalidades',
          content: `Prestación del servicio, cumplimiento KYC/AML (ASFI/UAF/FinCEN), prevención del fraude, notificaciones transaccionales y soporte.`,
        },
        {
          title: '4. Proveedores',
          content: `Stripe Identity (KYC), Vita Wallet (pagos LatAm), OwlPay Harbor (pagos globales), Fintoc (pagos Chile), SendGrid (emails), Firebase (push), Stellar Network (auditoría), Sentry (errores técnicos).`,
        },
        {
          title: '5. Retención de Datos',
          content: `Identidad y KYC: 5 años desde cierre de cuenta. Transacciones: 5 años. Notificaciones: 5 años (ASFI). Logs técnicos: 90 días.`,
        },
        {
          title: '6. Seguridad',
          content: `Cifrado AES-256 en reposo, TLS 1.3 en tránsito. Cookies HttpOnly, Secure, SameSite=Strict. Cierre de sesión por inactividad (30 min).`,
        },
        {
          title: '7. Sus Derechos',
          content: `Acceso, rectificación, supresión, portabilidad y oposición. Solicitudes a soporte@alyto.app — respondemos en 30 días. Puede reclamar ante ASFI (Bolivia), CMF/CNDP (Chile) o FTC (EE.UU.).`,
        },
        {
          title: '8. Contacto',
          content: `soporte@alyto.app | alyto.app`,
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'April 2026',
      sections: [
        {
          title: '1. Data Controller',
          content: `AV Finance LLC (131 Continental Dr, Dover, Delaware, USA), AV Finance SpA (Maipú 378, Antofagasta, Chile), AV Finance SRL (Av. Saavedra 1001, La Paz, Bolivia). Contact: soporte@alyto.app`,
        },
        {
          title: '2. Data We Collect',
          content: `Identity: name, DOB, ID document, biometrics (Stripe Identity). Contact: email, phone, country. Financial: transaction history, beneficiary data. Technical: IP, device, FCM token (server-side only).`,
        },
        {
          title: '3. Purposes',
          content: `Service delivery, KYC/AML compliance (ASFI/UAF/FinCEN), fraud prevention, transactional notifications and support.`,
        },
        {
          title: '4. Data Retention',
          content: `Identity and KYC: 5 years from account closure. Transactions: 5 years. Notifications: 5 years. Technical logs: 90 days.`,
        },
        {
          title: '5. Your Rights',
          content: `Access, rectification, erasure, portability, and objection. Contact soporte@alyto.app — we respond within 30 days.`,
        },
        {
          title: '6. Contact',
          content: `soporte@alyto.app | alyto.app`,
        },
      ],
    },
    pt: {
      title: 'Política de Privacidade',
      lastUpdated: 'Abril 2026',
      sections: [
        {
          title: '1. Controlador dos Dados',
          content: `AV Finance LLC, AV Finance SpA e AV Finance SRL. Contato: soporte@alyto.app`,
        },
        {
          title: '2. Dados Coletados',
          content: `Identidade, contato, financeiros e técnicos. Biometria processada pela Stripe Identity.`,
        },
        {
          title: '3. Retenção',
          content: `Identidade e KYC: 5 anos. Transações: 5 anos. Notificações: 5 anos. Logs: 90 dias.`,
        },
        {
          title: '4. Seus Direitos',
          content: `Acesso, retificação, exclusão, portabilidade e oposição. Contato: soporte@alyto.app`,
        },
      ],
    },
  },
};

export const LEGAL_VERSION = '2.1';
