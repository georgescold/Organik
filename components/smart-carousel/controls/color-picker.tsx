'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    presets?: string[];
    label?: string;
}

const defaultPresets = [
    '#ffffff', '#000000', '#1a1a2e', '#16213e',
    '#0f3460', '#e94560', '#ff6b6b', '#feca57',
    '#48dbfb', '#1dd1a1', '#5f27cd', '#341f97',
    '#2e86de', '#10ac84', '#ff9f43', '#ee5a24',
    '#c7ecee', '#dfe6e9', '#b2bec3', '#636e72',
];

export function ColorPicker({
    value,
    onChange,
    presets = defaultPresets,
    label
}: ColorPickerProps) {
    const [localColor, setLocalColor] = useState(value);
    const colorInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalColor(value);
    }, [value]);

    const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        setLocalColor(newColor);
        onChange(newColor);
    };

    const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let hex = e.target.value;
        if (!hex.startsWith('#')) {
            hex = '#' + hex;
        }
        setLocalColor(hex);
        // Only update if valid hex
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            onChange(hex);
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-xs text-white/60 block">{label}</label>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10"
                    >
                        <div
                            className="w-6 h-6 rounded border border-white/20 mr-2 shrink-0"
                            style={{ backgroundColor: value }}
                        />
                        <span className="text-white/80 font-mono text-sm">
                            {value.toUpperCase()}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-64 p-3 bg-zinc-900 border-white/10"
                    align="start"
                >
                    {/* Color presets grid */}
                    <div className="grid grid-cols-8 gap-1 mb-3">
                        {presets.map((color) => (
                            <button
                                key={color}
                                className={cn(
                                    "w-6 h-6 rounded border-2 transition-all hover:scale-110",
                                    value.toLowerCase() === color.toLowerCase()
                                        ? "border-white ring-2 ring-primary"
                                        : "border-transparent hover:border-white/50"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    setLocalColor(color);
                                    onChange(color);
                                }}
                            />
                        ))}
                    </div>

                    {/* Native color picker + hex input */}
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <input
                                ref={colorInputRef}
                                type="color"
                                value={localColor}
                                onChange={handleNativeColorChange}
                                className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                            />
                            <div
                                className="w-10 h-10 rounded border-2 border-white/20 cursor-pointer hover:border-white/40 transition-colors"
                                style={{ backgroundColor: localColor }}
                                onClick={() => colorInputRef.current?.click()}
                            />
                        </div>
                        <Input
                            value={localColor}
                            onChange={handleHexInput}
                            placeholder="#000000"
                            className="flex-1 bg-white/5 border-white/10 text-white font-mono text-sm"
                            maxLength={7}
                        />
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
