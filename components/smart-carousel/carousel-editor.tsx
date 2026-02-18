'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    Save,
    Type,
    ChevronLeft,
    ChevronRight,
    Plus,
    Image as ImageIcon,
    Download,
    Loader2,
    Sparkles,
    Undo2,
    Redo2,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorFonts } from '@/lib/use-editor-fonts';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// Canvas components
import { DraggableLayer } from './canvas/draggable-layer';
import { TextLayerContent } from './canvas/text-layer';

// Panel components
import { BackgroundPanel } from './panels/background-panel';
import { TextPanel } from './panels/text-panel';
import { TextPresetsPanel } from './panels/text-presets-panel';
import { MobileToolbar } from './panels/mobile-toolbar';

// Presets
import type { TextStylePreset } from '@/lib/text-style-presets';

// Types
import type {
    EditorSlide,
    EditorLayer,
    TextLayer,
    UserImage,
    HistoryEntry,
} from '@/types/post';

interface CarouselEditorProps {
    slides: EditorSlide[];
    images: UserImage[];
    onSave: (slides: EditorSlide[]) => void;
    onBack: () => void;
}

// Max undo history
const MAX_HISTORY = 50;

export function CarouselEditor({ slides: initialSlides, images, onSave, onBack }: CarouselEditorProps) {
    useEditorFonts();

    const [slides, setSlides] = useState<EditorSlide[]>(initialSlides);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [showGuideX, setShowGuideX] = useState(false);
    const [showGuideY, setShowGuideY] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // ============================================
    // Undo / Redo
    // ============================================
    const [history, setHistory] = useState<HistoryEntry[]>([{
        slides: initialSlides,
        activeSlideIndex: 0,
        timestamp: Date.now(),
    }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const isUndoRedoRef = useRef(false);

    const pushHistory = useCallback((newSlides: EditorSlide[], slideIdx: number) => {
        if (isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            return;
        }
        setHistory(prev => {
            const truncated = prev.slice(0, historyIndex + 1);
            const entry: HistoryEntry = { slides: newSlides, activeSlideIndex: slideIdx, timestamp: Date.now() };
            const next = [...truncated, entry].slice(-MAX_HISTORY);
            return next;
        });
        setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [historyIndex]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const undo = useCallback(() => {
        if (!canUndo) return;
        isUndoRedoRef.current = true;
        const newIndex = historyIndex - 1;
        const entry = history[newIndex];
        setSlides(entry.slides);
        setActiveSlideIndex(entry.activeSlideIndex);
        setHistoryIndex(newIndex);
        setSelectedLayerId(null);
        setEditingLayerId(null);
    }, [canUndo, history, historyIndex]);

    const redo = useCallback(() => {
        if (!canRedo) return;
        isUndoRedoRef.current = true;
        const newIndex = historyIndex + 1;
        const entry = history[newIndex];
        setSlides(entry.slides);
        setActiveSlideIndex(entry.activeSlideIndex);
        setHistoryIndex(newIndex);
        setSelectedLayerId(null);
        setEditingLayerId(null);
    }, [canRedo, history, historyIndex]);

    const canvasRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [canvasScale, setCanvasScale] = useState(1);
    const activeSlide = slides[activeSlideIndex];
    const selectedLayer = activeSlide?.layers.find(l => l.id === selectedLayerId);

    // ============================================
    // Responsive Canvas Scaling
    // ============================================
    useEffect(() => {
        const container = canvasContainerRef.current;
        if (!container) return;

        const updateScale = () => {
            const containerW = container.clientWidth - 16; // padding
            const containerH = container.clientHeight - 16;
            const scale = Math.min(containerW / 360, containerH / 640, 1);
            setCanvasScale(scale);
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // ============================================
    // Keyboard Shortcuts
    // ============================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
            if (isInput) return;

            // Undo: Ctrl+Z / Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
                return;
            }

            if (!selectedLayerId) return;

            // Delete: Delete or Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteLayer(selectedLayerId);
                return;
            }
            // Duplicate: Ctrl+D
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                duplicateLayer(selectedLayerId);
                return;
            }
            // Nudge with arrow keys
            const nudge = e.shiftKey ? 5 : 1;
            if (e.key === 'ArrowLeft') { e.preventDefault(); updateLayer(selectedLayerId, { x: Math.max(0, (selectedLayer?.x ?? 50) - nudge) }); }
            if (e.key === 'ArrowRight') { e.preventDefault(); updateLayer(selectedLayerId, { x: Math.min(100, (selectedLayer?.x ?? 50) + nudge) }); }
            if (e.key === 'ArrowUp') { e.preventDefault(); updateLayer(selectedLayerId, { y: Math.max(0, (selectedLayer?.y ?? 50) - nudge) }); }
            if (e.key === 'ArrowDown') { e.preventDefault(); updateLayer(selectedLayerId, { y: Math.min(100, (selectedLayer?.y ?? 50) + nudge) }); }
            // Escape: deselect
            if (e.key === 'Escape') {
                setSelectedLayerId(null);
                setEditingLayerId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedLayerId, selectedLayer, undo, redo]);

    // ============================================
    // Slide Operations
    // ============================================
    const updateSlide = (updates: Partial<EditorSlide>) => {
        setSlides(prev => {
            const next = prev.map((slide, idx) =>
                idx === activeSlideIndex ? { ...slide, ...updates } : slide
            );
            pushHistory(next, activeSlideIndex);
            return next;
        });
    };

    const addSlide = () => {
        const newSlide: EditorSlide = {
            id: `slide-${Date.now()}`,
            backgroundColor: '#1a1a2e',
            layers: [],
        };
        setSlides(prev => {
            const next = [...prev.slice(0, activeSlideIndex + 1), newSlide, ...prev.slice(activeSlideIndex + 1)];
            pushHistory(next, activeSlideIndex + 1);
            return next;
        });
        setActiveSlideIndex(prev => prev + 1);
        setSelectedLayerId(null);
    };

    const deleteSlide = (index: number) => {
        if (slides.length <= 1) {
            toast.error("Impossible de supprimer la dernière slide");
            return;
        }
        setSlides(prev => {
            const next = prev.filter((_, idx) => idx !== index);
            const newActive = Math.min(activeSlideIndex, next.length - 1);
            pushHistory(next, newActive);
            return next;
        });
        setActiveSlideIndex(prev => Math.min(prev, slides.length - 2));
        setSelectedLayerId(null);
    };

    const moveSlide = (from: number, to: number) => {
        if (to < 0 || to >= slides.length) return;
        setSlides(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            pushHistory(next, to);
            return next;
        });
        setActiveSlideIndex(to);
    };

    // ============================================
    // Layer Operations
    // ============================================
    const addTextLayer = () => {
        const maxZIndex = Math.max(...activeSlide.layers.map(l => l.zIndex), 0);
        const newLayer: TextLayer = {
            id: `text-${Date.now()}`,
            type: 'text',
            content: 'Nouveau texte',
            x: 50,
            y: 50,
            rotation: 0,
            opacity: 100,
            zIndex: maxZIndex + 1,
            fontSize: 28,
            fontFamily: 'Montserrat',
            fontWeight: '700',
            fontStyle: 'normal',
            textAlign: 'center',
            color: '#ffffff',
            outlineColor: '#000000',
            outlineWidth: 1.5,
            lineHeight: 1.5,
            maxWidth: 300,
            textMode: 'outline',
        };
        updateSlide({ layers: [...activeSlide.layers, newLayer] });
        setSelectedLayerId(newLayer.id);
    };

    const updateLayer = (layerId: string, updates: Partial<TextLayer>) => {
        const layers = activeSlide.layers.map(layer => {
            if (layer.id !== layerId) return layer;
            return { ...layer, ...updates } as TextLayer;
        });
        updateSlide({ layers });
    };

    const deleteLayer = (layerId: string) => {
        const layers = activeSlide.layers.filter(layer => layer.id !== layerId);
        updateSlide({ layers });
        if (selectedLayerId === layerId) setSelectedLayerId(null);
    };

    const duplicateLayer = (layerId: string) => {
        const layerToDuplicate = activeSlide.layers.find(l => l.id === layerId);
        if (!layerToDuplicate) return;
        const maxZIndex = Math.max(...activeSlide.layers.map(l => l.zIndex), 0);
        const newLayer: EditorLayer = {
            ...layerToDuplicate,
            id: `${layerToDuplicate.type}-${Date.now()}`,
            x: Math.min(layerToDuplicate.x + 5, 95),
            y: Math.min(layerToDuplicate.y + 5, 95),
            zIndex: maxZIndex + 1,
        };
        updateSlide({ layers: [...activeSlide.layers, newLayer] });
        setSelectedLayerId(newLayer.id);
    };

    const handlePositionChange = (layerId: string, x: number, y: number) => updateLayer(layerId, { x, y });
    const handleResize = (layerId: string, fontSize: number) => updateLayer(layerId, { fontSize });
    const handleTextWidthResize = (layerId: string, maxWidth: number) => updateLayer(layerId, { maxWidth });
    const handleRotate = (layerId: string, rotation: number) => updateLayer(layerId, { rotation });
    const handleGuideUpdate = (x: boolean, y: boolean) => { setShowGuideX(x); setShowGuideY(y); };

    // ============================================
    // Text Preset Application
    // ============================================
    const applyTextPreset = (preset: TextStylePreset, scope: 'layer' | 'slide' | 'all') => {
        const { x, y, ...styleWithoutPosition } = preset.style;
        if (scope === 'layer' && selectedLayerId) {
            const layer = activeSlide.layers.find(l => l.id === selectedLayerId);
            if (layer?.type === 'text') updateLayer(selectedLayerId, preset.style);
        } else if (scope === 'slide') {
            const updatedLayers = activeSlide.layers.map(l =>
                l.type === 'text' ? { ...l, ...styleWithoutPosition } : l
            );
            updateSlide({ layers: updatedLayers });
        } else if (scope === 'all') {
            setSlides(prev => {
                const next = prev.map(slide => ({
                    ...slide,
                    layers: slide.layers.map(l =>
                        l.type === 'text' ? { ...l, ...styleWithoutPosition } : l
                    ),
                }));
                pushHistory(next, activeSlideIndex);
                return next;
            });
            toast.success('Style appliqué à tous les slides');
        }
    };

    // Apply preset from mobile toolbar (single layer scope)
    const applyPresetMobile = (preset: TextStylePreset) => {
        if (selectedLayerId) {
            const layer = activeSlide.layers.find(l => l.id === selectedLayerId);
            if (layer?.type === 'text') updateLayer(selectedLayerId, preset.style);
        }
    };

    // ============================================
    // Background rendering
    // ============================================
    const renderBackground = () => {
        const { backgroundColor, backgroundImage } = activeSlide;
        const filter = backgroundImage?.filter;
        const filterParts: string[] = [];
        if (filter) {
            if (filter.brightness !== 100) filterParts.push(`brightness(${filter.brightness}%)`);
            if (filter.contrast !== 100) filterParts.push(`contrast(${filter.contrast}%)`);
            if (filter.blur > 0) filterParts.push(`blur(${filter.blur}px)`);
            if (filter.saturate != null && filter.saturate !== 100) filterParts.push(`saturate(${filter.saturate}%)`);
            if (filter.hueRotate != null && filter.hueRotate !== 0) filterParts.push(`hue-rotate(${filter.hueRotate}deg)`);
            if (filter.sepia != null && filter.sepia > 0) filterParts.push(`sepia(${filter.sepia}%)`);
        }
        const imageFilter = filterParts.length > 0 ? filterParts.join(' ') : undefined;

        return (
            <div className="absolute inset-0" style={{ backgroundColor }}>
                {backgroundImage && (
                    <div
                        className="absolute inset-0 overflow-hidden"
                        style={{
                            transform: `scale(${backgroundImage.scale})`,
                            transformOrigin: backgroundImage.objectPosition || 'center',
                        }}
                    >
                        <img
                            src={backgroundImage.imageUrl}
                            alt="Background"
                            className="w-full h-full"
                            style={{
                                objectFit: backgroundImage.objectFit,
                                objectPosition: backgroundImage.objectPosition,
                                filter: imageFilter,
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    // ============================================
    // Export
    // ============================================
    const exportSlides = async () => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        toast.info("Export en cours...");
        try {
            setSelectedLayerId(null);
            setEditingLayerId(null);
            setShowGuideX(false);
            setShowGuideY(false);
            await new Promise(resolve => setTimeout(resolve, 100));

            for (let i = 0; i < slides.length; i++) {
                setActiveSlideIndex(i);
                await new Promise(resolve => setTimeout(resolve, i === 0 ? 1500 : 800));
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));

                const capturedCanvas = await html2canvas(canvasRef.current!, {
                    scale: 3,
                    width: 360,
                    height: 640,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: null,
                    logging: false,
                    imageTimeout: 30000,
                    ignoreElements: (element) => element.getAttribute('data-export-ignore') === 'true',
                });

                const blob = await (await fetch(capturedCanvas.toDataURL('image/png', 1))).blob();
                saveAs(blob, `slide-${i + 1}.png`);
                if (i < slides.length - 1) await new Promise(resolve => setTimeout(resolve, 300));
            }
            toast.success(`${slides.length} slides exportées en 1080×1920 !`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error("Erreur lors de l'export");
        } finally {
            setIsExporting(false);
        }
    };

    // ============================================
    // Render
    // ============================================
    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Header */}
            <div className="flex items-center justify-between p-2 sm:p-3 bg-black/40 border-b border-white/10 gap-1.5">
                <Button variant="ghost" onClick={onBack} size="sm" className="text-white hover:bg-white/10 shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Retour</span>
                </Button>

                {/* Undo/Redo — desktop */}
                <div className="hidden sm:flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                        <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                        <Redo2 className="h-4 w-4" />
                    </Button>
                </div>

                <h2 className="text-sm sm:text-base font-bold text-white truncate">Éditeur</h2>

                <div className="flex gap-1 sm:gap-1.5 shrink-0">
                    {/* Undo/Redo — mobile */}
                    <div className="flex sm:hidden items-center">
                        <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} className="text-white/60 hover:bg-white/10 disabled:opacity-30 h-8 w-8 p-0">
                            <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} className="text-white/60 hover:bg-white/10 disabled:opacity-30 h-8 w-8 p-0">
                            <Redo2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={exportSlides} disabled={isExporting} className="border-white/20 text-white hover:bg-white/10">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        <span className="hidden sm:inline ml-1.5">Exporter</span>
                    </Button>
                    <Button size="sm" onClick={() => onSave(slides)} className="bg-primary hover:bg-primary/90">
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1.5">Sauvegarder</span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Slides Sidebar */}
                <div className="flex md:flex-col md:w-20 bg-black/60 md:border-r border-b md:border-b-0 border-white/10 overflow-x-auto md:overflow-y-auto p-1.5 sm:p-2 gap-1.5 sm:gap-2 md:space-y-2 md:gap-0 shrink-0 items-center min-h-0">
                    {slides.map((slide, idx) => (
                        <div key={slide.id} className="relative group shrink-0">
                            <div
                                className={cn(
                                    "aspect-[9/16] rounded cursor-pointer border-2 transition-all overflow-hidden relative w-12 sm:w-14 md:w-auto touch-manipulation",
                                    idx === activeSlideIndex
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-white/10 hover:border-white/30"
                                )}
                                style={{ backgroundColor: slide.backgroundColor }}
                                onClick={() => {
                                    setActiveSlideIndex(idx);
                                    setSelectedLayerId(null);
                                    setEditingLayerId(null);
                                }}
                            >
                                {slide.backgroundImage && (
                                    <img src={slide.backgroundImage.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                )}
                                <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] sm:text-[10px] px-1 py-0.5 rounded">
                                    {idx + 1}
                                </div>
                            </div>
                            {/* Slide actions on hover/long-press */}
                            <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                                    className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow"
                                >
                                    <Trash2 className="h-2.5 w-2.5 text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {/* Add Slide button */}
                    <button
                        onClick={addSlide}
                        className="shrink-0 w-12 sm:w-14 md:w-auto aspect-[9/16] rounded border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-primary/50 hover:text-primary transition-colors touch-manipulation"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                {/* Main Canvas */}
                <div
                    ref={canvasContainerRef}
                    className="flex-1 flex items-center justify-center bg-zinc-900 p-2 sm:p-4 md:p-6 min-h-0 relative"
                    onClick={() => {
                        setSelectedLayerId(null);
                        setEditingLayerId(null);
                    }}
                >
                    <div
                        ref={canvasRef}
                        data-is-exporting={isExporting ? "true" : "false"}
                        className={cn(
                            "relative overflow-hidden",
                            !isExporting ? "rounded-lg shadow-2xl ring-1 ring-white/10" : "rounded-none shadow-none"
                        )}
                        style={{
                            width: '360px',
                            height: '640px',
                            transform: isExporting ? undefined : `scale(${canvasScale})`,
                            transformOrigin: 'center center',
                        }}
                    >
                        {renderBackground()}

                        {activeSlide.layers
                            .filter(layer => layer.visible !== false && layer.type === 'text')
                            .sort((a, b) => a.zIndex - b.zIndex)
                            .map((layer) => (
                                <DraggableLayer
                                    key={layer.id}
                                    layer={layer}
                                    isSelected={selectedLayerId === layer.id}
                                    canvasRef={canvasRef as any}
                                    onSelect={(id) => setSelectedLayerId(id)}
                                    onPositionChange={handlePositionChange}
                                    onResize={handleResize}
                                    onTextWidthResize={handleTextWidthResize}
                                    onRotate={handleRotate}
                                    onGuideUpdate={handleGuideUpdate}
                                    isExporting={isExporting}
                                    onDoubleClick={() => setEditingLayerId(layer.id)}
                                >
                                    <TextLayerContent
                                        layer={layer as TextLayer}
                                        isEditing={editingLayerId === layer.id}
                                        onStartEdit={() => setEditingLayerId(layer.id)}
                                        onEndEdit={() => setEditingLayerId(null)}
                                        onContentChange={(content) => updateLayer(layer.id, { content })}
                                        isExporting={isExporting}
                                    />
                                </DraggableLayer>
                            ))}
                    </div>

                    {/* Quick Add Buttons — desktop + mobile */}
                    {!isExporting && (
                        <div
                            data-export-ignore="true"
                            className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-50"
                        >
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => { e.stopPropagation(); addTextLayer(); }}
                                className="bg-black/70 hover:bg-black/90 text-white border border-white/20 shadow-lg backdrop-blur-sm h-8 text-xs px-2.5"
                            >
                                <Type className="h-3.5 w-3.5 mr-1" />
                                Texte
                            </Button>
                        </div>
                    )}

                    {/* Alignment Guides — rendered inside the canvas container */}
                    {showGuideX && canvasRef.current && (
                        <div
                            data-export-ignore="true"
                            className="absolute w-px z-50 pointer-events-none"
                            style={{
                                left: canvasRef.current.offsetLeft + canvasRef.current.offsetWidth / 2,
                                top: canvasRef.current.offsetTop,
                                height: canvasRef.current.offsetHeight,
                                background: 'linear-gradient(to bottom, transparent, #ef4444, #ef4444, transparent)',
                            }}
                        />
                    )}
                    {showGuideY && canvasRef.current && (
                        <div
                            data-export-ignore="true"
                            className="absolute h-px z-50 pointer-events-none"
                            style={{
                                top: canvasRef.current.offsetTop + canvasRef.current.offsetHeight / 2,
                                left: canvasRef.current.offsetLeft,
                                width: canvasRef.current.offsetWidth,
                                background: 'linear-gradient(to right, transparent, #ef4444, #ef4444, transparent)',
                            }}
                        />
                    )}
                </div>

                {/* Desktop Properties Panel */}
                <div className="hidden md:flex w-80 bg-black/60 border-l border-white/10 flex-col min-h-0">
                    <Tabs defaultValue="slide" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="grid grid-cols-2 m-2 bg-white/5 shrink-0">
                            <TabsTrigger value="slide" className="data-[state=active]:bg-primary/20 text-xs gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5" />
                                Slide
                            </TabsTrigger>
                            <TabsTrigger value="element" className="data-[state=active]:bg-primary/20 text-xs gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                Élément
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: Slide — Background + Filters + Add elements */}
                        <TabsContent value="slide" className="flex-1 overflow-y-auto p-3 space-y-3 m-0 min-h-0">
                            <BackgroundPanel slide={activeSlide} images={images} onUpdate={updateSlide} />

                            {/* Quick add buttons */}
                            <div className="pt-2 border-t border-white/10">
                                <label className="text-xs text-white/60 mb-2 block">Ajouter</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button variant="outline" size="sm" onClick={addTextLayer} className="border-white/10 text-white hover:bg-white/10 h-9">
                                        <Type className="h-4 w-4 mr-1.5" />
                                        <span className="text-xs">Texte</span>
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* TAB 2: Element — Selected layer properties + Presets */}
                        <TabsContent value="element" className="flex-1 overflow-y-auto p-3 space-y-3 m-0 min-h-0">
                            {selectedLayer && selectedLayer.type === 'text' ? (
                                <>
                                    <TextPanel
                                        layer={selectedLayer as TextLayer}
                                        onUpdate={(updates) => updateLayer(selectedLayer.id, updates)}
                                    />

                                    {/* Delete / Duplicate inline */}
                                    <div className="flex gap-2 pt-2 border-t border-white/10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-white/10 text-white hover:bg-white/10"
                                            onClick={() => duplicateLayer(selectedLayer.id)}
                                        >
                                            Dupliquer
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => { deleteLayer(selectedLayer.id); setSelectedLayerId(null); }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                                            Supprimer
                                        </Button>
                                    </div>

                                    {/* Presets section for text layers */}
                                    <div className="pt-2 border-t border-white/10">
                                        <TextPresetsPanel
                                            onApply={applyTextPreset}
                                            selectedLayer={selectedLayer as TextLayer}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-white/40 py-12">
                                    <Type className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Sélectionnez un élément</p>
                                    <p className="text-xs mt-1 text-white/30">Cliquez sur un texte du canvas</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Slide Navigation */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 p-1.5 sm:p-3 bg-black/40 border-t border-white/10">
                <Button
                    variant="outline" size="sm"
                    onClick={() => { setActiveSlideIndex(Math.max(0, activeSlideIndex - 1)); setSelectedLayerId(null); }}
                    disabled={activeSlideIndex === 0}
                    className="border-white/10 text-white hover:bg-white/10 h-7 sm:h-9"
                >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <span className="text-white/60 text-xs sm:text-sm">
                    {activeSlideIndex + 1} / {slides.length}
                </span>
                <Button
                    variant="outline" size="sm"
                    onClick={() => { setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1)); setSelectedLayerId(null); }}
                    disabled={activeSlideIndex === slides.length - 1}
                    className="border-white/10 text-white hover:bg-white/10 h-7 sm:h-9"
                >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
            </div>

            {/* Mobile Toolbar + Bottom Sheet */}
            <MobileToolbar
                selectedLayer={selectedLayer?.type === 'text' ? selectedLayer as TextLayer : null}
                activeSlide={activeSlide}
                images={images}
                onUpdateLayer={(updates) => selectedLayerId && updateLayer(selectedLayerId, updates)}
                onUpdateSlide={updateSlide}
                onDeleteLayer={() => selectedLayerId && deleteLayer(selectedLayerId)}
                onDuplicateLayer={() => selectedLayerId && duplicateLayer(selectedLayerId)}
                onApplyPreset={applyPresetMobile}
                hasSelection={!!selectedLayerId}
            />
        </div>
    );
}
