/**
 * config.js — 사이트 전체 설정을 한 곳에 모아 둔 파일
 * 본인 정보로 바꿀 때는 이 파일부터 수정하세요.
 */
const CONFIG = {
  // GitHub 아이디 목록 (Projects 섹션이 각 계정의 공개 저장소를 불러와 합쳐서 보여줌)
  // gogojeje1022: 개인 계정 / muklog: 먹로그 서비스 계정
  githubUsernames: ['gogojeje1022', 'muklog'],

  // Projects 섹션 옵션
  maxProjects: 12, // 최대 표시 개수
  excludeForks: true, // 포크한 저장소는 제외
  cacheMinutes: 10, // 레이트 리밋(시간당 60회) 보호용 세션 캐시 유지 시간

  // 스크롤 인터랙션 기준값 (README에 명시)
  navScrollThreshold: 60, // 이 값(px) 이상 스크롤하면 네비게이션 배경 변경
  scrollTopThreshold: 300, // 이 값(px) 이상 스크롤하면 맨 위로 버튼 표시
  revealThreshold: 0.2, // 요소가 20% 이상 보이면 등장 애니메이션 실행

  // Hero 타이핑 효과 문구
  typingPhrases: ['정용준입니다.', 'SW 개발자입니다.', '교육을 설계합니다.', '함께 성장합니다.'],

  // (선택) Formspree 엔드포인트. 비워 두면 전송을 시뮬레이션만 합니다.
  // 예: 'https://formspree.io/f/xxxxxxx'
  formspreeEndpoint: '',
};
