/**
 * owlPayForms.js — Configuración estática de formularios OwlPay por país de destino.
 *
 * Estos son los campos que se muestran AL USUARIO — simples y en español.
 * El backend mapea estos valores al schema de Harbor en buildOwlPayBeneficiary().
 *
 * NO usar el schema dinámico de Harbor en el frontend. Toda la traducción
 * Harbor-schema → campos de usuario ocurre en el backend.
 */

export const OWLPAY_FORMS = {

  CN: {
    title: 'Datos del beneficiario en China',
    fields: [
      // ── Datos del beneficiario ──
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        section: 'Datos del beneficiario',
        type: 'text',
        placeholder: 'Ej: Wei Zhang',
        required: true,
        maxLength: 140,
      },
      {
        key: 'beneficiary_dob',
        label: 'Fecha de nacimiento',
        section: 'Datos del beneficiario',
        type: 'date',
        required: false,
      },
      {
        key: 'beneficiary_id_doc_number',
        label: 'Número de documento',
        section: 'Datos del beneficiario',
        type: 'text',
        required: false,
        maxLength: 50,
      },

      // ── Dirección ──
      {
        key: 'street',
        label: 'Calle',
        section: 'Dirección',
        type: 'text',
        placeholder: 'Ej: 123 Nanjing Road',
        required: true,
        maxLength: 200,
      },
      {
        key: 'city',
        label: 'Ciudad',
        section: 'Dirección',
        type: 'text',
        placeholder: 'Ej: Shanghai',
        required: true,
        maxLength: 80,
      },
      {
        key: 'state_province',
        label: 'Provincia',
        section: 'Dirección',
        type: 'select',
        required: true,
        options: [
          { value: 'AH', label: 'Anhui' },          { value: 'BJ', label: 'Beijing' },
          { value: 'CQ', label: 'Chongqing' },      { value: 'FJ', label: 'Fujian' },
          { value: 'GD', label: 'Guangdong' },      { value: 'GS', label: 'Gansu' },
          { value: 'GX', label: 'Guangxi' },        { value: 'GZ', label: 'Guizhou' },
          { value: 'HA', label: 'Henan' },          { value: 'HB', label: 'Hubei' },
          { value: 'HE', label: 'Hebei' },          { value: 'HI', label: 'Hainan' },
          { value: 'HL', label: 'Heilongjiang' },   { value: 'HN', label: 'Hunan' },
          { value: 'JL', label: 'Jilin' },          { value: 'JS', label: 'Jiangsu' },
          { value: 'JX', label: 'Jiangxi' },        { value: 'LN', label: 'Liaoning' },
          { value: 'NM', label: 'Inner Mongolia' }, { value: 'NX', label: 'Ningxia' },
          { value: 'QH', label: 'Qinghai' },        { value: 'SC', label: 'Sichuan' },
          { value: 'SD', label: 'Shandong' },       { value: 'SH', label: 'Shanghai' },
          { value: 'SN', label: 'Shaanxi' },        { value: 'SX', label: 'Shanxi' },
          { value: 'TJ', label: 'Tianjin' },        { value: 'XJ', label: 'Xinjiang' },
          { value: 'XZ', label: 'Tibet' },          { value: 'YN', label: 'Yunnan' },
          { value: 'ZJ', label: 'Zhejiang' },
        ],
      },
      {
        key: 'postal_code',
        label: 'Código postal',
        section: 'Dirección',
        type: 'text',
        placeholder: 'Ej: 200000',
        required: true,
        pattern: '^\\d{6}$',
        hint: '6 dígitos',
        maxLength: 6,
      },

      // ── Datos bancarios ──
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
        placeholder: 'ej. Industrial and Commercial Bank of China',
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
        placeholder: 'ej. ICBKCNBJ',
        required: true,
        pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        hint: '8 u 11 caracteres en mayúsculas',
        maxLength: 11,
      },

      // ── Propósito de la transferencia ──
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        section: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: [
          { value: 'TRANSFER_TO_OWN_ACCOUNT', label: 'Transferencia a cuenta propia' },
          { value: 'FAMILY_MAINTENANCE',      label: 'Manutención familiar' },
          { value: 'EDUCATION',               label: 'Educación' },
          { value: 'MEDICAL_TREATMENT',       label: 'Tratamiento médico' },
          { value: 'HOTEL',                   label: 'Hotel' },
          { value: 'TRAVEL',                  label: 'Viaje' },
          { value: 'REPAYMENT_OF_LOANS',      label: 'Pago de préstamos' },
          { value: 'TAX_PAYMENT',             label: 'Pago de impuestos' },
          { value: 'PURCHASE_PROPERTY',       label: 'Compra de propiedad' },
          { value: 'PROPERTY_RENTAL',         label: 'Alquiler de propiedad' },
          { value: 'INSURANCE_PREMIUM',       label: 'Prima de seguro' },
          { value: 'SALARY',                  label: 'Salario' },
          { value: 'ADVERTISING',             label: 'Publicidad' },
          { value: 'ROYALTY_FEES',            label: 'Regalías' },
          { value: 'ADVISOR_FEES',            label: 'Honorarios de asesor' },
          { value: 'CONSTRUCTION',            label: 'Construcción' },
          { value: 'TRANSPORTATION',          label: 'Transporte' },
          { value: 'EXPORTED_GOODS',          label: 'Bienes exportados' },
          { value: 'GENERAL_GOODS_OFFLINE',   label: 'Bienes generales' },
        ],
      },
      {
        key: 'is_self_transfer',
        label: 'Esta cuenta me pertenece',
        section: 'Propósito de la transferencia',
        type: 'toggle',
        required: false,
        default: false,
      },
    ],
  },

  NG: {
    title: 'Datos del beneficiario en Nigeria',
    fields: [
      {
        key: 'beneficiary_name',
        label: 'Nombre completo',
        type: 'text',
        placeholder: 'Ej: Chidi Okeke',
        required: true,
        maxLength: 140,
      },
      {
        key: 'account_holder_name',
        label: 'Titular de la cuenta',
        type: 'text',
        placeholder: 'Nombre como aparece en el banco',
        required: true,
        maxLength: 140,
      },
      {
        key: 'bank_name',
        label: 'Banco',
        type: 'text',
        placeholder: 'Ej: Zenith Bank',
        required: true,
        maxLength: 140,
      },
      {
        key: 'account_number',
        label: 'Número de cuenta (NUBAN)',
        type: 'text',
        placeholder: '10 dígitos',
        required: true,
        pattern: '^\\d{10}$',
        hint: '10 dígitos exactos',
        maxLength: 10,
      },
      {
        key: 'transfer_purpose',
        label: 'Propósito de la transferencia',
        type: 'select',
        required: true,
        options: [
          { value: 'FAMILY_MAINTENANCE',    label: 'Manutención familiar' },
          { value: 'TRANSFER_TO_OWN_ACCOUNT', label: 'Transferencia a cuenta propia' },
          { value: 'SALARY',                label: 'Salario' },
          { value: 'DONATIONS',             label: 'Donaciones' },
          { value: 'EDUCATION',             label: 'Educación' },
          { value: 'BUSINESS_EXPENSES',     label: 'Gastos de negocio' },
          { value: 'OTHER',                 label: 'Otro' },
        ],
      },
      {
        key: 'is_self_transfer',
        label: '¿Es una transferencia a tu propia cuenta?',
        type: 'toggle',
        required: true,
        default: false,
      },
    ],
  },

};

