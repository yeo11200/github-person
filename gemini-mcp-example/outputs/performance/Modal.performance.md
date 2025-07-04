안녕하세요. React 성능 최적화 전문가로서 제공해주신 `Modal` 컴포넌트의 코드를 분석하고 성능 개선을 위한 제안을 드립니다.

## React Modal 컴포넌트 성능 분석 및 최적화 제안

제공해주신 `Modal` 컴포넌트의 코드와 프로젝트 구조를 바탕으로 성능 병목 현상을 분석했습니다. 주요 이슈는 부모 컴포넌트의 리렌더링 시 불필요한 리렌더링을 유발할 수 있는 부분들입니다. 아래에서 각 문제점과 해결 방안을 상세히 설명합니다.

---

### 1. 문제: 부모 컴포넌트의 인라인 함수 prop 전달

**문제 설명:**
`Modal` 컴포넌트에 `onClose`, `onConfirm`과 같은 함수를 전달할 때, 부모 컴포넌트에서 인라인 함수(예: `() => {}`) 형태로 전달하면 부모가 리렌더링될 때마다 새로운 함수가 생성됩니다. 이로 인해 `Modal` 컴포넌트는 실제 prop 내용이 변경되지 않았음에도 불구하고 불필요하게 리렌더링됩니다.

**코드 예시 (부모 컴포넌트 - 예상):**
```tsx
function ParentComponent() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>모달 열기</button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)} // 매번 새로운 함수 생성
        onConfirm={() => {                 // 매번 새로운 함수 생성
          console.log("확인됨");
          setModalOpen(false);
        }}
        title="확인"
        message="이 작업을 수행하시겠습니까?"
        type="confirm"
      />
    </div>
  );
}
```

**설명:**
React는 props를 비교하여 컴포넌트 리렌더링 여부를 결정합니다. 함수나 객체는 내용이 같아도 메모리 참조 주소가 다르면 다른 값으로 인식됩니다. 위 예시에서 `onClose`, `onConfirm` prop은 `ParentComponent`가 렌더링될 때마다 새로운 함수로 생성되어 전달되므로, `React.memo`를 사용하더라도 `Modal` 컴포넌트는 항상 리렌더링됩니다.

**해결책:**
부모 컴포넌트에서 `useCallback` 훅을 사용하여 함수를 메모이제이션(memoization)합니다. 이렇게 하면 의존성 배열의 값이 변경되지 않는 한 함수 참조가 유지되어 불필요한 리렌더링을 방지할 수 있습니다.

**코드 예시 (부모 컴포넌트 - 수정):**
```tsx
import { useState, useCallback } from 'react';

function ParentComponent() {
  const [isModalOpen, setModalOpen] = useState(false);

  const handleClose = useCallback(() => {
    setModalOpen(false);
  }, []); // 의존성 배열이 비어있으므로 함수는 한 번만 생성됩니다.

  const handleConfirm = useCallback(() => {
    console.log("확인됨");
    setModalOpen(false);
  }, []);

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>모달 열기</button>
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose} // 메모이제이션된 함수 전달
        onConfirm={handleConfirm} // 메모이제이션된 함수 전달
        title="확인"
        message="이 작업을 수행하시겠습니까?"
        type="confirm"
      />
    </div>
  );
}
```

**성능 영향:** **높음 (High)**
- 부모 컴포넌트가 자주 리렌더링되는 경우, 이 최적화는 `Modal` 및 그 자식 컴포넌트들의 불필요한 렌더링을 막아주므로 성능 향상 효과가 큽니다.

---

### 2. 문제: 컴포넌트 메모이제이션 부재

**문제 설명:**
`Modal` 컴포넌트는 `React.memo`로 감싸여 있지 않습니다. 이로 인해 부모 컴포넌트가 리렌더링될 때 `Modal`에 전달되는 props가 변경되지 않았더라도 `Modal` 컴포넌트가 함께 리렌더링됩니다.

**코드 예시 (`Modal.tsx`):**
```tsx
// ... imports

const Modal: React.FC<ModalProps> = ({
  // ... props
}) => {
  // ... component logic
};

export default Modal; // React.memo가 적용되지 않음
```

