네, 안녕하세요. React 전문가로서 제공해주신 코드의 성능 병목 현상을 분석하고 최적화 방안을 제시해 드리겠습니다. 분석은 불필요한 리렌더링에 초점을 맞춥니다.

## React 성능 분석 보고서

제공된 코드는 React 애플리케이션에서 흔히 발생하는 여러 성능 저하 요인을 포함하고 있습니다. 주된 원인은 부모 컴포넌트(`ButtonContainer`)의 상태가 변경될 때마다 자식 컴포넌트(`Button`, `ExpensiveChild`)에 새로운 참조의 props(인라인 함수, 객체, 배열)를 전달하여 불필요한 리렌더링을 유발하는 것입니다.

아래는 각 문제점에 대한 상세 분석 및 해결 방안입니다.

---

### 1. 문제: 인라인 함수 Prop 전달

**Problem Description:**
`ButtonContainer` 컴포넌트가 리렌더링될 때마다 `Button` 컴포넌트의 `onClick` prop에 새로운 함수가 인라인으로 생성되어 전달됩니다. 예를 들어, `input`에 텍스트를 입력해 `message` 상태가 변경되면 `ButtonContainer`가 리렌더링되고, 이때 생성된 새로운 함수가 `Button`에 전달되어 `Button` 컴포넌트까지 불필요하게 리렌더링됩니다.

**Code Example:**
```tsx
// ButtonContainer.tsx

// ...
export const ButtonContainer: React.FC = () => {
  // ...
  return (
    <div>
      {/* ... */}
      {/* Performance issue: inline function */}
      <Button onClick={() => setCount(count + 1)}>Increment Count</Button>
      {/* Performance issue: inline function */}
      <Button
        onClick={() => console.log("Secondary clicked")}
        variant="secondary"
      >
        Secondary Button
      </Button>
      {/* ... */}
    </div>
  );
};
```

**Explanation:**
`() => {}` 구문은 렌더링 시마다 새로운 함수 객체를 생성합니다. React는 props를 비교하여 리렌더링 여부를 결정하는데, 함수는 객체이므로 이전 렌더링의 함수와 현재 렌더링의 함수는 내용이 같아도 참조(메모리 주소)가 달라 다른 prop으로 간주합니다. 이로 인해 `React.memo`를 사용하더라도 `Button` 컴포넌트의 리렌더링을 막을 수 없습니다.

**Solution:**
`useCallback` 훅을 사용하여 함수를 메모이제이션(memoization)합니다. 이렇게 하면 의존성 배열의 값이 변경되지 않는 한 함수 참조가 유지되어 자식 컴포넌트에 동일한 prop을 전달할 수 있습니다.

```tsx
// ButtonContainer.tsx (수정 후)
import React, { useState, useCallback } from "react";

// ...
export const ButtonContainer: React.FC = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  const handleIncrement = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []); // setCount는 참조가 안정적이므로 의존성 배열이 비어있어도 됩니다.

  const handleSecondaryClick = useCallback(() => {
    console.log("Secondary clicked");
  }, []);

  return (
    <div>
      {/* ... */}
      <Button onClick={handleIncrement}>Increment Count</Button>
      <Button onClick={handleSecondaryClick} variant="secondary">
        Secondary Button
      </Button>
      {/* ... */}
    </div>
  );
};
```

**Performance Impact:** **High**
- `message` 상태 변경 시 `Button` 컴포넌트의 불필요한 리렌더링을 방지합니다.

---

### 2. 문제: 인라인 배열 Prop 전달

**Problem Description:**
`ButtonContainer`가 리렌더링될 때마다 `ExpensiveChild` 컴포넌트의 `data` prop에 `[1, 2, 3]`이라는 새로운 배열이 생성되어 전달됩니다.

