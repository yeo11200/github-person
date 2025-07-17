import { useNavigate } from 'react-router-dom';
import { useAuth, type User } from '../../contexts/AuthContext';
import { useRepository } from '../../contexts/RepositoryContext';
import styles from './Dashboard.module.scss';
import { useMyAgent } from '../../store/useMyAgent';
import dayjs from 'dayjs';
import MonthlyCommitChart from '../../components/MonthlyCommitChart/MonthlyCommitChart';
import { selectLanguage, useCommitStats } from '../../store/useCommitStats';
import { useState, useRef } from 'react';
import fetchApi from '../../utils/fetch-api';
import type { APIResponse, RepositoryMyUploadImage } from '../../types/apis';
import Modal from '../../components/Modal/Modal';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const { repoCount } = useRepository();
  const navigate = useNavigate();
  const myData = useMyAgent(state => state.myData);
  const language = useCommitStats(selectLanguage);

  // 프로필 이미지 업로드 관련 상태
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달 상태 관리
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string) => {
    setModal({
      isOpen: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  // 임시 사용자 통계 데이터
  const userStats = {
    totalRepos: repoCount,
    summarizedRepos: myData.removeDuplicatesSummary,
    totalSummaries: myData.count,
    thisMonthSummaries: myData.monthCount,
    favoriteLanguage: language,
    joinDate: dayjs(myData.create_at).format('YYYY-MM-DD'),
  };

  const recentActivity = myData.repositorySummary;

  // 프로필 이미지 업로드 함수
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadProfileImage(files[0]);
    }
  };

  const uploadProfileImage = async (file: File) => {
    // 이미지 파일 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      showAlert(
        '업로드 실패',
        '이미지 파일만 업로드 가능합니다.\n(JPG, PNG, GIF, WebP, 최대 5MB)'
      );
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await fetchApi<APIResponse<RepositoryMyUploadImage>>(
        '/github/my/profile-image',
        {
          method: 'POST',
          body: formData,
          includeAuth: true,
        }
      );

      if (result.status === 'success') {
        console.log(
          `프로필 이미지 업로드 완료: ${result.data.user.profile_image_url}`
        );
        showAlert(
          '업로드 완료',
          '프로필 이미지가 성공적으로 업데이트되었습니다!'
        );

        const updateUserInfo = {
          ...user,
          avatar_url: result.data.user.profile_image_url,
        } as User;

        localStorage.setItem('github_user', JSON.stringify(updateUserInfo));
        setUser(updateUserInfo);
      } else {
        throw new Error(result.message || '프로필 이미지 업로드 실패');
      }
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
      showAlert('업로드 실패', '프로필 이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화 (성공/실패 관계없이)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteProfileImage = async () => {
    showConfirm(
      '프로필 이미지 삭제',
      '프로필 이미지를 삭제하시겠습니까?',
      async () => {
        setIsDeleting(true);

        try {
          const result = await fetchApi<APIResponse<RepositoryMyUploadImage>>(
            '/github/my/profile-image',
            {
              method: 'DELETE',
              includeAuth: true,
            }
          );

          if (result.status === 'success') {
            showAlert('삭제 완료', '프로필 이미지가 삭제되었습니다.');
            const updateUserInfo = {
              ...user,
              avatar_url: result.data.user?.avatar_url || '',
            } as User;

            localStorage.setItem('github_user', JSON.stringify(updateUserInfo));
            setUser(updateUserInfo);
          } else {
            throw new Error(result.message || '프로필 이미지 삭제 실패');
          }
        } catch (error) {
          console.error('프로필 이미지 삭제 실패:', error);
          showAlert('삭제 실패', '프로필 이미지 삭제 중 오류가 발생했습니다.');
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  const handleGoToRepoSummary = (owner: string, repoId: string) => {
    navigate(`/repositories/${owner}/${repoId}/summary`);
  };

  const getActivityIcon = () => {
    return '📋';

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
                src={user?.avatar_url || '/default-avatar.png'}
                alt={user?.name || '사용자'}
                className={styles.avatarImg}
              />
            </div>
            <div className={styles.userDetails}>
              <h1 className={styles.userName}>{user?.name || '사용자'}님</h1>
              <p className={styles.userEmail}>
                {user?.username || '이메일 없음'}
              </p>
              <p className={styles.joinDate}>{userStats.joinDate} 가입</p>

              {/* 프로필 이미지 관리 버튼들 */}
              <div className={styles.profileActions}>
                <button
                  className={styles.profileActionBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isDeleting}
                  title="프로필 이미지 변경"
                >
                  {isUploading ? '업로드중' : '이미지 변경'}
                </button>

                {user?.avatar_url && (
                  <button
                    className={`${styles.profileActionBtn} ${styles.deleteBtn}`}
                    onClick={deleteProfileImage}
                    disabled={isUploading || isDeleting}
                    title="프로필 이미지 삭제"
                  >
                    {isDeleting ? '삭제중' : '이미지 삭제'}
                  </button>
                )}

                {/* 숨겨진 파일 입력 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
              </div>
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
                    {dayjs(activity.updated_at).format('YYYY-MM-DD HH:mm')}
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
              onClick={() => navigate('/repositories')}
            >
              <span className={styles.quickActionBtnIcon}>➕</span>
              <span className={styles.quickActionBtnText}>새 요약 만들기</span>
            </button>
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

      {/* 커스텀 모달 */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
};

export default Dashboard;
