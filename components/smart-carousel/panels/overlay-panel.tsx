'use client';

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '../controls/color-picker';
import { cn } from '@/lib/utils';
import type { OverlayLayer } from '@/types/post';

interface OverlayPanelProps {
    layer: OverlayLayer;
    onUpdate: (updates: Partial<OverlayLayer>) => void;
}

export function OverlayPanel({ layer, onUpdate }: OverlayPanelProps) {
    return (
        <div className="space-y-4">
            {/* Background Color */}
            <ColorPicker
                label="Couleur"
                value={layer.backgroundColor}
                onChange={(color) => onUpdate({ backgroundColor: color })}
            />

            {/* Opacity */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Opacité</span>
                    <span className="text-primary">{layer.opacity}%</span>
                </label>
                <Slider
                    value={[layer.opacity]}
                    onValueChange={([v]) => onUpdate({ opacity: v })}
                    min={0}
                    max={100}
                    step={1}
                />
            </div>

            {/* Width */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Largeur</span>
                    <span className="text-primary">{layer.width || 80}%</span>
                </label>
                <Slider
                    value={[layer.width || 80]}
                    onValueChange={([v]) => onUpdate({ width: v })}
                    min={5}
                    max={100}
                    step={1}
                />
            </div>

            {/* Height */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Hauteur</span>
                    <span className="text-primary">{layer.height || 30}%</span>
                </label>
                <Slider
                    value={[layer.height || 30]}
                    onValueChange={([v]) => onUpdate({ height: v })}
                    min={3}
                    max={100}
                    step={1}
                />
            </div>

            {/* Backdrop Blur */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Flou d&apos;arrière-plan</span>
                    <span className="text-primary">{layer.blur || 0}px</span>
                </label>
                <Slider
                    value={[layer.blur || 0]}
                    onValueChange={([v]) => onUpdate({ blur: v })}
                    min={0}
                    max={30}
                    step={1}
                />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
                <label className="text-xs text-white/60 flex justify-between">
                    <span>Rotation</span>
                    <span className="text-primary">{layer.rotation || 0}°</span>
                </label>
                <Slider
                    value={[layer.rotation || 0]}
                    onValueChange={([v]) => onUpdate({ rotation: v })}
                    min={0}
                    max={360}
                    step={1}
                />
                <div className="flex gap-1 mt-1">
                    {[0, 45, 90, 180, 270].map((angle) => (
                        <Button
                            key={angle}
                            variant="outline"
                            size="sm"
                            className={cn(
                                "flex-1 border-white/10 text-[10px] h-6",
                                (layer.rotation || 0) === angle
                                    ? "bg-white/20 text-white"
                                    : "text-white/60 hover:text-white"
                            )}
                            onClick={() => onUpdate({ rotation: angle })}
                        >
                            {angle}°
                        </Button>
                    ))}
                </div>
            </div>

            {/* Quick presets */}
            <div className="space-y-1">
                <label className="text-xs text-white/60">Préréglages rapides</label>
                <div className="grid grid-cols-2 gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 text-white/70 hover:text-white text-xs h-8"
                        onClick={() => onUpdate({ width: 100, height: 100, x: 50, y: 50, opacity: 40 })}
                    >
                        Plein écran
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 text-white/70 hover:text-white text-xs h-8"
                        onClick={() => onUpdate({ width: 100, height: 25, x: 50, y: 87, opacity: 70 })}
                    >
                        Bande bas
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 text-white/70 hover:text-white text-xs h-8"
                        onClick={() => onUpdate({ width: 100, height: 25, x: 50, y: 13, opacity: 70 })}
                    >
                        Bande haut
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 text-white/70 hover:text-white text-xs h-8"
                        onClick={() => onUpdate({ width: 100, height: 50, x: 50, y: 75, opacity: 60, blur: 0 })}
                    >
                        Gradient bas
                    </Button>
                </div>
            </div>
        </div>
    );
}
