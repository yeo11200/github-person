import { useAuth } from "../contexts/AuthContext";
import { useRepository } from "../contexts/RepositoryContext";
import "../styles/Profile.scss";

const Profile = () => {
  const { user } = useAuth();
  const { repoCount } = useRepository();

  console.log(user);
  // 임시 사용자 통계 데이터
  const userStats = {
    totalRepos: 15,
    summarizedRepos: 8,
    totalSummaries: 12,
    favoriteLanguage: "TypeScript",
    joinDate: "2024-01-01",
  };

  const recentActivity = [
    {
      id: 1,
      type: "summary_created",
      repoName: "awesome-react-app",
      date: "2024-01-15",
      description: "이력서용 요약 생성",
    },
    {
      id: 2,
      type: "repo_connected",
      repoName: "node-api-server",
      date: "2024-01-14",
      description: "새 레포지토리 연결",
    },
    {
      id: 3,
      type: "summary_downloaded",
      repoName: "python-data-analysis",
      date: "2024-01-13",
      description: "Markdown 형식으로 다운로드",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "summary_created":
        return "📝";
      case "repo_connected":
        return "🔗";
      case "summary_downloaded":
        return "💾";
      default:
        return "📋";
    }
  };

  return (
    <div className="profile">
      <div className="profile__container">
        <header className="profile__header">
          <div className="profile__user-info">
            <div className="profile__avatar">
              <img
                src={user?.avatar_url || "/default-avatar.png"}
                alt={user?.name || "사용자"}
                className="profile__avatar-img"
              />
            </div>
            <div className="profile__user-details">
              <h1 className="profile__name">{user?.name || "사용자"}</h1>
              <p className="profile__email">
                {user?.username || "이메일 없음"}
              </p>
              <p className="profile__join-date">{userStats.joinDate} 가입</p>
            </div>
          </div>

          <div className="profile__actions">
            <button className="profile__edit-btn">프로필 편집</button>
          </div>
        </header>

        <div className="profile__content">
          <section className="profile__stats">
            <h2 className="profile__section-title">통계</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card__icon">📁</div>
                <div className="stat-card__content">
                  <h3 className="stat-card__number">{repoCount}</h3>
                  <p className="stat-card__label">총 레포지토리</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">✅</div>
                <div className="stat-card__content">
                  <h3 className="stat-card__number">
                    {userStats.summarizedRepos}
                  </h3>
                  <p className="stat-card__label">요약된 레포지토리</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">📊</div>
                <div className="stat-card__content">
                  <h3 className="stat-card__number">
                    {userStats.totalSummaries}
                  </h3>
                  <p className="stat-card__label">총 요약 개수</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__icon">💻</div>
                <div className="stat-card__content">
                  <h3 className="stat-card__number">
                    {userStats.favoriteLanguage}
                  </h3>
                  <p className="stat-card__label">주요 언어</p>
                </div>
              </div>
            </div>
          </section>

          <section className="profile__activity">
            <h2 className="profile__section-title">최근 활동</h2>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-item__icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-item__content">
                    <h3 className="activity-item__repo">{activity.repoName}</h3>
                    <p className="activity-item__description">
                      {activity.description}
                    </p>
                    <span className="activity-item__date">{activity.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="profile__preferences">
            <h2 className="profile__section-title">설정</h2>
            <div className="preferences-form">
              <div className="form-group">
                <label className="form-group__label">기본 요약 형식</label>
                <select className="form-group__select">
                  <option value="markdown">Markdown</option>
                  <option value="notion">Notion</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-group__label">기본 요약 타입</label>
                <select className="form-group__select">
                  <option value="resume">이력서용</option>
                  <option value="portfolio">포트폴리오용</option>
                  <option value="retrospective">회고용</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-group__checkbox-label">
                  <input
                    type="checkbox"
                    className="form-group__checkbox"
                    defaultChecked
                  />
                  이메일 알림 받기
                </label>
              </div>

              <div className="form-group">
                <label className="form-group__checkbox-label">
                  <input
                    type="checkbox"
                    className="form-group__checkbox"
                    defaultChecked
                  />
                  새로운 기능 알림 받기
                </label>
              </div>

              <button className="preferences-form__save-btn">설정 저장</button>
            </div>
          </section>

          <section className="profile__danger-zone">
            <h2 className="profile__section-title">위험 구역</h2>
            <div className="danger-zone">
              <div className="danger-zone__item">
                <div className="danger-zone__info">
                  <h3 className="danger-zone__title">모든 요약 데이터 삭제</h3>
                  <p className="danger-zone__description">
                    생성된 모든 요약 데이터를 삭제합니다. 이 작업은 되돌릴 수
                    없습니다.
                  </p>
                </div>
                <button className="danger-zone__btn">데이터 삭제</button>
              </div>

              <div className="danger-zone__item">
                <div className="danger-zone__info">
                  <h3 className="danger-zone__title">계정 삭제</h3>
                  <p className="danger-zone__description">
                    계정과 모든 관련 데이터를 영구적으로 삭제합니다.
                  </p>
                </div>
                <button className="danger-zone__btn">계정 삭제</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
