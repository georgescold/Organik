'use client';

import { ApiKeySettings } from '@/components/dashboard/api-key-settings';
import { ApiKeyManagement } from '@/components/api-keys/api-key-management';
import { Settings, Code } from 'lucide-react';

export function UnifiedApiSettings() {
    return (
        <div className="space-y-8 sm:space-y-10 max-w-6xl mx-auto">
            {/* Section 1: Third-Party Configuration (IA + Apify) */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Configuration des services</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Clés API pour les services d'IA et de scraping
                        </p>
                    </div>
                </div>
                <ApiKeySettings />
            </section>

            <div className="section-divider" />

            {/* Section 2: Service API Keys */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Code className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Clés API du service</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Intégrez la génération de carrousels dans vos applications
                        </p>
                    </div>
                </div>
                <ApiKeyManagement />
            </section>
        </div>
    );
}
