---
## 📄 파일: `src/components/CommitStatsPopup/CommitStatsPopup.test.tsx`
```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import CommitStatsPopup from './ui/CommitStatsPopup';
import type { CommitStatsPopupProps } from './ui/CommitStatsPopup';
import type { ChartData, ChartOptions } from 'chart.js';

// react-chartjs-2 모의 처리
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { 'data-testid': string }) => (
    <div data-testid={props['data-testid'] || 'mock-bar-chart'}>
      {/* 실제 차트 대신 간단한 div를 렌더링합니다. */}
    </div>
  ),
}));

// useCommitStatsPopup 훅의 내부 구현(body 스크롤 제어)을 테스트하기 위한 헬퍼
const getBodyScrollStyle = () => document.body.style.overflow;

// 테스트용 Mock 데이터 팩토리
const createMockProps = (
  overrides: Partial<CommitStatsPopupProps> = {}
): CommitStatsPopupProps => ({
  isOpen: true,
  onClose: vi.fn(),
  stats: {
    total: 1500,
    average: 125,
    max: 300,
    thisMonth: 80,
  },
  chartData: {
    labels: ['2023-01', '2023-02', '2023-03'],
    datasets: [
      {
        label: '월별 커밋 수',
        data: [100, 200, 300],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  } as ChartData<'bar'>,
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
  } as ChartOptions<'bar'>,
  ...overrides,
});

describe('CommitStatsPopup', () => {
  let mockProps: CommitStatsPopupProps;

  beforeEach(() => {
    mockProps = createMockProps();
    // body 스타일 초기화
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('isOpen이 true일 때 기본 props로 정상 렌더링된다', () => {
      render(<CommitStatsPopup {...mockProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('월별 커밋 통계')).toBeInTheDocument();
      expect(screen.getByText('총 커밋')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('월평균')).toBeInTheDocument();
      expect(screen.getByText('125')).toBeInTheDocument();
      expect(screen.getByText('최고 기록')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('이번 달')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
    });

    it('isOpen이 false일 때는 아무것도 렌더링하지 않는다', () => {
      const { container } = render(
        <CommitStatsPopup {...mockProps} isOpen={false} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('props가 변경되면 UI가 올바르게 업데이트된다', () => {
      const { rerender } = render(<CommitStatsPopup {...mockProps} />);
      expect(screen.getByText('1500')).toBeInTheDocument();

      const updatedProps = createMockProps({
        stats: { total: 2000, average: 150, max: 400, thisMonth: 90 },
      });
      rerender(<CommitStatsPopup {...updatedProps} />);

      expect(screen.getByText('2000')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('400')).toBeInTheDocument();
      expect(screen.getByText('90')).toBeInTheDocument();
    });
  });

  describe('사용자 상호작용', () => {
    it('닫기 버튼을 클릭하면 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<CommitStatsPopup {...mockProps} />);

      const closeButton = screen.getByRole('button', { name: '✕' });
      await user.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('오버레이(배경)를 클릭하면 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<CommitStatsPopup {...mockProps} />);

      const overlay = screen.getByRole('dialog').parentElement;
      expect(overlay).not.toBeNull();
      if (overlay) {
        await user.click(overlay);
        expect(mockProps.onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('팝업 콘텐츠 내부를 클릭해도 onClose가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      render(<CommitStatsPopup {...mockProps} />);

      const popupContent = screen.getByRole('dialog');
      await user.click(popupContent);

      expect(mockProps.onClose).not.toHaveBeenCalled();
    });

    it('ESC 키를 누르면 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<CommitStatsPopup {...mockProps} />);

      await user.keyboard('{Escape}');

      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('접근성', () => {
    it('팝업에 dialog 역할과 모달 관련 ARIA 속성이 있다', () => {
      render(<CommitStatsPopup {...mockProps} />);
      const dialog = screen.getByRole('dialog');

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'popup-header');
      expect(screen.getByText('월별 커밋 통계')).toHaveAttribute(
        'id',
        'popup-header'
      );
    });

    it('팝업이 열리면 닫기 버튼에 포커스가 간다', async () => {
      render(<CommitStatsPopup {...mockProps} />);
      
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: '✕' });
        expect(document.activeElement).toBe(closeButton);
      });
    });

    it('포커스가 팝업 내부에 머무른다 (Focus Trap)', async () => {
      const user = userEvent.setup();
      render(<CommitStatsPopup {...mockProps} />);

      const closeButton = screen.getByRole('button', { name: '✕' });
      const chart = screen.getByTestId('mock-bar-chart');

      // Tab 키로 포커스 이동
      await user.tab();
      // 포커스가 팝업 내 다른 요소(차트)로 이동해야 함
      // 실제로는 차트 라이브러리의 focusable 요소로 가겠지만, 여기서는 mock이므로 document.body로 갈 수 있음
      // 중요한 것은 팝업 밖으로 나가지 않는 것
      expect(document.activeElement).not.toBe(document.body);

      // Shift+Tab으로 포커스 역이동
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(closeButton);
    });
  });

  describe('커스텀 훅 (useCommitStatsPopup) 연동', () => {
    it('팝업이 열리면 body 스크롤이 비활성화된다', () => {
      render(<CommitStatsPopup {...mockProps} isOpen={true} />);
      expect(getBodyScrollStyle()).toBe('hidden');
    });

    it('팝업이 닫히면 body 스크롤이 원상 복구된다', () => {
      const { rerender } = render(
        <CommitStatsPopup {...mockProps} isOpen={true} />
      );
      expect(getBodyScrollStyle()).toBe('hidden');

      rerender(<CommitStatsPopup {...mockProps} isOpen={false} />);
      expect(getBodyScrollStyle()).not.toBe('hidden');
    });

    it('컴포넌트가 언마운트되면 body 스크롤이 원상 복구된다', () => {
      const { unmount } = render(
        <CommitStatsPopup {...mockProps} isOpen={true} />
      );
      expect(getBodyScrollStyle()).toBe('hidden');

      unmount();
      expect(getBodyScrollStyle()).not.toBe('hidden');
    });
  });
});
```
