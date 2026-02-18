'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { createApiKey } from '@/server/actions/api-key-actions';
import { KeyDisplayDialog } from './key-display-dialog';

interface CreateKeyDialogProps {
  onKeyCreated?: () => void;
}

export function CreateKeyDialog({ onKeyCreated }: CreateKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // State for displaying the created key
  const [showKeyDisplay, setShowKeyDisplay] = useState(false);
  const [createdKey, setCreatedKey] = useState('');
  const [createdKeyName, setCreatedKeyName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for your API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createApiKey(name.trim());

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.apiKey) {
        // Store the created key details
        setCreatedKey(result.apiKey);
        setCreatedKeyName(name);

        // Close create dialog and show display dialog
        setOpen(false);
        setShowKeyDisplay(true);

        // Reset form
        setName('');

        // Notify parent
        onKeyCreated?.();
      }
    } catch (e) {
      setError('Failed to create API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDisplayClose = () => {
    setShowKeyDisplay(false);
    setCreatedKey('');
    setCreatedKeyName('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give your API key a descriptive name to help you identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production App, Development"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KeyDisplayDialog
        open={showKeyDisplay}
        onClose={handleKeyDisplayClose}
        apiKey={createdKey}
        keyName={createdKeyName}
      />
    </>
  );
}
