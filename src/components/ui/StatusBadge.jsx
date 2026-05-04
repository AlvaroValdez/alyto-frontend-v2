import Badge from './Badge'

const STATUS_MAP = {
  initiated:                      { variant: 'pending', label: 'Iniciada'               },
  pending_customer_transfer_start:{ variant: 'pending', label: 'Preparando envío'        },
  transfer_initiated:             { variant: 'pending', label: 'Transferencia iniciada'  },
  payin_pending:                  { variant: 'pending', label: 'Pago pendiente'          },
  payin_confirmed:                { variant: 'pending', label: 'Pago confirmado'         },
  fintoc_payin_confirmed:         { variant: 'pending', label: 'Pago confirmado'         },
  manual_payin_confirmed:         { variant: 'pending', label: 'Pago confirmado'         },
  payin_completed:                { variant: 'pending', label: 'Pago recibido'           },
  harbor_source_received:         { variant: 'transit', label: 'Fondos recibidos'        },
  processing:                     { variant: 'transit', label: 'Procesando'              },
  in_transit:                     { variant: 'transit', label: 'En tránsito'             },
  pending_funding:                { variant: 'warning', label: 'Fondos pendientes'       },
  pending_funding_usdc:           { variant: 'warning', label: 'Fondos USDC pendientes' },
  payout_pending:                 { variant: 'warning', label: 'Enviando...'             },
  payout_pending_usdc_send:       { variant: 'warning', label: 'Enviando al beneficiario'},
  anchor_bolivia_payout_pending:  { variant: 'warning', label: 'Pago Bolivia en proceso' },
  payout_dispatched:              { variant: 'transit', label: 'Pago despachado'         },
  payout_in_transit:              { variant: 'transit', label: 'En tránsito'             },
  payout_sent:                    { variant: 'transit', label: 'Enviado al banco'        },
  completed:                      { variant: 'success', label: 'Completada'              },
  confirmed:                      { variant: 'success', label: 'Confirmada'              },
  failed:                         { variant: 'error',   label: 'Fallida'                 },
  refunded:                       { variant: 'warning', label: 'Reembolsada'             },
  expired:                        { variant: 'error',   label: 'Expirada'                },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { variant: 'pending', label: status ?? '—' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
