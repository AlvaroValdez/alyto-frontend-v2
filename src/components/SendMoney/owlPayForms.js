/**
 * owlPayForms.js — Configuración estática de formularios OwlPay por país de destino.
 *
 * Todos los campos están alineados al schema oficial de Harbor, validado vía
 * GET /v2/transfers/quotes/:id/requirements (ver scripts/inspect-harbor-all-schemas.js
 * en el repo backend). Todos los schemas Harbor usan additionalProperties:false
 * — campos extra producen error 2005.
 *
 * Estos son los campos que se muestran AL USUARIO — simples y en español.
 * El backend (buildOwlPayBeneficiary + buildPayoutInstrument) mapea estos valores
 * al payload exacto que Harbor espera.
 */

// transfer_purpose: subset utilitario del enum oficial Harbor.
// Enum completo en scripts/inspect-harbor-all-schemas.js. Estos cubren los casos
// más comunes para nuestros usuarios sin abrumar la UX.
const TRANSFER_PURPOSE_OPTIONS = [
  { value: 'FAMILY_MAINTENANCE',       label: 'Manutención familiar' },
  { value: 'TRANSFER_TO_OWN_ACCOUNT',  label: 'Transferencia a cuenta propia' },
  { value: 'SALARY',                   label: 'Salario' },
  { value: 'EDUCATION',                label: 'Educación' },
  { value: 'MEDICAL_TREATMENT',        label: 'Tratamiento médico' },
  { value: 'TRAVEL',                   label: 'Viaje' },
  { value: 'PROPERTY_RENTAL',          label: 'Alquiler de propiedad' },
  { value: 'ADVISOR_FEES',             label: 'Honorarios profesionales' },
  { value: 'DONATIONS',                label: 'Donaciones' },
  { value: 'EXPORTED_GOODS',           label: 'Bienes exportados' },
  { value: 'GENERAL_GOODS_OFFLINE',    label: 'Bienes generales' },
]

// Campos de dirección comunes (Harbor beneficiary_address).
// IMPORTANTE: el schema endpoint de Harbor dice que solo street + country son
// required, PERO la implementación real verifica también city, state_province
// y postal_code (validado vía scripts/audit-harbor-end-to-end.js). Por eso
// los pedimos como required en el formulario.
const addressFields = ({ countryName = '', stateProvinceLabel = 'Estado / Provincia' } = {}) => ([
  {
    key: 'street',
    label: 'Calle y número',
    section: 'Dirección del beneficiario',
    type: 'text',
    placeholder: 'Calle, número, complemento',
    required: true,
    maxLength: 200,
  },
  {
    key: 'city',
    label: 'Ciudad',
    section: 'Dirección del beneficiario',
    type: 'text',
    placeholder: countryName ? `Ej: capital de ${countryName}` : 'Ciudad',
    required: true,
    maxLength: 80,
  },
  {
    key: 'state_province',
    label: stateProvinceLabel,
    section: 'Dirección del beneficiario',
    type: 'text',
    placeholder: 'Si no aplica, escribir el código de país (HK, SG, etc.)',
    required: false,  // BE auto-fills con country code si no se provee
    maxLength: 80,
  },
  {
    key: 'postal_code',
    label: 'Código postal',
    section: 'Dirección del beneficiario',
    type: 'text',
    placeholder: 'Código postal',
    required: true,
    maxLength: 20,
    hint: 'Formato exacto del país del beneficiario. Ej: DE/FR/ES/IT 5 dígitos; NL 4 dígitos+2 letras; GB alfanum; US 5 o 9 dígitos.',
  },
])

