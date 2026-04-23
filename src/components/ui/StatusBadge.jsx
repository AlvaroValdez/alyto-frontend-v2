import Badge from './Badge'

const STATUS_MAP = {
  completed:       { variant: 'success', label: 'Completada'    },
  payout_sent:     { variant: 'teal',    label: 'En tránsito'   },
  processing:      { variant: 'teal',    label: 'Procesando'    },
  in_transit:      { variant: 'teal',    label: 'En tránsito'   },
  payin_confirmed: { variant: 'pending', label: 'Verificando'   },
  payin_pending:   { variant: 'pending', label: 'Pago pendiente' },
  failed:          { variant: 'error',   label: 'Fallida'       },
  refunded:        { variant: 'warning', label: 'Reembolsada'   },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { variant: 'pending', label: status ?? '—' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
