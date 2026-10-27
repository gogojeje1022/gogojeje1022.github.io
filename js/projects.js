/**
 * projects.js — GitHub API 연동 + 언어별 필터
 *
 * 상태(projectState.status)
 *   'loading' → 스피너
 *   'success' → 카드 목록
 *   'error'   → 에러 메시지 + [다시 시도] 버튼
 *   'empty'   → "표시할 프로젝트가 없습니다"
 *
 * 흐름: [페이지 로드 / 재시도 클릭 / 필터 클릭] → setProjectState() → renderProjects()
 */
const projectList = $('#project-list');
const filterBar = $('#project-filters');

// 계정마다 엔드포인트가 하나씩: https://api.github.com/users/{아이디}/repos
const getApiUrl = (username) => `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`;
const CACHE_KEY = `github-repos:${CONFIG.githubUsernames.join(',')}`;

// ---- 상태 ----
let projectState = {
  status: 'loading',
  repos: [],
  filter: 'all',
  errorMessage: '',
};

const setProjectState = (patch) => {
  projectState = { ...projectState, ...patch };
  renderProjects();
};

/* =========================================================
   데이터 가져오기
   ========================================================= */

// API 응답에서 필요한 값만 구조분해 할당으로 꺼내 가벼운 객체로 변환
const toProject = ({ name, description, html_url, homepage, language, stargazers_count, forks_count, pushed_at, fork, owner }) => ({
  name,
  owner: owner.login,
  description,
  url: html_url,
  homepage,
  language: language ?? '기타',
  stars: stargazers_count,
  forks: forks_count,
  updatedAt: pushed_at,
  isFork: fork,
});

// 레이트 리밋(시간당 60회) 보호: 짧은 시간 내 새로고침은 sessionStorage 캐시 사용
const readCache = () => {
  try {
    const { savedAt, repos } = JSON.parse(sessionStorage.getItem(CACHE_KEY)) ?? {};
    const isFresh = Date.now() - savedAt < CONFIG.cacheMinutes * 60 * 1000;
    return isFresh && Array.isArray(repos) ? repos : null;
  } catch {
    return null;
  }
};

const writeCache = (repos) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), repos }));
  } catch {
    /* 저장 실패는 무시 */
  }
};

// HTTP 상태 코드별로 사용자에게 보여줄 메시지 만들기
const createHttpError = (response, username) => {
  const { status, headers } = response;
  const remaining = headers.get('x-ratelimit-remaining');

  if (status === 403 || status === 429) {
    if (remaining === '0') {
      const resetAt = new Date(Number(headers.get('x-ratelimit-reset')) * 1000);
      const time = resetAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      return new Error(`GitHub API 요청 한도를 초과했어요. ${time} 이후에 다시 시도해 주세요.`);
    }
    return new Error('GitHub API 접근이 거부되었어요. (403)');
  }
  if (status === 404) return new Error(`'${username}' 사용자를 찾을 수 없어요. config.js의 아이디를 확인해 주세요.`);
  return new Error(`서버 응답 오류가 발생했어요. (HTTP ${status})`);
};

// 개발/스크린샷용: ?demo=loading | error | empty | ratelimit 로 각 상태를 강제로 확인
const demoMode = new URLSearchParams(window.location.search).get('demo');

