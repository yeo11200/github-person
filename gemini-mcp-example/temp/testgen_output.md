---
## 📄 파일: `src/components/Header/Header.test.tsx`
```typescript
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import Header from './Header';

// Mock 데이터
const mockUser = {
  id: 1,
  name: 'Test User',
  login: 'testuser',
  avatar_url: 'https://example.com/avatar.png',
};

const mockLoggedOutContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  loginWithGitHub: vi.fn(),
  logout: vi.fn(),
  loading: false,
  error: null,
};

const mockLoggedInContext: AuthContextType = {
  user: mockUser,
  isAuthenticated: true,
  loginWithGitHub: vi.fn(),
  logout: vi.fn(),
  loading: false,
  error: null,
};

// 테스트 유틸리티: 컨텍스트와 라우터와 함께 렌더링
const renderWithProviders = (
  ui: React.ReactElement,
  { authContextValue = mockLoggedOutContext, ...renderOptions } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <AuthContext.Provider value={authContextValue}>
        {children}
      </AuthContext.Provider>
    </MemoryRouter>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authContextValue,
  };
};

describe('Header 컴포넌트', () => {
  beforeEach(() => {
    // 모든 mock 함수 초기화
    vi.clearAllMocks();
  });

  afterEach(() => {
    // body 스타일 정리
    document.body.style.overflow = 'unset';
  });

  describe('렌더링 테스트', () => {
    it('로그아웃 상태일 때 올바르게 렌더링된다', () => {
      renderWithProviders(<Header />);
      
      expect(screen.getByText('RepoSummary')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /홈/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /github 로그인/i })).toBeInTheDocument();
      
      expect(screen.queryByRole('link', { name: /대시보드/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /레포지토리/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /로그아웃/i })).not.toBeInTheDocument();
      expect(screen.queryByText(mockUser.name)).not.toBeInTheDocument();
    });

    it('로그인 상태일 때 올바르게 렌더링된다', () => {
      renderWithProviders(<Header />, { authContextValue: mockLoggedInContext });

      expect(screen.getByText('RepoSummary')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /홈/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /대시보드/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /레포지토리/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /로그아웃/i })).toBeInTheDocument();
      
      // 데스크톱과 모바일 두 곳에 이름이 표시될 수 있으므로 getAllByText 사용
      expect(screen.getAllByText(mockUser.name)[0]).toBeInTheDocument();
      const avatarImages = screen.getAllByAltText(mockUser.name);
      expect(avatarImages[0]).toHaveAttribute('src', mockUser.avatar_url);

      expect(screen.queryByRole('button', { name: /github 로그인/i })).not.toBeInTheDocument();
    });
  });

  describe('사용자 상호작용 테스트', () => {
    it('로그인 버튼 클릭 시 loginWithGitHub 함수가 호출된다', async () => {
      const user = userEvent.setup();
      const { authContextValue } = renderWithProviders(<Header />);
      
      await user.click(screen.getByRole('button', { name: /github 로그인/i }));
      
      expect(authContextValue.loginWithGitHub).toHaveBeenCalledTimes(1);
    });

    it('로그아웃 버튼 클릭 시 logout 함수가 호출된다', async () => {
      const user = userEvent.setup();
      const { authContextValue } = renderWithProviders(<Header />, { authContextValue: mockLoggedInContext });
      
      await user.click(screen.getByRole('button', { name: /로그아웃/i }));
      
      expect(authContextValue.logout).toHaveBeenCalledTimes(1);
    });

    describe('모바일 메뉴 상호작용', () => {
      it('햄버거 버튼 클릭 시 모바일 메뉴가 열리고 닫힌다', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);
        
        const mobileNav = screen.getByRole('navigation', { hidden: true });
        expect(mobileNav).not.toHaveClass(/mobileNavOpen/);

        const menuButton = screen.getByRole('button', { name: /메뉴 열기\/닫기/i });
        await user.click(menuButton);
        expect(mobileNav).toHaveClass(/mobileNavOpen/);

        await user.click(menuButton);
        expect(mobileNav).not.toHaveClass(/mobileNavOpen/);
      });

      it('모바일 메뉴의 링크 클릭 시 메뉴가 닫힌다', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />, { authContextValue: mockLoggedInContext });
        
        const mobileNav = screen.getByRole('navigation', { hidden: true });
        const menuButton = screen.getByRole('button', { name: /메뉴 열기\/닫기/i });

        await user.click(menuButton);
        expect(mobileNav).toHaveClass(/mobileNavOpen/);

        const dashboardLink = within(mobileNav).getByRole('link', { name: /대시보드/i });
        await user.click(dashboardLink);
        
        expect(mobileNav).not.toHaveClass(/mobileNavOpen/);
      });

      it('모바일 메뉴가 열렸을 때 body 스크롤이 방지된다', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);
        
        const menuButton = screen.getByRole('button', { name: /메뉴 열기\/닫기/i });
        await user.click(menuButton);
        
        expect(document.body.style.overflow).toBe('hidden');
        
        await user.click(menuButton);
        expect(document.body.style.overflow).toBe('unset');
      });
    });
  });

  describe('성능 테스트', () => {
    it('AuthContext 값이 동일할 때 리렌더링되지 않는다', () => {
      const renderSpy = vi.fn();
      const MemoizedHeader = React.memo(() => {
        renderSpy();
        return <Header />;
      });

      const { rerender } = renderWithProviders(<MemoizedHeader />, { authContextValue: mockLoggedInContext });
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 동일한 컨텍스트 값으로 리렌더링
      rerender(
        <MemoryRouter>
          <AuthContext.Provider value={mockLoggedInContext}>
            <MemoizedHeader />
          </AuthContext.Provider>
        </MemoryRouter>
      );
      expect(renderSpy).toHaveBeenCalledTimes(1); // 리렌더링되지 않아야 함
    });

    it('AuthContext 값이 변경될 때 리렌더링된다', () => {
      const renderSpy = vi.fn();
      const MemoizedHeader = React.memo(() => {
        renderSpy();
        return <Header />;
      });

      const { rerender } = renderWithProviders(<MemoizedHeader />, { authContextValue: mockLoggedOutContext });
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 다른 컨텍스트 값으로 리렌더링
      rerender(
        <MemoryRouter>
          <AuthContext.Provider value={mockLoggedInContext}>
            <MemoizedHeader />
          </AuthContext.Provider>
        </MemoryRouter>
      );
      expect(renderSpy).toHaveBeenCalledTimes(2); // 리렌더링되어야 함
    });
  });

  describe('접근성 테스트', () => {
    it('햄버거 메뉴 버튼에 ARIA 레이블이 있다', () => {
      renderWithProviders(<Header />);
      expect(screen.getByRole('button', { name: /메뉴 열기\/닫기/i })).toBeInTheDocument();
    });

    it('사용자 아바타 이미지에 적절한 alt 텍스트가 있다', () => {
      renderWithProviders(<Header />, { authContextValue: mockLoggedInContext });
      const avatarImages = screen.getAllByAltText(mockUser.name);
      expect(avatarImages.length).toBeGreaterThan(0);
      avatarImages.forEach(img => {
        expect(img).toBeInTheDocument();
      });
    });

    it('키보드 네비게이션이 가능하다', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Header />, { authContextValue: mockLoggedInContext });

      // 로고 -> 홈 -> 대시보드 -> 레포지토리 -> 로그아웃 -> 사용자 아바타 순으로 포커스 이동
      await user.keyboard('{Tab}');
      expect(screen.getByRole('link', { name: /RepoSummary/i })).toHaveFocus();

      await user.keyboard('{Tab}');
      // 데스크톱 네비게이션의 홈 링크
      const navs = screen.getAllByRole('navigation');
      const desktopNav = navs[0];
      expect(within(desktopNav).getByRole('link', { name: /홈/i })).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByRole('link', { name: /대시보드/i })).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByRole('link', { name: /레포지토리/i })).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /로그아웃/i })).toHaveFocus();
    });
  });
});
```
