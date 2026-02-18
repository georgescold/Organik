import { useState, useTransition, useEffect } from 'react';
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
import { updatePost } from '@/server/actions/analytics-actions';
import { getUserImages } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { Loader2, Trash, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EditPostDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    post: {
        id: string;
        title?: string | null;
        description?: string | null;
        hookText: string;
        createdAt?: string | Date; // Add createdAt to interface
        slides: any[]; // Accept slides
    };
}

export function EditPostDialog({ open, onOpenChange, post }: EditPostDialogProps) {
    const [title, setTitle] = useState(post.title || post.hookText || '');
    const [description, setDescription] = useState(post.description || '');
    // Initialize date safely. If string, split. If Date, toISOString.
    const getInitialDate = () => {
        if (!post.createdAt) return new Date().toISOString().split('T')[0];
        const d = new Date(post.createdAt);
        return d.toISOString().split('T')[0];
    };
    const [date, setDate] = useState(getInitialDate());

    const [slides, setSlides] = useState<any[]>(post.slides || []);
    const [isPending, startTransition] = useTransition();

    // Image Picker State
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [pickingSlideIndex, setPickingSlideIndex] = useState<number | null>(null);
    const [userImages, setUserImages] = useState<any[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);

    useEffect(() => {
        // Reset state when post changes or dialog opens
        if (open) {
            setTitle(post.title || post.hookText || '');
            setDescription(post.description || '');
            // Update date when post changes
            const d = post.createdAt ? new Date(post.createdAt) : new Date();
            setDate(d.toISOString().split('T')[0]);
            setSlides(post.slides || []);
        }
    }, [open, post]);

    const handleSave = () => {
        startTransition(async () => {
            const result = await updatePost(post.id, { title, description, date, slides });
            if (result.success) {
                toast.success('Post mis à jour !');
                onOpenChange(false);
            } else {
                toast.error('Erreur lors de la mise à jour');
            }
        });
    };

    // Logic Functions (Mirrored from CreationView)
    const handleAddSlide = () => {
        const newSlide = {
            slide_number: slides.length + 1,
            text: "Nouveau texte",
            intention: "Nouvelle slide manuelle",
            image_id: null
        };
        setSlides([...slides, newSlide]);
    };

    const handleDeleteSlide = (index: number) => {
        const newSlides = slides.filter((_, i) => i !== index);
        const reindexed = newSlides.map((s, i) => ({ ...s, slide_number: i + 1 }));
        setSlides(reindexed);
    };

    const handleTextChange = (index: number, text: string) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], text };
        setSlides(newSlides);
    };

    const handleOpenImagePicker = async (index: number) => {
        setPickingSlideIndex(index);
        setIsImagePickerOpen(true);
        if (userImages.length === 0) {
            setIsLoadingImages(true);
            const res = await getUserImages();
            if (res.success && res.images) {
                setUserImages(res.images);
            } else {
                toast.error("Impossible de charger vos images");
            }
            setIsLoadingImages(false);
        }
    };

    const handleSelectImage = (image: any) => {
        if (pickingSlideIndex !== null) {
            const newSlides = [...slides];
            newSlides[pickingSlideIndex] = {
                ...newSlides[pickingSlideIndex],
                image_id: image.id,
                imageId: image.id, // Support both
                imageUrl: image.storageUrl,
                imageHumanId: image.humanId
            };
            setSlides(newSlides);
            setIsImagePickerOpen(false);
            setPickingSlideIndex(null);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
                    <DialogHeader>
                        <DialogTitle>Modifier le post</DialogTitle>
                        <DialogDescription>
                            Modifie les métadonnées et le contenu du post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                            <Label htmlFor="title" className="sm:text-right">Titre</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="sm:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                            <Label htmlFor="desc" className="sm:text-right">Description</Label>
                            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="sm:col-span-3" rows={4} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                            <Label htmlFor="date" className="sm:text-right">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="sm:col-span-3"
                            />
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">Slides</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {slides.map((slide, index) => (
                                    <Card key={`${slide.slide_number}-${index}`} className="overflow-hidden border-border/50 bg-card/30 flex flex-col relative group/card">
                                        {/* Delete Button - Top Left */}
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 left-2 z-20 h-7 w-7 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Supprimer cette slide ?")) handleDeleteSlide(index);
                                            }}
                                        >
                                            <Trash className="w-3.5 h-3.5" />
                                        </Button>

                                        {/* Change Image Button - Top Right (Icon only) */}
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            className="absolute top-2 right-2 z-20 h-7 w-7 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity shadow-sm bg-white/10 hover:bg-white/20 text-white border-none"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenImagePicker(index);
                                            }}
                                            title="Changer l'image"
                                        >
                                            <ImageIcon className="w-3.5 h-3.5" />
                                        </Button>

                                        <div className="aspect-[9/16] bg-black relative group flex-shrink-0">
                                            {slide.imageUrl || slide.image_url ? (
                                                <img src={slide.imageUrl || slide.image_url} className="w-full h-full object-cover" alt="Slide visual" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                                                    Pas d'image
                                                </div>
                                            )}

                                            {/* Slide Number Badge */}
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-[10px] pointer-events-none z-10">
                                                {index + 1}/{slides.length}
                                            </div>
                                        </div>

                                        {/* Text Section Below Image */}
                                        <div className="flex-grow bg-card p-4 flex flex-col gap-2 border-t border-border/50">
                                            <textarea
                                                value={slide.text}
                                                onChange={(e) => handleTextChange(index, e.target.value)}
                                                className="w-full min-h-[100px] flex-grow bg-muted/30 border border-transparent hover:border-border/50 focus:border-primary/50 text-foreground text-sm p-3 rounded-lg resize-none focus:outline-none transition-all placeholder:text-muted-foreground/50"
                                                spellCheck={false}
                                                placeholder="Texte de la slide..."
                                            />

                                            {(slide.intention || slide.description) && (
                                                <div className="pt-2 border-t border-border/20">
                                                    <p className="text-[10px] text-muted-foreground/70 font-mono uppercase tracking-wider truncate" title={slide.intention || slide.description}>
                                                        {slide.intention || slide.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                {/* Add Slide Button */}
                                <Card className="border-dashed border-2 border-border/50 bg-card/10 flex flex-col items-center justify-center cursor-pointer hover:bg-card/20 hover:border-primary/50 transition-all min-h-[300px] aspect-[9/16]" onClick={handleAddSlide}>
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground group">
                                        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Sparkles className="w-6 h-6 text-primary" />
                                        </div>
                                        <span className="font-semibold text-sm">Ajouter une slide</span>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" onClick={handleSave} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Picker Dialog (Nested) - Reusing simpler rendering for simplicity */}
            <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
                <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-4xl max-h-[80vh] flex flex-col pt-10">
                    <DialogHeader>
                        <DialogTitle>Choisir une image</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-[300px] p-2">
                        {isLoadingImages ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {userImages.map((img) => (
                                    <div
                                        key={img.id}
                                        className="relative aspect-[9/16] cursor-pointer group rounded-lg overflow-hidden border border-border/50 hover:border-primary transition-all"
                                        onClick={() => handleSelectImage(img)}
                                    >
                                        <img
                                            src={img.storageUrl}
                                            alt={img.descriptionLong || "Image"}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
