import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 사이트는 회원가입 없이 누구나 이용 가능.
// 제작자 통계(/admin)만 로그인(제작자 계정)으로 보호한다.
export async function middleware(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && path.startsWith("/admin")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 학교 전용 구역: 로그인해야 열린다.
  // 승인 여부와 역할(학생·교사·관리자)은 각 페이지에서 확인한다.
  if (!user && path.startsWith("/school/")) {
    const schoolEntry = request.nextUrl.clone();
    schoolEntry.pathname = "/school";
    return NextResponse.redirect(schoolEntry);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/school/:path*"],
};
