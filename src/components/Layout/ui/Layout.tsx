import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../Header';
import styles from '../Layout.module.scss';
import useLayout from '../model/useLayout';

const Layout = () => {
  useLayout();
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
