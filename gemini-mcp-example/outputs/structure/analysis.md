네, 알겠습니다. React 시니어 아키텍트로서 제공해주신 프로젝트 구조를 분석하고 개선 방안을 제안해 드리겠습니다.

# 프로젝트 구조 분석

## 현재 상태

전반적으로 프로젝트는 기능(feature) 기반의 잘 정돈된 구조를 가지고 있습니다. `pages`, `components`, `contexts`, `store` 등 역할에 따라 디렉토리를 분리한 것은 좋은 출발점입니다.

#### **강점 (Strengths)**

*   **관심사 분리 (SoC):** `pages` (라우팅 단위), `components` (재사용 UI), `contexts` (상태 관리), `store` (Zustand 훅), `utils` (유틸리티 함수) 등으로 역할이 명확하게 분리되어 있습니다.
*   **컴포넌트 구성:** 각 컴포넌트가 자신의 폴더 안에서 `*.tsx`, `*.module.scss`, `index.ts` 파일을 함께 관리하는 방식(Co-location)은 컴포넌트의 응집도를 높이고 재사용성을 좋게 합니다.
*   **배럴 수출 (Barrel Exports):** `index.ts`를 사용하여 컴포넌트 및 유틸리티를 내보내는 패턴은 다른 곳에서 임포트할 때 경로를 간결하게 만들어줍니다.

#### **개선점 (Weaknesses)**

*   **확장성 및 유지보수성:**
    *   `store` 디렉토리는 현재 Zustand 커스텀 훅을 담고 있는데, 'store'라는 이름은 전통적인 Redux 방식의 중앙 집중식 스토어를 연상시킬 수 있습니다. `hooks`라는 더 일반적인 이름이 역할과 책임을 명확히 하는 데 도움이 될 수 있습니다.
    *   `utils`와 `types` 디렉토리는 프로젝트가 커질수록 다양한 파일들이 혼재하여 '잡동사니' 폴더가 될 가능성이 있습니다.
*   **개발 경험 (Developer Experience):**
    *   절대 경로 별칭(Path Alias)이 설정되어 있지 않아, `import MyComponent from '../../../components/MyComponent'`와 같은 상대 경로 지옥(relative path hell)에 빠지기 쉽습니다. 이는 코드 가독성을 해치고 리팩토링을 어렵게 만듭니다.
*   **성능 (Performance):**
    *   `router/index.tsx`에서 페이지 컴포넌트를 정적으로 임포트할 가능성이 높습니다. 이 경우, 사용자가 방문하지 않는 페이지의 코드까지 초기 번들에 포함되어 로딩 속도가 저하될 수 있습니다.

## 권장 구조

현재 구조의 장점을 살리면서 확장성과 개발 경험을 개선하는 방향으로 구조를 재구성하는 것을 추천합니다.

```
src/
├── api/              # API 요청 관련 로직 (fetch-api.ts 이동)
├── assets/           # 기존 유지
├── components/
│   ├── ui/           # 버튼, 모달 등 범용적인 기본 UI 컴포넌트
│   └── domain/       # 특정 도메인/기능에 종속된 복합 컴포넌트
├── constants/        # 상수 관리 (e.g., API 엔드포인트, 키 값)
├── contexts/         # 기존 유지
├── hooks/            # 모든 커스텀 훅 (store/*.tsx 이동)
├── pages/            # 기존 유지 (Lazy Loading 적용)
├── router/           # 라우팅 설정 (기존 유지)
├── store/            # Zustand 스토어 생성 및 전역 설정만 담당
├── styles/           # 전역 스타일, 변수, 믹스인
├── types/            # 타입 정의 (도메인별 하위 폴더 구성 권장)
└── utils/            # 순수 유틸리티 함수 (기능별 파일로 분리 권장)
```

## 마이그레이션 계획

아래 계획에 따라 점진적으로 구조를 변경하면 리스크를 최소화하고 안정적으로 마이그레이션을 진행할 수 있습니다.

#### **1단계: 도구 설정 (경로 별칭)**

