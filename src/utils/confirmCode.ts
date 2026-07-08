/** 파괴적 작업 전 10자리 숫자 확인 코드 */
export function generateNumericConfirmCode(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
}
