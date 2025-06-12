import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Header.module.scss";

const Header = () => {
  const { user, isAuthenticated, logout, loginWithGitHub } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // 모바일 메뉴가 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={closeMobileMenu}>
          <span className={styles.logoIcon}>📊</span>
          <span className={styles.logoText}>RepoSummary</span>
        </Link>

        {/* 햄버거 메뉴 버튼 */}
        <button
          className={styles.mobileMenuBtn}
          onClick={toggleMobileMenu}
          aria-label="메뉴 열기/닫기"
        >
          <span
            className={`${styles.hamburger} ${
              isMobileMenuOpen ? styles.hamburgerOpen : ""
            }`}
          >
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* 데스크톱 네비게이션 */}
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
              <Link to="/profile" className={styles.navLink}>
                프로필
              </Link>
              <button onClick={logout} className={styles.logoutBtn}>
                로그아웃
              </button>
            </>
          ) : (
            <button className={styles.loginBtn} onClick={loginWithGitHub}>
              GitHub 로그인
            </button>
          )}
        </nav>

        {/* 모바일 네비게이션 */}
        <nav
          className={`${styles.mobileNav} ${
            isMobileMenuOpen ? styles.mobileNavOpen : ""
          }`}
        >
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
              <Link
                to="/"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                홈
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className={styles.mobileNavLink}
                    onClick={closeMobileMenu}
                  >
                    대시보드
                  </Link>
                  <Link
                    to="/repositories"
                    className={styles.mobileNavLink}
                    onClick={closeMobileMenu}
                  >
                    레포지토리
                  </Link>
                  <Link
                    to="/profile"
                    className={styles.mobileNavLink}
                    onClick={closeMobileMenu}
                  >
                    프로필
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      closeMobileMenu();
                    }}
                    className={styles.mobileLogoutBtn}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  className={styles.mobileLoginBtn}
                  onClick={() => {
                    loginWithGitHub();
                    closeMobileMenu();
                  }}
                >
                  GitHub 로그인
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* 데스크톱 사용자 정보 */}
        {isAuthenticated && user && (
          <div className={styles.user}>
            <img
              src={user.avatar_url || "/default-avatar.png"}
              alt={user.name}
              className={styles.userAvatar}
            />
            <span className={styles.userName}>{user.name}</span>
          </div>
        )}

        {/* 모바일 메뉴 오버레이 */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={closeMobileMenu}></div>
        )}
      </div>
    </header>
  );
};

export default Header;