const loadProjects = async ({ useCache = true } = {}) => {
  setProjectState({ status: 'loading', errorMessage: '' });

  if (demoMode === 'loading') return; // 로딩 상태 유지
  if (demoMode === 'empty') {
    await wait(600);
    setProjectState({ status: 'empty', repos: [] });
    return;
  }

  try {
    if (demoMode === 'error') {
      await wait(600);
      throw new Error('네트워크 연결을 확인해 주세요.');
    }
    if (demoMode === 'ratelimit') {
      await wait(600);
      throw new Error('GitHub API 요청 한도를 초과했어요. 잠시 후 다시 시도해 주세요.');
    }

    const cached = useCache ? readCache() : null;
    if (cached) {
      setProjectState({ status: cached.length > 0 ? 'success' : 'empty', repos: cached, filter: 'all' });
      return;
    }

    // 한 계정의 저장소 목록 가져오기
    const fetchUserRepos = async (username) => {
      const response = await fetch(getApiUrl(username), { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw createHttpError(response, username);
      return response.json();
    };

    // 여러 계정을 동시에 요청하고(Promise.all), 하나라도 실패하면 catch로 이동
    const results = await Promise.all(CONFIG.githubUsernames.map(fetchUserRepos));

    const repos = results
      .flat() // [[계정1 저장소...], [계정2 저장소...]] → 하나의 배열로
      .map(toProject)
      .filter(({ isFork }) => !(CONFIG.excludeForks && isFork))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) // 최근 업데이트 순
      .slice(0, CONFIG.maxProjects);

    writeCache(repos);
    setProjectState({ status: repos.length > 0 ? 'success' : 'empty', repos, filter: 'all' });
  } catch (error) {
    // fetch 자체가 실패하면(오프라인 등) TypeError가 발생
    const errorMessage = error instanceof TypeError ? '네트워크 연결을 확인해 주세요.' : error.message;
    setProjectState({ status: 'error', errorMessage });
  }
};

/* =========================================================
   렌더링: 상태 → HTML (템플릿 리터럴)
   ========================================================= */

const createCardHTML = ({ name, owner, description, url, homepage, language, stars, forks, updatedAt }) => `
  <article class="project-card reveal">
    <p class="project-card__owner">@${escapeHTML(owner)}</p>
    <h3 class="project-card__title">
      <a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(name)}</a>
    </h3>
    <p class="project-card__desc">${escapeHTML(description ?? '설명이 아직 없는 저장소입니다.')}</p>
    <div class="project-card__meta">
      <span class="project-card__lang" data-lang="${escapeHTML(language)}">${escapeHTML(language)}</span>
      <span aria-label="스타 ${stars}개">★ ${stars}</span>
      <span aria-label="포크 ${forks}개">⑂ ${forks}</span>
      <time datetime="${escapeHTML(updatedAt)}">${formatDate(updatedAt)}</time>
    </div>
    ${homepage ? `<a class="project-card__demo" href="${escapeHTML(homepage)}" target="_blank" rel="noopener noreferrer">Live Demo →</a>` : ''}
  </article>
`;

const STATE_TEMPLATES = {
  loading: () => `
    <div class="state state--loading">
      <div class="spinner" aria-hidden="true"></div>
      <p class="state__title">프로젝트를 불러오는 중...</p>
    </div>`,
  error: ({ errorMessage }) => `
    <div class="state state--error" role="alert">
      <p class="state__title">프로젝트를 불러올 수 없습니다.</p>
      <p class="state__detail">${escapeHTML(errorMessage)}</p>
      <button class="btn btn--ghost" type="button" data-action="retry">다시 시도</button>
    </div>`,
  empty: () => `
    <div class="state state--empty">
      <p class="state__title">표시할 프로젝트가 없습니다.</p>
      <p class="state__detail">공개 저장소가 생기면 이곳에 자동으로 표시됩니다.</p>
    </div>`,
};

// 언어 목록과 개수 계산: { all: 5, JavaScript: 3, HTML: 2 }
const countByLanguage = (repos) =>
  repos.reduce(
    (counts, { language }) => ({ ...counts, [language]: (counts[language] ?? 0) + 1 }),
    { all: repos.length }
  );

const renderFilters = () => {
  const { status, repos, filter } = projectState;

  if (status !== 'success') {
    filterBar.innerHTML = '';
    return;
  }

  const counts = countByLanguage(repos);
  filterBar.innerHTML = Object.entries(counts)
    .map(([language, count]) => {
      const isActive = language === filter;
      const label = language === 'all' ? '전체' : language;
      return `
        <button class="filter-btn ${isActive ? 'is-active' : ''}" type="button"
                data-filter="${escapeHTML(language)}" aria-pressed="${isActive}">
          ${escapeHTML(label)}<span class="filter-btn__count">${count}</span>
        </button>`;
    })
    .join('');
};

const renderProjects = () => {
  const { status, repos, filter } = projectState;

  projectList.setAttribute('aria-busy', String(status === 'loading'));
  renderFilters();

  if (status !== 'success') {
    projectList.innerHTML = STATE_TEMPLATES[status](projectState);
    return;
  }

  // filter: 선택한 언어의 프로젝트만 남김
  const visibleRepos = filter === 'all' ? repos : repos.filter(({ language }) => language === filter);

  // map: 데이터 배열 → HTML 문자열 배열 → join으로 하나로
  projectList.innerHTML = `<div class="projects__grid">${visibleRepos.map(createCardHTML).join('')}</div>`;

  observeReveal($$('.project-card', projectList)); // 새로 생긴 카드에도 스크롤 애니메이션 적용
};

/* =========================================================
   이벤트 연결 (이벤트 위임: 다시 그려지는 버튼에도 동작)
   ========================================================= */
filterBar.addEventListener('click', (event) => {
  const button = event.target.closest('.filter-btn');
  if (!button) return;
  setProjectState({ filter: button.dataset.filter });
});

projectList.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="retry"]')) {
    loadProjects({ useCache: false });
  }
});

// 최초 실행
loadProjects();
