import React from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@/types/apis';
import styles from '../Header.module.scss';
interface MobileNavigationProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  user: User | null;
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
}
/**
 * 모바일용 네비게이션 메뉴 컴포넌트
 * @param {MobileNavigationProps} props - 메뉴 상태 및 핸들러
 */
const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  isAuthenticated,
  user,
  onClose,
  onLogin,
  onLogout,
}) => (
  <>
    <nav
      className={`${styles.mobileNav} ${isOpen ? styles.mobileNavOpen : ''}`}
    >
      <div className={styles.mobileNavContent}>
        {isAuthenticated && user && (
          <div className={styles.mobileUser}>
            <img
              src={user.avatar_url || '/default-avatar.png'}
              alt={user.name}
              className={styles.userAvatar}
            />
            <span className={styles.userName}>{user.name}</span>
          </div>
        )}
        <div className={styles.mobileNavLinks}>
          <Link to="/" className={styles.mobileNavLink} onClick={onClose}>
            홈
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={styles.mobileNavLink}
                onClick={onClose}
              >
                대시보드
              </Link>
              <Link
                to="/repositories"
                className={styles.mobileNavLink}
                onClick={onClose}
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
    </nav>
    {isOpen && <div className={styles.mobileOverlay} onClick={onClose} />}
  </>
);
export default React.memo(MobileNavigation);
