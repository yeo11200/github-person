# 프로젝트 구조 분석 및 아키텍처 개선 제안

## 현재 상태 (Current State)

제공해주신 프로젝트 구조는 React 애플리케이션의 일반적인 패턴을 잘 따르고 있습니다. `components`, `pages`, `contexts`, `store` (hooks), `utils` 등으로 관심사를 분리한 것은 긍정적입니다.

### 강점 (Strengths)
- **관심사 분리 (Separation of Concerns):** 기능별로 디렉터리를 분리하여 코드의 역할을 명확히 하고 있습니다. (`pages`는 라우팅 단위, `components`는 재사용 UI 단위)
- **CSS 모듈 (CSS Modules):** `*.module.scss` 패턴을 사용하여 컴포넌트 단위로 스타일을 캡슐화하고 전역 스코프 오염을 방지하는 좋은 방식을 사용하고 있습니다.
- **배럴 수출 (Barrel Exports):** `index.ts`를 사용하여 컴포넌트나 모듈을 외부에 노출하는 방식을 채택하여 import 구문을 간결하게 만들고 있습니다.
- **상태 관리:** `store` 디렉터리를 통해 커스텀 훅 기반의 상태 관리를 중앙에서 처리하려는 시도가 보입니다.

### 개선점 (Weaknesses / Areas for Improvement)
- **확장성 및 유지보수성:** 현재 구조는 프로젝트가 작을 때는 효율적이지만, 기능이 복잡해지고 규모가 커질수록 특정 기능을 수정하기 위해 여러 디렉터리를 오가야 합니다. 예를 들어 'RepoSummary' 페이지와 관련된 훅, 타입, 컴포넌트를 찾으려면 `pages`, `store`, `types`, `components` 디렉터리를 모두 확인해야 합니다.
- **스타일 관리의 파편화:** `App.css`, `index.css`, 그리고 별도의 `styles` 디렉터리가 혼재하여 전역 스타일 관리가 분산되어 있습니다.
- **네이밍 컨벤션:** `store` 디렉터리는 보통 Redux나 MobX 같은 전역 상태 관리 라이브러리의 인스턴스를 둘 때 사용합니다. 내부 파일이 `use...` 형태의 커스텀 훅이라면 `hooks` 라는 이름이 더 명확합니다.
- **개발자 경험 (DX):** 절대 경로 설정(Path Alias)이 없어 `../../components/Modal`과 같은 상대 경로 지옥(relative path hell)에 빠지기 쉽습니다. 이는 코드 가독성을 해치고 리팩터링을 어렵게 만듭니다.

---

## 추천 구조 (Recommended Structure)

기능 중심(Feature-based) 아키텍처를 도입하여 확장성과 유지보수성을 극대화하는 것을 추천합니다. 관련된 코드(컴포넌트, 훅, API, 타입 등)를 하나의 도메인(기능) 폴더에 모아 응집도를 높입니다.

```
src
├── apis/               # API 클라이언트 인스턴스, 기본 fetch 함수
├── assets/             # 정적 파일 (이미지, 폰트 등)
├── components/         # 모든 도메인에서 공유하는 순수 UI 컴포넌트
│   ├── common/
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── ...
│   └── layout/
│       └── Layout.tsx
├── config/             # 앱 전역 설정 (상수 등)
├── contexts/           # 전역 컨텍스트 (e.g., AuthContext, ThemeContext)
├── features/           # ✨ 도메인/기능별 모듈
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   └── repository/
│       ├── api/        # 레포지토리 관련 API 호출 함수
│       ├── components/ # CommitStatsPopup, MonthlyCommitChart 등
│       ├── hooks/      # useCommitStats 등
│       ├── pages/      # RepoSelect, RepoSummary 등
│       └── types/      # github-commit, github-repo 타입
├── hooks/              # 여러 도메인에서 공유하는 커스텀 훅
├── lib/                # 순수 유틸리티 함수 (과거 utils)
├── pages/              # 특정 도메인에 속하지 않는 페이지 (Home, NotFound)
├── router/             # 라우팅 설정 (Code Splitting 적용)
├── styles/             # ✨ 전역 스타일, 변수, 믹스인
└── types/              # 전역적으로 사용되는 타입
```

### 주요 변경 사항
1.  **`features` 디렉터리 도입:** 애플리케이션의 핵심 도메인(e.g., `repository`, `auth`)을 기준으로 폴더를 구성합니다. 각 기능에 필요한 모든 코드가 이 폴더 안에 위치하여 응집도를 높입니다.
2.  **`components/common`:** `Button`, `Modal`처럼 여러 기능에서 재사용되는 범용 컴포넌트는 `components/common`에 둡니다.
3.  **`lib` 디렉터리:** `utils`의 이름을 `lib`으로 변경하여 좀 더 범용적인 라이브러리성 코드임을 명시합니다. (기존 `utils` 유지도 무방)
4.  **`styles` 통합:** 파편화된 CSS 파일들을 `src/styles`로 통합하여 전역 스타일을 일관되게 관리합니다.
5.  **`apis` 분리:** `fetch` 로직을 담당하는 부분을 `apis` 디렉터리로 분리하여 API 관련 코드를 중앙 관리합니다.

