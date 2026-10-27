/**
 * form.js — Contact 폼 유효성 검사
 *
 * 흐름: [input / blur / submit] → formState(values, errors, touched, status) 변경 → renderForm()
 *       → 에러 메시지 표시/숨김, 입력창 테두리 색, 글자 수, 버튼 상태가 함께 바뀜
 */
const contactForm = $('#contact-form');
const submitBtn = $('#submit-btn');
const formStatus = $('#form-status');
const messageCount = $('#message-count');

const FIELD_NAMES = ['name', 'email', 'message'];
const MESSAGE_MAX = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 필드별 검증 함수: 문제가 없으면 빈 문자열을 반환
const validators = {
  name: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return '이름을 입력해 주세요.';
    if (trimmed.length < 2) return '이름은 2자 이상 입력해 주세요.';
    return '';
  },
  email: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return '이메일을 입력해 주세요.';
    if (!EMAIL_PATTERN.test(trimmed)) return '올바른 이메일 형식이 아닙니다. (예: name@example.com)';
    return '';
  },
  message: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return '메시지를 입력해 주세요.';
    if (trimmed.length < 10) return `메시지는 10자 이상 입력해 주세요. (현재 ${trimmed.length}자)`;
    if (value.length > MESSAGE_MAX) return `메시지는 ${MESSAGE_MAX}자 이하로 입력해 주세요.`;
    return '';
  },
};

// 필드 이름 배열 → { name: init, email: init, message: init } 객체
const createFieldMap = (init) => Object.fromEntries(FIELD_NAMES.map((field) => [field, init]));

const createInitialFormState = () => ({
  values: createFieldMap(''),
  errors: createFieldMap(''),
  touched: createFieldMap(false), // 사용자가 한 번이라도 건드린 필드만 에러를 보여줌
  status: 'idle', // 'idle' | 'submitting' | 'success' | 'error'
  statusMessage: '',
});

let formState = createInitialFormState();

const setFormState = (patch) => {
  formState = { ...formState, ...patch };
  renderForm();
};

const validateAll = (values) =>
  Object.fromEntries(FIELD_NAMES.map((field) => [field, validators[field](values[field])]));

// ---- 렌더링: 상태 → DOM ----
const renderForm = () => {
  const { values, errors, touched, status, statusMessage } = formState;

  FIELD_NAMES.forEach((field) => {
    const input = contactForm.elements[field];
    const errorEl = $(`#${field}-error`);
    const showError = touched[field] && Boolean(errors[field]);

    if (input.value !== values[field]) input.value = values[field]; // 상태 → 입력창 (초기화 시)
    input.classList.toggle('is-invalid', showError);
    input.classList.toggle('is-valid', touched[field] && !errors[field]);
    input.setAttribute('aria-invalid', String(showError));
    errorEl.textContent = showError ? errors[field] : '';
  });

  const { length } = values.message;
  messageCount.textContent = `${length} / ${MESSAGE_MAX}`;
  messageCount.classList.toggle('is-over', length > MESSAGE_MAX);

  const isSubmitting = status === 'submitting';
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? '보내는 중...' : '보내기';

  formStatus.textContent = statusMessage;
  formStatus.classList.toggle('is-success', status === 'success');
  formStatus.classList.toggle('is-error', status === 'error');
};

// ---- 실제 전송 (Formspree 설정 시) 또는 시뮬레이션 ----
const sendMessage = async (values) => {
  if (!CONFIG.formspreeEndpoint) {
    await wait(800); // 엔드포인트가 없으면 전송을 흉내만 냄
    return;
  }
  const response = await fetch(CONFIG.formspreeEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
};

// ---- 이벤트 연결 ----

// input: 입력할 때마다 값 저장, 이미 건드린 필드면 즉시 재검증
contactForm.addEventListener('input', (event) => {
  const { name, value } = event.target;
  if (!FIELD_NAMES.includes(name)) return;

  const values = { ...formState.values, [name]: value };
  const errors = { ...formState.errors, [name]: validators[name](value) };
  // 성공 메시지가 떠 있는 상태에서 다시 입력하면 메시지를 지움
  const statusPatch = formState.status === 'success' ? { status: 'idle', statusMessage: '' } : {};
  setFormState({ values, errors, ...statusPatch });
});

// focusout: 필드를 떠날 때 '건드림' 처리 → 그때부터 에러 표시
contactForm.addEventListener('focusout', (event) => {
  const { name, value } = event.target;
  if (!FIELD_NAMES.includes(name)) return;
  if (!value && !formState.touched[name]) return; // 아직 손대지 않은 빈 칸을 지나칠 땐 에러를 띄우지 않음
  setFormState({
    touched: { ...formState.touched, [name]: true },
    errors: { ...formState.errors, [name]: validators[name](value) },
  });
});

// submit: 기본 제출(페이지 새로고침)을 막고 전체 검증 후 전송
contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (formState.status === 'submitting') return;

  const errors = validateAll(formState.values);
  const touched = createFieldMap(true);
  const firstInvalid = FIELD_NAMES.find((field) => errors[field]);

  if (firstInvalid) {
    setFormState({ errors, touched, status: 'error', statusMessage: '입력 내용을 다시 확인해 주세요.' });
    contactForm.elements[firstInvalid].focus();
    return;
  }

  setFormState({ errors, touched, status: 'submitting', statusMessage: '' });

  try {
    const { name } = formState.values;
    await sendMessage(formState.values);
    setFormState({
      ...createInitialFormState(),
      status: 'success',
      statusMessage: `감사합니다, ${name.trim()}님! 메시지가 전송되었습니다.`,
    });
  } catch {
    setFormState({ status: 'error', statusMessage: '전송에 실패했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

renderForm();
