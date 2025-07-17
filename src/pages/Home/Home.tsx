import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Home.module.scss';

const Home = () => {
  const { isAuthenticated, loginWithGitHub } = useAuth();

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <h1 className={styles.heroTitle}>
            GitHub 레포지토리를
            <br />
            <span className={styles.heroTitleHighlight}>AI로 요약하세요</span>
          </h1>
          <p className={styles.heroDescription}>
            프로젝트 소개, 기술 스택, 리팩토링 내역을 자동으로 분석하여
            <br />
            이력서와 포트폴리오에 바로 사용할 수 있는 요약본을 만들어드립니다.
          </p>

          {isAuthenticated ? (
            <Link to="/repositories" className={styles.heroCtaBtn}>
              레포지토리 선택하기
            </Link>
          ) : (
            <button className={styles.heroCtaBtn} onClick={loginWithGitHub}>
              GitHub으로 시작하기
            </button>
          )}
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresContainer}>
          <h2 className={styles.featuresTitle}>주요 기능</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>🔍</div>
              <h3 className={styles.featureCardTitle}>자동 분석</h3>
              <p className={styles.featureCardDescription}>
                README, 커밋 히스토리, 코드 구조를 자동으로 분석합니다.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>🤖</div>
              <h3 className={styles.featureCardTitle}>AI 요약</h3>
              <p className={styles.featureCardDescription}>
                GPT를 활용해 프로젝트의 핵심 내용을 요약합니다.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>📝</div>
              <h3 className={styles.featureCardTitle}>다양한 형식</h3>
              <p className={styles.featureCardDescription}>
                이력서, 포트폴리오, 회고록 등 목적에 맞는 형식으로 제공합니다.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>💾</div>
              <h3 className={styles.featureCardTitle}>간편한 내보내기</h3>
              <p className={styles.featureCardDescription}>
                Markdown, Notion 형식으로 바로 내보낼 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.workflow}>
        <div className={styles.workflowContainer}>
          <h2 className={styles.workflowTitle}>사용 방법</h2>
          <div className={styles.workflowSteps}>
            <div className={styles.workflowStep}>
              <div className={styles.workflowStepNumber}>1</div>
              <h3 className={styles.workflowStepTitle}>GitHub 로그인</h3>
              <p className={styles.workflowStepDescription}>
                GitHub 계정으로 간편하게 로그인하세요.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.workflowStepNumber}>2</div>
              <h3 className={styles.workflowStepTitle}>레포지토리 선택</h3>
              <p className={styles.workflowStepDescription}>
                요약하고 싶은 레포지토리를 선택하세요.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.workflowStepNumber}>3</div>
              <h3 className={styles.workflowStepTitle}>요약 주제 선택</h3>
              <p className={styles.workflowStepDescription}>
                이력서용, 회고용 등 원하는 요약 형식을 선택하세요.
              </p>
            </div>

            <div className={styles.workflowStep}>
              <div className={styles.workflowStepNumber}>4</div>
              <h3 className={styles.workflowStepTitle}>
                결과 확인 및 내보내기
              </h3>
              <p className={styles.workflowStepDescription}>
                AI가 생성한 요약을 확인하고 원하는 형식으로 내보내세요.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
