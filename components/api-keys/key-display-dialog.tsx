'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle } from 'lucide-react';

interface KeyDisplayDialogProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  keyName: string;
}

export function KeyDisplayDialog({ open, onClose, apiKey, keyName }: KeyDisplayDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Ensure we copy the complete API key
      await navigator.clipboard.writeText(apiKey);
      console.log('API Key copied:', apiKey.length, 'characters');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
      // Fallback: try to copy using the old method
      const textArea = document.createElement('textarea');
      textArea.value = apiKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            API Key Created Successfully
          </DialogTitle>
          <DialogDescription>
            Save your API key now. You won't be able to see it again!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Key Name</label>
            <div className="text-sm text-muted-foreground">{keyName}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all select-all">
                {apiKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
                title={`Copier la clé complète (${apiKey.length} caractères)`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clé complète : {apiKey.length} caractères
            </p>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Important: Copy your API key now
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This is the only time you'll be able to see the full API key. Store it securely
                  in your application or password manager.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm}>I've saved my key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