**Code Example:**
```tsx
// ButtonContainer.tsx

// ...
export const ButtonContainer: React.FC = () => {
  // ...
  return (
    <div>
      {/* ... */}
      <ExpensiveChild data={[1, 2, 3]} /> {/* Performance issue: inline array */}
    </div>
  );
};
```

**Explanation:**
인라인 함수와 마찬가지로, `[1, 2, 3]` 구문은 렌더링 시마다 새로운 배열 객체를 생성합니다. 이로 인해 `ExpensiveChild`는 `ButtonContainer`가 리렌더링될 때마다 새로운 `data` prop을 받게 되어, 실제 데이터 내용이 변하지 않았음에도 불구하고 무거운 연산을 포함한 리렌더링을 반복하게 됩니다.

**Solution:**
`useMemo` 훅을 사용하여 배열을 메모이제이션하거나, 컴포넌트 외부에 상수로 정의합니다. 데이터가 정적이라면 상수로 정의하는 것이 가장 좋습니다.

```tsx
// ButtonContainer.tsx (수정 후)
import React, { useState, useCallback, useMemo } from "react";

// ...

// 해결책 1: 컴포넌트 외부에 상수로 정의 (더 좋은 방법)
const EXPENSIVE_CHILD_DATA = [1, 2, 3];

export const ButtonContainer: React.FC = () => {
  // ...
  // 해결책 2: useMemo 사용
  const expensiveChildData = useMemo(() => [1, 2, 3], []);

  return (
    <div>
      {/* ... */}
      <ExpensiveChild data={EXPENSIVE_CHILD_DATA} />
    </div>
  );
};
```

**Performance Impact:** **High**
- `count`나 `message` 상태 변경 시 `ExpensiveChild`의 불필요하고 비용이 큰 리렌더링을 방지합니다.

---

### 3. 문제: 비용이 큰 자식 컴포넌트의 메모이제이션 부재

**Problem Description:**
`ExpensiveChild` 컴포넌트는 내부적으로 무거운 연산을 수행하지만, `React.memo`로 감싸여 있지 않습니다. 따라서 부모로부터 받는 props가 변경되지 않았더라도, 부모가 리렌더링되면 함께 리렌더링될 수 있습니다.

**Code Example:**
```tsx
// ExpensiveChild.tsx

const ExpensiveChild: React.FC<{ data: number[] }> = ({ data }) => {
  console.log("ExpensiveChild rendering with data:", data);
  // ... 무거운 연산
  return (
    // ...
  );
};
```

**Explanation:**
위 1, 2번 문제에서 props를 안정화했더라도, `ExpensiveChild` 자체를 `React.memo`로 감싸주면 props가 실제로 변경되었을 때만 리렌더링되도록 보장할 수 있습니다. 이는 예기치 않은 리렌더링을 방지하는 방어적인 코딩 전략입니다.

**Solution:**
`ExpensiveChild` 컴포넌트를 `React.memo` 고차 컴포넌트(HOC)로 감싸줍니다.

```tsx
// ExpensiveChild.tsx (수정 후)
import React from "react";

const ExpensiveChild: React.FC<{ data: number[] }> = ({ data }) => {
  // ...
};

export default React.memo(ExpensiveChild); // React.memo로 감싸기
```

**Performance Impact:** **High**
- props가 변경되지 않았을 때 비용이 큰 컴포넌트의 리렌더링을 원천적으로 차단합니다.

---

### 4. 문제: 인라인 스타일 객체

**Problem Description:**
`Button` 컴포넌트 내에서 `buttonStyle` 객체가 렌더링 시마다 새로 생성됩니다.

**Code Example:**
```tsx
// Button.tsx

export const Button: React.FC<ButtonProps> = ({
  // ...
}) => {
  // ...
  // Performance issue: inline style object
  const buttonStyle = {
    backgroundColor: variant === "primary" ? "#007bff" : "#6c757d",
    // ...
  };

  return (
    <button
      // ...
      style={buttonStyle} // Performance issue: new object on every render
    >
      {/* ... */}
    </button>
  );
};
```

