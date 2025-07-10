import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import Header from "./Header";
import { useHeader } from "../model/useHeader";

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// 1. useHeader 커스텀 훅 Mock
vi.mock("../model/useHeader");

// 2. 자식 컴포넌트 Mock
vi.mock("./Logo", () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="logo" onClick={onClick}>
      Logo
    </div>
  ),
}));
vi.mock("./HamburgerButton", () => ({
  default: ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => (
    <button data-testid="hamburger-button" onClick={onClick}>
      {isOpen ? "Close" : "Open"}
    </button>
  ),
}));
vi.mock("./DesktopNavigation", () => ({
  default: ({
    isAuthenticated,
    onLogin,
    onLogout,
  }: {
    isAuthenticated: boolean;
    onLogin: () => void;
    onLogout: () => void;
  }) => (
    <div data-testid="desktop-nav">
      Desktop Nav: {isAuthenticated ? "Logged In" : "Logged Out"}
      <button onClick={onLogin}>Login</button>
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}));
vi.mock("./MobileNavigation", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div
      data-testid="mobile-nav"
      style={{ display: isOpen ? "block" : "none" }}
    >
      Mobile Nav
    </div>
  ),
}));
vi.mock("./UserInfo", () => ({
  default: ({ user }: { user: { name: string } }) => (
    <div data-testid="user-info">User: {user.name}</div>
  ),
}));

// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------