export const OWLPAY_FORMS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CN — China (CIPS, WIRE)
  // Schema verificado: payout requires account_holder_name, bank_name,
  //   account_number, swift_code. benef requires name + address (street, country).
  // ═══════════════════════════════════════════════════════════════════════════
  CN: {
    title: 'Datos del beneficiario en China',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Wei Zhang',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'China' }),
      // Datos bancarios
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Nombre como aparece en el banco',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Nombre del banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: Industrial and Commercial Bank of China',
        required: true,
        maxLength: 140,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 6222021234565488',
        required: true,
        maxLength: 34,
      },
      {
        key: 'swift_code',
        label: 'Código SWIFT / BIC',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: ICBKCNBJXXX',
        required: true,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        hint: '8 u 11 caracteres en mayúsculas',
        maxLength: 11,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IN — India (IMPS)
  // Schema verificado: payout requires bank_code (IFSC) + account_number (only!).
  //   benef requires name + email + address + phone + dob + id_doc (TODOS).
  // NO incluye account_holder_name en payout — es solo para nuestro UX.
  // ═══════════════════════════════════════════════════════════════════════════
  IN: {
    title: 'Datos del beneficiario en India',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Rahul Sharma',
        required: true,
        maxLength: 140,
      },
      {
        key: 'beneficiary_dob',
        label: 'Fecha de nacimiento',
        section: 'Datos del beneficiario',
        type: 'date',
        required: true,
        hint: 'Requerido por India IMPS (AML)',
      },
      {
        key: 'beneficiary_id_doc_number',
        label: 'Número de documento (PAN / Aadhaar)',
        section: 'Datos del beneficiario',
        type: 'text',
        required: true,
        maxLength: 50,
      },
      {
        key: 'beneficiary_email',
        label: 'Email del beneficiario',
        section: 'Datos del beneficiario',
        type: 'email',
        placeholder: 'beneficiario@ejemplo.com',
        required: true,
        maxLength: 140,
      },
      {
        key: 'beneficiary_phone_number',
        label: 'Teléfono del beneficiario',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: +91 98765 43210',
        required: true,
        hint: 'Incluir prefijo internacional (+91 para India)',
        maxLength: 25,
      },
      ...addressFields({ countryName: 'India' }),
      {
        key: 'bank_code',
        label: 'Código IFSC',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: HDFC0001234',
        required: true,
        pattern: '^[A-Z]{4}0[A-Z0-9]{6}$',
        hint: '11 caracteres: 4 letras + 0 + 6 alfanuméricos',
        maxLength: 11,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta bancaria',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 012345678901',
        required: true,
        maxLength: 18,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NG — Nigeria (BANK-TRANSFER)
  // Schema verificado: payout requires account_holder_name, bank_name,
  //   account_number. benef requires name + address.
  // ═══════════════════════════════════════════════════════════════════════════
  NG: {
    title: 'Datos del beneficiario en Nigeria',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Chidi Okeke',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'Nigeria' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Nombre como aparece en el banco',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: Zenith Bank',
        required: true,
        maxLength: 140,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta (NUBAN)',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: '10 dígitos',
        required: true,
        pattern: '^\\d{10}$',
        hint: '10 dígitos exactos (NUBAN)',
        maxLength: 10,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EU — Europa (SEPA, WIRE)
  // Schema verificado: SEPA payout = { account_holder_name, account_number(IBAN) }
  //   WIRE payout = + { bank_name, swift_code }. benef requires name + address.
  //   beneficiary_address requires street, country, postal_code.
  // ═══════════════════════════════════════════════════════════════════════════
  EU: {
    title: 'Datos del beneficiario en Europa (SEPA)',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Hans Müller',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'Europa' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Nombre como aparece en el banco',
        required: true,
        maxLength: 140,
      },
      {
        key: 'iban',
        label: 'IBAN',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: DE89370400440532013000',
        required: true,
        pattern: '^[A-Z]{2}\\d{2}[A-Z0-9]{11,30}$',
        hint: 'Código IBAN del banco europeo (15–34 caracteres)',
        maxLength: 34,
      },
      {
        key: 'bic',
        label: 'BIC / SWIFT',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: DEUTDEDB',
        required: false,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        hint: 'Solo necesario para Transferencia Internacional (WIRE)',
        maxLength: 11,
      },
      {
        key: 'bank_name',
        label: 'Nombre del banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: Deutsche Bank',
        required: false,
        hint: 'Solo necesario para Transferencia Internacional (WIRE)',
        maxLength: 140,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BR — Brasil (PIX)
  // Schema verificado: payout requires br_cpf (^\d{11}$). Allowed extras:
  //   phone_number, email, br_pix_evp. benef requires name + address.
  // ═══════════════════════════════════════════════════════════════════════════
  BR: {
    title: 'Datos del beneficiario en Brasil',
    hint: 'El beneficiario recibe vía PIX — instantáneo a cualquier banco brasileño.',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: João Silva',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'Brasil' }),
      {
        key: 'br_cpf',
        label: 'CPF del beneficiario',
        section: 'Datos PIX',
        type: 'text',
        placeholder: 'Ej: 12345678909',
        required: true,
        pattern: '^\\d{11}$',
        hint: 'CPF real (11 dígitos sin puntos ni guiones). Se valida con el algoritmo oficial brasileño — CPFs ficticios serán rechazados.',
        maxLength: 11,
      },
      {
        key: 'br_pix_evp',
        label: 'Chave PIX aleatória (EVP) — opcional',
        section: 'Chave PIX alternativa',
        type: 'text',
        placeholder: 'Ej: 71f76d4f-c0e4-4f6b-acaf-...',
        required: false,
        hint: 'Si el beneficiario usa una chave aleatória en vez de CPF',
        maxLength: 50,
      },
      {
        key: 'email',
        label: 'Email del beneficiario (chave PIX) — opcional',
        section: 'Chave PIX alternativa',
        type: 'email',
        placeholder: 'beneficiario@email.com',
        required: false,
        maxLength: 140,
      },
      {
        key: 'phone_number',
        label: 'Teléfono del beneficiario (chave PIX) — opcional',
        section: 'Chave PIX alternativa',
        type: 'text',
        placeholder: 'Ej: +5511999999999',
        required: false,
        pattern: '^\\+[1-9]\\d{1,14}$',
        hint: 'Formato E.164 (con + y código país)',
        maxLength: 16,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MX — México (SPEI)
  // Schema verificado: payout requires mx_clabe (^[0-9]{18}$) — ÚNICO campo.
  //   benef requires name + address + dob + id_doc (TODOS).
  // ═══════════════════════════════════════════════════════════════════════════
  MX: {
    title: 'Datos del beneficiario en México',
    hint: 'La transferencia llega vía SPEI — el sistema interbancario instantáneo de México.',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: María García',
        required: true,
        maxLength: 140,
      },
      {
        key: 'beneficiary_dob',
        label: 'Fecha de nacimiento',
        section: 'Datos del beneficiario',
        type: 'date',
        required: true,
        hint: 'Requerido por SPEI (AML)',
      },
      {
        key: 'beneficiary_id_doc_number',
        label: 'Número de documento (CURP o RFC)',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: CURP de 18 caracteres',
        required: true,
        maxLength: 50,
      },
      ...addressFields({ countryName: 'México' }),
      {
        key: 'mx_clabe',
        label: 'CLABE interbancaria',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 646180157000000004',
        required: true,
        pattern: '^\\d{18}$',
        hint: '18 dígitos — la encuentras en tu app bancaria o estado de cuenta',
        maxLength: 18,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AE — Emiratos Árabes (BANK-TRANSFER)
  // Schema verificado: payout requires account_holder_name, phone_number
  //   (^\+971[0-9]{8,9}$), swift_code, account_number (IBAN).
  //   benef requires name + address + dob + id_doc (UAE Emirates ID 784-YYYY-XXXXXXX-X).
  // ═══════════════════════════════════════════════════════════════════════════
  AE: {
    title: 'Datos del beneficiario en Emiratos Árabes',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Ahmed Al Rashidi',
        required: true,
        maxLength: 140,
      },
      {
        key: 'beneficiary_dob',
        label: 'Fecha de nacimiento',
        section: 'Datos del beneficiario',
        type: 'date',
        required: true,
        hint: 'Requerido por regulación AML UAE',
      },
      {
        key: 'beneficiary_id_doc_number',
        label: 'Emirates ID',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: 784-1985-1234567-1',
        required: true,
        hint: 'Cédula de identidad Emirates — formato 784-YYYY-XXXXXXX-X',
        maxLength: 20,
      },
      ...addressFields({ countryName: 'Emiratos Árabes' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        required: true,
        maxLength: 140,
      },
      {
        key: 'phone_number',
        label: 'Teléfono del beneficiario',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: +971501234567',
        required: true,
        pattern: '^\\+971[0-9]{8,9}$',
        hint: 'Formato UAE: +971 seguido de 8 o 9 dígitos',
        maxLength: 14,
      },
      {
        key: 'iban',
        label: 'IBAN',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: AE070331234567890123456',
        required: true,
        pattern: '^[A-Z]{2}\\d{2}[A-Z0-9]{11,30}$',
        hint: 'IBAN UAE — empieza con AE seguido de 21 caracteres',
        maxLength: 30,
      },
      {
        key: 'swift_code',
        label: 'SWIFT / BIC',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: EBILAEAD',
        required: true,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        hint: '8 u 11 caracteres en mayúsculas',
        maxLength: 11,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GB — Reino Unido (FPS) — corredor no activo para SRL, requiere LLC
  // Schema asumido basado en UK Faster Payments standard.
  // ═══════════════════════════════════════════════════════════════════════════
  GB: {
    title: 'Datos del beneficiario en Reino Unido',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: James Smith',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'Reino Unido' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        required: true,
        maxLength: 140,
      },
      {
        key: 'sort_code',
        label: 'Sort Code',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 20-00-00',
        required: true,
        pattern: '^\\d{2}-?\\d{2}-?\\d{2}$',
        hint: '6 dígitos en formato 00-00-00',
        maxLength: 8,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 12345678',
        required: true,
        pattern: '^\\d{8}$',
        hint: '8 dígitos exactos',
        maxLength: 8,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // JP — Japón (BANK-TRANSFER) — corredor no activo para SRL, requiere LLC
  // Schema asumido similar a SG (BANK-TRANSFER estándar SWIFT).
  // ═══════════════════════════════════════════════════════════════════════════
  JP: {
    title: 'Datos del beneficiario en Japón',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo (en romaji)',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Tanaka Hiroshi',
        required: true,
        maxLength: 140,
        hint: 'Usar letras latinas (romaji), no kanji',
      },
      ...addressFields({ countryName: 'Japón' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta (en romaji)',
        section: 'Datos bancarios',
        type: 'text',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: MUFG Bank, Sumitomo Mitsui',
        required: true,
        maxLength: 140,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 1234567',
        required: true,
        maxLength: 20,
      },
      {
        key: 'swift_code',
        label: 'SWIFT / BIC',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: BOTKJPJT',
        required: true,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        hint: '8 u 11 caracteres en mayúsculas',
        maxLength: 11,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SG — Singapur (BANK-TRANSFER)
  // Schema verificado: payout requires account_holder_name, bank_name,
  //   account_number, swift_code. benef requires name + address.
  // ═══════════════════════════════════════════════════════════════════════════
  SG: {
    title: 'Datos del beneficiario en Singapur',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Lee Wei Ming',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'Singapur' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: DBS Bank, OCBC, UOB',
        required: true,
        maxLength: 140,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 1234567890',
        required: true,
        maxLength: 20,
      },
      {
        key: 'swift_code',
        label: 'SWIFT / BIC',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: DBSSSGSG',
        required: true,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        maxLength: 11,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HK — Hong Kong (CHATS, WIRE)
  // Schema verificado: CHATS adds bank_code (^\d{3}$) requerido.
  //   WIRE no incluye bank_code. benef requires name + address.
  // bank_code de FE se envía siempre; BE lo omite si método es WIRE.
  // ═══════════════════════════════════════════════════════════════════════════
  HK: {
    title: 'Datos del beneficiario en Hong Kong',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Chan Tai Man',
        required: true,
        maxLength: 140,
      },
      ...addressFields({ countryName: 'Hong Kong' }),
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: HSBC HK, Hang Seng Bank',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_code',
        label: 'HK Clearing Code (3 dígitos)',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 004 (HSBC), 012 (BOC HK), 024 (Hang Seng)',
        required: false,  // BE enforce required solo si paymentMethod === 'CHATS'
        pattern: '^\\d{3}$',
        hint: 'Requerido si seleccionas CHATS (instantáneo). No necesario para WIRE.',
        maxLength: 3,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 123-456789-001',
        required: true,
        maxLength: 20,
      },
      {
        key: 'swift_code',
        label: 'SWIFT / BIC',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: HSBCHKHHHKH',
        required: true,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        maxLength: 11,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // US — Estados Unidos (ACH_PUSH, DOMESTIC_WIRE, FEDWIRE, WIRE)
  // Schema verificado (todos los métodos comparten payout schema):
  //   payout requires account_holder_name, bank_name, account_number, routing_number.
  //   benef requires name + address (street, city, state_province, postal_code, country).
  // IMPORTANTE: Harbor valida state_province contra enum de abreviaturas de estado US.
  //   'US' no es un valor válido — debe ser CA, NY, TX, etc. (2 letras, required).
  // NO existe account_type en el schema — removido.
  // ═══════════════════════════════════════════════════════════════════════════
  US: {
    title: 'Datos del beneficiario en Estados Unidos',
    hint: 'La transferencia llega vía ACH (2-5 días) o FEDWIRE (mismo día).',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: John Smith',
        required: true,
        maxLength: 140,
      },
      // Spread addressFields excepto state_province, que para US es required con select propio.
      // Enum verificado via Harbor requirements (2026-06-05): CT, NJ, NY ausentes en sandbox.
      ...addressFields({ countryName: 'Estados Unidos' }).filter(f => f.key !== 'state_province'),
      {
        key: 'state_province',
        label: 'Estado',
        section: 'Dirección del beneficiario',
        type: 'select',
        required: true,
        placeholder: 'Selecciona un estado',
        options: [
          { value: 'AL', label: 'Alabama' },       { value: 'AK', label: 'Alaska' },
          { value: 'AZ', label: 'Arizona' },       { value: 'AR', label: 'Arkansas' },
          { value: 'CA', label: 'California' },    { value: 'CO', label: 'Colorado' },
          { value: 'DC', label: 'District of Columbia' }, { value: 'DE', label: 'Delaware' },
          { value: 'FL', label: 'Florida' },       { value: 'GA', label: 'Georgia' },
          { value: 'HI', label: 'Hawaii' },        { value: 'ID', label: 'Idaho' },
          { value: 'IL', label: 'Illinois' },      { value: 'IN', label: 'Indiana' },
          { value: 'IA', label: 'Iowa' },          { value: 'KS', label: 'Kansas' },
          { value: 'KY', label: 'Kentucky' },      { value: 'LA', label: 'Louisiana' },
          { value: 'ME', label: 'Maine' },         { value: 'MD', label: 'Maryland' },
          { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
          { value: 'MN', label: 'Minnesota' },     { value: 'MS', label: 'Mississippi' },
          { value: 'MO', label: 'Missouri' },      { value: 'MT', label: 'Montana' },
          { value: 'NE', label: 'Nebraska' },      { value: 'NV', label: 'Nevada' },
          { value: 'NH', label: 'New Hampshire' }, { value: 'NM', label: 'New Mexico' },
          { value: 'NC', label: 'North Carolina' },{ value: 'ND', label: 'North Dakota' },
          { value: 'OH', label: 'Ohio' },          { value: 'OK', label: 'Oklahoma' },
          { value: 'OR', label: 'Oregon' },        { value: 'PA', label: 'Pennsylvania' },
          { value: 'RI', label: 'Rhode Island' },  { value: 'SC', label: 'South Carolina' },
          { value: 'SD', label: 'South Dakota' },  { value: 'TN', label: 'Tennessee' },
          { value: 'TX', label: 'Texas' },         { value: 'UT', label: 'Utah' },
          { value: 'VT', label: 'Vermont' },       { value: 'VA', label: 'Virginia' },
          { value: 'WA', label: 'Washington' },    { value: 'WV', label: 'West Virginia' },
          { value: 'WI', label: 'Wisconsin' },     { value: 'WY', label: 'Wyoming' },
          // CT, NJ, NY omitidos: ausentes del enum Harbor sandbox (2026-06-05)
        ],
      },
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        section: 'Datos bancarios',
        type: 'text',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Banco',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: Chase, Bank of America, Wells Fargo',
        required: true,
        maxLength: 140,
      },
      {
        key: 'routing_number',
        label: 'Routing Number (ABA)',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 021000021',
        required: true,
        pattern: '^\\d{9}$',
        hint: '9 dígitos — lo encuentras en tus cheques o app bancaria',
        maxLength: 9,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta',
        section: 'Datos bancarios',
        type: 'text',
        placeholder: 'Ej: 123456789',
        required: true,
        maxLength: 17,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: TRANSFER_PURPOSE_OPTIONS,
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

}

// Para países OwlPay sin configuración específica (fallback genérico).
// Asume SWIFT-based bank transfer estándar.
export const GENERIC_OWLPAY_FORM = {
  title: 'Datos del beneficiario',
  fields: [
    {
      key: 'beneficiary_name',
      label: 'Nombre completo',
      section: 'Datos del beneficiario',
      type: 'text',
      required: true,
      maxLength: 140,
    },
    {
      key: 'street',
      label: 'Calle y número',
      section: 'Dirección',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      key: 'city',
      label: 'Ciudad',
      section: 'Dirección',
      type: 'text',
      required: false,
      maxLength: 80,
    },
    {
      key: 'postal_code',
      label: 'Código postal',
      section: 'Dirección',
      type: 'text',
      required: false,
      maxLength: 20,
    },
    {
      key: 'account_holder_name',
      label: 'Titular de la cuenta',
      section: 'Datos bancarios',
      type: 'text',
      required: true,
      maxLength: 140,
    },
    {
      key: 'bank_name',
      label: 'Banco',
      section: 'Datos bancarios',
      type: 'text',
      required: true,
      maxLength: 140,
    },
    {
      key: 'account_number',
      label: 'Número de cuenta',
      section: 'Datos bancarios',
      type: 'text',
      required: true,
      maxLength: 34,
    },
    {
      key: 'swift_code',
      label: 'SWIFT / BIC',
      section: 'Datos bancarios',
      type: 'text',
      required: false,
      maxLength: 11,
    },
    {
      key: 'transfer_purpose',
      label: 'Propósito de la transferencia',
      type: 'select',
      required: true,
      options: TRANSFER_PURPOSE_OPTIONS,
    },
    {
      key: 'is_self_transfer',
      label: 'Esta cuenta me pertenece',
      type: 'toggle',
      required: false,
      default: false,
    },
  ],
}
