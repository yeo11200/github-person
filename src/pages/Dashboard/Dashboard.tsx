import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useRepository } from "../../contexts/RepositoryContext";
import styles from "./Dashboard.module.scss";

const Dashboard = () => {
  const { user } = useAuth();
  const { repoCount } = useRepository();
  const navigate = useNavigate();
  // 임시 데이터 (실제로는 API에서 가져올 데이터)
  // const recentSummaries = [
  //   {
  //     id: 1,
  //     repoName: "my-awesome-project",
  //     summaryType: "이력서용",
  //     createdAt: "2024-01-15",
  //     status: "완료",
  //   },
  //   {
  //     id: 2,
  //     repoName: "react-todo-app",
  //     summaryType: "회고용",
  //     createdAt: "2024-01-14",
  //     status: "진행중",
  //   },
  //   {
  //     id: 3,
  //     repoName: "node-api-server",
  //     summaryType: "포트폴리오용",
  //     createdAt: "2024-01-13",
  //     status: "완료",
  //   },
  // ];

  const stats = {
    totalRepos: 12,
    totalSummaries: 8,
    thisMonthSummaries: 3,
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            안녕하세요, {user?.name || "사용자"}님! 👋
          </h1>
          <p className={styles.subtitle}>
            오늘도 멋진 프로젝트를 요약해보세요.
          </p>
        </header>

        <section className={styles.stats}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>📁</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>{repoCount}</h3>
                <p className={styles.statCardLabel}>연결된 레포지토리</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>📊</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>
                  {stats.totalSummaries}
                </h3>
                <p className={styles.statCardLabel}>총 요약 개수</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>🗓️</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>
                  {stats.thisMonthSummaries}
                </h3>
                <p className={styles.statCardLabel}>이번 달 요약</p>
              </div>
            </div>
          </div>
        </section>

        {/* <section className={styles.recent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>최근 요약</h2>
            <button className={styles.viewAllBtn}>전체 보기</button>
          </div>

          <div className={styles.summaryList}>
            {recentSummaries.map((summary) => (
              <div key={summary.id} className={styles.summaryItem}>
                <div className={styles.summaryItemInfo}>
                  <h3 className={styles.summaryItemRepoName}>
                    {summary.repoName}
                  </h3>
                  <div className={styles.summaryItemMeta}>
                    <span className={styles.summaryItemType}>
                      {summary.summaryType}
                    </span>
                    <span className={styles.summaryItemDate}>
                      {summary.createdAt}
                    </span>
                  </div>
                </div>

                <div className={styles.summaryItemActions}>
                  <span
                    className={`${styles.summaryItemStatus} ${
                      summary.status === "완료"
                        ? styles.summaryItemStatusCompleted
                        : styles.summaryItemStatusPending
                    }`}
                  >
                    {summary.status}
                  </span>
                  <button className={styles.summaryItemViewBtn}>보기</button>
                </div>
              </div>
            ))}
          </div>
        </section> */}

        <section className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>빠른 작업</h2>
          <div className={styles.quickActionsGrid}>
            <button
              className={styles.quickActionBtn}
              onClick={() => navigate("/repositories")}
            >
              <span className={styles.quickActionBtnIcon}>➕</span>
              <span className={styles.quickActionBtnText}>새 요약 만들기</span>
            </button>

            {/* <button className={styles.quickActionBtn}>
              <span className={styles.quickActionBtnIcon}>📁</span>
              <span className={styles.quickActionBtnText}>레포지토리 관리</span>
            </button>

            <button className={styles.quickActionBtn}>
              <span className={styles.quickActionBtnIcon}>⚙️</span>
              <span className={styles.quickActionBtnText}>설정</span>
            </button> */}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