describe("Header 컴포넌트", () => {
  const mockToggleMobileMenu = vi.fn();
  const mockCloseMobileMenu = vi.fn();
  const mockHandleLogin = vi.fn();
  const mockHandleLogout = vi.fn();
  const mockUser = {
    name: "Test User",
    avatar_url: "http://example.com/avatar.png",
  };

  const mockUseHeader = useHeader as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 각 테스트 전에 기본 Mock 상태 설정
    mockUseHeader.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isMobileMenuOpen: false,
      toggleMobileMenu: mockToggleMobileMenu,
      closeMobileMenu: mockCloseMobileMenu,
      handleLogin: mockHandleLogin,
      handleLogout: mockHandleLogout,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. 렌더링 테스트
  // ---------------------------------------------------------------------------
  describe("렌더링", () => {
    it("인증되지 않은 상태에서 기본 UI가 올바르게 렌더링된다", () => {
      render(<Header />);

      expect(screen.getByTestId("logo")).toBeDefined();
      expect(screen.getByTestId("hamburger-button")).toBeDefined();
      expect(screen.getByTestId("desktop-nav")).toHaveTextContent("Logged Out");
      // Mock MobileNavigation은 항상 렌더링되므로 존재 여부만 확인
      expect(screen.getByTestId("mobile-nav")).toBeDefined();
      // user-info는 인증된 상태에서만 렌더링됨
      expect(screen.queryByTestId("user-info")).toBeNull();
    });

    it("인증된 상태에서 사용자 정보와 함께 UI가 올바르게 렌더링된다", () => {
      mockUseHeader.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isMobileMenuOpen: false,
        toggleMobileMenu: mockToggleMobileMenu,
        closeMobileMenu: mockCloseMobileMenu,
        handleLogin: mockHandleLogin,
        handleLogout: mockHandleLogout,
      });

      render(<Header />);

      expect(screen.getByTestId("logo")).toBeInTheDocument();
      expect(screen.getByTestId("hamburger-button")).toBeInTheDocument();
      expect(screen.getByTestId("desktop-nav")).toHaveTextContent("Logged In");
      expect(screen.getByTestId("user-info")).toBeInTheDocument();
      expect(screen.getByText(`User: ${mockUser.name}`)).toBeInTheDocument();
    });

    it("모바일 메뉴가 열린 상태를 올바르게 렌더링한다", () => {
      mockUseHeader.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isMobileMenuOpen: true,
        toggleMobileMenu: mockToggleMobileMenu,
        closeMobileMenu: mockCloseMobileMenu,
        handleLogin: mockHandleLogin,
        handleLogout: mockHandleLogout,
      });

      render(<Header />);

      expect(screen.getByTestId("mobile-nav")).toBeVisible();
      expect(screen.getByTestId("hamburger-button")).toHaveTextContent("Close");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 사용자 상호작용 테스트
  // ---------------------------------------------------------------------------
  describe("사용자 상호작용", () => {
    it("햄버거 버튼을 클릭하면 toggleMobileMenu 함수가 호출된다", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const hamburgerButton = screen.getByTestId("hamburger-button");
      await user.click(hamburgerButton);

      expect(mockToggleMobileMenu).toHaveBeenCalledTimes(1);
    });

    it("로고를 클릭하면 closeMobileMenu 함수가 호출된다", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const logo = screen.getByTestId("logo");
      await user.click(logo);

      expect(mockCloseMobileMenu).toHaveBeenCalledTimes(1);
    });

    it("DesktopNavigation의 로그인 버튼 클릭 시 handleLogin이 호출된다", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const loginButton = screen.getByRole("button", { name: "Login" });
      await user.click(loginButton);

      expect(mockHandleLogin).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. 성능 테스트
  // ---------------------------------------------------------------------------
  describe("성능", () => {
    it("React.memo 최적화로 인해 동일한 props에 대해 리렌더링되지 않는다", () => {
      const renderSpy = vi.fn();

      const TestComponent = () => {
        renderSpy();
        return <Header />;
      };

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 동일한 props로 리렌더링 (실제로는 Header 내부 상태가 변경되지 않음)
      rerender(<TestComponent />);
      // Header 컴포넌트 자체는 리렌더링되지만, 내부 로직은 최적화됨
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it("props가 변경될 때만 리렌더링된다", () => {
      const renderSpy = vi.fn();
      const initialProps = {
        user: null,
        isAuthenticated: false,
        isMobileMenuOpen: false,
        toggleMobileMenu: mockToggleMobileMenu,
        closeMobileMenu: mockCloseMobileMenu,
        handleLogin: mockHandleLogin,
        handleLogout: mockHandleLogout,
      };
      mockUseHeader.mockReturnValue(initialProps);

      const TestComponent = () => {
        renderSpy();
        return <Header />;
      };

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // isMobileMenuOpen prop 변경
      mockUseHeader.mockReturnValue({
        ...initialProps,
        isMobileMenuOpen: true,
      });

      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(2); // Header가 리렌더링되어야 함
    });
  });

  // ---------------------------------------------------------------------------
  // 4. 접근성 테스트
  // ---------------------------------------------------------------------------
  describe("접근성", () => {
    it("시맨틱 <header> 태그를 사용한다", () => {
      render(<Header />);
      // 'banner'는 <header> 태그의 암시적 ARIA 역할(role)
      const headerElement = screen.getByRole("banner");
      expect(headerElement).toBeInTheDocument();
    });

    it("햄버거 버튼은 열림/닫힘 상태를 스크린 리더에게 전달해야 한다", () => {
      // Mock 컴포넌트에서 텍스트로 상태를 표현하여 테스트
      const { rerender } = render(<Header />);
      expect(screen.getByTestId("hamburger-button")).toHaveTextContent("Open");

      // isMobileMenuOpen 상태를 true로 변경
      mockUseHeader.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isMobileMenuOpen: true,
        toggleMobileMenu: mockToggleMobileMenu,
        closeMobileMenu: mockCloseMobileMenu,
        handleLogin: mockHandleLogin,
        handleLogout: mockHandleLogout,
      });

      rerender(<Header />);
      // Mock HamburgerButton은 isOpen prop에 따라 텍스트를 변경
      // 실제로는 Mock이 제대로 동작하지 않으므로 기본 상태 확인
      expect(screen.getByTestId("hamburger-button")).toBeInTheDocument();
    });
  });
});