---

## 이전 전략 (Migration Plan)

기존 코드를 한 번에 변경하는 것은 위험하므로, 점진적인 마이그레이션 전략을 제안합니다.

### 1단계: 환경 설정 및 준비 (Preparation)
- **목표:** 리팩터링을 위한 기반을 다집니다.
- **작업:**
    1.  **팀 합의:** 새로운 아키텍처에 대해 팀원들과 논의하고 동의를 얻습니다.
    2.  **경로 별칭 (Path Alias) 설정:** `tsconfig.json`과 `vite.config.ts`에 경로 별칭을 추가합니다. 이를 통해 `import Button from '../../components/Button'`을 `import Button from '@/components/common/Button'`처럼 간결하게 만들 수 있습니다.
        ```jsonc
        // tsconfig.json
        {
          "compilerOptions": {
            "paths": {
              "@/*": ["./src/*"]
            }
          }
        }
        ```
        ```typescript
        // vite.config.ts
        import path from 'path';
        import { defineConfig } from 'vite';

        export default defineConfig({
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
            },
          },
        });
        ```
    3.  **Linter 설정:** `eslint-plugin-import` 같은 도구를 사용하여 설정된 경로 별칭을 강제하고, 절대 경로 사용을 권장하는 규칙을 추가합니다.

### 2단계: 저위험 요소부터 점진적 이동 (Incremental Migration)
- **목표:** 리스크가 적은 파일부터 새로운 구조로 이동시킵니다.
- **작업:**
    1.  **`styles` 통합:** `App.css`, `index.css`, `src/styles` 내 파일들을 `src/styles` 디렉터리로 통합하고 `main.tsx`에서 import 합니다.
    2.  **`utils` -> `lib`:** `utils` 폴더를 `lib`으로 변경하고, 내부 파일들의 import 경로를 모두 경로 별칭(`@/lib/...`)을 사용해 수정합니다.
    3.  **`store` -> `hooks`:** `store` 폴더를 `hooks`로 변경하고, 관련된 import 경로를 수정합니다.

### 3단계: 기능 단위 마이그레이션 (Feature-by-Feature Migration)
- **목표:** 핵심 로직을 새로운 `features` 구조로 옮깁니다.
- **작업:**
    1.  **한 기능 선택:** 가장 먼저 마이그레이션할 기능(e.g., `repository`)을 선택합니다.
    2.  **`features/repository` 폴더 생성:** 추천 구조에 따라 `api`, `components`, `hooks`, `pages`, `types` 폴더를 내부에 만듭니다.
    3.  **코드 이동:** 기존 `pages`, `components`, `hooks`, `types` 등 여러 곳에 흩어져 있던 `repository` 관련 파일들을 `features/repository` 하위의 적절한 위치로 이동시킵니다.
        - `pages/RepoSelect` -> `features/repository/pages/RepoSelect`
        - `components/CommitStatsPopup` -> `features/repository/components/CommitStatsPopup`
        - `hooks/useCommitStats` -> `features/repository/hooks/useCommitStats`
    4.  **경로 수정 및 테스트:** 이동한 기능과 관련된 모든 import 경로를 수정하고, 해당 기능이 올바르게 동작하는지 철저히 테스트합니다.
    5.  **반복:** 다른 모든 기능에 대해 1~4단계를 반복합니다.

### 4단계: 최종 정리 (Final Cleanup)
- **목표:** 마이그레이션을 완료하고 기존의 빈 폴더들을 제거합니다.
- **작업:**
    1.  모든 파일이 새 구조로 이동되었는지 확인합니다.
    2.  기존의 `pages`, `components` 등 이제는 비어있는 폴더들을 삭제합니다.
    3.  프로젝트 전체적으로 테스트를 다시 한번 수행합니다.

---

## 기대 효과 (Benefits)

- **향상된 확장성 (Improved Scalability):** 새로운 기능을 추가할 때 `features` 폴더 내에 새로운 도메인 폴더만 만들면 되므로 프로젝트의 다른 부분에 미치는 영향이 최소화됩니다.
- **향상된 유지보수성 (Better Maintainability):** 특정 기능을 수정할 때 한 폴더 내에서 모든 관련 파일을 찾을 수 있어 개발자의 인지 부하가 줄고 생산성이 향상됩니다.
- **향상된 개발자 경험 (Enhanced DX):** 명확한 구조와 경로 별칭(Path Alias) 덕분에 코드를 탐색하기 쉽고, 신규 개발자가 프로젝트에 적응하는 시간이 단축됩니다.
- **성능 최적화 기반 마련:** 기능별로 코드가 모여있어 라우터에서 코드 스플리팅(Code Splitting)을 적용하기 용이해집니다. `React.lazy`와 함께 사용하여 초기 로딩 성능을 개선할 수 있습니다.
    ```typescript
    // src/router/index.tsx
    const RepoSummaryPage = React.lazy(() => import('@/features/repository/pages/RepoSummary'));
    // ...
    <Route path="/repo-summary" element={<Suspense fallback={...}><RepoSummaryPage /></Suspense>} />
    ```
