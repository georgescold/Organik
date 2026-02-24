'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sparkles,
    RefreshCw,
    Palette,
    Layout,
    ChevronRight,
    Check,
    Wand2,
    Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CarouselEditor } from './carousel-editor';
import type { EditorSlide, TextLayer, UserImage } from '@/types/post';

interface Angle {
    id: string;
    title: string;
    description: string;
    hook: string;
    tone: string;
}

// Local slide type for preview (simpler than EditorSlide)
interface PreviewSlide {
    id: string;
    text?: string;
    backgroundColor: string;
    textColor: string;
    fontSize?: number;
}

interface SmartCarouselGeneratorProps {
    images?: UserImage[];
    onSave?: (slides: EditorSlide[]) => void;
}

export function SmartCarouselGenerator({ images = [], onSave }: SmartCarouselGeneratorProps) {
    const [step, setStep] = useState<'topic' | 'angles' | 'slides' | 'edit'>('topic');
    const [topic, setTopic] = useState('');
    const [slideCount, setSlideCount] = useState([7]);
    const [generating, setGenerating] = useState(false);
    const [angles, setAngles] = useState<Angle[]>([]);
    const [selectedAngle, setSelectedAngle] = useState<Angle | null>(null);
    const [previewSlides, setPreviewSlides] = useState<PreviewSlide[]>([]);
    const [editorSlides, setEditorSlides] = useState<EditorSlide[]>([]);

    // Convert preview slides to editor slides when entering edit mode
    const convertToEditorSlides = (preview: PreviewSlide[]): EditorSlide[] => {
        return preview.map((slide, idx) => {
            const fullText = slide.text || `Slide ${idx + 1}`;
            const isLastSlide = idx === preview.length - 1;
            // Don't split the last slide (CTA) — it stays as a single block
            const paragraphs = isLastSlide
                ? [fullText.trim()].filter(Boolean)
                : fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
            const hasSplit = paragraphs.length > 1;

            const layers: TextLayer[] = paragraphs.map((paragraph, pIdx) => {
                const textLength = paragraph.length;
                let autoFontSize: number;
                if (idx === 0 && pIdx === 0) {
                    autoFontSize = textLength > 80 ? 20 : textLength > 50 ? 24 : 28;
                } else if (pIdx === 0) {
                    autoFontSize = textLength > 80 ? 18 : textLength > 40 ? 20 : 24;
                } else {
                    autoFontSize = textLength > 60 ? 16 : textLength > 30 ? 18 : 20;
                }

                let yPos = 50;
                if (hasSplit) {
                    yPos = pIdx === 0 ? 40 : 62;
                }

                return {
                    id: `text-${slide.id}-${pIdx}`,
                    type: 'text' as const,
                    content: paragraph,
                    x: 50,
                    y: yPos,
                    rotation: 0,
                    opacity: 100,
                    zIndex: pIdx + 1,
                    fontSize: slide.fontSize || autoFontSize,
                    fontFamily: 'Montserrat',
                    fontWeight: '700',
                    fontStyle: 'normal' as const,
                    textAlign: 'center' as const,
                    color: slide.textColor,
                    outlineColor: '#000000',
                    outlineWidth: 2,
                    lineHeight: 1.5,
                    maxWidth: 300,
                    textMode: 'outline' as const,
                };
            });

            return {
                id: slide.id,
                backgroundColor: slide.backgroundColor,
                layers,
            };
        });
    };

    const generateAngles = async () => {
        if (!topic.trim()) return;

        setGenerating(true);
        // Simulate API call - in production would call Claude
        await new Promise(r => setTimeout(r, 2000));

        setAngles([
            {
                id: '1',
                title: 'L\'approche Pédagogique',
                description: 'Expliquer le concept étape par étape',
                hook: `🔥 ${topic} : La Méthode Complète`,
                tone: 'Éducatif',
            },
            {
                id: '2',
                title: 'L\'approche Provocante',
                description: 'Challenger les idées reçues',
                hook: `❌ Tu fais ${topic} de la mauvaise façon`,
                tone: 'Provocateur',
            },
            {
                id: '3',
                title: 'L\'approche Story',
                description: 'Raconter une histoire personnelle',
                hook: `💡 Comment j'ai découvert le secret de ${topic}`,
                tone: 'Narratif',
            },
        ]);
        setStep('angles');
        setGenerating(false);
    };

    const selectAngle = async (angle: Angle) => {
        setSelectedAngle(angle);
        setGenerating(true);

        // Simulate slide generation
        await new Promise(r => setTimeout(r, 2000));

        const count = slideCount[0];
        const newSlides: PreviewSlide[] = Array.from({ length: count }, (_, i) => ({
            id: String(i + 1),
            text: i === 0 ? angle.hook : `Slide ${i + 1} pour "${angle.title}"`,
            backgroundColor: '#1a1a2e',
            textColor: '#ffffff',
            fontSize: i === 0 ? 32 : 24,
        }));

        setPreviewSlides(newSlides);
        setStep('slides');
        setGenerating(false);
    };

    const regenerateFromAngle = async () => {
        if (!selectedAngle) return;

        setGenerating(true);
        await new Promise(r => setTimeout(r, 2000));

        setAngles([
            {
                id: '1a',
                title: `${selectedAngle.title} - Variation A`,
                description: 'Nouvelle approche basée sur votre sélection',
                hook: `🎯 ${topic} : Le Point de Vue Expert`,
                tone: selectedAngle.tone,
            },
            {
                id: '2a',
                title: `${selectedAngle.title} - Variation B`,
                description: 'Angle plus controversé',
                hook: `⚡ La vérité sur ${topic} que personne ne dit`,
                tone: 'Controversé',
            },
            {
                id: '3a',
                title: `${selectedAngle.title} - Variation C`,
                description: 'Approche liste actionnable',
                hook: `📋 ${slideCount[0]} secrets sur ${topic}`,
                tone: 'Guide',
            },
        ]);
        setStep('angles');
        setGenerating(false);
    };

    if (step === 'edit' && editorSlides.length > 0) {
        return (
            <CarouselEditor
                slides={editorSlides}
                images={images}
                onSave={(updatedSlides) => {
                    setEditorSlides(updatedSlides);
                    onSave?.(updatedSlides);
                }}
                onBack={() => setStep('slides')}
            />
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4">
                {['Sujet', 'Angles', 'Slides', 'Éditer'].map((label, idx) => {
                    const stepOrder = ['topic', 'angles', 'slides', 'edit'];
                    const isActive = stepOrder.indexOf(step) >= idx;
                    const isCurrent = stepOrder[idx] === step;

                    return (
                        <div key={label} className="flex items-center gap-4">
                            <div className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                                isCurrent ? "bg-primary text-white" :
                                    isActive ? "bg-primary/20 text-primary" :
                                        "bg-white/5 text-white/40"
                            )}>
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                                    isCurrent ? "bg-white text-primary" :
                                        isActive ? "bg-primary/30" : "bg-white/10"
                                )}>
                                    {isActive && idx < stepOrder.indexOf(step) ? <Check className="h-4 w-4" /> : idx + 1}
                                </span>
                                <span className="font-medium">{label}</span>
                            </div>
                            {idx < 3 && <ChevronRight className="h-5 w-5 text-white/20" />}
                        </div>
                    );
                })}
            </div>

            {/* Step: Topic */}
            {step === 'topic' && (
                <Card className="bg-black/40 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-primary" />
                            Quel est le sujet de votre carrousel ?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Textarea
                            placeholder="Ex: Les 7 habitudes des gens qui réussissent, Comment doubler son engagement sur TikTok..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="bg-white/5 border-white/10 text-white min-h-[100px] text-lg"
                        />

                        <div className="space-y-4">
                            <label className="text-white/60 text-sm flex items-center justify-between">
                                <span>Nombre de slides</span>
                                <Badge variant="outline" className="text-primary border-primary/30">
                                    {slideCount[0]} slides
                                </Badge>
                            </label>
                            <Slider
                                value={slideCount}
                                onValueChange={setSlideCount}
                                min={5}
                                max={10}
                                step={1}
                                className="w-full"
                            />
                        </div>

                        <Button
                            onClick={generateAngles}
                            disabled={!topic.trim() || generating}
                            className="w-full bg-primary hover:bg-primary/90 py-6 text-lg"
                        >
                            {generating ? (
                                <>
                                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                    Génération des angles...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5 mr-2" />
                                    Générer 3 Angles
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step: Angles */}
            {step === 'angles' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Choisissez un Angle</h2>
                        {selectedAngle && (
                            <Button
                                variant="outline"
                                onClick={regenerateFromAngle}
                                disabled={generating}
                                className="border-primary/30 text-primary hover:bg-primary/10"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Régénérer depuis "{selectedAngle.title}"
                            </Button>
                        )}
                    </div>

                    {generating ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-48" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {angles.map((angle) => (
                                <Card
                                    key={angle.id}
                                    className={cn(
                                        "bg-black/40 border-2 cursor-pointer transition-all hover:border-primary/50",
                                        selectedAngle?.id === angle.id ? "border-primary" : "border-white/10"
                                    )}
                                    onClick={() => setSelectedAngle(angle)}
                                >
                                    <CardContent className="p-6 space-y-4">
                                        <Badge variant="outline" className="text-xs">
                                            {angle.tone}
                                        </Badge>
                                        <h3 className="text-lg font-bold text-white">{angle.title}</h3>
                                        <p className="text-white/60 text-sm">{angle.description}</p>
                                        <div className="p-3 bg-white/5 rounded-lg">
                                            <p className="text-primary font-medium text-sm">{angle.hook}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {selectedAngle && !generating && (
                        <Button
                            onClick={() => selectAngle(selectedAngle)}
                            className="w-full bg-primary hover:bg-primary/90 py-6"
                        >
                            Générer les {slideCount[0]} slides avec cet angle
                            <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                    )}
                </div>
            )}

            {/* Step: Slides Preview */}
            {step === 'slides' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Previsualisation</h2>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setStep('angles')}
                                className="border-white/10 text-white"
                            >
                                Changer d'angle
                            </Button>
                            <Button
                                onClick={() => {
                                    // Convert preview slides to editor format
                                    const converted = convertToEditorSlides(previewSlides);
                                    setEditorSlides(converted);
                                    setStep('edit');
                                }}
                                className="bg-primary hover:bg-primary/90"
                            >
                                <Palette className="h-4 w-4 mr-2" />
                                Editer dans Canva
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {previewSlides.map((slide, idx) => (
                            <div
                                key={slide.id}
                                className="aspect-[9/16] rounded-lg overflow-hidden flex items-center justify-center p-4"
                                style={{
                                    backgroundColor: slide.backgroundColor,
                                    color: slide.textColor,
                                }}
                            >
                                <div className="text-center">
                                    <p className="text-xs text-white/40 mb-2">Slide {idx + 1}</p>
                                    <p style={{ fontSize: slide.fontSize }} className="font-bold">
                                        {slide.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
