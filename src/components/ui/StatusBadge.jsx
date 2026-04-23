import Badge from './Badge'

const STATUS_MAP = {
  completed:        { variant: 'success', label: 'Completada'        },
  payout_sent:      { variant: 'transit', label: 'En tránsito'       },
  payout_in_transit:{ variant: 'transit', label: 'En tránsito'       },
  processing:       { variant: 'transit', label: 'Procesando'        },
  in_transit:       { variant: 'transit', label: 'En tránsito'       },
  payin_confirmed:  { variant: 'pending', label: 'Verificando pago'  },
  payin_pending:    { variant: 'pending', label: 'Pago pendiente'    },
  payout_pending:   { variant: 'warning', label: 'Pago manual'       },
  pending_funding:  { variant: 'warning', label: 'Fondos pendientes' },
  failed:           { variant: 'error',   label: 'Fallida'           },
  refunded:         { variant: 'warning', label: 'Reembolsada'       },
  initiated:        { variant: 'pending', label: 'Iniciada'          },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { variant: 'pending', label: status ?? '—' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
