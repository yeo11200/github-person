import React, { memo } from "react";
import { Link } from "react-router-dom";
import { useHeader } from "./hooks/useHeader";
import styles from "./Header.module.scss";
import type { User } from "../../../types/apis/github-my";
// --- 내부 컴포넌트 정의 ---
interface LogoProps {
  onClick: () => void;
}
// 로고 컴포넌트
const Logo = memo(({ onClick }: LogoProps) => (
  <Link to="/" className={styles.logo} onClick={onClick}>
    <span className={styles.logoIcon}>📊</span>
    <span className={styles.logoText}>RepoSummary</span>
  </Link>
));
interface MobileMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
}
// 모바일 메뉴 버튼 (햄버거)
const MobileMenuButton = memo(({ isOpen, onClick }: MobileMenuButtonProps) => (
  <button
    className={styles.mobileMenuBtn}
    onClick={onClick}
    aria-label="메뉴 열기/닫기"
  >
    <span
      className={`${styles.hamburger} ${isOpen ? styles.hamburgerOpen : ""}`}
    >
      <span />
      <span />
      <span />
    </span>
  </button>
));
interface UserInfoProps {
  user: User;
}
// 사용자 정보 표시 컴포넌트
const UserInfo = memo(({ user }: UserInfoProps) => (
  <div className={styles.user}>
    <img
      src={user.avatar_url || "/default-avatar.png"}
      alt={user.name || "사용자 아바타"}
      className={styles.userAvatar}
    />
    <span className={styles.userName}>{user.name}</span>
  </div>
));
interface NavProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onLinkClick: () => void;
}
// 데스크톱 네비게이션
const DesktopNav = memo(
  ({ isAuthenticated, onLogout, onLogin }: Omit<NavProps, "onLinkClick">) => (
    <nav className={styles.nav}>
      <Link to="/" className={styles.navLink}>
        홈
      </Link>
      {isAuthenticated ? (
        <>
          <Link to="/dashboard" className={styles.navLink}>
            대시보드
          </Link>
          <Link to="/repositories" className={styles.navLink}>
            레포지토리
          </Link>
          <button onClick={onLogout} className={styles.logoutBtn}>
            로그아웃
          </button>
        </>
      ) : (
        <button className={styles.loginBtn} onClick={onLogin}>
          GitHub 로그인
        </button>
      )}
    </nav>
  )
);
// 모바일 네비게이션
const MobileNav = memo(
  ({
    isAuthenticated,
    user,
    onLogout,
    onLogin,
    onLinkClick,
  }: NavProps & { user: User | null }) => (
    <div className={styles.mobileNavContent}>
      {isAuthenticated && user && (
        <div className={styles.mobileUser}>
          <img
            src={user.avatar_url || "/default-avatar.png"}
            alt={user.name}
            className={styles.userAvatar}
          />
          <span className={styles.userName}>{user.name}</span>
        </div>
      )}
      <div className={styles.mobileNavLinks}>
        <Link to="/" className={styles.mobileNavLink} onClick={onLinkClick}>
          홈
        </Link>
        {isAuthenticated ? (
          <>
            <Link
              to="/dashboard"
              className={styles.mobileNavLink}
              onClick={onLinkClick}
            >
              대시보드
            </Link>
            <Link
              to="/repositories"
              className={styles.mobileNavLink}
              onClick={onLinkClick}
            >
              레포지토리
            </Link>
            <button onClick={onLogout} className={styles.mobileLogoutBtn}>
              로그아웃
            </button>
          </>
        ) : (
          <button className={styles.mobileLoginBtn} onClick={onLogin}>
            GitHub 로그인
          </button>
        )}
      </div>
    </div>
  )
);
// --- 메인 헤더 컴포넌트 ---
const Header = () => {
  const {
    user,
    isAuthenticated,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
    handleLogin,
    handleLogout,
  } = useHeader();
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Logo onClick={closeMobileMenu} />
        <MobileMenuButton
          isOpen={isMobileMenuOpen}
          onClick={toggleMobileMenu}
        />
        <DesktopNav
          isAuthenticated={isAuthenticated}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        {/* 모바일 네비게이션 영역 */}
        <nav
          className={`${styles.mobileNav} ${
            isMobileMenuOpen ? styles.mobileNavOpen : ""
          }`}
        >
          <MobileNav
            isAuthenticated={isAuthenticated}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onLinkClick={closeMobileMenu}
          />
        </nav>
        {isAuthenticated && user && <UserInfo user={user} />}
        {/* 모바일 메뉴 오버레이 */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
        )}
      </div>
    </header>
  );
};
export default memo(Header);
