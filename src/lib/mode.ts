// Supabase 환경변수가 설정돼 있으면 클라우드 모드(계정·클라우드 저장),
// 없으면 로컬 모드(이 컴퓨터의 data/ 폴더 저장)로 동작한다.
export function isCloudMode(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
