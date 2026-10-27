/**
 * ui.js — 네비게이션, 스크롤, 애니메이션 등 화면 인터랙션
 */

// JS가 동작 중임을 표시 → CSS에서 .js .reveal 일 때만 요소를 숨겼다가 나타나게 함
document.documentElement.classList.add('js');

// 푸터 연도, GitHub 링크를 설정값으로 채우기
$('#year').textContent = new Date().getFullYear();
$('#github-link').href = `https://github.com/${CONFIG.githubUsernames[0]}`;

/* =========================================================
   1. 햄버거 메뉴
   흐름: [클릭] → menuState.isOpen 변경 → renderMenu() 가 .active 클래스 토글
   ========================================================= */
const header = $('#site-header');
const hamburger = $('#hamburger');
const navMenu = $('#nav-menu');
const tabletQuery = window.matchMedia('(min-width: 768px)');

let menuState = { isOpen: false };

const renderMenu = () => {
  const { isOpen } = menuState;
  // setMenuOpen()은 상태가 실제로 바뀔 때만 호출하므로, 여기서 'active'를 한 번 토글하면 상태와 일치함
  navMenu.classList.toggle('active');
  hamburger.classList.toggle('active');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  hamburger.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
};

const setMenuOpen = (isOpen) => {
  if (menuState.isOpen === isOpen) return;
  menuState = { ...menuState, isOpen };
  renderMenu();
};

hamburger.addEventListener('click', () => setMenuOpen(!menuState.isOpen));

// ESC 키, 메뉴 바깥 클릭, 태블릿 이상으로 화면이 커지면 메뉴 닫기
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuState.isOpen) {
    setMenuOpen(false);
    hamburger.focus();
  }
});
document.addEventListener('click', (event) => {
  if (menuState.isOpen && !header.contains(event.target)) setMenuOpen(false);
});
tabletQuery.addEventListener('change', ({ matches }) => {
  if (matches) setMenuOpen(false);
});

/* =========================================================
   2. 부드러운 스크롤 (앵커 링크)
   ========================================================= */
$$('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    const target = hash.length > 1 ? $(hash) : null;
    if (!target) return;

    event.preventDefault(); // 브라우저의 기본 '즉시 점프' 동작을 막고 직접 스크롤
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    history.pushState(null, '', hash);

    // 키보드 사용자를 위해 이동한 섹션으로 포커스도 옮김
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });

    setMenuOpen(false); // 모바일 메뉴에서 클릭했다면 닫기
  });
});

/* =========================================================
   3. 스크롤 상태 → 네비게이션 배경 / 맨 위로 버튼
   흐름: [scroll] → scrollState 변경(값이 바뀔 때만) → renderScroll()
   ========================================================= */
const scrollTopBtn = $('#scroll-top');

let scrollState = { isScrolled: false, showTopButton: false };

const renderScroll = () => {
  const { isScrolled, showTopButton } = scrollState;
  // classList.add / remove 로 명시적으로 켜고 끄기
  if (isScrolled) header.classList.add('is-scrolled');
  else header.classList.remove('is-scrolled');

  if (showTopButton) scrollTopBtn.classList.add('is-visible');
  else scrollTopBtn.classList.remove('is-visible');
};

const setScrollState = (nextState) => {
  const hasChanged = Object.entries(nextState).some(([key, value]) => scrollState[key] !== value);
  if (!hasChanged) return; // 스크롤 이벤트는 매우 자주 발생하므로, 바뀐 게 없으면 렌더링 생략
  scrollState = { ...scrollState, ...nextState };
  renderScroll();
};

const handleScroll = () => {
  const { scrollY } = window;
  setScrollState({
    isScrolled: scrollY >= CONFIG.navScrollThreshold,
    showTopButton: scrollY >= CONFIG.scrollTopThreshold,
  });
};

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll(); // 새로고침 시 중간 위치에서 시작해도 올바른 상태로

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
});

/* =========================================================
   4. 스크롤 애니메이션 (Intersection Observer)
   ========================================================= */
const revealObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            target.classList.add('is-visible');
            observer.unobserve(target); // 한 번 나타나면 더 이상 관찰하지 않음
          });
        },
        { threshold: CONFIG.revealThreshold }
      )
    : null;

// projects.js에서 새로 렌더링한 카드에도 재사용하기 위해 함수로 분리
const observeReveal = (elements) => {
  elements.forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-visible'); // 미지원 브라우저는 바로 표시
  });
};

observeReveal($$('.reveal'));

/* =========================================================
   5. 현재 보고 있는 섹션의 메뉴 강조
   ========================================================= */
const navLinks = [...$$('.nav__link')];

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries
      .filter(({ isIntersecting }) => isIntersecting)
      .forEach(({ target }) => {
        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute('href') === `#${target.id}`;
          link.classList.toggle('is-current', isCurrent);
          if (isCurrent) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
  },
  { rootMargin: '-50% 0px -50% 0px' } // 화면 정중앙 선을 지나는 섹션을 '현재 섹션'으로 판단
);
$$('main section[id]').forEach((section) => sectionObserver.observe(section));

/* =========================================================
   6. Hero 타이핑 효과 (보너스 2)
   ========================================================= */
const typingEl = $('#typing');

const startTyping = (phrases) => {
  let state = { phraseIndex: 0, charCount: 0, isDeleting: false };

  const tick = () => {
    const { phraseIndex, charCount, isDeleting } = state;
    const phrase = phrases[phraseIndex];

    typingEl.textContent = phrase.slice(0, charCount);

    let delay = isDeleting ? 50 : 110;
    if (!isDeleting && charCount === phrase.length) {
      state = { ...state, isDeleting: true };
      delay = 1800; // 다 쓴 뒤 잠시 멈춤
    } else if (isDeleting && charCount === 0) {
      state = { phraseIndex: (phraseIndex + 1) % phrases.length, charCount: 0, isDeleting: false };
      delay = 400;
    } else {
      state = { ...state, charCount: charCount + (isDeleting ? -1 : 1) };
    }
    setTimeout(tick, delay);
  };

  tick();
};

if (CONFIG.typingPhrases.length > 0 && !prefersReducedMotion()) {
  startTyping(CONFIG.typingPhrases);
}
