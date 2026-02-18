'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-between p-4 border-2 border-border bg-card">
                <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-primary" />
                    <div>
                        <Label className="text-base font-bold">Thème</Label>
                        <p className="text-sm text-muted-foreground">Chargement...</p>
                    </div>
                </div>
            </div>
        );
    }

    const themeLabels = {
        dark: 'Sombre',
        white: 'Blanc',
        beige: 'Beige'
    };

    return (
        <div className="flex items-center justify-between p-4 border-2 border-border bg-card">
            <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                <div>
                    <Label className="text-base font-bold">Thème</Label>
                    <p className="text-sm text-muted-foreground">
                        {themeLabels[theme as keyof typeof themeLabels] || 'Sombre'}
                    </p>
                </div>
            </div>
            <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[140px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="dark">🌙 Sombre</SelectItem>
                    <SelectItem value="white">☀️ Blanc</SelectItem>
                    <SelectItem value="beige">🏜️ Beige</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
