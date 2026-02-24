'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Loader2, AlertCircle, CheckCircle2, X, FolderPlus, MinusCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteImage, deleteImages } from '@/server/actions/image-actions';
import { removeImageFromCollection, removeImagesFromCollection } from '@/server/actions/collection-actions';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { cn } from '@/lib/utils';
import { AddToCollectionDialog } from './add-to-collection-dialog';

// Helper to safely get keywords as array (handles both string and array)
function getKeywordsArray(keywords: string | string[] | null | undefined): string[] {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    try {
        return JSON.parse(keywords);
    } catch {
        return [];
    }
}

// Using a simplified type for the client data - keywords/colors can be string or array
type ClientImage = {
    id: string;
    humanId: string;
    storageUrl: string;
    descriptionLong: string;
    keywords: string | string[];
    colors?: string | string[] | null;
    mood?: string | null;
    style?: string | null;
};

export function ImageGrid({ images, collectionId }: { images: ClientImage[], collectionId?: string }) {
    const [selectedImage, setSelectedImage] = useState<ClientImage | null>(null);
    const [imageToAdd, setImageToAdd] = useState<string | null>(null);
    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [isAddingToCollection, startAddTransition] = useTransition();

    // Bulk Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === images.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(images.map(img => img.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (collectionId) {
            if (!confirm(`Retirer ${selectedIds.size} image(s) de cette collection ? Elles resteront dans la galerie générale.`)) return;
            const ids = Array.from(selectedIds);
            setDeletingIds(prev => new Set([...prev, ...ids]));
            try {
                const result = await removeImagesFromCollection(collectionId, ids);
                if (result.success) {
                    toast.success(`${ids.length} images retirées`);
                    setSelectedIds(new Set());
                    setIsSelectionMode(false);
                } else {
                    toast.error('Erreur lors du retrait');
                }
            } finally {
                setDeletingIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
            }
        } else {
            if (!confirm(`Supprimer définitivement ${selectedIds.size} image(s) ? Cette action est irréversible.`)) return;
            const ids = Array.from(selectedIds);
            setDeletingIds(prev => new Set([...prev, ...ids]));
            try {
                const result = await deleteImages(ids);
                if (result.success) {
                    toast.success(`${ids.length} images supprimées`);
                    setSelectedIds(new Set());
                    setIsSelectionMode(false);
                } else {
                    toast.error('Erreur lors de la suppression');
                }
            } finally {
                setDeletingIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
            }
        }
    };

    const handleDelete = async (e: React.MouseEvent, img: ClientImage) => {
        e.stopPropagation();

        if (collectionId) {
            if (!confirm('Retirer cette image de la collection ? Elle restera dans la galerie générale.')) return;
            setDeletingIds(prev => new Set([...prev, img.id]));
            try {
                const result = await removeImageFromCollection(collectionId, img.id);
                if (result.success) {
                    toast.success('Image retirée');
                    if (selectedImage?.id === img.id) setSelectedImage(null);
                } else {
                    toast.error('Erreur lors du retrait');
                }
            } finally {
                setDeletingIds(prev => { const next = new Set(prev); next.delete(img.id); return next; });
            }
        } else {
            if (!confirm('Supprimer définitivement cette image ? Cette action est irréversible.')) return;
            setDeletingIds(prev => new Set([...prev, img.id]));
            try {
                const result = await deleteImage(img.id, img.storageUrl);
                if (result.success) {
                    toast.success('Image supprimée');
                    if (selectedImage?.id === img.id) setSelectedImage(null);
                } else {
                    toast.error('Erreur lors de la suppression');
                }
            } finally {
                setDeletingIds(prev => { const next = new Set(prev); next.delete(img.id); return next; });
            }
        }
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <Button
                    variant={isSelectionMode ? "secondary" : "outline"}
                    onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedIds(new Set());
                    }}
                    className="gap-2 w-full sm:w-auto"
                >
                    {isSelectionMode ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isSelectionMode ? 'Annuler' : 'Gérer / Supprimer'}
                </Button>

                {isSelectionMode && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-right-4 w-full sm:w-auto">
                        <Button variant="outline" onClick={handleSelectAll}>
                            {selectedIds.size === images.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={selectedIds.size === 0 || isAddingToCollection}
                            onClick={() => setIsBatchAddOpen(true)}
                        >
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Ajouter ({selectedIds.size})
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={selectedIds.size === 0 || deletingIds.size > 0}
                            onClick={handleBulkDelete}
                        >
                            {deletingIds.size > 0 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {collectionId ? (
                                <>
                                    <MinusCircle className="w-4 h-4 mr-2" />
                                    Retirer ({selectedIds.size})
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Supprimer ({selectedIds.size})
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {images.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">Aucune image</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Uploadez des images pour commencer</p>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mt-4">
                {images.map((img) => {
                    const isSelected = selectedIds.has(img.id);
                    const isDeleting = deletingIds.has(img.id);

                    return (
                        <Card
                            key={img.id}
                            className={cn(
                                "group relative overflow-hidden aspect-square cursor-pointer border-0 transition-all duration-200",
                                isSelectionMode && isSelected && "ring-4 ring-primary ring-offset-2",
                                isSelectionMode && !isSelected && "opacity-60 grayscale",
                                isDeleting && "opacity-30 pointer-events-none scale-95 transition-all"
                            )}
                            onClick={() => {
                                if (isSelectionMode) {
                                    toggleSelection(img.id);
                                } else {
                                    setSelectedImage(img);
                                }
                            }}
                            tabIndex={isSelectionMode ? 0 : undefined}
                            onKeyDown={isSelectionMode ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleSelection(img.id);
                                }
                            } : undefined}
                            role={isSelectionMode ? "checkbox" : undefined}
                            aria-checked={isSelectionMode ? isSelected : undefined}
                        >
                            <ImageWithFallback
                                src={img.storageUrl}
                                alt={img.descriptionLong.slice(0, 50)}
                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                            />

                            {/* Selection Checkbox Overlay */}
                            {isSelectionMode && (
                                <div className="absolute top-2 right-2 z-10">
                                    <div className={cn(
                                        "w-9 h-9 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-colors bg-black/50 touch-manipulation",
                                        isSelected ? "bg-primary border-primary" : "border-white"
                                    )}>
                                        {isSelected && <CheckCircle2 className="w-6 h-6 sm:w-5 sm:h-5 text-white" />}
                                    </div>
                                </div>
                            )}

                            {/* Normal Hover Overlay (Hidden in Selection Mode) */}
                            {!isSelectionMode && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-9 w-9 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg touch-manipulation"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageToAdd(img.id);
                                            }}
                                            title="Ajouter à une collection"
                                            aria-label="Ajouter à une collection"
                                        >
                                            <FolderPlus className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-9 w-9 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg touch-manipulation"
                                            onClick={(e) => handleDelete(e, img)}
                                            disabled={isDeleting}
                                            title={collectionId ? "Retirer de la collection" : "Supprimer"}
                                            aria-label={collectionId ? "Retirer de la collection" : "Supprimer l'image"}
                                        >
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                                (collectionId ? <MinusCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />)
                                            }
                                        </Button>
                                    </div>
                                    <p className="text-xs text-white font-mono mb-1">{img.humanId}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {getKeywordsArray(img.keywords).slice(0, 2).map((k: string) => (
                                            <span key={k} className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{k}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <AddToCollectionDialog
                open={!!imageToAdd || isBatchAddOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setImageToAdd(null);
                        setIsBatchAddOpen(false);
                        if (isBatchAddOpen) setIsSelectionMode(false); // Close selection mode after batch add? Optional. User might want to do more. Let's keep it open.
                        // Actually, closing selection mode usually makes sense after action. But let's verify user preference. Usually yes.
                        // Let's reset selection if batch add successful? The dialog handles success toast.
                        // Ideally we pass a callback, but for now standard close.
                        if (isBatchAddOpen) {
                            setSelectedIds(new Set());
                            setIsSelectionMode(false);
                        }
                    }
                }}
                imageIds={imageToAdd ? [imageToAdd] : Array.from(selectedIds)}
            />

            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-card border-2 border-border">
                    <DialogHeader>
                        <DialogTitle>{selectedImage?.humanId}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center relative">
                            {selectedImage && (
                                <ImageWithFallback
                                    src={selectedImage.storageUrl}
                                    className="object-contain w-full h-full"
                                    alt="Preview"
                                />
                            )}
                        </div>
                        <ScrollArea className="h-auto md:h-[400px]">
                            <div className="space-y-4 pr-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-1 text-primary">Description</h4>
                                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                                        {selectedImage?.descriptionLong}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm mb-1 text-primary">Mots-clés</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {getKeywordsArray(selectedImage?.keywords).map((k: string) => (
                                            <Badge key={k} variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">{k}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-primary">Ambiance</h4>
                                        <p className="text-sm font-medium">{selectedImage?.mood}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-primary">Style</h4>
                                        <p className="text-sm font-medium">{selectedImage?.style}</p>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
