---
## 📄 파일: `model/useModal.ts`
```tsx
import { useCallback } from 'react';

interface UseModalParams {
  onClose: () => void;
  onConfirm?: () => void;
}

/**
 * Modal 컴포넌트의 비즈니스 로직을 담당하는 커스텀 훅입니다.
 * 확인 및 닫기 핸들러를 생성하고 관리합니다.
 */
export const useModal = ({ onClose, onConfirm }: UseModalParams) => {
  /**
   * 확인 버튼 클릭 시 실행되는 핸들러입니다.
   * onConfirm 콜백이 있으면 실행하고, 항상 모달을 닫습니다.
   * 자식 컴포넌트(ModalFooter)에 props로 전달되므로 useCallback으로 메모이제이션합니다.
   */
  const handleConfirm = useCallback(() => {
    onConfirm?.();
    onClose();
  }, [onConfirm, onClose]);

  /**
   * 모달의 배경(Backdrop) 클릭 시 실행되는 핸들러입니다.
   * 이벤트가 발생한 타겟이 현재 타겟(배경)과 같을 때만 모달을 닫습니다.
   * 자식 컴포넌트(ModalBackdrop)에 props로 전달되므로 useCallback으로 메모이제이션합니다.
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return {
    handleConfirm,
    handleBackdropClick,
  };
};
```

---
## 📄 파일: `ui/ModalBackdrop.tsx`
```tsx
import React, { memo } from 'react';
import styles from '../Modal.module.scss';

interface ModalBackdropProps {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

/**
 * 모달의 오버레이 배경을 렌더링하는 컴포넌트입니다.
 * 클릭 시 모달을 닫는 기능을 담당합니다.
 * props가 변경되지 않으면 리렌더링되지 않도록 React.memo로 최적화합니다.
 */
const ModalBackdrop: React.FC<ModalBackdropProps> = ({ onClick, children }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClick}>
      {children}
    </div>
  );
};

export default memo(ModalBackdrop);
```

---
## 📄 파일: `ui/ModalHeader.tsx`
```tsx
import React, { memo } from 'react';
import styles from '../Modal.module.scss';

interface ModalHeaderProps {
  title: string;
}

/**
 * 모달의 헤더 영역을 렌더링하는 컴포넌트입니다.
 * 제목을 표시합니다.
 * props가 변경되지 않으면 리렌더링되지 않도록 React.memo로 최적화합니다.
 */
const ModalHeader: React.FC<ModalHeaderProps> = ({ title }) => {
  return (
    <div className={styles.modalHeader}>
      <h3 className={styles.modalTitle}>{title}</h3>
    </div>
  );
};

export default memo(ModalHeader);
```

---
## 📄 파일: `ui/ModalBody.tsx`
```tsx
import React, { memo } from 'react';
import styles from '../Modal.module.scss';

interface ModalBodyProps {
  message: string;
}

/**
 * 모달의 본문 영역을 렌더링하는 컴포넌트입니다.
 * 메시지를 표시합니다.
 * props가 변경되지 않으면 리렌더링되지 않도록 React.memo로 최적화합니다.
 */
const ModalBody: React.FC<ModalBodyProps> = ({ message }) => {
  return (
    <div className={styles.modalBody}>
      <p className={styles.modalMessage}>{message}</p>
    </div>
  );
};

export default memo(ModalBody);
```

---
## 📄 파일: `ui/ModalFooter.tsx`
```tsx
import React, { memo } from 'react';
import styles from '../Modal.module.scss';

interface ModalFooterProps {
  type: 'alert' | 'confirm';
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  cancelText: string;
}

/**
 * 모달의 푸터 영역을 렌더링하는 컴포넌트입니다.
 * 확인 및 취소 버튼을 표시하고 관련 액션을 처리합니다.
 * props가 변경되지 않으면 리렌더링되지 않도록 React.memo로 최적화합니다.
 */
const ModalFooter: React.FC<ModalFooterProps> = ({
  type,
  onClose,
  onConfirm,
  confirmText,
  cancelText,
}) => {
  return (
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
        onClick={onConfirm}
      >
        {confirmText}
      </button>
    </div>
  );
};

export default memo(ModalFooter);
```

---
## 📄 파일: `ui/Modal.tsx`
```tsx
import React, { memo } from 'react';
import { useModal } from '../model/useModal';
import ModalBackdrop from './ModalBackdrop';
import ModalHeader from './ModalHeader';
import ModalBody from './ModalBody';
import ModalFooter from './ModalFooter';
import styles from '../Modal.module.scss';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 메인 Modal UI 컴포넌트입니다.
 * 하위 UI 컴포넌트(Backdrop, Header, Body, Footer)들을 조합하여 완전한 모달을 렌더링합니다.
 * 비즈니스 로직은 useModal 훅에 위임합니다.
 * props가 변경되지 않으면 리렌더링되지 않도록 React.memo로 최적화합니다.
 */
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
  const { handleConfirm, handleBackdropClick } = useModal({
    onClose,
    onConfirm,
  });

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <ModalHeader title={title} />
        <ModalBody message={message} />
        <ModalFooter
          type={type}
          onClose={onClose}
          onConfirm={handleConfirm}
          confirmText={confirmText}
          cancelText={cancelText}
        />
      </div>
    </ModalBackdrop>
  );
};

export default memo(Modal);
```

---
## 📄 파일: `index.ts`
```tsx
// 메인 컴포넌트만 export하여 내부 구현을 캡슐화합니다.
export { default } from './ui/Modal';

// 외부에서 Modal의 props 타입을 사용할 수 있도록 export합니다.
export type { ModalProps } from './ui/Modal';
```
