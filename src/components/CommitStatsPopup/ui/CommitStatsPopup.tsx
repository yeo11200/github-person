import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import useCommitStatsPopup from '../model/useCommitStatsPopup';
import styles from '../CommitStatsPopup.module.scss';

interface CommitStatsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    total: number;
    average: number;
    max: number;
    thisMonth: number;
  };
  chartData: ChartData<'bar'>;
  chartOptions: ChartOptions<'bar'>;
}

const CommitStatsPopup: React.FC<CommitStatsPopupProps> = ({
  isOpen,
  onClose,
  stats,
  chartData,
  chartOptions,
}) => {
  useCommitStatsPopup({ isOpen });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>월별 커밋 통계</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>총 커밋</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>월평균</span>
            <span className={styles.statValue}>{stats.average}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>최고 기록</span>
            <span className={styles.statValue}>{stats.max}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>이번 달</span>
            <span className={styles.statValue}>{stats.thisMonth}</span>
          </div>
        </div>

        <div className={styles.chartContainer}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default CommitStatsPopup;
