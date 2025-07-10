import React from 'react';
import { useHeader } from '../model/useHeader';
import Logo from './Logo';
import HamburgerButton from './HamburgerButton';
import DesktopNavigation from './DesktopNavigation';
import MobileNavigation from './MobileNavigation';
import UserInfo from './UserInfo';
import styles from '../Header.module.scss';

/**
 * 메인 Header 컴포넌트 (UI 조합 담당)
 */
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
        <HamburgerButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
        <DesktopNavigation
          isAuthenticated={isAuthenticated}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <MobileNavigation
          isOpen={isMobileMenuOpen}
          isAuthenticated={isAuthenticated}
          user={user}
          onClose={closeMobileMenu}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        {isAuthenticated && user && <UserInfo user={user} />}
      </div>
    </header>
  );
};
export default React.memo(Header);
