'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Client-side session provider — wraps the app to enable:
 * - useSession() hook in client components
 * - Automatic session polling (keeps client in sync across tabs/devices)
 * - Proper signIn/signOut from next-auth/react
 *
 * refetchInterval: re-checks session every 5 min so concurrent
 * sessions stay in sync without manual refresh.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
            {children}
        </SessionProvider>
    );
}
