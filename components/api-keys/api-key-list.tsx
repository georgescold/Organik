'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Ban, Trash2, Check } from 'lucide-react';
import { revokeApiKey, deleteApiKey } from '@/server/actions/api-key-actions';
import { formatDistanceToNow } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: string;
  requestCount: number;
  dailyLimit: number;
  lastResetAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onUpdate: () => void;
}

export function ApiKeyList({ apiKeys, onUpdate }: ApiKeyListProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleCopyPrefix = async (prefix: string) => {
    await navigator.clipboard.writeText(prefix);
    setCopied(prefix);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? It will immediately stop working.')) {
      return;
    }

    setLoading(keyId);
    try {
      const result = await revokeApiKey(keyId);
      if (result.error) {
        alert(result.error);
      } else {
        onUpdate();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    setLoading(keyId);
    try {
      const result = await deleteApiKey(keyId);
      if (result.error) {
        alert(result.error);
      } else {
        onUpdate();
      }
    } finally {
      setLoading(null);
    }
  };

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <p className="text-muted-foreground">No API keys yet. Create your first one to get started.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="font-medium">{key.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {key.keyPrefix}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyPrefix(key.keyPrefix)}
                    className="h-7 w-7 p-0"
                    title="Copier le préfixe (la clé complète n'est plus disponible)"
                  >
                    {copied === key.keyPrefix ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {key.status === 'active' ? (
                  <Badge variant="default" className="bg-green-600">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Revoked</Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {key.requestCount} / {key.dailyLimit}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {key.lastUsedAt
                  ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={loading === key.id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {key.status === 'active' && (
                      <DropdownMenuItem onClick={() => handleRevoke(key.id)}>
                        <Ban className="mr-2 h-4 w-4" />
                        Revoke
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(key.id)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
