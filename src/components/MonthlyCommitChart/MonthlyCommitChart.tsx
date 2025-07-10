import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './MonthlyCommitChart.module.scss';
import CommitStatsPopup from '../CommitStatsPopup';
import {
  selectMonthlyData,
  selectStats,
  useCommitStats,
} from '../../store/useCommitStats';

// Chart.js 구성 요소 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyCommitChartProps {
  isCompact?: boolean; // 헤더용 작은 차트인지 구분
}

const MonthlyCommitChart: React.FC<MonthlyCommitChartProps> = ({
  isCompact = false,
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const fetctCommitStats = useCommitStats(state => state.fetctCommitStats);
  const commitStats = useCommitStats(state => state.commitStats);
  const monthlyData = useCommitStats(selectMonthlyData);
  const stats = useCommitStats(selectStats);

  // 라인 차트 데이터 (헤더용)
  const lineChartData = useMemo(() => {
    const recentData = monthlyData.slice(-6); // 최근 6개월만

    const labels = recentData.map(item => {
      const date = new Date(item.month + '-01');
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
      });
    });

    const commits = recentData.map(item => item.commits);

    return {
      labels,
      datasets: [
        {
          data: commits,
          borderColor: 'rgba(102, 126, 234, 1)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(102, 126, 234, 1)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [monthlyData]);

  // 바 차트 데이터 (팝업용)
  const barChartData = useMemo(() => {
    const recentData = monthlyData.slice(-12); // 최근 12개월

    const labels = recentData.map(item => {
      const date = new Date(item.month + '-01');
      return date.toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: 'short',
      });
    });

    const commits = recentData.map(item => item.commits);

    return {
      labels,
      datasets: [
        {
          label: '월별 커밋 수',
          data: commits,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [monthlyData]);

  // 라인 차트 옵션 (헤더용)
  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      elements: {
        point: { hoverRadius: 0 },
      },
      interaction: { intersect: false },
    }),
    []
  );

  // 바 차트 옵션 (팝업용)
  const barChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (context: TooltipItem<'bar'>[]) => `${context[0].label}`,
            label: (context: TooltipItem<'bar'>) =>
              `커밋 수: ${context.parsed.y}개`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: 'rgba(51, 51, 51, 0.8)',
            font: { size: 12, weight: 500 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(51, 51, 51, 0.8)',
            font: { size: 12 },
            stepSize: 20,
          },
        },
      },
      animation: { duration: 800, easing: 'easeInOutQuart' as const },
      interaction: { intersect: false, mode: 'index' as const },
    }),
    []
  );

  useEffect(() => {
    // 데이터가 없을 때만 API 호출
    if (!commitStats) {
      fetctCommitStats();
    }
  }, [commitStats, fetctCommitStats]); // 빈 의존성 배열로 마운트 시에만 실행

  // 헤더용 작은 차트
  if (isCompact) {
    return (
      <>
        <div
          className={styles.compactChart}
          onClick={() => setIsPopupOpen(true)}
          title="클릭하여 상세 통계 보기"
        >
          <div className={styles.compactChartContainer}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
          <div className={styles.compactStats}>
            <span className={styles.compactValue}>{stats.thisMonth}</span>
            <span className={styles.compactLabel}>이번 달</span>
          </div>
        </div>

        <CommitStatsPopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          stats={stats}
          chartData={barChartData}
          chartOptions={barChartOptions}
        />
      </>
    );
  }

  // 기존 풀사이즈 차트 (사용하지 않음)
  return null;
};

export default MonthlyCommitChart;
