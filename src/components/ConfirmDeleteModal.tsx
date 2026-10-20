import React, { useEffect } from 'react';

interface ConfirmDeleteModalProps {
  title?: string;
  itemName: string;
  itemType?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title = 'Confirm Deletion',
  itemName,
  itemType = 'entry',
  onConfirm,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-del-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="c"
        style={{
          maxWidth: '420px',
          width: '100%',
          margin: 0,
          background: 'var(--cd)',
          borderRadius: '18px',
          padding: '22px',
          border: '1px solid var(--bd)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
          textAlign: 'center'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'rgba(220, 38, 38, 0.12)',
            color: 'var(--rd)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            marginBottom: '14px'
          }}
        >
          🗑️
        </div>

        <h2 id="confirm-del-title" style={{ fontSize: '18px', margin: '0 0 6px', fontWeight: 800 }}>
          {title}
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--tx)', margin: '0 0 8px', lineHeight: 1.5 }}>
          Are you sure you want to delete <b>&ldquo;{itemName}&rdquo;</b>?
        </p>

        <p style={{ fontSize: '12px', color: 'var(--mu)', margin: '0 0 20px', lineHeight: 1.4 }}>
          This will permanently remove this {itemType} from your local storage and cloud database.
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="s"
            onClick={onClose}
            style={{ flex: 1, background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              flex: 1.2,
              background: 'var(--rd)',
              color: '#ffffff',
              fontWeight: 700
            }}
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
