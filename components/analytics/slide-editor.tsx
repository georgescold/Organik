'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon } from 'lucide-react';
import { SlideData, UserImage } from '@/types/post';
import Image from 'next/image';
import { ImagePickerModal } from './image-picker-modal';

type SlideEditorProps = {
    slide: SlideData;
    index: number;
    images: UserImage[];
    onChange: (index: number, slide: SlideData) => void;
    onRemove: (index: number) => void;
    canRemove: boolean;
};

export function SlideEditor({ slide, index, images, onChange, onRemove, canRemove }: SlideEditorProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const selectedImage = images.find(img => img.id === slide.imageId);

    const handleImageSelect = (image: UserImage) => {
        onChange(index, {
            ...slide,
            imageId: image.id,
            imageHumanId: image.humanId,
            description: image.descriptionLong,
        });
    };

    const handleTextChange = (text: string) => {
        onChange(index, { ...slide, text });
    };

    return (
        <div className="border-2 border-border rounded-lg p-4 space-y-4 bg-card relative">
            {/* Remove Button */}
            {canRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(index)}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}

            <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Slide {index + 1}</span>
            </div>

            {/* Image Selector Button */}
            <div className="space-y-2">
                <Label>Image (de la collection)</Label>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setPickerOpen(true)}
                >
                    {selectedImage ? (
                        <span className="truncate">
                            <span className="font-bold text-primary">{selectedImage.humanId}</span>
                            {' - '}
                            <span className="text-muted-foreground">{selectedImage.descriptionLong.substring(0, 40)}...</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Choisir une image...</span>
                    )}
                </Button>
            </div>

            {/* Image Preview */}
            {selectedImage && (
                <div className="space-y-2">
                    <div className="relative w-full h-32 bg-muted rounded-md overflow-hidden border-2 border-primary/20">
                        <Image
                            src={selectedImage.storageUrl}
                            alt={selectedImage.humanId}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                        {selectedImage.descriptionLong}
                    </p>
                </div>
            )}

            {/* Slide Text */}
            <div className="space-y-2">
                <Label htmlFor={`text-${index}`}>Texte de la slide</Label>
                <Textarea
                    id={`text-${index}`}
                    placeholder="Texte à afficher sur cette slide..."
                    value={slide.text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={3}
                    className="resize-none"
                />
            </div>

            {/* Image Picker Modal */}
            <ImagePickerModal
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                images={images}
                selectedImageId={slide.imageId}
                onSelect={handleImageSelect}
            />
        </div>
    );
}