가장 먼저 개발 경험을 크게 향상시키는 경로 별칭을 설정합니다.

1.  **`tsconfig.json` 수정:** `compilerOptions`에 `paths`를 추가합니다.

    ```json
    {
      "compilerOptions": {
        // ... 기존 옵션
        "baseUrl": ".",
        "paths": {
          "@/*": ["src/*"]
        }
      }
    }
    ```

2.  **`vite.config.ts` 수정:** Vite가 경로 별칭을 인식하도록 `resolve.alias`를 설정합니다.

    ```typescript
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import path from 'path'

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
    })
    ```

#### **2단계: 디렉토리 구조 변경 및 파일 이동**

1.  권장 구조에 따라 `api`, `hooks`, `components/ui`, `components/domain` 등의 새 디렉토리를 생성합니다.
2.  기존 파일들을 새 위치로 이동합니다.
    *   `src/store/useCommitStats.tsx` -> `src/hooks/useCommitStats.ts`
    *   `src/store/useMyAgent.tsx` -> `src/hooks/useMyAgent.ts`
    *   `src/utils/fetch-api.ts` -> `src/api/index.ts` (혹은 더 구체적인 이름)
    *   `src/components/Modal` -> `src/components/ui/Modal` (범용 컴포넌트일 경우)
    *   `src/components/CommitStatsPopup` -> `src/components/domain/CommitStatsPopup` (특정 기능 컴포넌트일 경우)

#### **3단계: 임포트 경로 업데이트**

전체 프로젝트에서 기존의 상대 경로 임포트를 1단계에서 설정한 절대 경로 별칭으로 변경합니다.

*   **변경 전:** `import { Modal } from '../../components/Modal';`
*   **변경 후:** `import { Modal } from '@/components/ui/Modal';`

#### **4단계: 페이지 지연 로딩(Lazy Loading) 적용**

초기 로딩 성능 최적화를 위해 각 페이지를 동적으로 임포트합니다.

*   **`src/router/index.tsx` 수정 예시:**

    ```tsx
    import { lazy, Suspense } from 'react';
    import { createBrowserRouter, RouterProvider } from 'react-router-dom';
    import Layout from '@/components/Layout'; // 예시 경로

    // 각 페이지를 lazy를 사용해 동적으로 임포트
    const Home = lazy(() => import('@/pages/Home/Home'));
    const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
    const RepoSelect = lazy(() => import('@/pages/RepoSelect/RepoSelect'));

    const router = createBrowserRouter([
      {
        path: '/',
        element: <Layout />,
        children: [
          // Suspense로 감싸 로딩 중 표시할 UI(e.g. 스피너)를 설정
          { index: true, element: <Suspense fallback={<div>Loading...</div>}><Home /></Suspense> },
          { path: 'dashboard', element: <Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense> },
          { path: 'select', element: <Suspense fallback={<div>Loading...</div>}><RepoSelect /></Suspense> },
        ],
      },
    ]);

    export function AppRouter() {
      return <RouterProvider router={router} />;
    }
    ```

#### **5단계: 검증**

모든 변경이 완료된 후, 프로젝트가 정상적으로 동작하는지 확인합니다.

```bash
# 린트 검사
pnpm lint

# 타입 체크 및 빌드
pnpm build
```

## 기대 효과

*   **유지보수성 향상:** 역할과 책임이 명확히 분리된 구조는 코드를 이해하고 수정하기 쉽게 만듭니다.
*   **확장성 증대:** 새로운 기능을 추가할 때 파일을 어디에 위치시켜야 할지 명확한 가이드라인을 제공하여 프로젝트의 일관성을 유지할 수 있습니다.
*   **개발 경험(DX) 개선:** 절대 경로 별칭은 임포트 구문을 간결하게 만들고, 파일 이동 시 발생하는 경로 수정의 번거로움을 크게 줄여줍니다.
*   **성능 최적화:** 페이지별 코드 분할(Code Splitting) 및 지연 로딩(Lazy Loading)을 통해 초기 진입(TTV) 속도를 향상시켜 사용자 경험을 개선합니다.
