import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '90vh',
  showHandle = true,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'var(--color-bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          maxHeight,
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
          </div>
        )}

        {(title || onClose) && (
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            {title && (
              <h2
                className="text-base font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="ml-auto p-1 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
