'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateHooks, generateCarousel, saveCarousel, getDrafts, updatePostContent, saveHookAsIdea, getSavedIdeas, deletePost, rejectHook, generateReplacementHook, generateVariations, getPost, scoreCarouselBeforePublish, improveCarouselFromScore, HookProposal, Slide } from '@/server/actions/creation-actions';
import { parseTwemojiAsync } from '@/lib/use-twemoji';
import { retryFailedAnalyses, getUserImages } from '@/server/actions/image-actions';
import { getUserCollections } from '@/server/actions/collection-actions';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, RefreshCw, FileText, Clock, ArrowRight, Bookmark, Lightbulb, User, Trash, Image as ImageIcon, X, Target, Copy, Wand2, RefreshCcw, Download, Undo2 } from 'lucide-react';
import { PostCopyModal } from './post-copy-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
// file-saver is lazy-loaded in handleDownloadImages to reduce bundle
import { CarouselEditor } from '@/components/smart-carousel/carousel-editor';
import type { EditorSlide, TextLayer, UserImage } from '@/types/post';

/**
 * Estimate the rendered height of a text block as a percentage of the canvas.
 * Uses word-wrap estimation to count lines, then converts to % of canvas height.
 */
function estimateTextHeightPercent(text: string, fontSize: number, lineHeight: number, maxWidth: number): number {
    const avgCharWidth = fontSize * 0.55; // Montserrat Bold approx
    const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth));
    const words = text.split(/\s+/);
    let lines = 1;
    let currentLen = 0;
    for (const word of words) {
        if (currentLen + word.length > charsPerLine && currentLen > 0) {
            lines++;
            currentLen = word.length;
        } else {
            currentLen += (currentLen > 0 ? 1 : 0) + word.length;
        }
    }
    // Editor canvas is ~350px wide at 9:16 → ~622px tall
    const heightPx = lines * fontSize * lineHeight;
    return (heightPx / 622) * 100;
}

/**
 * Detect overlapping text layers and redistribute them vertically.
 * Called after initial positioning to ensure no text blocks overlap.
 */
function fixTextOverlaps(layers: import('@/types/post').TextLayer[]): void {
    if (layers.length < 2) return;
    // Sort by y position (topmost first)
    const sorted = [...layers].sort((a, b) => a.y - b.y);
    for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const aH = estimateTextHeightPercent(a.content, a.fontSize, a.lineHeight || 1.5, a.maxWidth || 300);
        const bH = estimateTextHeightPercent(b.content, b.fontSize, b.lineHeight || 1.5, b.maxWidth || 300);
        const aBottom = a.y + aH / 2;
        const bTop = b.y - bH / 2;
        const gap = 3; // minimum 3% gap
        if (aBottom + gap > bTop) {
            // Overlap detected — push blocks apart symmetrically
            const totalNeeded = aH / 2 + gap + bH / 2;
            const center = (a.y + b.y) / 2;
            const newAy = Math.max(aH / 2 + 2, center - totalNeeded / 2);
            const newBy = Math.min(100 - bH / 2 - 2, center + totalNeeded / 2);
            // Update the original layer references
            const layerA = layers.find(l => l.id === a.id);
            const layerB = layers.find(l => l.id === b.id);
            if (layerA) layerA.y = newAy;
            if (layerB) layerB.y = newBy;
        }
    }
}

interface CreationViewProps {
    initialPost?: {
        id: string;
        hookText: string;
        slides: string | null; // JSON string
        status: string;
    };
}

