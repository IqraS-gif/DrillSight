import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, hideHeader = false, hideClose = false, className = '', children }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal ${hideHeader ? 'modal--evidence-dossier' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {!hideHeader ? (
          <div className="modal__header">
            <h2 id="modal-title" className="modal__title">{title}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        ) : !hideClose ? (
          <button
            type="button"
            className="modal__close--floating"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        ) : null}
        <div className={hideHeader ? 'modal__body--dossier' : 'modal__body'}>
          {children}
        </div>
      </div>
    </div>
  );
}
