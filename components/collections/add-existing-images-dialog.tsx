"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getUserImages } from "@/server/actions/image-actions";
import { addImagesToCollection } from "@/server/actions/collection-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AddExistingImagesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collectionId: string;
    currentImageIds: string[]; // To disable/hide already added images
}

export function AddExistingImagesDialog({ open, onOpenChange, collectionId, currentImageIds }: AddExistingImagesDialogProps) {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (open) {
            setLoading(true);
            getUserImages().then(res => {
                if (res.success) {
                    setImages(res.images || []);
                }
                setLoading(false);
            });
            setSelectedIds(new Set());
        }
    }, [open]);

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleAdd = async () => {
        if (selectedIds.size === 0) return;
        setAdding(true);
        const result = await addImagesToCollection(collectionId, Array.from(selectedIds));
        setAdding(false);

        if (result.success) {
            toast.success(`${selectedIds.size} images ajoutées !`);
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error("Erreur, réessayez.");
        }
    };

    // Filter images: logic checks if text matches description, mood, etc.
    const filteredImages = images.filter(img => {
        const alreadyIn = currentImageIds.includes(img.id);
        if (alreadyIn) return false; // Don't show images already in collection

        if (!search) return true;
        const lowSearch = search.toLowerCase();
        return (
            img.descriptionLong?.toLowerCase().includes(lowSearch) ||
            img.filename?.toLowerCase().includes(lowSearch) ||
            img.mood?.toLowerCase().includes(lowSearch)
        );
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 sm:p-6 pb-2">
                    <DialogTitle>Ajouter des images existantes</DialogTitle>
                    <DialogDescription>
                        Sélectionnez les images de votre galerie globale à ajouter à cette collection.
                    </DialogDescription>
                    <div className="relative mt-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par description, ambiance..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                            {filteredImages.length === 0 && (
                                <p className="col-span-full text-center text-muted-foreground py-10">Aucune image disponible.</p>
                            )}
                            {filteredImages.map((image) => {
                                const isSelected = selectedIds.has(image.id);
                                return (
                                    <div
                                        key={image.id}
                                        className={cn(
                                            "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                            isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-gray-200"
                                        )}
                                        onClick={() => handleToggle(image.id)}
                                    >
                                        <Image
                                            src={image.storageUrl}
                                            alt="Thumbnail"
                                            fill
                                            className="object-cover"
                                            sizes="200px"
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <CheckCircle2 className="h-8 w-8 text-white drop-shadow-md" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 sm:p-6 pt-2 border-t bg-muted/10">
                    <div className="flex w-full flex-col sm:flex-row justify-between items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                            {selectedIds.size} image{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                        </span>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Annuler</Button>
                            <Button size="sm" onClick={handleAdd} disabled={adding || selectedIds.size === 0} className="flex-1 sm:flex-none">
                                {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Ajouter
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
