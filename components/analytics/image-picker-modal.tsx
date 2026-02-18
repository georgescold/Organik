'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserImage } from '@/types/post';
import Image from 'next/image';
import { Check } from 'lucide-react';

type ImagePickerModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    images: UserImage[];
    selectedImageId?: string;
    onSelect: (image: UserImage) => void;
};

export function ImagePickerModal({ open, onOpenChange, images, selectedImageId, onSelect }: ImagePickerModalProps) {
    const handleImageClick = (image: UserImage) => {
        onSelect(image);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-3 md:p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl md:text-2xl font-black">Choisir une image de votre collection</DialogTitle>
                    <DialogDescription className="text-sm">
                        Sélectionnez une image pour cette slide
                    </DialogDescription>
                </DialogHeader>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto pr-2">
                    {images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <p className="text-muted-foreground mb-4">
                                Aucune image dans votre collection
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Ajoutez des images dans l'onglet Collections pour pouvoir les utiliser
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-4">
                            {images.map((img) => (
                                <button
                                    key={img.id}
                                    onClick={() => handleImageClick(img)}
                                    className={`
                                        group relative rounded-lg overflow-hidden border-2 transition-all
                                        hover:scale-105 hover:shadow-lg
                                        ${selectedImageId === img.id
                                            ? 'border-primary shadow-[0_0_0_2px_var(--color-primary)]'
                                            : 'border-border hover:border-primary/50'
                                        }
                                    `}
                                >
                                    {/* Image */}
                                    <div className="relative aspect-square bg-muted">
                                        <Image
                                            src={img.storageUrl}
                                            alt={img.humanId}
                                            fill
                                            className="object-cover"
                                        />
                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                                        {/* Selected indicator */}
                                        {selectedImageId === img.id && (
                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                                <Check className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Image Info */}
                                    <div className="p-2 bg-card">
                                        <p className="font-bold text-xs text-primary truncate">{img.humanId}</p>
                                        <p className="text-xs text-muted-foreground truncate line-clamp-2">
                                            {img.descriptionLong}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
