import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import styles from './RepoSummary.module.scss';
import fetchApi from '../../utils/fetch-api';
import type {
  GitHubBranchResponse,
  GitHubRepository,
  SummaryData,
} from '../../types/apis';
import type { APIResponse } from '../../types/apis';
type SummaryType = 'resume' | 'retrospective' | 'portfolio' | 'documentation';

// 로딩 메시지 배열 (재미있는 요소)
const LOADING_MESSAGES = [
  { text: '코드를 분석하고 있어요... 🔍', duration: 3000 },
  { text: '커밋 히스토리를 읽고 있어요... 📚', duration: 4000 },
  { text: '기술 스택을 파악하고 있어요... 🛠️', duration: 3000 },
  { text: '프로젝트 구조를 이해하고 있어요... 🏗️', duration: 4000 },
  { text: '최고의 요약을 작성하고 있어요... ✨', duration: 3000 },
  { text: '마지막 검토 중이에요... 🎯', duration: 3000 },
];

const RepoSummary = () => {
  const { repoId, owner } = useParams<{ repoId: string; owner: string }>();
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SummaryType>('resume');
  const [summaryContent, setSummaryContent] = useState<SummaryData>();
  const [generatingType, setGeneratingType] = useState<SummaryType | null>(
    null
  );

  // 로딩 애니메이션 상태
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(30);

  // 상수를 컴포넌트 외부로 이동하여 안정적인 참조 생성
  const TABS_CONFIG = useMemo(() => {
    return [{ id: 'resume' as SummaryType, label: '이력서용', icon: '📄' }];
  }, []);

  // 로딩 애니메이션 효과
  useEffect(() => {
    if (generatingType) {
      setLoadingProgress(0);
      setCurrentMessageIndex(0);
      setLoadingStartTime(Date.now());
      setRemainingTime(30); // 30초로 초기화

      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev; // 95%에서 멈춤 (완료되면 100%로)
          return prev + Math.random() * 2 + 0.5; // 랜덤하게 증가
        });
      }, 300);

      // 메시지 변경 로직
      let messageTimeout: NodeJS.Timeout;
      let currentIndex = 0;

      const scheduleNextMessage = () => {
        if (currentIndex < LOADING_MESSAGES.length - 1) {
          messageTimeout = setTimeout(() => {
            currentIndex++;
            setCurrentMessageIndex(currentIndex);
            scheduleNextMessage();
          }, LOADING_MESSAGES[currentIndex].duration);
        }
      };

      scheduleNextMessage();

      return () => {
        clearInterval(progressInterval);
        if (messageTimeout) clearTimeout(messageTimeout);
      };
    } else {
      setLoadingProgress(0);
      setCurrentMessageIndex(0);
      setLoadingStartTime(null);
      setRemainingTime(30); // 초기화
    }
  }, [generatingType]);

  // 실시간 카운트다운 업데이트
  useEffect(() => {
    let timeInterval: NodeJS.Timeout;

    if (generatingType && loadingStartTime) {
      timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - loadingStartTime) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        setRemainingTime(remaining);
      }, 1000); // 1초마다 업데이트
    }

    return () => {
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [generatingType, loadingStartTime]);

  // fetchRepositoryAndBranches를 useCallback으로 메모이제이션
  const fetchRepositoryAndBranches = useCallback(async () => {
    if (!repoId || !owner) return;

    try {
      setLoading(true);

      // 브랜치 목록 가져오기
      setBranchesLoading(true);

      const [branchesResponse, repoResponse] = await Promise.all([
        fetchApi<GitHubBranchResponse>(
          `/github/repos/${owner}/${repoId}/branches`
        ),
        fetchApi<APIResponse<GitHubRepository>>(
          `/github/repos/${owner}/${repoId}`
        ),
      ]);

      const branchData = branchesResponse.data;
      const repoData = repoResponse.data;

      setBranches(branchData);
      setRepository(repoData);

      // 기본 브랜치 설정 (main, master 순으로 확인)
      const defaultBranch = branchData.find(
        (branch: string) => branch === 'main' || branch === 'master'
      );

      if (defaultBranch) {
        setSelectedBranch(defaultBranch);
      } else if (branchData.length > 0) {
        setSelectedBranch(branchData[0]);
      }
    } catch (error) {
      console.error('Failed to fetch repository or branches:', error);
    } finally {
      setLoading(false);
      setBranchesLoading(false);
    }
  }, [owner, repoId]);

  useEffect(() => {
    fetchRepositoryAndBranches();
  }, [fetchRepositoryAndBranches]);

  const summaryGetData = useCallback(async () => {
    if (!owner || !repoId || !selectedBranch) return;

    try {
      const summeryGetResponse = await fetchApi<APIResponse<SummaryData>>(
        `/github/repos/${owner}/${repoId}/summary?branch=${selectedBranch}`
      );
      setSummaryContent(summeryGetResponse.data);
    } catch (error) {
      console.error('Failed to fetch summary data:', error);
      setSummaryContent(undefined);
    }
  }, [owner, repoId, selectedBranch]);

  const generateSummary = useCallback(
    async (type: SummaryType) => {
      if (!repository || !selectedBranch) return;

      setGeneratingType(type);

      try {
        // 실제 AI 요약 API 호출
        const summaryResponse = await fetchApi<APIResponse<string>>(
          `/github/repos/${owner}/${repoId}/summary?branch=${selectedBranch}`,
          { method: 'POST' }
        );

        if (summaryResponse.status === 'success') {
          // 완료 시 프로그레스를 100%로 설정
          setLoadingProgress(100);
          await new Promise(resolve => setTimeout(resolve, 500)); // 완료 애니메이션을 위한 잠시 대기
          await summaryGetData();
        }

        setGeneratingType(null);
      } catch (error) {
        console.error('Failed to generate summary:', error);
        setGeneratingType(null);
      }
    },
    [repository, selectedBranch, owner, repoId, summaryGetData]
  );

  // 이력서용 요약 생성 함수를 useCallback으로 메모이제이션
  const generateResumeSummary = useCallback(
    (data: SummaryData, repo: GitHubRepository) => {
      const topLanguages = data.performance_metrics.top_languages
        .slice(0, 3)
        .map(
          (lang: { language: string; percentage: number }) =>
            `${lang.language} (${lang.percentage}%)`
        )
        .join(', ');

      return `# ${repo.name} - 이력서용 요약

## 📋 프로젝트 개요
${data.project_intro}

## 🛠 주요 기술 스택
- **언어**: ${topLanguages}
${
  data.tech_stack.backend.join(', ') &&
  `- **백엔드**: ${data.tech_stack.backend.join(', ')}`
}
${
  data.tech_stack.database.join(', ') &&
  `- **데이터베이스**: ${data.tech_stack.database.join(', ')}`
}
${
  data.tech_stack.testing.join(', ') &&
  `- **테스팅**: ${data.tech_stack.testing.join(', ')}`
}
${
  data.tech_stack.frontend.join(', ') &&
  `- **프론트앤드**: ${data.tech_stack.frontend.join(', ')}`
}
${
  data.tech_stack.other &&
  data.tech_stack.other.length > 0 &&
  `- **추가**:\n${data.tech_stack.other
    .map((item: string) => `  - ${item.replace(/^-\s*/, '').trim()}`)
    .join('\n')}`
}


## 📊 프로젝트 성과
- **분석된 커밋**: ${data.performance_metrics.commits_analyzed}개
- **분석된 파일**: ${data.performance_metrics.files_analyzed}개
- **총 파일 수**: ${data.performance_metrics.branch_total_files}개

## 🎯 주요 성취사항
${data.resume_bullets
  .map((bullet: string) => {
    try {
      const parsed = JSON.parse(bullet);
      const title = parsed.title.replace(/^:+|:+$/g, '').trim();
      const content = parsed.content.replace(/^:+|:+$/g, '').trim();

      // title과 content가 같으면 하나만 표시
      if (title === content) {
        return `- ${title}`;
      }

      // title이 content에 포함되어 있으면 content만 표시
      if (content.includes(title)) {
        return `- ${content}`;
      }

      // 둘 다 의미있는 내용이면 연결
      return `- ${title}: ${content}`;
    } catch {
      return `- ${bullet}`;
    }
  })
  .join('\n')}

## 🔧 기술적 도전과 해결
${(() => {
  // refactoring_history 텍스트를 일관된 Markdown 리스트로 포맷팅
  const formatRefactoringHistory = (text: string) => {
    // 먼저 모든 "- " 패턴을 찾아서 배열로 분리
    const items = text.split(/\s*-\s+/).filter(item => item.trim().length > 0);

    return items
      .map(item => {
        // 각 아이템을 정리하고 "- "를 앞에 붙임
        const cleanItem = item
          .trim()
          .replace(/^-+\s*/, '') // 앞의 불필요한 대시 제거
          .replace(/\s+/g, ' ') // 여러 공백을 하나로 통일
          .trim();

        return `- ${cleanItem}`;
      })
      .join('\n');
  };

  return formatRefactoringHistory(data.refactoring_history);
})()}

## 📅 프로젝트 기간
${(() => {
  const createdDate = new Date(data.created_at);
  const updatedDate = new Date(data.updated_at);

  // 날짜 유효성 검사
  const isValidCreated = !isNaN(createdDate.getTime());
  const isValidUpdated = !isNaN(updatedDate.getTime());

  if (!isValidCreated && !isValidUpdated) {
    return '날짜 정보를 확인할 수 없습니다.';
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const createdStr = isValidCreated ? formatDate(createdDate) : '알 수 없음';
  const updatedStr = isValidUpdated ? formatDate(updatedDate) : '알 수 없음';

  // 프로젝트 진행 기간 계산
  if (isValidCreated && isValidUpdated) {
    const diffTime = Math.abs(updatedDate.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `**시작일**: ${createdStr}  
**최근 업데이트**: ${updatedStr}  
**진행 기간**: 약 ${diffDays}일`;
  }

  return `**시작일**: ${createdStr}  
**최근 업데이트**: ${updatedStr}`;
})()}
`;
    },
    []
  );

  // 클립보드 복사 함수를 useCallback으로 메모이제이션
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  }, []);

  // 다운로드 함수를 useCallback으로 메모이제이션
  const downloadAsMarkdown = useCallback(
    (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${selectedBranch}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [selectedBranch]
  );

  // 브랜치 변경 핸들러를 useCallback으로 메모이제이션
  const handleBranchChange = useCallback((branchName: string) => {
    setSelectedBranch(branchName);
  }, []);

  useEffect(() => {
    if (selectedBranch && owner && repoId) {
      summaryGetData();
    }
  }, [selectedBranch, owner, repoId, summaryGetData]);

  // 현재 선택된 탭에 따른 요약 내용 생성을 useMemo로 메모이제이션
  const getCurrentSummary = useMemo(() => {
    if (!summaryContent || !repository) return '';

    switch (activeTab) {
      case 'resume':
        return generateResumeSummary(summaryContent, repository);

      default:
        return '';
    }
  }, [summaryContent, repository, activeTab, generateResumeSummary]);

  const goToGithubRepo = useCallback(() => {
    if (!repository) return;
    window.open(`${repository.html_url}/tree/${selectedBranch}`, '_blank');
  }, [repository, selectedBranch]);

  if (loading) {
    return (
      <div className={styles.repoSummary}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>레포지토리 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className={styles.repoSummary}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>레포지토리를 찾을 수 없습니다</h2>
            <p>요청하신 레포지토리가 존재하지 않거나 접근 권한이 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentSummary = getCurrentSummary;

  return (
    <div className={styles.repoSummary}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.repoInfo}>
            <h1 className={styles.repoName} onClick={goToGithubRepo}>
              {repository.name}
            </h1>
            <p className={styles.repoDescription}>
              {repository.description || '설명이 없습니다.'}
            </p>
            <div className={styles.repoMeta}>
              <span className={styles.language}>{repository.language}</span>
              <span className={styles.stars}>
                ⭐ {repository.stargazers_count}
              </span>
              <span className={styles.forks}>🍴 {repository.forks_count}</span>
            </div>
          </div>

          {/* 브랜치 선택 */}
          <div className={styles.branchSelector}>
            <label className={styles.branchLabel}>🌿 브랜치 선택:</label>
            <select
              className={styles.branchSelect}
              value={selectedBranch}
              onChange={e => handleBranchChange(e.target.value)}
              disabled={branchesLoading}
            >
              {branchesLoading ? (
                <option>브랜치 로딩 중...</option>
              ) : (
                branches.map(branch => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))
              )}
            </select>
          </div>
        </header>

        <div className={styles.tabs}>
          {TABS_CONFIG.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${
                activeTab === tab.id ? styles.tabActive : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h2 className={styles.contentTitle}>
              {TABS_CONFIG.find(tab => tab.id === activeTab)?.label} 요약
              <span className={styles.branchBadge}>({selectedBranch})</span>
            </h2>
            <div className={styles.contentActions}>
              {!currentSummary && (
                <button
                  className={styles.generateBtn}
                  onClick={() => generateSummary(activeTab)}
                  disabled={generatingType === activeTab}
                >
                  {generatingType === activeTab ? '생성 중...' : '요약 생성'}
                </button>
              )}
              {currentSummary && (
                <>
                  <button
                    className={styles.actionBtn}
                    onClick={() => copyToClipboard(currentSummary)}
                  >
                    📋 복사
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() =>
                      downloadAsMarkdown(
                        currentSummary,
                        `${repository.name}-${activeTab}`
                      )
                    }
                  >
                    💾 다운로드
                  </button>
                  <button
                    className={styles.regenerateBtn}
                    onClick={() => generateSummary(activeTab)}
                    disabled={generatingType === activeTab}
                  >
                    🔄 재생성
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.contentBody}>
            {generatingType === activeTab ? (
              <div className={styles.generating}>
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingIcon}>
                    <div className={styles.generatingSpinner}></div>
                    <div className={styles.aiIcon}>🤖</div>
                  </div>

                  <div className={styles.loadingContent}>
                    <h3 className={styles.loadingTitle}>
                      AI가 열심히 분석 중이에요!
                    </h3>
                    <p className={styles.loadingMessage}>
                      {LOADING_MESSAGES[currentMessageIndex].text}
                    </p>

                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${loadingProgress}%` }}
                        ></div>
                      </div>
                      <div className={styles.progressText}>
                        {Math.round(loadingProgress)}% 완료
                      </div>
                    </div>

                    <div className={styles.timeEstimate}>
                      {loadingStartTime && (
                        <span>
                          예상 소요 시간: 최대 30초 ⏰
                          {remainingTime > 0
                            ? ` (약 ${remainingTime}초 남음)`
                            : ' (곧 완료됩니다!)'}
                        </span>
                      )}
                    </div>

                    <div className={styles.loadingTips}>
                      <p>
                        💡 <strong>팁:</strong> 더 정확한 분석을 위해 시간이
                        걸려요!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentSummary ? (
              <div className={styles.summaryContent}>
                <ReactMarkdown>{currentSummary}</ReactMarkdown>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <p>
                  {selectedBranch} 브랜치의 요약을 생성하려면 "요약 생성" 버튼을
                  클릭하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoSummary;
