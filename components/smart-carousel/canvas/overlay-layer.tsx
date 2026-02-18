'use client';

import type { OverlayLayer } from '@/types/post';

interface OverlayLayerContentProps {
    layer: OverlayLayer;
}

export function OverlayLayerContent({ layer }: OverlayLayerContentProps) {
    // Use pixel dimensions for overlay within canvas (360x640)
    const widthPx = layer.width ? (layer.width / 100) * 360 : 200;
    const heightPx = layer.height ? (layer.height / 100) * 640 : 120;

    const style: React.CSSProperties = {
        backgroundColor: layer.backgroundColor,
        backdropFilter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        WebkitBackdropFilter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        minWidth: '30px',
        minHeight: '20px',
        borderRadius: '8px',
    };

    return (
        <div style={style} />
    );
}
