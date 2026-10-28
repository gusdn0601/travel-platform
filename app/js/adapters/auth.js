// 인증 어댑터 자리: 1단계는 로그인 없이 로컬 사용자 1명. 서버 연동 시 같은 인터페이스로 교체.
export const authAdapter = {
  current: () => ({ id: 'local', name: '나', guest: true }),
  signIn: async () => { throw new Error('회원가입은 아직 준비 중이에요.'); },
};
