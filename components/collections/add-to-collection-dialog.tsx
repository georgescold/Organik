'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getUserCollections, addImagesToCollection } from '@/server/actions/collection-actions';
import { toast } from 'sonner';
import { FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AddToCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageIds: string[];
}

export function AddToCollectionDialog({ open, onOpenChange, imageIds }: AddToCollectionDialogProps) {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const cacheRef = useRef<any[] | null>(null);

    useEffect(() => {
        if (open) {
            if (cacheRef.current) {
                setCollections(cacheRef.current);
            } else {
                getUserCollections().then(res => {
                    if (res.success) {
                        const cols = res.collections || [];
                        setCollections(cols);
                        cacheRef.current = cols;
                    }
                });
            }
        }
    }, [open]);

    const handleAdd = async (collectionId: string) => {
        setLoading(true);
        const result = await addImagesToCollection(collectionId, imageIds);
        setLoading(false);
        if (result.success) {
            toast.success("Image(s) ajoutée(s) à la collection");
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error("Erreur lors de l'ajout");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter à une collection</DialogTitle>
                    <DialogDescription>
                        Choisissez une collection pour y ajouter cette image.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4 max-h-[60vh] overflow-y-auto">
                    {collections.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm">
                            Aucune collection trouvée. Créez-en une d'abord !
                        </p>
                    )}
                    {collections.map((collection) => (
                        <Button
                            key={collection.id}
                            variant="outline"
                            className="justify-start"
                            onClick={() => handleAdd(collection.id)}
                            disabled={loading}
                        >
                            <FolderPlus className="mr-2 h-4 w-4" />
                            {collection.name}
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
