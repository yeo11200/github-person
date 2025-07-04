네, 10년차 시니어 프론트엔드 아키텍트로서 제공해주신 `Header.tsx` 컴포넌트를 성능 최적화와 올바른 아키텍처에 초점을 맞춰 리팩토링하겠습니다.

UI와 비즈니스 로직을 분리하기 위해 커스텀 훅(`useHeader`)을 도입하고, `React.memo`와 `useCallback`을 사용하여 불필요한 렌더링을 방지했습니다. 또한, 중복되는 JSX 구조를 별도의 내부 컴포넌트로 추출하여 코드의 재사용성과 가독성을 높였습니다.

다음은 리팩토링된 코드입니다. `hooks` 폴더와 `useHeader.ts` 파일을 새로 생성하고, 기존 `Header.tsx` 파일은 아래 내용으로 덮어쓰시면 됩니다.

---
## 📄 파일: `src/components/Header/hooks/useHeader.ts`
```tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * Header 컴포넌트의 비즈니스 로직과 상태를 관리하는 커스텀 훅입니다.
 * 인증 상태, 모바일 메뉴 상태, 네비게이션 링크 데이터 및 관련 이벤트 핸들러를 제공합니다.
 */
export const useHeader = () => {
  const { user, isAuthenticated, logout, loginWithGitHub } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 네비게이션 링크 데이터
  const navLinks = [
    { to: '/dashboard', label: '대시보드' },
    { to: '/repositories', label: '레포지토리' },
  ];

  // 모바일 메뉴 상태를 토글하는 메모이즈된 콜백
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // 모바일 메뉴를 닫는 메모이즈된 콜백
  const closeMobileMenu = useCallback(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  // 로그아웃을 처리하고 메뉴를 닫는 메모이즈된 콜백
  const handleLogout = useCallback(() => {
    logout();
    closeMobileMenu();
  }, [logout, closeMobileMenu]);

  // 로그인을 처리하고 메뉴를 닫는 메모이즈된 콜백
  const handleLogin = useCallback(() => {
    loginWithGitHub();
    closeMobileMenu();
  }, [loginWithGitHub, closeMobileMenu]);

  // 모바일 메뉴가 열렸을 때 body 스크롤을 방지하는 부수 효과
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }

    // 컴포넌트 언마운트 시 또는 상태 변경 시 원래 스타일로 복원
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  return {
    user,
    isAuthenticated,
    isMobileMenuOpen,
    navLinks,
    toggleMobileMenu,
    closeMobileMenu,
    handleLogin,
    handleLogout,
  };
};
```
---
## 📄 파일: `src/components/Header/Header.tsx`
```tsx
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useHeader } from './hooks/useHeader';
import styles from './Header.module.scss';
import type { MyProfile } from '../../types/apis/github-my';

// 네비게이션 링크 목록을 렌더링하는 메모이즈된 컴포넌트
const NavLinks = memo(
  ({
    links,
    className,
    onClick,
  }: {
    links: { to: string; label: string }[];
    className: string;
    onClick?: () => void;
  }) => (
    <>
      {links.map(({ to, label }) => (
        <Link key={to} to={to} className={className} onClick={onClick}>
          {label}
        </Link>
      ))}
    </>
  ),
);
NavLinks.displayName = 'NavLinks';

// 사용자 프로필을 표시하는 메모이즈된 컴포넌트
const UserProfile = memo(
  ({
    user,
    avatarClassName,
    nameClassName,
  }: {
    user: MyProfile;
    avatarClassName: string;
    nameClassName: string;
  }) => (
    <>
      <img
        src={user.avatar_url || '/default-avatar.png'}
        alt={user.name || 'User Avatar'}
        className={avatarClassName}
      />
      <span className={nameClassName}>{user.name}</span>
    </>
  ),
);
UserProfile.displayName = 'UserProfile';

/**
 * 헤더 UI를 표시하는 순수 프레젠테이션 컴포넌트입니다.
 * 모든 상태와 로직은 `useHeader` 훅에서 제공받습니다.
 */
const Header = memo(() => {
  const {
    user,
    isAuthenticated,
    isMobileMenuOpen,
    navLinks,
    toggleMobileMenu,
    closeMobileMenu,
    handleLogin,
    handleLogout,
  } = useHeader();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={closeMobileMenu}>
          <span className={styles.logoIcon}>📊</span>
          <span className={styles.logoText}>RepoSummary</span>
        </Link>

        <button
          className={styles.mobileMenuBtn}
          onClick={toggleMobileMenu}
          aria-label="메뉴 열기/닫기"
        >
          <span
            className={`${styles.hamburger} ${
              isMobileMenuOpen ? styles.hamburgerOpen : ''
            }`}
          >
            <span />
            <span />
            <span />
          </span>
        </button>

        {/* 데스크톱 네비게이션 */}
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            홈
          </Link>
          {isAuthenticated ? (
            <>
              <NavLinks links={navLinks} className={styles.navLink} />
              <button onClick={handleLogout} className={styles.logoutBtn}>
                로그아웃
              </button>
            </>
          ) : (
            <button className={styles.loginBtn} onClick={handleLogin}>
              GitHub 로그인
            </button>
          )}
        </nav>

        {/* 모바일 네비게이션 */}
        <div
          className={`${styles.mobileNav} ${
            isMobileMenuOpen ? styles.mobileNavOpen : ''
          }`}
        >
          <div className={styles.mobileNavContent}>
            {isAuthenticated && user && (
              <div className={styles.mobileUser}>
                <UserProfile
                  user={user}
                  avatarClassName={styles.userAvatar}
                  nameClassName={styles.userName}
                />
              </div>
            )}
            <div className={styles.mobileNavLinks}>
              <Link
                to="/"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                홈
              </Link>
              {isAuthenticated ? (
                <>
                  <NavLinks
                    links={navLinks}
                    className={styles.mobileNavLink}
                    onClick={closeMobileMenu}
                  />
                  <button
                    onClick={handleLogout}
                    className={styles.mobileLogoutBtn}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button className={styles.mobileLoginBtn} onClick={handleLogin}>
                  GitHub 로그인
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 데스크톱 사용자 정보 */}
        {isAuthenticated && user && (
          <div className={styles.user}>
            <UserProfile
              user={user}
              avatarClassName={styles.userAvatar}
              nameClassName={styles.userName}
            />
          </div>
        )}

        {/* 모바일 메뉴 오버레이 */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
        )}
      </div>
    </header>
  );
});
Header.displayName = 'Header';

export default Header;
```
---
