import { useCallback } from "react";
interface useModalProps {
  onClose: () => void;
  onConfirm?: () => void;
}
/**
 * Modal 컴포넌트의 비즈니스 로직을 담당하는 커스텀 훅입니다.
 * 확인, 취소, 백드롭 클릭 이벤트를 처리합니다.
 */
export const useModal = ({ onClose, onConfirm }: useModalProps) => {
  /**
   * 확인 버튼 클릭 시 실행되는 핸들러입니다.
   * onConfirm 콜백이 있으면 실행하고, 항상 모달을 닫습니다.
   * 자식 컴포넌트(Modal)에 props로 전달되므로 useCallback으로 메모이제이션합니다.
   */
  const handleConfirm = useCallback(() => {
    onConfirm?.();
    onClose();
  }, [onConfirm, onClose]);
  /**
   * 모달 외부(백드롭) 클릭 시 모달을 닫는 핸들러입니다.
   * 이벤트가 발생한 타겟이 현재 타겟(백드롭)과 같을 때만 닫습니다.
   * 자식 컴포넌트(Modal)에 props로 전달되므로 useCallback으로 메모이제이션합니다.
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );
  return {
    handleConfirm,
    handleBackdropClick,
  };
};
