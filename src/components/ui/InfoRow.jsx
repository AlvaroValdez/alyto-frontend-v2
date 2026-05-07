export default function InfoRow({ label, value, bold = false, accent = false, separator = false }) {
  return (
    <>
      <div className="flex items-center justify-between py-2">
        <span
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </span>
        <span
          className={bold ? 'font-semibold' : 'font-normal'}
          style={{
            fontSize: 'var(--font-base)',
            color: accent ? 'var(--color-accent)' : 'var(--color-text-primary)',
          }}
        >
          {value}
        </span>
      </div>
      {separator && (
        <div style={{ height: 1, backgroundColor: 'var(--color-border-light)' }} />
      )}
    </>
  );
}
