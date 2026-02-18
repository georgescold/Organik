import { Suspense } from 'react';
import { ApiKeyManagement } from '@/components/api-keys/api-key-management';
import { ApiKeySettings } from '@/components/dashboard/api-key-settings';
import { Loader2, Key, Code, Terminal, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function ApiKeysPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Key className="h-8 w-8" />
            Clés API
          </h1>
          <p className="text-lg text-muted-foreground">
            Gérez vos clés API pour les intégrations externes et les services tiers
          </p>
        </div>

        {/* Section 1: Third-Party Configuration (IA + Apify) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Configuration des services</h2>
          </div>
          <p className="text-muted-foreground">
            Configurez vos clés API pour utiliser les services d'IA et de scraping
          </p>
          <ApiKeySettings />
        </div>

        <Separator className="my-12" />

        {/* Section 2: Service API Keys */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Clés API du service</h2>
          </div>
          <p className="text-muted-foreground">
            Générez des clés API pour intégrer la génération de carrousels dans vos applications
          </p>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <ApiKeyManagement />
          </Suspense>

          {/* Documentation Section */}
          <div className="grid gap-6 md:grid-cols-2 mt-8">
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Quick Start</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Générez un carrousel avec une simple requête HTTP :
                </p>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                  {`curl -X POST https://your-app.com/api/v1/carousels/generate \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "5 tips fitness",
    "slideCount": 7
  }'`}
                </pre>
              </div>
            </div>

            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">API Endpoints</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">POST /api/v1/carousels/generate</code>
                  <p className="text-muted-foreground mt-1">Générer un nouveau carrousel</p>
                </div>
                <div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">GET /api/v1/carousels</code>
                  <p className="text-muted-foreground mt-1">Lister tous les carrousels</p>
                </div>
                <div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">GET /api/v1/carousels/:id</code>
                  <p className="text-muted-foreground mt-1">Récupérer un carrousel spécifique</p>
                </div>
                <div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">DELETE /api/v1/carousels/:id</code>
                  <p className="text-muted-foreground mt-1">Supprimer un carrousel</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limits Info */}
          <div className="border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
              Limites de taux
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Par défaut, chaque clé API a une limite de <strong>100 requêtes par jour</strong>.
              La limite se réinitialise toutes les 24 heures à partir de votre première requête.
              Vous pouvez suivre votre utilisation dans le tableau ci-dessus.
            </p>
          </div>

          {/* Security Best Practices */}
          <div className="border rounded-lg p-6 space-y-4 mt-6">
            <h3 className="text-lg font-semibold">Bonnes pratiques de sécurité</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Ne commitez jamais les clés API dans le contrôle de version</li>
              <li>Stockez les clés de manière sécurisée avec des variables d'environnement</li>
              <li>Révoquez immédiatement les clés compromises</li>
              <li>Utilisez différentes clés pour différents environnements (dev, prod)</li>
              <li>Rotez régulièrement vos clés pour une sécurité renforcée</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
