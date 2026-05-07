export default function SkeletonLoader({
  width = '100%',
  height = 16,
  rounded = false,
  dark = false,
}) {
  if (dark) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: rounded ? 9999 : 'var(--radius-sm)',
          background: 'linear-gradient(90deg, #1A2340 25%, #1F2B4D 50%, #1A2340 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    );
  }

  return (
    <div
      className="skeleton-line"
      style={{
        width,
        height,
        borderRadius: rounded ? 9999 : 'var(--radius-sm)',
      }}
    />
  );
}
