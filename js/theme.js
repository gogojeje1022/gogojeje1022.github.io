/**
 * theme.js — 다크 모드
 *
 * 흐름: [클릭 이벤트] → setTheme() 로 themeState 변경 → renderTheme() 가 DOM 갱신
 *       → <html data-theme="dark"> 가 바뀌면 CSS 변수가 통째로 교체되어 전체 화면 스타일이 변경됨
 */
const THEME_STORAGE_KEY = 'portfolio-theme';
const themeToggle = $('#theme-toggle');
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// localStorage는 시크릿 모드 등에서 예외가 날 수 있으므로 try/catch로 감싼다
const loadSavedTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
};

const saveTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* 저장 실패 시에도 화면 전환은 정상 동작 */
  }
};

const getSystemTheme = () => (systemDarkQuery.matches ? 'dark' : 'light');

// ---- 상태 ----
// 저장된 값이 있으면 우선, 없으면 시스템 설정(prefers-color-scheme)을 따른다 (보너스 4)
let themeState = {
  theme: loadSavedTheme() ?? getSystemTheme(),
};

// ---- 렌더링: 상태 → DOM ----
const renderTheme = () => {
  const { theme } = themeState;
  const isDark = theme === 'dark';

  document.documentElement.dataset.theme = theme; // <html data-theme="dark|light">
  themeToggle.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
  themeToggle.setAttribute('aria-pressed', String(isDark));
};

// ---- 상태 변경 ----
const setTheme = (theme, { persist = true } = {}) => {
  themeState = { ...themeState, theme };
  if (persist) saveTheme(theme);
  renderTheme();
};

// ---- 이벤트 연결 ----
themeToggle.addEventListener('click', () => {
  const nextTheme = themeState.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
});

// 사용자가 직접 고른 적이 없다면, OS 테마가 바뀔 때 따라간다
systemDarkQuery.addEventListener('change', (event) => {
  if (loadSavedTheme() === null) {
    setTheme(event.matches ? 'dark' : 'light', { persist: false });
  }
});

// 최초 렌더링
renderTheme();
