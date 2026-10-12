import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  if (process.env.APP_MODE !== "local") return NextResponse.next();
  const host = request.headers.get("host") || "";
  if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))
    return new NextResponse("Nur lokaler Zugriff erlaubt.", { status: 403 });
  const pathname = request.nextUrl.pathname;
  if (
    (pathname.startsWith("/api/") && pathname !== "/api/local") ||
    request.headers.has("next-action")
  )
    return new NextResponse("Cloud-Funktion im lokalen Modus gesperrt.", {
      status: 403,
    });
  const response = NextResponse.next();
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
