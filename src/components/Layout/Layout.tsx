import { Outlet, useLocation } from 'react-router-dom';
import Header from '../Header';
import styles from './Layout.module.scss';
import { useEffect, useRef } from 'react';

const Layout = () => {
  const location = useLocation();
  const currentLoction = useRef(location.pathname);

  useEffect(() => {
    if (currentLoction.current !== location.pathname) {
      currentLoction.current = location.pathname;
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
