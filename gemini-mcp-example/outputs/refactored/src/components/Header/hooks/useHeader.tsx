import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
/**
 * Header 컴포넌트의 모든 비즈니스 로직을 관리하는 커스텀 훅
 */
export const useHeader = () => {
  const { user, isAuthenticated, logout, loginWithGitHub } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 모바일 메뉴 토글 핸들러
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);
  // 모바일 메뉴 닫기 핸들러
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);
  // 로그인 핸들러
  const handleLogin = useCallback(() => {
    loginWithGitHub();
    closeMobileMenu(); // 로그인 시도 후 메뉴 닫기
  }, [loginWithGitHub, closeMobileMenu]);
  // 로그아웃 핸들러
  const handleLogout = useCallback(() => {
    logout();
    closeMobileMenu(); // 로그아웃 후 메뉴 닫기
  }, [logout, closeMobileMenu]);
  // 모바일 메뉴가 열렸을 때 body 스크롤을 방지하는 부수 효과
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    // 컴포넌트 언마운트 시 스크롤 스타일 초기화
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);
  return {
    user,
    isAuthenticated,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
    handleLogin,
    handleLogout,
  };
};
