'use client';

import { useEffect, useState } from 'react';
import { ApiKeyList } from './api-key-list';
import { CreateKeyDialog } from './create-key-dialog';
import { getUserApiKeys } from '@/server/actions/api-key-actions';
import { Loader2 } from 'lucide-react';

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApiKeys = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getUserApiKeys();

      if (result.error) {
        setError(result.error);
      } else if (result.apiKeys) {
        setApiKeys(result.apiKeys);
      }
    } catch (e) {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 border rounded-lg border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground mt-1">
            Manage your API keys for external integrations
          </p>
        </div>
        <CreateKeyDialog onKeyCreated={loadApiKeys} />
      </div>

      <ApiKeyList apiKeys={apiKeys} onUpdate={loadApiKeys} />
    </div>
  );
}
