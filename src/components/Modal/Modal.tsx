import React from 'react';
import styles from './Modal.module.scss';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type,
  onConfirm,
  confirmText = '확인',
  cancelText = '취소',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalMessage}>{message}</p>
        </div>

        <div className={styles.modalFooter}>
          {type === 'confirm' && (
            <button
              className={`${styles.modalBtn} ${styles.cancelBtn}`}
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button
            className={`${styles.modalBtn} ${styles.confirmBtn}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
