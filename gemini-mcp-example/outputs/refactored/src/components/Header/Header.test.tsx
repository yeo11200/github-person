import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { AuthContext, AuthContextType } from '../../contexts/AuthContext';

// Mock 데이터
const mockUser = {
  login: 'testuser',
  id: 1,
  node_id: 'MDQ6VXNlcjE=',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  gravatar_id: '',
  url: 'https://api.github.com/users/testuser',
  html_url: 'https://github.com/testuser',
  followers_url: 'https://api.github.com/users/testuser/followers',
  following_url: 'https://api.github.com/users/testuser/following{/other_user}',
  gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
  starred_url: 'https://api.github.com/users/testuser/starred{/owner}{/repo}',
  subscriptions_url: 'https://api.github.com/users/testuser/subscriptions',
  organizations_url: 'https://api.github.com/users/testuser/orgs',
  repos_url: 'https://api.github.com/users/testuser/repos',
  events_url: 'https://api.github.com/users/testuser/events{/privacy}',
  received_events_url: 'https://api.github.com/users/testuser/received_events',
  type: 'User',
  site_admin: false,
  name: 'Test User',
  company: null,
  blog: '',
  location: 'Test Location',
  email: null,
  hireable: null,
  bio: null,
  twitter_username: null,
  public_repos: 8,
  public_gists: 0,
  followers: 0,
  following: 0,
  created_at: '2017-07-01T00:00:00Z',
  updated_at: '2024-07-01T00:00:00Z',
};

// 테스트용 커스텀 렌더 함수
const renderHeader = (authContextValue: Partial<AuthContextType>) => {
  const defaultAuthValue: AuthContextType = {
    user: null,
    isAuthenticated: false,
    loginWithGitHub: vi.fn(),
    logout: vi.fn(),
    loading: false,
    error: null,
  };

  return render(
    <AuthContext.Provider value={{ ...defaultAuthValue, ...authContextValue }}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('<Header />', () => {
  beforeEach(() => {
    // body overflow 스타일 초기화
    document.body.style.overflow = '';
  });

  describe('렌더링 및 접근성', () => {
    it('비인증 상태에서 로고, 홈 링크, 로그인 버튼이 렌더링된다', () => {
      renderHeader({ isAuthenticated: false });
      expect(screen.getByText('RepoSummary')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /홈/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /github 로그인/i })).toBeInTheDocument();
    });

    it('인증 상태에서 로고, 네비게이션 링크, 로그아웃 버튼, 유저 정보가 렌더링된다', () => {
      renderHeader({ isAuthenticated: true, user: mockUser });
      expect(screen.getByText('RepoSummary')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /홈/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /대시보드/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /레포지토리/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /로그아웃/i })).toBeInTheDocument();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByAltText(mockUser.name)).toHaveAttribute('src', mockUser.avatar_url);
    });

    it('모바일 메뉴 버튼은 "메뉴 열기/닫기"라는 접근성 레이블을 가진다', () => {
      renderHeader({});
      expect(screen.getByRole('button', { name: '메뉴 열기/닫기' })).toBeInTheDocument();
    });
  });

  describe('사용자 상호작용 (데스크톱)', () => {
    it('로그인 버튼 클릭 시 loginWithGitHub 함수가 호출된다', async () => {
      const loginWithGitHub = vi.fn();
      renderHeader({ isAuthenticated: false, loginWithGitHub });
      
      const loginButton = screen.getByRole('button', { name: /github 로그인/i });
      await userEvent.click(loginButton);
      
      expect(loginWithGitHub).toHaveBeenCalledTimes(1);
    });

    it('로그아웃 버튼 클릭 시 logout 함수가 호출된다', async () => {
      const logout = vi.fn();
      renderHeader({ isAuthenticated: true, user: mockUser, logout });
      
      const logoutButton = screen.getByRole('button', { name: /로그아웃/i });
      await userEvent.click(logoutButton);
      
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('사용자 상호작용 (모바일)', () => {
    it('햄버거 버튼 클릭 시 모바일 메뉴가 열리고 닫힌다', async () => {
      renderHeader({});
      const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });
      
      // 메뉴 열기
      await userEvent.click(mobileMenuButton);
      const mobileNav = screen.getByRole('navigation', { name: '' }); // 모바일 네비게이션은 aria-label이 없음
      expect(mobileNav).toHaveClass('mobileNavOpen');

      // 메뉴 닫기
      await userEvent.click(mobileMenuButton);
      expect(mobileNav).not.toHaveClass('mobileNavOpen');
    });

    it('모바일 메뉴가 열렸을 때 오버레이 클릭 시 메뉴가 닫힌다', async () => {
      renderHeader({});
      const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });
      
      await userEvent.click(mobileMenuButton);
      const mobileNav = screen.getByRole('navigation', { name: '' });
      expect(mobileNav).toHaveClass('mobileNavOpen');

      const overlay = screen.getByRole('presentation', {hidden: true}).nextSibling;
      if (overlay) {
        await userEvent.click(overlay);
      }
      expect(mobileNav).not.toHaveClass('mobileNavOpen');
    });

    it('모바일 메뉴의 링크 클릭 시 메뉴가 닫힌다', async () => {
      renderHeader({ isAuthenticated: true, user: mockUser });
      const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });
      
      await userEvent.click(mobileMenuButton);
      const mobileNav = screen.getByRole('navigation', { name: '' });
      expect(mobileNav).toHaveClass('mobileNavOpen');

      const dashboardLink = within(mobileNav).getByRole('link', { name: /대시보드/i });
      await userEvent.click(dashboardLink);
      
      expect(mobileNav).not.toHaveClass('mobileNavOpen');
    });

    it('모바일 로그아웃 버튼 클릭 시 logout 함수가 호출되고 메뉴가 닫힌다', async () => {
        const logout = vi.fn();
        renderHeader({ isAuthenticated: true, user: mockUser, logout });
        const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });
        
        await userEvent.click(mobileMenuButton);
        const mobileNav = screen.getByRole('navigation', { name: '' });
        
        const mobileLogoutButton = within(mobileNav).getByRole('button', { name: /로그아웃/i });
        await userEvent.click(mobileLogoutButton);
        
        expect(logout).toHaveBeenCalledTimes(1);
        expect(mobileNav).not.toHaveClass('mobileNavOpen');
    });
  });

  describe('사이드 이펙트 및 상태 관리', () => {
    it('모바일 메뉴가 열리면 body의 overflow가 "hidden"으로 설정된다', async () => {
      renderHeader({});
      const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });
      
      await userEvent.click(mobileMenuButton);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('모바일 메뉴가 닫히면 body의 overflow가 "unset"으로 설정된다', async () => {
      renderHeader({});
      const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });

      // 열기
      await userEvent.click(mobileMenuButton);
      expect(document.body.style.overflow).toBe('hidden');

      // 닫기
      await userEvent.click(mobileMenuButton);
      expect(document.body.style.overflow).toBe('unset');
    });

    it('컴포넌트 언마운트 시 body의 overflow가 "unset"으로 초기화된다', async () => {
      const { unmount } = renderHeader({});
      const mobileMenuButton = screen.getByRole('button', { name: '메뉴 열기/닫기' });
      
      await userEvent.click(mobileMenuButton);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });
});

// testing-library/react의 within 헬퍼를 모방하여 사용
const within = (element: HTMLElement) => ({
  getByRole: (role: string, options?: any) =>
    require('@testing-library/dom').within(element).getByRole(role, options),
  getByText: (text: string, options?: any) =>
    require('@testing-library/dom').within(element).getByText(text, options),
});