export function CreationView({ initialPost }: CreationViewProps) {
    const [step, setStep] = useState<'hooks' | 'preview'>('hooks');
    const [hooks, setHooks] = useState<HookProposal[]>([]);
    const [selectedHook, setSelectedHook] = useState<HookProposal | null>(null);

    const [slides, setSlides] = useState<Slide[]>([]);
    const [description, setDescription] = useState("");
    const [drafts, setDrafts] = useState<any[]>([]);
    const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]); // [NEW]
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>(''); // [NEW] Forced choice

    const [isPending, startTransition] = useTransition();
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [isCanvaEditorOpen, setIsCanvaEditorOpen] = useState(false);
    const [editorSlides, setEditorSlides] = useState<EditorSlide[]>([]);
    const [predictiveScore, setPredictiveScore] = useState<any>(null);
    const [isScoring, setIsScoring] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [selectedImprovements, setSelectedImprovements] = useState<Set<number>>(new Set());
    const [appliedImprovements, setAppliedImprovements] = useState<Set<number>>(new Set());
    const [slidesBeforeImprove, setSlidesBeforeImprove] = useState<Slide[] | null>(null);
    const [generationPhase, setGenerationPhase] = useState<'idle' | 'generating' | 'scoring' | 'improving'>('idle');
    const [showConfirmSave, setShowConfirmSave] = useState(false);
    const inlineConfigRef = useRef<HTMLDivElement>(null);
    const slidesPreviewRef = useRef<HTMLDivElement>(null);

    // Convert current slides to EditorSlide format for the Canva editor
    // Splits text on double newlines into separate layers for TikTok-like layout
    // EXCEPT for the last slide (CTA) which stays as a single block
    const convertToEditorSlides = (): EditorSlide[] => {
        return slides.map((slide, idx) => {
            const fullText = slide.text || '';
            const isLastSlide = idx === slides.length - 1;
            // Split on double newline (paragraph break) to create separate text zones
            // Don't split the last slide (CTA) — it's the creator's personal message
            const paragraphs = isLastSlide
                ? [fullText.trim()].filter(Boolean)
                : fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
            const hasSplit = paragraphs.length > 1;

            const layers: TextLayer[] = paragraphs.map((paragraph, pIdx) => {
                const textLength = paragraph.length;
                let autoFontSize: number;
                if (idx === 0 && pIdx === 0) {
                    autoFontSize = textLength > 80 ? 24 : textLength > 50 ? 28 : 34;
                } else if (pIdx === 0) {
                    autoFontSize = textLength > 80 ? 22 : textLength > 40 ? 26 : 30;
                } else {
                    // Secondary paragraph (subtitle) — smaller
                    autoFontSize = textLength > 60 ? 20 : textLength > 30 ? 22 : 26;
                }

                // Position: first paragraph higher, second lower
                let yPos = 50;
                if (hasSplit) {
                    yPos = pIdx === 0 ? 40 : 62;
                }

                return {
                    id: `text-${slide.slide_number}-${pIdx}`,
                    type: 'text' as const,
                    content: paragraph,
                    x: 50,
                    y: yPos,
                    rotation: 0,
                    opacity: 100,
                    zIndex: pIdx + 1,
                    fontSize: autoFontSize,
                    fontFamily: 'Montserrat',
                    fontWeight: '700',
                    fontStyle: 'normal' as const,
                    textAlign: 'center' as const,
                    color: '#ffffff',
                    outlineColor: '#000000',
                    outlineWidth: 1.5,
                    lineHeight: 1.5,
                    maxWidth: 300,
                    textMode: 'outline' as const,
                };
            });

            // Detect and fix overlapping text layers
            fixTextOverlaps(layers);

            return {
                id: String(slide.slide_number),
                backgroundColor: '#1a1a2e',
                backgroundImage: slide.image_url ? {
                    imageId: slide.image_id || '',
                    imageUrl: slide.image_url,
                    objectFit: 'cover' as const,
                    objectPosition: 'center',
                    scale: 1,
                    filter: { brightness: 100, contrast: 100, blur: 0 },
                } : undefined,
                layers,
            };
        });
    };

    // Convert EditorSlides back to the original Slide format
    const convertFromEditorSlides = (editorSlides: EditorSlide[]): Slide[] => {
        return editorSlides.map((es, idx) => {
            // Find the main text layer
            const textLayer = es.layers.find(l => l.type === 'text') as TextLayer | undefined;
            return {
                slide_number: idx + 1,
                text: textLayer?.content || '',
                intention: slides[idx]?.intention || 'Custom',
                image_id: es.backgroundImage?.imageId,
                image_url: es.backgroundImage?.imageUrl,
            };
        });
    };

    const openCanvaEditor = () => {
        const converted = convertToEditorSlides();
        setEditorSlides(converted);
        setIsCanvaEditorOpen(true);
    };

    const handleCanvaEditorSave = (updatedSlides: EditorSlide[]) => {
        const converted = convertFromEditorSlides(updatedSlides);
        setSlides(converted);
        setIsCanvaEditorOpen(false);
        toast.success("Modifications appliquees !");
    };

    const handleCopyPost = (post: any, isCompetitor: boolean) => {
        if (isCompetitor) {
            // Competitor Post: Use as inspiration (Hook)
            setSelectedHook({
                id: `comp-${post.id}`,
                angle: "Remix Concurrent",
                hook: post.title || post.description || "Hook inspiré",
                reason: "Basé sur un post concurrent performant",
                type: 'optimized'
            });
            setStep('hooks');
        } else {
            // User Post: Full Resume (Clone)
            try {
                const parsedSlides = JSON.parse(post.slides || '[]');
                setSlides(parsedSlides);
                setDescription(post.description || "");
                setSelectedHook({
                    id: `clone-${post.id}`,
                    angle: post.title || "Clone",
                    hook: post.hookText || "Post Cloned",
                    reason: "Reprise d'un post existant"
                });
                setEditingId(null); // distinct from resumeDraft, this is a new copy
                setStep('preview');
                toast.success("Post dupliqué !");
            } catch (e) {
                toast.error("Erreur lors de la copie du post");
            }
        }
    };

    // Image Picker State
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [pickingSlideIndex, setPickingSlideIndex] = useState<number | null>(null);
    const [userImages, setUserImages] = useState<any[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);

    const loadDrafts = async () => {
        const [draftsRes, ideasRes, collectionsRes] = await Promise.all([getDrafts(), getSavedIdeas(), getUserCollections()]);
        if (draftsRes.success && draftsRes.drafts) {
            setDrafts(draftsRes.drafts);
        }
        if (ideasRes.success && ideasRes.ideas) setSavedIdeas(ideasRes.ideas);
        if (collectionsRes.success && collectionsRes.collections) setCollections(collectionsRes.collections);
    };

    useEffect(() => {
        loadDrafts();
    }, []);

    // Listen for remix hook from competitor tab
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.hook) {
                setSelectedHook({
                    id: `remix-${Date.now()}`,
                    angle: detail.angle || 'Remix Concurrent',
                    hook: detail.hook,
                    reason: detail.reason || 'Basé sur un post concurrent performant',
                    type: 'optimized'
                });
                setEditingId(null);
                setStep('hooks');
                toast.success("Hook remix chargé ! Choisissez une collection pour générer.");
            }
        };
        window.addEventListener('remix-hook-selected', handler);
        return () => window.removeEventListener('remix-hook-selected', handler);
    }, []);

    // Load initial post data if editing
    useEffect(() => {
        if (initialPost && initialPost.slides) {
            try {
                const parsedSlides = JSON.parse(initialPost.slides);
                setSlides(parsedSlides);
                setSelectedHook({
                    id: `edit-${initialPost.id}`,
                    angle: initialPost.hookText,
                    hook: initialPost.hookText,
                    reason: "Édition d'un post existant",
                    type: 'optimized'
                });
                setEditingId(initialPost.id);
                setStep('preview');
                toast.success("Post chargé pour édition");
            } catch (e) {
                console.error('Error loading initial post:', e);
                toast.error("Erreur lors du chargement du post");
            }
        }
    }, [initialPost]);

    useEffect(() => {
        if (step === 'hooks') {
            getUserCollections().then(res => {
                if (res.success && res.collections) setCollections(res.collections);
            });
        }
    }, [step]);

    // Scroll to inline config when a hook is selected (important on mobile)
    useEffect(() => {
        if (selectedHook && inlineConfigRef.current) {
            setTimeout(() => {
                inlineConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [selectedHook]);

    // Force Twemoji parsing on slide preview after slides change
    // Uses async version to ensure Twemoji script is loaded first
    useEffect(() => {
        if (slides.length > 0 && slidesPreviewRef.current) {
            const timer = setTimeout(() => {
                parseTwemojiAsync(slidesPreviewRef.current);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [slides]);

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
                image_url: image.storageUrl
            };
            setSlides(newSlides);
            setIsImagePickerOpen(false);
            setPickingSlideIndex(null);
        }
    };

    const handleGenerateHooks = () => {
        startTransition(async () => {
            const result = await generateHooks();
            if (result.error) toast.error(result.error);
            else if (result.hooks) {
                // Assign unique IDs to each hook (API returns hooks without id)
                setHooks(result.hooks.map((h: HookProposal) => ({ ...h, id: h.id || crypto.randomUUID() })));
                setEditingId(null);
            }
        });
    };

    const handleRejectHook = (index: number, hook: HookProposal) => {
        setReplacingIndex(index);
        startTransition(async () => {
            await rejectHook(hook);
            const res = await generateReplacementHook(hook);
            if (res.hook) {
                const newHooks = [...hooks];
                // Ensure the replacement preserves the original type (wildcard stays wildcard)
                newHooks[index] = {
                    ...res.hook,
                    type: res.hook.type || hook.type || 'optimized',
                    id: res.hook.id || crypto.randomUUID()
                };
                setHooks(newHooks);
                toast.success("Nouvel angle généré !");
            } else {
                toast.error("Impossible de remplacer ce hook");
            }
            setReplacingIndex(null);
        });
    };

    const handleGenerateVariations = (index: number, hook: HookProposal) => {
        setReplacingIndex(index); // Use replacing index to show loading state on the card
        startTransition(async () => {
            const result = await generateVariations(hook);
            if (result.error) toast.error(result.error);
            else if (result.hooks) {
                // Assign unique IDs to each variation (API returns hooks without id)
                setHooks(result.hooks.map((h: HookProposal) => ({ ...h, id: h.id || crypto.randomUUID() })));
                toast.success("Variations générées !");
            }
            setReplacingIndex(null);
        });
    };

    const handleAddSlide = () => {
        const newSlide: Slide = {
            slide_number: slides.length + 1,
            text: "Nouveau texte",
            intention: "Nouvelle slide manuelle"
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

    const handleGenerateCarousel = () => {
        if (!selectedHook) return;
        if (!selectedCollectionId) {
            toast.error("Veuillez sélectionner une collection d'images pour continuer");
            return;
        }
        startTransition(async () => {
            // Phase 1: Generate carousel (slides + images)
            setGenerationPhase('generating');
            const result = await generateCarousel(selectedHook.hook, selectedCollectionId);
            if (result.error) {
                toast.error(result.error);
                setGenerationPhase('idle');
                return;
            }
            if (!result.slides) {
                setGenerationPhase('idle');
                return;
            }

            setSlides(result.slides);
            setDescription(result.description || "");
            if (result.warning) toast.warning(result.warning);

            // Phase 2: Auto-score (predictive analysis)
            setGenerationPhase('scoring');
            try {
                const scoreRes = await scoreCarouselBeforePublish(selectedHook.hook, result.slides);

                if (scoreRes.success && scoreRes.score) {
                    const score = scoreRes.score;

                    // Phase 3: Auto-improve if score < 75 and improvements exist
                    if (score.total < 75 && score.improvements?.length > 0) {
                        setGenerationPhase('improving');
                        const improveRes = await improveCarouselFromScore(
                            selectedHook.hook,
                            result.slides,
                            score.improvements,
                            score.scores
                        );

                        if (improveRes.success && improveRes.slides) {
                            setSlides(improveRes.slides);

                            // Re-score after improvement to show final score
                            setGenerationPhase('scoring');
                            const finalScoreRes = await scoreCarouselBeforePublish(selectedHook.hook, improveRes.slides);
                            if (finalScoreRes.success && finalScoreRes.score) {
                                setPredictiveScore(finalScoreRes.score);
                            } else {
                                setPredictiveScore(score); // fallback to pre-improvement score
                            }
                        } else {
                            setPredictiveScore(score); // improvement failed, show original score
                        }
                    } else {
                        setPredictiveScore(score); // score >= 75, no improvement needed
                    }
                }
                // If scoring failed entirely, just show slides without score
            } catch (e) {
                console.error("Auto-review failed:", e);
                toast.warning("Analyse prédictive indisponible. Vous pouvez la relancer manuellement.");
            }

            setGenerationPhase('idle');
            setStep('preview');
        });
    };

    const handleDownloadImages = async () => {
        if (!slides.length) return;

        let downloadedCount = 0;
        const loadingToast = toast.loading("Téléchargement des slides...");
        const { saveAs } = await import('file-saver');

        const W = 1080, H = 1920;

        try {
            for (const slide of slides) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = W;
                    canvas.height = H;
                    const ctx = canvas.getContext('2d', { alpha: false })!;
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Black background
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, W, H);

                    // Background image — draw with object-fit:cover logic
                    if (slide.image_url) {
                        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                            const i = new Image();
                            i.crossOrigin = 'anonymous';
                            i.onload = () => resolve(i);
                            i.onerror = () => reject(new Error('Image load failed'));
                            i.src = slide.image_url!;
                            setTimeout(() => reject(new Error('Image timeout')), 8000);
                        }).catch(() => null);

                        if (img) {
                            // object-fit:cover — scale to fill then center-crop
                            const imgRatio = img.naturalWidth / img.naturalHeight;
                            const canvasRatio = W / H;
                            let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
                            if (imgRatio > canvasRatio) {
                                // Image is wider — crop sides
                                sw = img.naturalHeight * canvasRatio;
                                sx = (img.naturalWidth - sw) / 2;
                            } else {
                                // Image is taller — crop top/bottom
                                sh = img.naturalWidth / canvasRatio;
                                sy = (img.naturalHeight - sh) / 2;
                            }
                            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
                        }
                    }

                    // Text overlay
                    const fullText = (slide.text || '').trim();
                    if (fullText) {
                        const isLastSlide = slide.slide_number === slides.length;
                        const isHook = slide.slide_number === 1;
                        const totalLen = fullText.length;

                        let fontSize: number;
                        if (isHook) { fontSize = totalLen > 80 ? 52 : totalLen > 50 ? 60 : 72; }
                        else if (isLastSlide) {
                            if (totalLen > 300) fontSize = 30;
                            else if (totalLen > 250) fontSize = 34;
                            else if (totalLen > 180) fontSize = 38;
                            else if (totalLen > 120) fontSize = 44;
                            else if (totalLen > 80) fontSize = 48;
                            else fontSize = 52;
                        } else {
                            if (totalLen > 120) fontSize = 40;
                            else if (totalLen > 80) fontSize = 48;
                            else if (totalLen > 40) fontSize = 52;
                            else fontSize = 60;
                        }

                        const padding = 50;
                        const maxTextW = W - padding * 2;
                        const lineH = fontSize * 1.5;

                        ctx.font = `700 ${fontSize}px Montserrat, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';

                        // Word-wrap text into lines
                        const lines: string[] = [];
                        const rawLines = fullText.split('\n');
                        for (const rawLine of rawLines) {
                            if (!rawLine.trim()) { lines.push(''); continue; }
                            const words = rawLine.split(' ');
                            let current = '';
                            for (const word of words) {
                                const test = current ? `${current} ${word}` : word;
                                if (ctx.measureText(test).width > maxTextW && current) {
                                    lines.push(current);
                                    current = word;
                                } else {
                                    current = test;
                                }
                            }
                            if (current) lines.push(current);
                        }

                        const totalTextH = lines.length * lineH;
                        const startY = (H - totalTextH) / 2;

                        // Draw each line with outline + fill
                        for (let li = 0; li < lines.length; li++) {
                            const y = startY + li * lineH;
                            const x = W / 2;

                            // Black outline (stroke text multiple times)
                            ctx.strokeStyle = '#000';
                            ctx.lineWidth = 10;
                            ctx.lineJoin = 'round';
                            ctx.miterLimit = 2;
                            ctx.strokeText(lines[li], x, y);

                            // White fill
                            ctx.fillStyle = '#fff';
                            ctx.fillText(lines[li], x, y);
                        }
                    }

                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1));
                    if (blob) {
                        saveAs(blob, `slide-${slide.slide_number}.png`);
                        downloadedCount++;
                    }

                    if (slide.slide_number < slides.length) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                } catch (err) {
                    console.error(`Failed to export slide ${slide.slide_number}`, err);
                }
            }

            if (downloadedCount === 0) {
                toast.error("Aucune slide exportée.");
            } else {
                toast.success(`${downloadedCount} slide${downloadedCount > 1 ? 's' : ''} exportée${downloadedCount > 1 ? 's' : ''} !`);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de l'export.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleSave = (asDraft = false) => {
        startTransition(async () => {
            if (!selectedHook) return;

            if (editingId) {
                // Update existing post (draft or published)
                const res = await updatePostContent(editingId, slides, description, asDraft ? 'draft' : 'created');
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(asDraft ? "Brouillon mis à jour !" : "Post mis à jour !");
                if (asDraft) {
                    // Stay on preview with draft context preserved
                    loadDrafts();
                } else {
                    setStep('hooks');
                    setHooks([]);
                    setSlides([]);
                    setDescription("");
                    setEditingId(null);
                    loadDrafts();
                }
            } else {
                // Create new
                const res = await saveCarousel(selectedHook.hook, slides, description, asDraft ? 'draft' : 'created');
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                // If this carousel was created from a saved idea, delete the idea
                const matchedIdea = savedIdeas.find(idea => idea.id === selectedHook.id);
                if (matchedIdea) {
                    await deletePost(matchedIdea.id);
                }
                toast.success(asDraft ? "Brouillon sauvegardé !" : "Carrousel sauvegardé !");
                if (asDraft) {
                    // Stay on preview — set editingId so future saves update instead of creating duplicates
                    if (res.postId) setEditingId(res.postId);
                    loadDrafts();
                } else {
                    setStep('hooks');
                    setHooks([]);
                    setSlides([]);
                    setDescription("");
                    loadDrafts();
                }
            }
        });
    };

    const handleSaveIdea = (hook: HookProposal) => {
        startTransition(async () => {
            const res = await saveHookAsIdea(hook);
            if (res.error) toast.error(res.error);
            else {
                toast.success("Idée sauvegardée !");
                loadDrafts(); // Refresh lists
            }
        });
    };

    const reloadDraftFromDatabase = async (draftId: string) => {
        startTransition(async () => {
            const result = await getPost(draftId);

            if (result.error || !result.post) {
                toast.error("Impossible de recharger le brouillon");
                return;
            }

            const post = result.post;

            if (!post.slides || post.slides === '' || post.slides === '[]') {
                toast.error("Ce brouillon n'a vraiment pas de slides dans la base de données.");
                return;
            }

            try {
                const parsedSlides = JSON.parse(post.slides);
                if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
                    setSlides(parsedSlides);
                    setDescription(post.description || "");
                    setSelectedHook({ id: 'draft', angle: 'Draft', hook: post.hookText, reason: 'Resume' });
                    setEditingId(post.id);
                    setStep('preview');
                    toast.success(`${parsedSlides.length} slides rechargées avec succès !`);
                } else {
                    toast.error("Les slides rechargées sont vides");
                }
            } catch (e) {
                toast.error("Erreur lors du parsing des slides rechargées");
            }
        });
    };

    const resumeDraft = (draft: any) => {
        try {
            // Check if slides exist and are not empty string
            if (!draft.slides || draft.slides === '' || draft.slides === '[]') {
                toast.error("Ce brouillon ne contient pas de slides. Utilisez le bouton ci-dessous pour les recharger.", {
                    duration: 8000,
                    action: {
                        label: 'Recharger',
                        onClick: () => reloadDraftFromDatabase(draft.id)
                    }
                });
                // Stay on hooks step so user can select a collection inline
                setSlides([]);
                setDescription(draft.description || "");
                setSelectedHook({ id: 'draft', angle: 'Draft', hook: draft.hookText, reason: 'Resume' });
                setEditingId(draft.id);
                setStep('hooks');
                return;
            }

            const parsedSlides = JSON.parse(draft.slides);

            if (!Array.isArray(parsedSlides) || parsedSlides.length === 0) {
                toast.warning("Ce brouillon ne contient pas de slides valides.");
                setSlides([]);
                setDescription(draft.description || "");
                setSelectedHook({ id: 'draft', angle: 'Draft', hook: draft.hookText, reason: 'Resume' });
                setEditingId(draft.id);
                setStep('hooks');
            } else {
                setSlides(parsedSlides);
                setDescription(draft.description || "");
                setSelectedHook({ id: 'draft', angle: 'Draft', hook: draft.hookText, reason: 'Resume' });
                setEditingId(draft.id);
                setStep('preview');
            }

        } catch (e) {
            console.error('[CLIENT ERROR] Failed to parse draft slides:', e);
            console.error('[CLIENT ERROR] Draft data:', draft);
            console.error('[CLIENT ERROR] Slides value:', draft.slides);
            toast.error("Impossible d'ouvrir ce brouillon: " + ((e as Error).message || 'Erreur inconnue'));
        }
    };

    const handleDeleteDraft = async (id: string) => {
        const res = await deletePost(id);
        if (res.success) {
            toast.success("Brouillon supprimé");
            loadDrafts();
        } else {
            toast.error("Erreur lors de la suppression");
        }
    };

    // Creation Flow Stepper
    const steps = [
        { id: 'hooks', label: 'Angles', number: 1 },
        { id: 'preview', label: 'Preview', number: 2 },
    ] as const;

    const Stepper = () => (
        <div className="flex items-center justify-center gap-1 mb-6">
            {steps.map((s, idx) => {
                const isActive = s.id === step;
                const isPast = steps.findIndex(st => st.id === step) > idx;
                return (
                    <div key={s.id} className="flex items-center">
                        <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : isPast ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-primary-foreground/20' : isPast ? 'bg-primary/30' : 'bg-muted'}`}>
                                {isPast ? <Check className="w-3 h-3" /> : s.number}
                            </span>
                            <span className="hidden sm:inline">{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`w-6 sm:w-8 h-0.5 mx-1 rounded ${isPast ? 'bg-primary/50' : 'bg-border'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Step 1: Hooks
    if (step === 'hooks') {
        return (
            <div className="space-y-10 max-w-4xl mx-auto py-8 px-4">
                <Stepper />
                {/* Hero Section */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-3xl blur-xl" />
                    <Card className="relative bg-card/60 backdrop-blur-xl border-border/30 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 hidden md:block" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 hidden md:block" />

                        <CardHeader className="text-center space-y-4 pt-8 md:pt-12 pb-4 md:pb-6 relative z-10">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                    Studio de Création
                                </CardTitle>
                                <CardDescription className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
                                    Crée des contenus viraux qui captivent ton audience
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="pb-12 relative z-10">
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full md:w-auto">
                                    <Button
                                        size="lg"
                                        onClick={handleGenerateHooks}
                                        disabled={isPending}
                                        className="gap-3 text-base md:text-lg h-14 md:h-16 px-8 md:px-10 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 hover:scale-105 w-full md:w-auto"
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                                        )}
                                        Créer un post
                                    </Button>

                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => setIsCopyModalOpen(true)}
                                        className="gap-3 text-base md:text-lg h-14 md:h-16 px-6 rounded-2xl border-2 hover:bg-muted/50 transition-all duration-300 hover:scale-105 w-full md:w-auto"
                                    >
                                        <Copy className="w-5 h-5 md:w-6 md:h-6" />
                                        Copier un post
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground/70 text-center px-4">
                                    L'IA va analyser les tendances et te proposer des angles viraux
                                </p>
                            </div>
                        </CardContent>

                        <PostCopyModal
                            isOpen={isCopyModalOpen}
                            onClose={() => setIsCopyModalOpen(false)}
                            onSelectPost={handleCopyPost}
                        />
                    </Card>
                </div>

                {
                    hooks.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" /> Concepts Générés
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleGenerateHooks}
                                    disabled={isPending}
                                    className="text-muted-foreground hover:text-primary gap-2"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                    Régénérer tout
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                {hooks.map((h, i) => (
                                    <Card key={h.id || i}
                                        onClick={(e) => {
                                            // Don't toggle if click came from a button inside
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            setSelectedHook(selectedHook?.id === h.id ? null : h);
                                        }}
                                        className={`cursor-pointer transition-all group bg-card backdrop-blur relative ${replacingIndex === i ? 'opacity-50 pointer-events-none' : ''} ${selectedHook?.id === h.id ? 'border-primary ring-2 ring-primary/30 scale-[1.02]' : selectedHook ? 'opacity-80 hover:opacity-100' : 'hover:border-primary hover:scale-105'}`}
                                    >
                                        {/* Reject Button (Red Cross) */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 z-20 h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Cet angle ne vous plaît pas ? Je vais en générer un autre.")) {
                                                    handleRejectHook(i, h);
                                                }
                                            }}
                                            title="Invalider et remplacer"
                                            disabled={replacingIndex === i}
                                        >
                                            {replacingIndex === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
                                        </Button>

                                        {/* Action Buttons (Top Right) */}
                                        <div className="absolute top-2 right-12 z-20 flex gap-1 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateVariations(i, h);
                                                }}
                                                title="Générer des variations à partir de ce concept"
                                                disabled={isPending || replacingIndex === i}
                                            >
                                                {replacingIndex === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            </Button>
                                        </div>

                                        {/* Type Badge */}
                                        <div className="absolute top-2 left-2 z-20">
                                            {h.type === 'wildcard' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/50">
                                                    <Sparkles className="w-3 h-3 mr-1" /> WILDCARD
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/50">
                                                    <Target className="w-3 h-3 mr-1" /> OPTIMIZED
                                                </span>
                                            )}
                                        </div>

                                        <CardHeader className="pt-8"> {/* Added padding for badge */}
                                            <div className="text-xs font-mono text-primary mb-2 uppercase tracking-wide">{h.angle}</div>
                                            <CardTitle className="leading-tight text-lg min-h-[60px]" data-twemoji>"{h.hook}"</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">{h.reason}</p>
                                        </CardContent>
                                        <CardFooter className="grid grid-cols-4 gap-2">
                                            <Button
                                                variant={savedIdeas.some(idea => idea.hookText === h.hook) ? "default" : "outline"}
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); handleSaveIdea(h); }}
                                                title={savedIdeas.some(idea => idea.hookText === h.hook) ? "Idée sauvegardée" : "Sauvegarder pour plus tard"}
                                                className={`transition-colors ${savedIdeas.some(idea => idea.hookText === h.hook)
                                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                    : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                                    }`}
                                            >
                                                <Bookmark className={`w-4 h-4 ${savedIdeas.some(idea => idea.hookText === h.hook) ? "fill-current" : ""}`} />
                                            </Button>
                                            <Button className={`col-span-3 transition-colors ${selectedHook?.id === h.id ? 'bg-primary text-primary-foreground' : 'group-hover:bg-primary group-hover:text-primary-foreground'}`} onClick={(e) => {
                                                e.stopPropagation();
                                                if (selectedHook?.id === h.id) {
                                                    // Already selected — scroll to config instead of deselecting
                                                    setTimeout(() => inlineConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                                                } else {
                                                    setSelectedHook(h);
                                                }
                                            }}>
                                                {selectedHook?.id === h.id ? 'Sélectionné ✓' : 'Choisir'}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Inline Config - shown when a hook is selected */}
                {selectedHook && (
                    <div ref={inlineConfigRef} className="animate-in fade-in slide-in-from-top-2 duration-300 max-w-lg mx-auto">
                        <Card className="p-4 sm:p-5 space-y-4 border-primary/30 bg-card/60 backdrop-blur">
                            <div className="text-sm text-muted-foreground text-center truncate px-2">
                                <span className="font-medium text-foreground">"{selectedHook.hook}"</span>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Source des images</label>
                                <select
                                    value={selectedCollectionId}
                                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="" disabled>-- Collection --</option>
                                    <option value="all">Toutes mes images</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c._count?.images || 0})</option>
                                    ))}
                                </select>
                            </div>
                            <Button className="w-full" onClick={handleGenerateCarousel} disabled={isPending}>
                                {isPending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {generationPhase === 'scoring' ? 'Analyse predictive...' :
                                     generationPhase === 'improving' ? 'Optimisation...' :
                                     'Generation...'}</>
                                ) : (
                                    <><Sparkles className="mr-2 h-4 w-4" />Generer le Carrousel</>
                                )}
                            </Button>
                        </Card>
                    </div>
                )}

                {/* Saved Content Section - Drafts & Ideas */}
                {(drafts.length > 0 || savedIdeas.length > 0) ? (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 border-t border-border/50 pt-8 mt-8">

                        {/* 1. Drafts */}
                        {drafts.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                                    <FileText className="w-5 h-5" /> Reprendre un brouillon
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {drafts.map((draft) => (
                                        <Card key={draft.id} className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group relative border-l-4 border-l-transparent hover:border-l-primary" onClick={() => resumeDraft(draft)}>
                                            <CardHeader className="pb-2 relative">
                                                <CardTitle className="text-base line-clamp-2 pr-8 leading-snug">{draft.hookText}</CardTitle>
                                                <CardDescription className="flex items-center gap-2 text-xs pt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(draft.createdAt).toLocaleDateString()}
                                                    {draft.slideCount && (
                                                        <span className="ml-auto text-primary font-semibold">
                                                            {draft.slideCount} slides
                                                        </span>
                                                    )}
                                                </CardDescription>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Supprimer ce brouillon ?")) {
                                                            handleDeleteDraft(draft.id);
                                                        }
                                                    }}
                                                    title="Supprimer le brouillon"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </CardHeader>
                                            <CardFooter className="pt-2">
                                                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground group-hover:text-primary transition-colors text-xs">
                                                    Continuer l'édition <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Saved Ideas */}
                        {savedIdeas.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-yellow-500">
                                    <Lightbulb className="w-5 h-5" /> Idées & Hooks Sauvegardés
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {savedIdeas.map((idea) => (
                                        <Card key={idea.id} className="cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group relative border-l-4 border-l-transparent hover:border-l-yellow-500 min-w-0 overflow-hidden"
                                            onClick={() => {
                                                setSelectedHook({
                                                    id: idea.id,
                                                    hook: idea.hookText,
                                                    angle: idea.title || 'Saved Idea',
                                                    reason: idea.description || 'Saved Idea'
                                                });
                                            }}
                                        >
                                            <CardHeader className="pb-2 relative min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                                    <Bookmark className="w-3.5 h-3.5 text-yellow-500 fill-current flex-shrink-0" />
                                                    <div className="text-xs font-mono text-yellow-600 uppercase tracking-wide truncate">{idea.title}</div>
                                                </div>
                                                <CardTitle className="text-base line-clamp-3 leading-snug break-words">"{idea.hookText}"</CardTitle>
                                            </CardHeader>
                                            <CardFooter className="pt-2 pb-4">
                                                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground group-hover:text-yellow-600 transition-colors text-xs">
                                                    Générer ce post <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </CardFooter>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Supprimer cette idée ?")) {
                                                        handleDeleteDraft(idea.id);
                                                    }
                                                }}
                                                title="Supprimer cette idée"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 opacity-40">
                        <p className="text-sm">Aucun brouillon ni idée sauvegardée.</p>
                    </div>
                )}
            </div >
        );
    }

    // Step 2 (Config) has been merged into Step 1 (Hooks) - inline config shown when hook is selected

    // Step 3: Preview

    // If Canva Editor is open, render it fullscreen
    if (isCanvaEditorOpen && editorSlides.length > 0) {
        return (
            <div className="fixed inset-0 z-50 bg-zinc-950">
                <CarouselEditor
                    slides={editorSlides}
                    images={userImages as UserImage[]}
                    onSave={handleCanvaEditorSave}
                    onBack={() => setIsCanvaEditorOpen(false)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Stepper />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">{initialPost ? 'Modifier le Post' : 'Preview du Carrousel'}</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (confirm("Voulez-vous vraiment annuler ? Les modifications non sauvegardées seront perdues.")) {
                                setStep('hooks');
                                setHooks([]);
                                setEditingId(null);
                            }
                        }}
                        disabled={isPending}
                        className="flex-1 md:flex-none text-muted-foreground hover:text-foreground"
                    >
                        Annuler
                    </Button>
                    {!initialPost && (
                        <Button variant="outline" onClick={() => handleSave(true)} disabled={isPending} className="flex-1 md:flex-none">
                            <FileText className="mr-2 h-4 w-4" />
                            <span className="truncate">Sauvegarder Brouillon</span>
                        </Button>
                    )}
                    <Button onClick={() => initialPost ? handleSave(false) : setShowConfirmSave(true)} disabled={isPending} className="bg-secondary text-white hover:bg-secondary/90 flex-1 md:flex-none">
                        {isPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        {initialPost ? 'Enregistrer' : 'Valider'}
                    </Button>
                </div>
            </div>

            {/* Confirmation Dialog before saving */}
            <Dialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmer la création</DialogTitle>
                        <DialogDescription>
                            As-tu bien téléchargé les images de tes slides avant de valider ? Une fois validé, le post sera marqué comme créé.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                handleDownloadImages();
                            }}
                            className="w-full gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Télécharger les slides
                        </Button>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setShowConfirmSave(false)} className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={() => {
                                setShowConfirmSave(false);
                                handleSave(false);
                            }}
                            className="flex-1 bg-secondary text-white hover:bg-secondary/90 gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Oui, valider le post
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Predictive Score */}
            {predictiveScore && (() => {
                const total = predictiveScore.total || 0;
                const scoreColor = total >= 75 ? '#10b981' : total >= 55 ? '#f59e0b' : '#ef4444';
                const scoreLabel = total >= 75 ? 'Excellent' : total >= 55 ? 'Correct' : 'A Ameliorer';
                const circumference = 2 * Math.PI * 36;
                const strokeDash = (total / 100) * circumference;
                const criteriaLabels: Record<string, string> = {
                    hookPower: 'Hook', retentionFlow: 'Retention', textQuality: 'Texte',
                    valueDensity: 'Valeur', ctaStrength: 'CTA', slideFormatting: 'Format',
                };
                // Strip em-dashes from all text outputs
                const cleanDash = (t: string) => t.replace(/\u2014/g, '-').replace(/\u2013/g, '-');

                return (
                    <div className="rounded-xl border border-border/50 bg-card mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Score header - compact */}
                        <div className="flex items-center gap-4 p-4 pb-3">
                            <div className="relative flex-shrink-0">
                                <svg viewBox="0 0 80 80" className="-rotate-90 w-16 h-16 sm:w-[72px] sm:h-[72px]">
                                    <circle cx="40" cy="40" r="36" fill="none" className="stroke-border/20" strokeWidth="5" />
                                    <circle cx="40" cy="40" r="36" fill="none" strokeWidth="5" strokeLinecap="round"
                                        style={{ stroke: scoreColor, strokeDasharray: `${strokeDash} ${circumference}`, transition: 'stroke-dasharray 0.8s ease-out' }} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg sm:text-xl font-bold">{total}</span>
                                    <span className="text-[9px] text-muted-foreground/60">/100</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground mb-0.5">Score Predictif</div>
                                <div className="text-sm font-semibold" style={{ color: scoreColor }}>{scoreLabel}</div>
                                {predictiveScore.estimatedViews && (
                                    <div className="text-[11px] text-muted-foreground mt-1">{predictiveScore.estimatedViews} vues estimees</div>
                                )}
                            </div>
                        </div>

                        {/* Criteria - minimal bars */}
                        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                            {Object.entries(predictiveScore.scores || {}).map(([key, val]) => {
                                const v = val as number;
                                const pct = (v / 20) * 100;
                                const c = v >= 15 ? '#10b981' : v >= 10 ? '#f59e0b' : '#ef4444';
                                return (
                                    <div key={key}>
                                        <div className="flex justify-between text-[10px] mb-0.5">
                                            <span className="text-muted-foreground">{criteriaLabels[key] || key}</span>
                                            <span className="font-medium" style={{ color: c }}>{v}</span>
                                        </div>
                                        <div className="h-1 bg-border/20 rounded-full"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c, transition: 'width 0.6s ease-out' }} /></div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Strengths + Issues - collapsible details */}
                        {(predictiveScore.strengths?.length > 0 || predictiveScore.formattingIssues?.length > 0) && (
                            <div className="px-4 pb-3 space-y-1">
                                {predictiveScore.strengths?.map((s: string, i: number) => (
                                    <div key={`s-${i}`} className="text-[11px] text-muted-foreground flex gap-1.5">
                                        <span className="text-emerald-500 mt-px">+</span>
                                        <span>{cleanDash(s)}</span>
                                    </div>
                                ))}
                                {predictiveScore.formattingIssues?.map((issue: string, i: number) => (
                                    <div key={`f-${i}`} className="text-[11px] text-muted-foreground flex gap-1.5">
                                        <span className="text-red-400 mt-px">!</span>
                                        <span>{cleanDash(issue)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Improvements */}
                        {predictiveScore.improvements?.length > 0 && (() => {
                            // Filter out already-applied improvements
                            const remaining = predictiveScore.improvements
                                .map((tip: string, i: number) => ({ tip, originalIdx: i }))
                                .filter(({ originalIdx }: { originalIdx: number }) => !appliedImprovements.has(originalIdx));
                            if (remaining.length === 0) return null;
                            return (
                            <>
                                <div className="border-t border-border/30 px-4 pt-3 pb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-medium text-muted-foreground">Ameliorations ({remaining.length})</span>
                                        <button className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                            onClick={() => {
                                                const allIdxs = remaining.map(({ originalIdx }: { originalIdx: number }) => originalIdx);
                                                const allSelected = allIdxs.every((idx: number) => selectedImprovements.has(idx));
                                                setSelectedImprovements(allSelected ? new Set() : new Set(allIdxs));
                                            }}>
                                            {remaining.every(({ originalIdx }: { originalIdx: number }) => selectedImprovements.has(originalIdx)) ? 'Deselectionner' : 'Tout selectionner'}
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {remaining.map(({ tip, originalIdx }: { tip: string; originalIdx: number }) => (
                                            <button key={originalIdx}
                                                onClick={() => setSelectedImprovements(prev => { const n = new Set(prev); n.has(originalIdx) ? n.delete(originalIdx) : n.add(originalIdx); return n; })}
                                                className={`w-full text-left text-[11px] leading-relaxed flex items-start gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                                                    selectedImprovements.has(originalIdx) ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                                                }`}>
                                                <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-[4px] mt-0.5 border transition-colors flex items-center justify-center ${
                                                    selectedImprovements.has(originalIdx) ? 'border-primary bg-primary' : 'border-border/40'
                                                }`}>
                                                    {selectedImprovements.has(originalIdx) && (
                                                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                </div>
                                                <span className={selectedImprovements.has(originalIdx) ? 'text-foreground/90' : 'text-muted-foreground/70'}>{cleanDash(tip)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 pt-2">
                                    <Button
                                        onClick={() => {
                                            const selected = predictiveScore.improvements.filter((_: string, i: number) => selectedImprovements.has(i));
                                            if (!selected.length) { toast.error("Selectionnez au moins une amelioration"); return; }
                                            setIsImproving(true);
                                            startTransition(async () => {
                                                try {
                                                    // Save current slides for undo
                                                    setSlidesBeforeImprove([...slides]);
                                                    const res = await improveCarouselFromScore(selectedHook?.hook || '', slides, selected, predictiveScore.scores);
                                                    if (res.success && res.slides) {
                                                        setSlides(res.slides);
                                                        // Mark applied improvements (keep original list, hide applied visually)
                                                        const newApplied = new Set(appliedImprovements);
                                                        selectedImprovements.forEach(i => newApplied.add(i));
                                                        setAppliedImprovements(newApplied);
                                                        setSelectedImprovements(new Set());
                                                        toast.success("Carrousel ameliore !");
                                                    } else {
                                                        setSlidesBeforeImprove(null);
                                                        toast.error(res.error || "Erreur lors de l'amelioration. Reessayez.");
                                                    }
                                                } catch (e: any) {
                                                    console.error("Improve failed:", e);
                                                    setSlidesBeforeImprove(null);
                                                    toast.error("Erreur temporaire. Reessayez dans quelques secondes.");
                                                }
                                                setIsImproving(false);
                                            });
                                        }}
                                        disabled={isImproving || isPending || selectedImprovements.size === 0}
                                        size="sm"
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-20"
                                    >
                                        {isImproving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Optimisation...</> :
                                            <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Appliquer{selectedImprovements.size > 0 ? ` (${selectedImprovements.size})` : ''}</>}
                                    </Button>
                                    {slidesBeforeImprove && (
                                        <Button
                                            onClick={() => {
                                                setSlides(slidesBeforeImprove);
                                                setSlidesBeforeImprove(null);
                                                setAppliedImprovements(new Set());
                                                toast.success("Retour en arriere effectue");
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-1.5 border-border/30 text-muted-foreground hover:text-foreground"
                                        >
                                            <Undo2 className="w-3.5 h-3.5 mr-1.5" />Annuler l&apos;amelioration
                                        </Button>
                                    )}
                                </div>
                            </>
                            );
                        })()}
                    </div>
                );
            })()}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-2 mb-4">
                <Button
                    onClick={() => {
                        setIsScoring(true);
                        setPredictiveScore(null);
                        setSelectedImprovements(new Set());
                        startTransition(async () => {
                            const res = await scoreCarouselBeforePublish(selectedHook?.hook || '', slides);
                            if (res.success) setPredictiveScore(res.score);
                            else toast.error("Scoring indisponible");
                            setIsScoring(false);
                        });
                    }}
                    variant="outline"
                    size="sm"
                    disabled={isScoring || isPending}
                    className="gap-1.5 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-xs sm:text-sm"
                >
                    {isScoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4 shrink-0" />}
                    <span className="hidden sm:inline">{isScoring ? 'Analyse...' : 'Score Prédictif'}</span>
                    <span className="sm:hidden">{isScoring ? '...' : 'Score'}</span>
                </Button>
                <Button
                    onClick={openCanvaEditor}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs sm:text-sm"
                >
                    <Wand2 className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Editer dans Canva</span><span className="sm:hidden">Canva</span>
                </Button>
                <Button onClick={handleDownloadImages} variant="outline" size="sm" className="gap-1.5 border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm">
                    <ArrowRight className="w-4 h-4 rotate-90 shrink-0" /> <span className="hidden sm:inline">Télécharger les slides</span><span className="sm:hidden">Download</span>
                </Button>
            </div>

            <div className="bg-card/30 border border-border/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm sm:text-lg font-semibold">
                    <Sparkles className="w-5 h-5 text-primary shrink-0" />
                    <h3>Description Générée</h3>
                </div>
                <div className="relative">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full min-h-[120px] bg-muted/30 border border-border rounded-lg p-4 text-sm resize-y focus:outline-none focus:border-primary/50 transition-colors"
                        placeholder="La description générée apparaîtra ici..."
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {description.length} caractères
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-bold">Important :</span> Cette description sera utilisée pour faire le lien avec le post une fois publié sur TikTok.
                </p>
            </div>

            {/* Image Picker Dialog */}
            <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col pt-10">
                    <DialogHeader>
                        <DialogTitle>Choisir une image pour la Slide {pickingSlideIndex !== null ? pickingSlideIndex + 1 : ''}</DialogTitle>
                        <DialogDescription>
                            Sélectionnez une image de votre collection pour remplacer l'actuelle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-[300px] p-2">
                        {isLoadingImages ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : userImages.length > 0 ? (
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
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Check className="w-8 h-8 text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <ImageIcon className="w-12 h-12 opacity-20" />
                                <p>Aucune image trouvée dans votre collection.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div ref={slidesPreviewRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {slides.map((slide, index) => {
                    // Split text into paragraphs for TikTok-like overlay rendering
                    // Don't split the last slide (CTA) — it stays as a single block
                    const fullText = slide.text || '';
                    const isLastSlide = index === slides.length - 1;
                    const paragraphs = isLastSlide
                        ? [fullText.trim()].filter(Boolean)
                        : fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
                    const hasSplit = paragraphs.length > 1;

                    // Auto font size based on text length
                    const getAutoFontSize = (text: string, isFirst: boolean, isHook: boolean, isLastSlide: boolean = false) => {
                        const len = text.length;
                        if (isHook) return len > 80 ? 14 : len > 50 ? 16 : 19;
                        // CTA/last slide: scale down more gracefully for long texts
                        if (isLastSlide) {
                            if (len > 250) return 9;
                            if (len > 180) return 10;
                            if (len > 120) return 12;
                            if (len > 80) return 13;
                            return 14;
                        }
                        if (isFirst) return len > 80 ? 13 : len > 40 ? 14 : 16;
                        return len > 60 ? 12 : len > 30 ? 13 : 15;
                    };

                    // Render text with emojis stripped of text-shadow
                    const emojiRx = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)/gu;
                    const renderCleanEmojis = (text: string) => {
                        const parts = text.split(emojiRx).filter(Boolean);
                        emojiRx.lastIndex = 0;
                        if (parts.length <= 1 && !emojiRx.test(text)) return text;
                        emojiRx.lastIndex = 0;
                        return parts.map((part, pi) => {
                            emojiRx.lastIndex = 0;
                            if (emojiRx.test(part)) {
                                return <span key={pi} style={{ textShadow: 'none' }}>{part}</span>;
                            }
                            return <span key={pi}>{part}</span>;
                        });
                    };

                    // Smart paragraph positioning: estimate heights and avoid overlap
                    const paragraphPositions: string[] = [];
                    if (hasSplit && paragraphs.length > 1) {
                        const fontSizes = paragraphs.map((p, pi) =>
                            getAutoFontSize(p, pi === 0, index === 0 && pi === 0, isLastSlide)
                        );
                        // Estimate each block height as % of container (~200px wide preview)
                        const containerW = 200;
                        const containerH = containerW * 16 / 9;
                        const heights = paragraphs.map((p, pi) => {
                            const fs = fontSizes[pi];
                            const avgCW = fs * 0.55;
                            const cpl = Math.max(1, Math.floor((containerW - 24) / avgCW));
                            const words = p.split(/\s+/);
                            let lines = 1, cur = 0;
                            for (const w of words) { if (cur + w.length > cpl && cur > 0) { lines++; cur = w.length; } else { cur += (cur > 0 ? 1 : 0) + w.length; } }
                            return lines * fs * 1.5;
                        });
                        const gap = 8;
                        const totalH = heights.reduce((a, b) => a + b, 0) + gap * (heights.length - 1);
                        let startY = (containerH - totalH) / 2;
                        for (let pi = 0; pi < heights.length; pi++) {
                            const center = startY + heights[pi] / 2;
                            paragraphPositions.push(`${Math.max(8, Math.min(92, (center / containerH) * 100))}%`);
                            startY += heights[pi] + gap;
                        }
                    } else {
                        paragraphs.forEach(() => paragraphPositions.push('50%'));
                    }

                    return (
                        <Card key={`${slide.slide_number}-${index}`} className="overflow-hidden border-border/50 bg-card/30 flex flex-col group/card relative">
                            {/* Delete Button */}
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 left-2 z-20 h-6 w-6 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity"
                                onClick={() => {
                                    if (confirm("Supprimer cette slide ?")) handleDeleteSlide(index);
                                }}
                                title="Supprimer la slide"
                            >
                                <Trash className="w-3 h-3" />
                            </Button>

                            {/* TikTok Preview - Text overlaid on image */}
                            <div className="aspect-[9/16] bg-black relative group flex-shrink-0 overflow-hidden">
                                {slide.image_url ? (
                                    <img src={slide.image_url} className="w-full h-full object-cover" alt="Slide visual" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                                        Pas d&apos;image trouvée
                                    </div>
                                )}

                                {/* Slide number badge */}
                                <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs pointer-events-none z-10">
                                    {slide.slide_number}/{slides.length}
                                </div>

                                {/* TikTok-style text overlay — matches editor default (outline mode) */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center px-3 pointer-events-none z-10" data-twemoji>
                                    {paragraphs.length > 0 ? paragraphs.map((paragraph, pIdx) => {
                                        const isLastSlide = index === slides.length - 1;
                                        const fontSize = getAutoFontSize(paragraph, pIdx === 0, index === 0 && pIdx === 0, isLastSlide);
                                        const topOffset = paragraphPositions[pIdx] || '50%';

                                        // Generate TikTok-authentic outline text-shadow (3-ring system like real TikTok)
                                        const outlineW = index === 0 && pIdx === 0 ? 1.5 : 1.5;
                                        const outlineShadows: string[] = [];
                                        // Outer ring: 24 points for smooth coverage
                                        for (let s = 0; s < 24; s++) {
                                            const a = (2 * Math.PI * s) / 24;
                                            outlineShadows.push(`${(Math.cos(a) * outlineW).toFixed(1)}px ${(Math.sin(a) * outlineW).toFixed(1)}px 0 #000`);
                                        }
                                        // Middle ring: 16 points at 75% width
                                        for (let s = 0; s < 16; s++) {
                                            const a = (2 * Math.PI * s) / 16;
                                            outlineShadows.push(`${(Math.cos(a) * outlineW * 0.75).toFixed(1)}px ${(Math.sin(a) * outlineW * 0.75).toFixed(1)}px 0 #000`);
                                        }
                                        // Inner ring: 8 points at 40% width
                                        for (let s = 0; s < 8; s++) {
                                            const a = (2 * Math.PI * s) / 8;
                                            outlineShadows.push(`${(Math.cos(a) * outlineW * 0.4).toFixed(1)}px ${(Math.sin(a) * outlineW * 0.4).toFixed(1)}px 0 #000`);
                                        }
                                        outlineShadows.push('0 1px 3px rgba(0,0,0,0.6)');

                                        return (
                                            <div
                                                key={pIdx}
                                                className="absolute left-3 right-3"
                                                style={{
                                                    top: topOffset,
                                                    transform: 'translateY(-50%)',
                                                    textAlign: 'center',
                                                    color: '#ffffff',
                                                    fontFamily: 'Montserrat, sans-serif',
                                                    fontWeight: '700',
                                                    fontSize: `${fontSize}px`,
                                                    lineHeight: 1.5,
                                                    textShadow: outlineShadows.join(', '),
                                                    wordWrap: 'break-word',
                                                    overflowWrap: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {renderCleanEmojis(paragraph)}
                                            </div>
                                        );
                                    }) : (
                                        <span className="text-white/40 text-xs italic">Pas de texte</span>
                                    )}
                                </div>
                            </div>

                            {/* Compact edit area below */}
                            <div className="bg-card p-3 space-y-2 flex flex-col border-t border-border/50">
                                <textarea
                                    value={slide.text}
                                    onChange={(e) => handleTextChange(index, e.target.value)}
                                    className="w-full min-h-[60px] bg-muted/30 border border-transparent hover:border-border/50 focus:border-primary/50 text-foreground text-xs p-2 rounded-lg resize-none focus:outline-none transition-all placeholder:text-muted-foreground/50"
                                    placeholder="Texte de la slide..."
                                    rows={3}
                                />

                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] text-muted-foreground font-mono uppercase truncate flex-1" title={slide.intention}>
                                        {slide.intention}
                                    </p>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="text-xs h-7 px-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                                        onClick={() => handleOpenImagePicker(index)}
                                    >
                                        Changer l&apos;image
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {/* Add Slide Button */}
                <Card className="border-dashed border-2 border-border/50 bg-card/10 flex flex-col items-center justify-center cursor-pointer hover:bg-card/20 hover:border-primary/50 transition-all min-h-[400px]" onClick={handleAddSlide}>
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Sparkles className="w-8 h-8" />
                        <span className="font-semibold">Ajouter une slide</span>
                    </div>
                </Card>
            </div>
        </div>
    );
}
