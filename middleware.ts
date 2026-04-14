export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: ["/((?!api/auth|api/register|login|register|_next|favicon.ico|share).*)"],
}
