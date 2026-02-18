'use client';

import { Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
    GripVertical,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Trash2,
    Copy,
    Type,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorLayer, TextLayer } from '@/types/post';

interface LayerPanelProps {
    layers: EditorLayer[];
    selectedLayerId: string | null;
    onSelectLayer: (id: string | null) => void;
    onReorderLayers: (layers: EditorLayer[]) => void;
    onUpdateLayer: (id: string, updates: Partial<EditorLayer>) => void;
    onDeleteLayer: (id: string) => void;
    onDuplicateLayer: (id: string) => void;
}

export function LayerPanel({
    layers,
    selectedLayerId,
    onSelectLayer,
    onReorderLayers,
    onUpdateLayer,
    onDeleteLayer,
    onDuplicateLayer,
}: LayerPanelProps) {
    // Sort by zIndex descending (highest at top of list)
    const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

    const handleReorder = (newOrder: EditorLayer[]) => {
        // Update zIndex based on new order (reversed since list shows highest first)
        const updatedLayers = newOrder.map((layer, idx) => ({
            ...layer,
            zIndex: newOrder.length - idx,
        }));
        onReorderLayers(updatedLayers);
    };

    const selectedLayer = layers.find(l => l.id === selectedLayerId);

    return (
        <div className="space-y-4">
            {/* Layer List */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Calques</h3>
                {sortedLayers.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-4">
                        Aucun calque. Ajoutez un texte.
                    </p>
                ) : (
                    <Reorder.Group
                        axis="y"
                        values={sortedLayers}
                        onReorder={handleReorder}
                        className="space-y-1"
                    >
                        {sortedLayers.map((layer) => (
                            <Reorder.Item
                                key={layer.id}
                                value={layer}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded border transition-colors cursor-grab active:cursor-grabbing",
                                    selectedLayerId === layer.id
                                        ? "bg-primary/20 border-primary"
                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                )}
                                onClick={() => onSelectLayer(layer.id)}
                            >
                                {/* Drag handle */}
                                <GripVertical className="h-4 w-4 text-white/40 shrink-0" />

                                {/* Layer icon */}
                                <Type className="h-4 w-4 text-white/60 shrink-0" />

                                {/* Layer name/preview */}
                                <span className="flex-1 text-sm text-white truncate">
                                    {layer.type === 'text'
                                        ? (layer as TextLayer).content.slice(0, 15) || 'Texte'
                                        : 'Calque'}
                                </span>

                                {/* Quick actions */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateLayer(layer.id, { visible: layer.visible === false });
                                        }}
                                        className="p-1 hover:bg-white/10 rounded"
                                    >
                                        {layer.visible !== false ? (
                                            <Eye className="h-3 w-3 text-white/40" />
                                        ) : (
                                            <EyeOff className="h-3 w-3 text-white/20" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateLayer(layer.id, { locked: !layer.locked });
                                        }}
                                        className="p-1 hover:bg-white/10 rounded"
                                    >
                                        {layer.locked ? (
                                            <Lock className="h-3 w-3 text-yellow-400" />
                                        ) : (
                                            <Unlock className="h-3 w-3 text-white/20" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDuplicateLayer(layer.id);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded"
                                    >
                                        <Copy className="h-3 w-3 text-white/40" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteLayer(layer.id);
                                        }}
                                        className="p-1 hover:bg-red-500/20 rounded"
                                    >
                                        <Trash2 className="h-3 w-3 text-red-400" />
                                    </button>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                )}
            </div>

            {/* Selected Layer Properties */}
            {selectedLayer && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-medium text-white">Proprietes du calque</h3>

                    {/* Position X/Y */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">Position X</label>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    value={Math.round(selectedLayer.x)}
                                    onChange={(e) => onUpdateLayer(selectedLayer.id, { x: parseFloat(e.target.value) || 0 })}
                                    className="bg-white/5 border-white/10 text-white"
                                    min={0}
                                    max={100}
                                />
                                <span className="text-white/40 text-xs">%</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">Position Y</label>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    value={Math.round(selectedLayer.y)}
                                    onChange={(e) => onUpdateLayer(selectedLayer.id, { y: parseFloat(e.target.value) || 0 })}
                                    className="bg-white/5 border-white/10 text-white"
                                    min={0}
                                    max={100}
                                />
                                <span className="text-white/40 text-xs">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Position Presets */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60">Position rapide</label>
                        <div className="grid grid-cols-3 gap-1">
                            {[
                                { x: 10, y: 10, label: 'HG' },
                                { x: 50, y: 10, label: 'HC' },
                                { x: 90, y: 10, label: 'HD' },
                                { x: 10, y: 50, label: 'MG' },
                                { x: 50, y: 50, label: 'C' },
                                { x: 90, y: 50, label: 'MD' },
                                { x: 10, y: 90, label: 'BG' },
                                { x: 50, y: 90, label: 'BC' },
                                { x: 90, y: 90, label: 'BD' },
                            ].map((pos) => (
                                <Button
                                    key={pos.label}
                                    variant="outline"
                                    size="sm"
                                    className="border-white/10 text-white/60 text-xs h-7 hover:bg-white/10"
                                    onClick={() => onUpdateLayer(selectedLayer.id, { x: pos.x, y: pos.y })}
                                >
                                    {pos.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 flex justify-between">
                            <span>Opacite</span>
                            <span className="text-primary">{selectedLayer.opacity}%</span>
                        </label>
                        <Slider
                            value={[selectedLayer.opacity]}
                            onValueChange={([v]) => onUpdateLayer(selectedLayer.id, { opacity: v })}
                            min={0}
                            max={100}
                        />
                    </div>

                    {/* Rotation */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60 flex justify-between">
                            <span>Rotation</span>
                            <span className="text-primary">{selectedLayer.rotation || 0}°</span>
                        </label>
                        <Slider
                            value={[selectedLayer.rotation || 0]}
                            onValueChange={([v]) => onUpdateLayer(selectedLayer.id, { rotation: v })}
                            min={0}
                            max={360}
                            step={1}
                        />
                    </div>

                    {/* Z-Index Controls */}
                    <div className="space-y-1">
                        <label className="text-xs text-white/60">Ordre</label>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-white/10 text-white"
                                onClick={() => onUpdateLayer(selectedLayer.id, { zIndex: selectedLayer.zIndex + 1 })}
                            >
                                <ArrowUp className="h-4 w-4 mr-1" />
                                Avancer
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-white/10 text-white"
                                onClick={() => onUpdateLayer(selectedLayer.id, { zIndex: Math.max(1, selectedLayer.zIndex - 1) })}
                            >
                                <ArrowDown className="h-4 w-4 mr-1" />
                                Reculer
                            </Button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-white/10 text-white"
                            onClick={() => onDuplicateLayer(selectedLayer.id)}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Dupliquer
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => {
                                onDeleteLayer(selectedLayer.id);
                                onSelectLayer(null);
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
