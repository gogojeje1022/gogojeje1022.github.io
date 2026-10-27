/**
 * utils.js — 여러 파일에서 함께 쓰는 작은 도우미 함수들
 */

// 요소 선택 축약 함수
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => parent.querySelectorAll(selector);

// innerHTML에 외부 데이터(GitHub 저장소 설명 등)를 넣기 전 HTML 특수문자를 이스케이프 (XSS 방지)
const escapeHTML = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// '2026-10-27T00:00:00Z' → '2026. 10. 27.'
const formatDate = (isoString) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(isoString));

// 사용자가 '동작 줄이기'를 설정했는지
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ms만큼 기다리는 Promise
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
