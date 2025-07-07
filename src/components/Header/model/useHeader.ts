import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
/**
 * Header 컴포넌트의 비즈니스 로직과 상태를 관리하는 커스텀 훅
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
  // 로그아웃 핸들러
  const handleLogout = useCallback(() => {
    logout();
    closeMobileMenu();
  }, [logout, closeMobileMenu]);
  // 로그인 핸들러
  const handleLogin = useCallback(() => {
    loginWithGitHub();
    closeMobileMenu();
  }, [loginWithGitHub, closeMobileMenu]);
  // 모바일 메뉴가 열렸을 때 body 스크롤 방지
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    // 컴포넌트 언마운트 시 body 스크롤 원상 복구
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
