'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface EditSlideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slide: {
        text: string;
        imageUrl?: string;
    };
    onSave: (newText: string) => Promise<void>;
}

export function EditSlideDialog({ open, onOpenChange, slide, onSave }: EditSlideDialogProps) {
    const [text, setText] = useState(slide.text);
    const [isLoading, setIsLoading] = useState(false);

    // Sync text if slide changes
    useEffect(() => { setText(slide.text); }, [slide]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onSave(text);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            // Optionally show error toast here if not handled by parent, but parent likely handles logic errors.
            // This catch is for unexpected runtime errors.
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Modifier la slide</DialogTitle>
                    <DialogDescription>
                        Ajuste le texte de cette slide.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {slide.imageUrl && (
                        <div className="relative w-32 h-48 mx-auto rounded-lg overflow-hidden border border-border">
                            <Image
                                src={slide.imageUrl}
                                alt="Slide preview"
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="slide-text">
                            Texte de la slide
                        </Label>
                        <Textarea
                            id="slide-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
