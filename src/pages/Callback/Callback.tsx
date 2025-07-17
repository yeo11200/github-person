import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Callback.module.scss';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleGitHubCallback } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const processedRef = useRef(false); // 처리 완료 여부를 추적

  useEffect(() => {
    // 이미 처리되었다면 실행하지 않음
    if (processedRef.current) {
      return;
    }

    const processCallback = async () => {
      try {
        processedRef.current = true; // 처리 시작 표시

        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // OAuth 에러 처리
        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || `OAuth Error: ${error}`);
          return;
        }

        // 인증 코드가 없는 경우
        if (!code) {
          setStatus('error');
          setErrorMessage('인증 코드를 받지 못했습니다.');
          return;
        }

        // GitHub 콜백 처리
        await handleGitHubCallback(code);
        setStatus('success');

        // 성공 시 대시보드로 리다이렉트 (2초 후)
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '로그인 처리 중 오류가 발생했습니다.'
        );
      }
    };

    processCallback();
  }, []); // 의존성 배열을 비워서 한 번만 실행

  const handleRetry = () => {
    navigate('/', { replace: true });
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className={styles.callback__content}>
            <div className={styles.callback__spinner}>
              <div className={styles.spinner}></div>
            </div>
            <h2 className={styles.callback__title}>로그인 처리 중...</h2>
            <p className={styles.callback__description}>
              GitHub에서 인증 정보를 확인하고 있습니다.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className={styles.callback__content}>
            <div className={styles.callback__icon}>
              <span className={styles.callback__success}>✅</span>
            </div>
            <h2 className={styles.callback__title}>로그인 성공!</h2>
            <p className={styles.callback__description}>
              곧 대시보드로 이동합니다...
            </p>
          </div>
        );

      case 'error':
        return (
          <div className={styles.callback__content}>
            <div className={styles.callback__icon}>
              <span className={styles.callback__error}>❌</span>
            </div>
            <h2 className={styles.callback__title}>로그인 실패</h2>
            <p className={styles.callback__description}>{errorMessage}</p>
            <div className={styles.callback__actions}>
              <button onClick={handleRetry} className={styles.callback__button}>
                다시 시도
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.callback}>
      <div className={styles.callback__container}>{renderContent()}</div>
    </div>
  );
};

export default Callback;
