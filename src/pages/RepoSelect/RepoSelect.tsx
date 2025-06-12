import React, { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  useRepository,
  type Repository,
} from "../../contexts/RepositoryContext";
import styles from "./RepoSelect.module.scss";

const RepoSelect = () => {
  const { isAuthenticated } = useAuth();
  const { repositories, loading, error, refreshRepositories } = useRepository();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "stars">("updated");

  // 검색 입력 핸들러
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  );

  // 정렬 변경 핸들러
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as "name" | "updated" | "stars");
    },
    []
  );

  // 필터링 및 정렬된 레포지토리 목록
  const filteredAndSortedRepos = useMemo(() => {
    return repositories
      .filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "stars":
            return b.stargazers_count - a.stargazers_count;
          case "updated":
          default:
            return (
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
            );
        }
      });
  }, [repositories, searchTerm, sortBy]);

  // 로딩 상태
  if (loading) {
    return (
      <div className={styles.repoSelect}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>레포지토리를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 인증되지 않은 상태
  if (!isAuthenticated) {
    return (
      <div className={styles.repoSelect}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>로그인이 필요합니다</h2>
            <p>레포지토리를 보려면 먼저 GitHub 로그인을 해주세요.</p>
            <Link to="/" className={styles.loginBtn}>
              로그인하러 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={styles.repoSelect}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>오류가 발생했습니다</h2>
            <p>{error}</p>
            <button onClick={refreshRepositories} className={styles.retryBtn}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.repoSelect}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>레포지토리 선택</h1>
          <p className={styles.subtitle}>
            요약하고 싶은 레포지토리를 선택해주세요.
          </p>
        </header>

        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="레포지토리 검색..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.sortBox}>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className={styles.sortSelect}
            >
              <option value="updated">최근 업데이트순</option>
              <option value="name">이름순</option>
              <option value="stars">스타순</option>
            </select>
          </div>
        </div>

        <div className={styles.repoGrid}>
          {filteredAndSortedRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>

        {filteredAndSortedRepos.length === 0 && repositories.length > 0 && (
          <div className={styles.emptyState}>
            <p>검색 결과가 없습니다.</p>
          </div>
        )}

        {repositories.length === 0 && (
          <div className={styles.emptyState}>
            <p>레포지토리가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 레포지토리 카드 컴포넌트 (성능 최적화를 위해 분리)
const RepoCard = React.memo(({ repo }: { repo: Repository }) => {
  return (
    <div className={styles.repoCard}>
      <div className={styles.repoCardHeader}>
        <h3 className={styles.repoCardTitle}>{repo.name}</h3>
        <div className={styles.repoCardMeta}>
          {repo.private && <span className={styles.privateLabel}>Private</span>}
          {repo.language && (
            <span className={styles.languageLabel}>{repo.language}</span>
          )}
        </div>
      </div>

      <p className={styles.repoCardDescription}>
        {repo.description || "설명이 없습니다."}
      </p>

      <div className={styles.repoCardStats}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>⭐</span>
          <span className={styles.statValue}>{repo.stargazers_count}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>📅</span>
          <span className={styles.statValue}>
            {new Date(repo.updated_at).toLocaleDateString("ko-KR")}
          </span>
        </div>
      </div>

      <div className={styles.repoCardActions}>
        <Link
          to={`/repositories/${repo.owner.login}/${encodeURIComponent(
            repo.name
          )}/summary`}
          className={styles.summaryBtn}
        >
          요약하기
        </Link>
      </div>
    </div>
  );
});

RepoCard.displayName = "RepoCard";

export default RepoSelect;
