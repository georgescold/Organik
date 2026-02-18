'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
    TEXT_STYLE_PRESETS,
    loadCustomPresets,
    saveCustomPresets,
    type TextStylePreset,
} from '@/lib/text-style-presets';
import { Trash2, BookmarkPlus } from 'lucide-react';
import type { TextLayer } from '@/types/post';

type Scope = 'layer' | 'slide' | 'all';

interface TextPresetsPanelProps {
    onApply: (preset: TextStylePreset, scope: Scope) => void;
    selectedLayer: TextLayer | null;
}

function PresetCard({
    preset,
    onApply,
    onDelete,
}: {
    preset: TextStylePreset;
    onApply: () => void;
    onDelete?: () => void;
}) {
    // Generate outline shadows for preview
    const outlineShadow = preset.style.outlineWidth && preset.style.outlineColor
        ? (() => {
            const w = preset.style.outlineWidth!;
            const c = preset.style.outlineColor!;
            const shadows: string[] = [];
            const steps = 12;
            for (let i = 0; i < steps; i++) {
                const angle = (2 * Math.PI * i) / steps;
                shadows.push(`${(Math.cos(angle) * w).toFixed(1)}px ${(Math.sin(angle) * w).toFixed(1)}px 0 ${c}`);
            }
            return shadows.join(', ');
        })()
        : undefined;

    return (
        <div className="relative group">
            <button
                onClick={onApply}
                className={cn(
                    'w-full rounded-lg overflow-hidden border border-white/10 text-left transition-all',
                    'hover:border-primary/60 hover:scale-[1.02] active:scale-[0.98]',
                )}
            >
                <div
                    className="flex items-center justify-center h-12"
                    style={{ backgroundColor: preset.previewBg }}
                >
                    <span
                        style={{
                            fontFamily: preset.style.fontFamily,
                            fontWeight: preset.style.fontWeight,
                            fontStyle: preset.style.fontStyle,
                            color: preset.style.color,
                            backgroundColor: preset.style.textMode === 'box'
                                ? (preset.style.backgroundColor || 'rgba(255,255,255,0.95)')
                                : undefined,
                            padding: preset.style.textMode === 'box' ? '3px 10px' : undefined,
                            borderRadius: preset.style.textMode === 'box' ? '6px' : undefined,
                            textShadow: preset.style.textMode === 'shadow'
                                ? '0 2px 6px rgba(0,0,0,0.7)'
                                : outlineShadow,
                            fontSize: '20px',
                            lineHeight: 1,
                        }}
                    >
                        Aa
                    </span>
                </div>
                <div className="px-2 py-1 bg-white/5">
                    <p className="text-[11px] text-white/60 truncate">{preset.name}</p>
                </div>
            </button>

            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className={cn(
                        'absolute top-1 right-1 p-1 rounded bg-black/60 text-red-400',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        'hover:bg-red-500/20'
                    )}
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

export function TextPresetsPanel({ onApply, selectedLayer }: TextPresetsPanelProps) {
    const [customPresets, setCustomPresets] = useState<TextStylePreset[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCustomPresets(loadCustomPresets());
    }, []);

    const handleSaveCustomPreset = () => {
        if (!selectedLayer || !newName.trim()) return;
        const preset: TextStylePreset = {
            id: `custom-${Date.now()}`,
            name: newName.trim(),
            previewBg: '#1e1e2e',
            isCustom: true,
            style: {
                fontFamily: selectedLayer.fontFamily,
                fontWeight: selectedLayer.fontWeight,
                fontStyle: selectedLayer.fontStyle,
                color: selectedLayer.color,
                fontSize: selectedLayer.fontSize,
                lineHeight: selectedLayer.lineHeight,
                backgroundColor: selectedLayer.backgroundColor,
                outlineColor: selectedLayer.outlineColor,
                outlineWidth: selectedLayer.outlineWidth,
                textMode: selectedLayer.textMode,
            },
        };
        const updated = [...customPresets, preset];
        setCustomPresets(updated);
        saveCustomPresets(updated);
        setNewName('');
        setIsCreating(false);
    };

    const handleDeleteCustomPreset = (id: string) => {
        const updated = customPresets.filter(p => p.id !== id);
        setCustomPresets(updated);
        saveCustomPresets(updated);
    };

    return (
        <div className="space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Styles rapides</p>

            {/* Built-in presets */}
            <div className="grid grid-cols-3 gap-1.5">
                {TEXT_STYLE_PRESETS.map((preset) => (
                    <PresetCard
                        key={preset.id}
                        preset={preset}
                        onApply={() => onApply(preset, 'layer')}
                    />
                ))}
            </div>

            {/* Custom presets */}
            {customPresets.length > 0 && (
                <>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Mes styles</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {customPresets.map((preset) => (
                            <PresetCard
                                key={preset.id}
                                preset={preset}
                                onApply={() => onApply(preset, 'layer')}
                                onDelete={() => handleDeleteCustomPreset(preset.id)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Save as preset button */}
            {selectedLayer && (
                <div>
                    {!isCreating ? (
                        <button
                            onClick={() => {
                                setIsCreating(true);
                                setTimeout(() => nameInputRef.current?.focus(), 50);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-dashed border-white/15 text-[11px] text-white/40 hover:border-primary/40 hover:text-primary/70 transition-colors"
                        >
                            <BookmarkPlus className="h-3 w-3" />
                            Sauvegarder le style
                        </button>
                    ) : (
                        <div className="flex gap-1.5">
                            <input
                                ref={nameInputRef}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCustomPreset();
                                    if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
                                }}
                                placeholder="Nom..."
                                className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-primary"
                            />
                            <button
                                onClick={handleSaveCustomPreset}
                                disabled={!newName.trim()}
                                className="px-2 py-1 bg-primary text-white text-xs rounded disabled:opacity-40"
                            >
                                OK
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
