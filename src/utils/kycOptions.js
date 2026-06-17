/**
 * kycOptions.js — Catálogos para el formulario de cumplimiento KYC.
 *
 * COUNTRIES: ISO 3166-1 alpha-2 + nombre en español, usado para nacionalidad y
 * país de residencia (domicilio). Ordenado con LatAm primero, luego alfabético.
 *
 * SOURCE_OF_FUNDS: espejo exacto del enum del backend (User.sourceOfFunds).
 */

// LatAm + principales mercados al tope para acceso rápido; resto alfabético.
export const COUNTRIES = [
  { code: 'BO', name: 'Bolivia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'BR', name: 'Brasil' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
  // Resto (alfabético por nombre)
  { code: 'DE', name: 'Alemania' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'CA', name: 'Canadá' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'AE', name: 'Emiratos Árabes Unidos' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FR', name: 'Francia' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HT', name: 'Haití' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IT', name: 'Italia' },
  { code: 'JP', name: 'Japón' },
  { code: 'MY', name: 'Malasia' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Noruega' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'SE', name: 'Suecia' },
  { code: 'CH', name: 'Suiza' },
  { code: 'SG', name: 'Singapur' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'TR', name: 'Turquía' },
]

/** Espejo del enum User.sourceOfFunds (backend). value === enum del backend. */
export const SOURCE_OF_FUNDS = [
  { value: 'salary_employment', label: 'Salario / Empleo' },
  { value: 'business_income',   label: 'Ingresos de negocio propio' },
  { value: 'investments',       label: 'Inversiones' },
  { value: 'savings',           label: 'Ahorros' },
  { value: 'inheritance_gift',  label: 'Herencia / Donación' },
  { value: 'property_sale',     label: 'Venta de propiedad' },
  { value: 'loan',              label: 'Préstamo' },
  { value: 'other',             label: 'Otro' },
]
