import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use authConfig (without Prisma/bcrypt) so middleware can run at the Edge runtime.
// This activates the `authorized` callback for route protection
// and ensures JWT cookies are refreshed on every request (sliding window).
export default NextAuth(authConfig).auth;

export const config = {
    matcher: [
        // Run middleware on all routes EXCEPT static assets, API routes, and Next.js internals
        "/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-touch-icon\\.png).*)",
    ],
};