**Explanation:**
이 문제는 앞선 문제들보다 심각도는 낮지만, 여전히 좋지 않은 패턴입니다. 렌더링마다 새로운 스타일 객체가 생성되어 `style` prop으로 전달됩니다. React가 가상 DOM에서 변경 사항을 비교할 때 새로운 객체 참조로 인해 불필요한 비교 작업을 수행할 수 있습니다.

**Solution:**
`useMemo`를 사용하여 `variant`나 `disabled` prop이 변경될 때만 스타일 객체를 새로 생성하도록 합니다. 또는 CSS Modules, Styled-components 같은 CSS-in-JS 라이브러리를 사용하여 동적 스타일링을 처리하는 것이 더 나은 아키텍처입니다. 프로젝트에 이미 `*.module.scss` 파일이 있으므로 CSS Modules를 활용하는 것을 권장합니다. 여기서는 `useMemo`를 사용한 해결책을 제시합니다.

```tsx
// Button.tsx (수정 후)
import React, { useState, useMemo } from "react";

// ...
export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  loading = false,
}) => {
  // ...
  const buttonStyle = useMemo(() => ({
    backgroundColor: variant === "primary" ? "#007bff" : "#6c757d",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }), [variant, disabled]);

  return (
    <button
      // ...
      style={buttonStyle}
    >
      {/* ... */}
    </button>
  );
};
```

**Performance Impact:** **Medium**
- 리렌더링 시마다 발생하는 불필요한 객체 생성을 방지하여 가상 DOM 비교 비용을 줄입니다.

---

### 5. Context 사용 분석

제공된 코드 스니펫에서는 React Context가 사용되지 않았으므로 이 항목은 해당되지 않습니다.

## 최종 수정 코드 (요약)

```tsx
import React, { useState, useMemo, useCallback } from "react";

// ... (LoadingSpinner는 변경 없음)

// Button 컴포넌트: React.memo와 useMemo로 최적화
export const Button: React.FC<ButtonProps> = React.memo(({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  loading = false,
}) => {
  const [clickCount, setClickCount] = useState(0);

  const handleClick = () => {
    setClickCount((prev) => prev + 1);
    onClick();
  };

  const buttonStyle = useMemo(() => ({
    backgroundColor: variant === "primary" ? "#007bff" : "#6c757d",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }), [variant, disabled]);

  const countStyle = useMemo(() => ({ fontSize: "12px", marginLeft: "4px" }), []);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      style={buttonStyle}
    >
      {loading && <LoadingSpinner size={16} />}
      {children}
      {clickCount > 0 && (
        <span style={countStyle}>({clickCount})</span>
      )}
    </button>
  );
});

// ExpensiveChild 컴포넌트: React.memo로 최적화
const ExpensiveChild: React.FC<{ data: number[] }> = React.memo(({ data }) => {
  console.log("ExpensiveChild rendering with data:", data);
  const expensiveValue = useMemo(() => data.reduce(
    (acc, val) => acc + val * Math.random(),
    0
  ), [data]);

  return (
    <div>
      <p>Expensive computation result: {expensiveValue.toFixed(2)}</p>
    </div>
  );
});

// ButtonContainer 컴포넌트: useCallback과 useMemo(또는 상수)로 최적화
const EXPENSIVE_CHILD_DATA = [1, 2, 3];

export const ButtonContainer: React.FC = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  const handleIncrement = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const handleSecondaryClick = useCallback(() => {
    console.log("Secondary clicked");
  }, []);

  return (
    <div>
      <div>Count: {count}</div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type something..."
      />
      <Button onClick={handleIncrement}>Increment Count</Button>
      <Button
        onClick={handleSecondaryClick}
        variant="secondary"
      >
        Secondary Button
      </Button>
      <ExpensiveChild data={EXPENSIVE_CHILD_DATA} />
    </div>
  );
};
```
