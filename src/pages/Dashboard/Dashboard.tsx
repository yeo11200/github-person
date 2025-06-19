import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useRepository } from "../../contexts/RepositoryContext";
import styles from "./Dashboard.module.scss";
import { useMyAgent } from "../../store/useMyAgent";
import dayjs from "dayjs";
import MonthlyCommitChart from "../../components/MonthlyCommitChart/MonthlyCommitChart";
import { selectLanguage, useCommitStats } from "../../store/useCommitStats";

const Dashboard = () => {
  const { user } = useAuth();
  const { repoCount } = useRepository();
  const navigate = useNavigate();
  const myData = useMyAgent((state) => state.myData);
  const language = useCommitStats(selectLanguage);

  // 임시 사용자 통계 데이터
  const userStats = {
    totalRepos: repoCount,
    summarizedRepos: myData.removeDuplicatesSummary,
    totalSummaries: myData.count,
    thisMonthSummaries: myData.monthCount,
    favoriteLanguage: language,
    joinDate: dayjs(myData.create_at).format("YYYY-MM-DD"),
  };

  const recentActivity = myData.repositorySummary;

  const handleGoToRepoSummary = (owner: string, repoId: string) => {
    navigate(`/repositories/${owner}/${repoId}/summary`);
  };

  const getActivityIcon = () => {
    return "📋";

    // switch (type) {
    //   case "summary_created":
    //     return "📝";
    //   case "repo_connected":
    //     return "🔗";
    //   case "summary_downloaded":
    //     return "💾";
    //   default:
    //     return "📋";
    // }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        {/* 사용자 프로필 헤더 - 간소화 */}
        <header className={styles.profileHeader}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <img
                src={user?.avatar_url || "/default-avatar.png"}
                alt={user?.name || "사용자"}
                className={styles.avatarImg}
              />
            </div>
            <div className={styles.userDetails}>
              <h1 className={styles.userName}>{user?.name || "사용자"}님</h1>
              <p className={styles.userEmail}>
                {user?.username || "이메일 없음"}
              </p>
              <p className={styles.joinDate}>{userStats.joinDate} 가입</p>
            </div>
          </div>

          {/* 헤더에 작은 차트 추가 */}
          <div className={styles.headerChart}>
            <MonthlyCommitChart isCompact={true} />
          </div>
        </header>

        {/* 통계 섹션 */}
        <section className={styles.stats}>
          <h2 className={styles.sectionTitle}>통계 현황</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>📁</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>
                  {userStats.totalRepos}
                </h3>
                <p className={styles.statCardLabel}>연결된 레포지토리</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>✅</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>
                  {userStats.summarizedRepos}
                </h3>
                <p className={styles.statCardLabel}>요약된 레포지토리</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>📊</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>
                  {userStats.totalSummaries}
                </h3>
                <p className={styles.statCardLabel}>총 요약 개수</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statCardIcon}>🗓️</div>
              <div className={styles.statCardContent}>
                <h3 className={styles.statCardNumber}>
                  {userStats.thisMonthSummaries}
                </h3>
                <p className={styles.statCardLabel}>이번 달 요약</p>
              </div>
            </div>

            {userStats?.favoriteLanguage && (
              <div className={styles.statCard}>
                <div className={styles.statCardIcon}>💻</div>
                <div className={styles.statCardContent}>
                  <h3 className={styles.statCardNumber}>
                    {userStats.favoriteLanguage}
                  </h3>
                  <p className={styles.statCardLabel}>주요 언어</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 최근 활동 섹션 */}
        <section className={styles.recentActivity}>
          <h2 className={styles.sectionTitle}>최근 요약 활동</h2>
          <div className={styles.activityList}>
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className={styles.activityItem}
                onClick={() =>
                  handleGoToRepoSummary(activity.owner, activity.name)
                }
              >
                <div className={styles.activityIcon}>{getActivityIcon()}</div>
                <div className={styles.activityContent}>
                  <h3 className={styles.activityRepo}>{activity.name}</h3>
                  <p className={styles.activityDescription}>
                    {activity.description || activity.language}
                  </p>
                  <span className={styles.activityDate}>
                    {dayjs(activity.updated_at).format("YYYY-MM-DD HH:mm")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 빠른 작업 섹션 */}
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
            </button>

            <button className={styles.quickActionBtn}>
              <span className={styles.quickActionBtnIcon}>📊</span>
              <span className={styles.quickActionBtnText}>통계 보기</span>
            </button> */}
          </div>
        </section>

        {/* 설정 섹션 */}
        {/* <section className={styles.preferences}>
          <h2 className={styles.sectionTitle}>설정</h2>
          <div className={styles.preferencesForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>기본 요약 형식</label>
              <select className={styles.formSelect}>
                <option value="markdown">Markdown</option>
                <option value="notion">Notion</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>기본 요약 타입</label>
              <select className={styles.formSelect}>
                <option value="resume">이력서용</option>
                <option value="portfolio">포트폴리오용</option>
                <option value="retrospective">회고용</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  defaultChecked
                />
                이메일 알림 받기
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  defaultChecked
                />
                새로운 기능 알림 받기
              </label>
            </div>

            <button className={styles.saveBtn}>설정 저장</button>
          </div>
        </section> */}
      </div>
    </div>
  );
};

export default Dashboard;
