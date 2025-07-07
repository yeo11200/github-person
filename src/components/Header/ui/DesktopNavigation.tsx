import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../Header.module.scss';
interface DesktopNavigationProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}
/**
 * 데스크톱용 네비게이션 메뉴 컴포넌트
 * @param {DesktopNavigationProps} props - 인증 상태, 로그인/로그아웃 핸들러
 */
const DesktopNavigation: React.FC<DesktopNavigationProps> = ({
  isAuthenticated,
  onLogin,
  onLogout,
}) => (
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
);
export default React.memo(DesktopNavigation);
