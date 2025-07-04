import React, { memo } from "react";
import { useModal } from "./hooks/useModal";
import styles from "./Modal.module.scss";
// --- 내부 컴포넌트 분리 ---
interface ModalHeaderProps {
  title: string;
}
// ModalHeader: 제목을 렌더링하는 순수 UI 컴포넌트
const ModalHeader: React.FC<ModalHeaderProps> = memo(({ title }) => (
  <div className={styles.modalHeader}>
    <h3 className={styles.modalTitle}>{title}</h3>
  </div>
));
ModalHeader.displayName = 'ModalHeader';
interface ModalBodyProps {
  message: string;
}
// ModalBody: 메시지를 렌더링하는 순수 UI 컴포넌트
const ModalBody: React.FC<ModalBodyProps> = memo(({ message }) => (
  <div className={styles.modalBody}>
    <p className={styles.modalMessage}>{message}</p>
  </div>
));
ModalBody.displayName = 'ModalBody';
interface ModalFooterProps {
  type: "alert" | "confirm";
  onClose: () => void;
  handleConfirm: () => void;
  confirmText: string;
  cancelText: string;
}
// ModalFooter: 버튼들을 렌더링하는 순수 UI 컴포넌트
const ModalFooter: React.FC<ModalFooterProps> = memo(
  ({ type, onClose, handleConfirm, confirmText, cancelText }) => (
    <div className={styles.modalFooter}>
      {type === "confirm" && (
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
  )
);
ModalFooter.displayName = 'ModalFooter';
// --- 메인 컴포넌트 ---
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: "alert" | "confirm";
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}
/**
 * Modal: 순수 UI 컴포넌트
 * 비즈니스 로직은 useModal 훅에 위임하고, UI 렌더링에만 집중합니다.
 * props 변경이 없을 때 불필요한 리렌더링을 방지하기 위해 React.memo를 사용합니다.
 */
const Modal: React.FC<ModalProps> = memo(
  ({
    isOpen,
    onClose,
    title,
    message,
    type,
    onConfirm,
    confirmText = "확인",
    cancelText = "취소",
  }) => {
    const { handleConfirm, handleBackdropClick } = useModal({
      onClose,
      onConfirm,
    });
    if (!isOpen) return null;
    return (
      <div className={styles.modalOverlay} onClick={handleBackdropClick}>
        <div className={styles.modalContent}>
          <ModalHeader title={title} />
          <ModalBody message={message} />
          <ModalFooter
            type={type}
            onClose={onClose}
            handleConfirm={handleConfirm}
            confirmText={confirmText}
            cancelText={cancelText}
          />
        </div>
      </div>
    );
  }
);
Modal.displayName = 'Modal';
export default Modal;
