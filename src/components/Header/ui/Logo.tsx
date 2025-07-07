import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../Header.module.scss';
interface LogoProps {
  onClick: () => void;
}
/**
 * 로고 컴포넌트
 * @param {LogoProps} props - onClick 핸들러
 */
const Logo: React.FC<LogoProps> = ({ onClick }) => (
  <Link to="/" className={styles.logo} onClick={onClick}>
    <span className={styles.logoIcon}>📊</span>
    <span className={styles.logoText}>RepoSummary</span>
  </Link>
);
export default React.memo(Logo);
