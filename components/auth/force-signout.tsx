'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

export function ForceSignOut() {
    useEffect(() => {
        signOut({ callbackUrl: '/login' });
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Session expirée, déconnexion...</p>
            </div>
        </div>
    );
}