// Para países OwlPay sin configuración específica aún
export const GENERIC_OWLPAY_FORM = {
  title: 'Datos del beneficiario',
  fields: [
    {
      key: 'beneficiary_name',
      label: 'Nombre completo',
      type: 'text',
      required: true,
      maxLength: 140,
    },
    {
      key: 'account_holder_name',
      label: 'Titular de la cuenta',
      type: 'text',
      required: true,
      maxLength: 140,
    },
    {
      key: 'bank_name',
      label: 'Banco',
      type: 'text',
      required: true,
      maxLength: 140,
    },
    {
      key: 'account_number',
      label: 'Número de cuenta',
      type: 'text',
      required: true,
      maxLength: 34,
    },
    {
      key: 'swift_code',
      label: 'SWIFT / BIC',
      type: 'text',
      required: false,
      maxLength: 11,
    },
    {
      key: 'transfer_purpose',
      label: 'Propósito de la transferencia',
      type: 'select',
      required: true,
      options: [
        { value: 'FAMILY_MAINTENANCE',    label: 'Manutención familiar' },
        { value: 'TRANSFER_TO_OWN_ACCOUNT', label: 'Transferencia a cuenta propia' },
        { value: 'SALARY',                label: 'Salario' },
        { value: 'DONATIONS',             label: 'Donaciones' },
        { value: 'EDUCATION',             label: 'Educación' },
        { value: 'BUSINESS_EXPENSES',     label: 'Gastos de negocio' },
        { value: 'OTHER',                 label: 'Otro' },
      ],
    },
    {
      key: 'is_self_transfer',
      label: '¿Cuenta propia?',
      type: 'toggle',
      required: true,
      default: false,
    },
  ],
};
