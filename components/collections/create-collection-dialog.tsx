'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { createCollection } from '@/server/actions/collection-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function CreateCollectionDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        const result = await createCollection(name);
        setLoading(false);

        if (result.success) {
            toast.success('Collection créée !');
            setOpen(false);
            setName('');
            // Refresh to show new collection in list
            router.refresh();
        } else {
            toast.error('Erreur lors de la création');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="w-full justify-start bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold shadow-[0_4px_14px_0_rgba(254,44,85,0.39)] transition-transform hover:scale-[1.02] border-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Collection
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Créer une collection</DialogTitle>
                    <DialogDescription>
                        Créez un dossier pour organiser vos images.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Nom
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: Inspirations Automne"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Création...' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
