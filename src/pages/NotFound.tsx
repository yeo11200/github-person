import { Link } from 'react-router-dom';
import '../styles/NotFound.scss';

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="not-found__container">
        <div className="not-found__content">
          <div className="not-found__icon">
            <span className="not-found__emoji">🔍</span>
          </div>

          <h1 className="not-found__title">404</h1>
          <h2 className="not-found__subtitle">페이지를 찾을 수 없습니다</h2>

          <p className="not-found__description">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
            <br />
            URL을 다시 확인해 주세요.
          </p>

          <div className="not-found__actions">
            <Link to="/" className="not-found__btn not-found__btn--primary">
              홈으로 돌아가기
            </Link>

            <Link
              to="/dashboard"
              className="not-found__btn not-found__btn--secondary"
            >
              대시보드로 이동
            </Link>
          </div>

          <div className="not-found__suggestions">
            <h3 className="not-found__suggestions-title">
              다음 페이지들을 확인해보세요:
            </h3>
            <ul className="not-found__suggestions-list">
              <li>
                <Link to="/" className="not-found__link">
                  🏠 홈페이지
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="not-found__link">
                  📊 대시보드
                </Link>
              </li>
              <li>
                <Link to="/repositories" className="not-found__link">
                  📁 레포지토리 선택
                </Link>
              </li>
              <li>
                <Link to="/profile" className="not-found__link">
                  👤 프로필
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="not-found__illustration">
          <div className="not-found__search-box">
            <div className="not-found__search-icon">🔍</div>
            <div className="not-found__search-text">페이지를 찾는 중...</div>
          </div>

          <div className="not-found__floating-elements">
            <div className="floating-element floating-element--1">📄</div>
            <div className="floating-element floating-element--2">📁</div>
            <div className="floating-element floating-element--3">💻</div>
            <div className="floating-element floating-element--4">🔗</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