**설명:**
`React.memo`는 고차 컴포넌트(Higher-Order Component)로, 컴포넌트의 props가 변경되지 않았다면 리렌더링을 건너뛰어 성능을 최적화합니다. `Modal`과 같이 UI의 일부를 독립적으로 표시하고, `isOpen` prop에 따라 표시 여부가 결정되는 컴포넌트는 `React.memo` 적용의 좋은 후보입니다.

**해결책:**
컴포넌트를 `React.memo`로 감싸서 export 합니다. 이렇게 하면 props가 이전 렌더링과 동일할 경우 React는 리렌더링을 생략합니다.

**코드 예시 (`Modal.tsx` - 수정):**
```tsx
import React from "react";
import styles from "./Modal.module.scss";

// ... interface

const Modal: React.FC<ModalProps> = ({ /* ...props */ }) => {
  // ... component logic
};

export default React.memo(Modal);
```

**성능 영향:** **중간 (Medium)**
- `Modal` 컴포넌트의 렌더링 비용이 크거나, 부모 컴포넌트가 자주 리렌더링되지만 `Modal`의 props는 자주 바뀌지 않는 상황에서 효과적입니다.

---

### 3. 문제: 컴포넌트 내부 함수 재생성

**문제 설명:**
`Modal` 컴포넌트 내부의 `handleConfirm`, `handleBackdropClick` 함수는 컴포넌트가 리렌더링될 때마다 새로 생성됩니다.

**코드 예시 (`Modal.tsx`):**
```tsx
// ...
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, ... }) => {
  if (!isOpen) return null;

  const handleConfirm = () => { // 리렌더링 시마다 재생성
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => { // 리렌더링 시마다 재생성
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    // ... JSX
  );
};
```

**설명:**
이 함수들이 하위 컴포넌트의 prop으로 전달되지는 않으므로 직접적인 리렌더링을 유발하지는 않습니다. 하지만 리렌더링마다 함수를 새로 정의하고 메모리에 할당하는 것은 미미한 성능 저하를 유발하며, 가비지 컬렉션의 대상이 됩니다. `useCallback`을 사용해 일관성을 유지하고 잠재적인 성능 문제를 예방하는 것이 좋습니다.

**해결책:**
컴포넌트 내부에서 정의되는 함수들을 `useCallback`으로 감싸서 의존성이 변경될 때만 함수가 재생성되도록 합니다.

**코드 예시 (`Modal.tsx` - 수정):**
```tsx
import React, { useCallback } from "react";
import styles from "./Modal.module.scss";

// ... interface

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  // ... other props
}) => {
  if (!isOpen) return null;

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  }, [onConfirm, onClose]); // 의존성 배열에 onConfirm, onClose 추가

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]); // 의존성 배열에 onClose 추가

  return (
    // ... JSX
  );
};

export default React.memo(Modal);
```

**성능 영향:** **낮음 (Low)**
- 현재 구조에서는 성능에 미치는 영향이 거의 없지만, 컴포넌트가 복잡해지거나 해당 함수들이 하위 컴포넌트로 전달될 경우를 대비한 좋은 습관이자 잠재적 최적화입니다.

---

### 4. Context 사용 분석
- 제공된 `Modal` 컴포넌트는 React Context를 직접 사용하고 있지 않습니다. 따라서 Context로 인한 성능 문제는 해당 컴포넌트에 없습니다.
- 만약 애플리케이션 전역에서 Context를 사용하고 있고, 이로 인해 `Modal`을 감싸는 부모 컴포넌트가 자주 리렌더링된다면, Context를 분리하거나 `useMemo`를 사용하여 Context의 값의 일부만 선택적으로 구독하는 등의 최적화를 고려해볼 수 있습니다.

---

### 종합 제안
위 분석을 바탕으로 `Modal.tsx` 파일을 다음과 같이 수정할 것을 제안합니다. 이와 더불어 `Modal`을 사용하는 부모 컴포넌트에서는 `onClose`와 `onConfirm` 함수를 `useCallback`으로 감싸서 전달해야 최적화 효과를 극대화할 수 있습니다.

```tsx
import React, { useCallback } from "react";
import styles from "./Modal.module.scss";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: "alert" | "confirm";
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
  confirmText = "확인",
  cancelText = "취소",
}) => {
  if (!isOpen) return null;

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  }, [onConfirm, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

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
      </div>
    </div>
  );
};

export default React.memo(Modal);
```
