import React from 'react';
import styles from '../Header.module.scss';
interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
}
/**
 * 모바일 햄버거 메뉴 버튼 컴포넌트
 * @param {HamburgerButtonProps} props - 메뉴 열림 상태와 클릭 핸들러
 */
const HamburgerButton: React.FC<HamburgerButtonProps> = ({ isOpen, onClick }) => (
  <button
    className={styles.mobileMenuBtn}
    onClick={onClick}
    aria-label="메뉴 열기/닫기"
    aria-expanded={isOpen}
  >
    <span className={`${styles.hamburger} ${isOpen ? styles.hamburgerOpen : ''}`}>
      <span />
      <span />
      <span />
    </span>
  </button>
);
export default React.memo(HamburgerButton);
