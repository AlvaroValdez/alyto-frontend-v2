import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Lock,
  Unlock,
  DollarSign,
  Landmark,
  RefreshCw,
  Wallet,
} from 'lucide-react';

const TYPE_MAP = {
  deposit:      { Icon: ArrowDownLeft,  bg: 'var(--color-success-bg)',  color: 'var(--color-success)'  },
  withdrawal:   { Icon: ArrowUpRight,   bg: 'var(--color-error-bg)',    color: 'var(--color-error)'    },
  send:         { Icon: ArrowUpRight,   bg: 'var(--color-error-bg)',    color: 'var(--color-error)'    },
  receive:      { Icon: ArrowDownLeft,  bg: 'var(--color-success-bg)',  color: 'var(--color-success)'  },
  freeze:       { Icon: Lock,           bg: 'var(--color-pending-bg)',  color: 'var(--color-pending)'  },
  unfreeze:     { Icon: Unlock,         bg: 'var(--color-accent-bg)',   color: 'var(--color-accent)'   },
  fee:          { Icon: DollarSign,     bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)'  },
  bob_to_usdc:  { Icon: RefreshCw,      bg: 'var(--color-transit-bg)',  color: 'var(--color-transit)'  },
  usdc_to_bob:  { Icon: RefreshCw,      bg: 'var(--color-transit-bg)',  color: 'var(--color-transit)'  },
  usdc_deposit: { Icon: Landmark,       bg: 'var(--color-accent-bg)',   color: 'var(--color-accent)'   },
};

const FALLBACK = { Icon: Wallet, bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };

export default function TxIcon({ type, size = 36 }) {
  const { Icon, bg, color } = TYPE_MAP[type] ?? FALLBACK;
  const iconSize = Math.round(size * 0.5);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} style={{ color }} />
    </div>
  );
}
