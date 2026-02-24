'use client';

import { motion, useMotionValue } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { EditorLayer, TextLayer } from '@/types/post';

interface DraggableLayerProps {
    layer: EditorLayer;
    isSelected: boolean;
    canvasRef: React.RefObject<HTMLDivElement>;
    onSelect: (id: string) => void;
    onPositionChange: (id: string, x: number, y: number) => void;
    onResize?: (id: string, value: number) => void;
    onTextWidthResize?: (id: string, width: number) => void;
    onRotate?: (id: string, rotation: number) => void;
    onGuideUpdate?: (x: boolean, y: boolean) => void;
    onDoubleClick?: () => void;
    isExporting?: boolean;
    children: React.ReactNode;
}

// Use a generic interface for touch points to avoid React.Touch vs native Touch conflicts
interface TouchPoint { clientX: number; clientY: number; }

// Helper to get distance between two touch points
function getTouchDistance(t1: TouchPoint, t2: TouchPoint): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Helper to get angle between two touch points
function getTouchAngle(t1: TouchPoint, t2: TouchPoint): number {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
}

export function DraggableLayer({
    layer,
    isSelected,
    canvasRef,
    onSelect,
    onPositionChange,
    onResize,
    onTextWidthResize,
    onRotate,
    onGuideUpdate,
    onDoubleClick,
    isExporting,
    children,
}: DraggableLayerProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isPinching, setIsPinching] = useState(false);
    const resizeStartRef = useRef<{ x: number; y: number; fontSize: number; maxWidth: number } | null>(null);
    const pinchStartRef = useRef<{ distance: number; angle: number; fontSize: number; rotation: number } | null>(null);
    const layerRef = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    useEffect(() => {
        x.set(0);
        y.set(0);
    }, [layer.x, layer.y, x, y]);

    // ============================================
    // Multi-touch: Pinch to rotate only (no font size zoom)
    // Font size is controlled exclusively via resize handles
    // ============================================
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();
            setIsPinching(true);
            onSelect(layer.id);

            const t1 = e.touches[0];
            const t2 = e.touches[1];

            pinchStartRef.current = {
                distance: getTouchDistance(t1, t2),
                angle: getTouchAngle(t1, t2),
                fontSize: 0, // unused — pinch no longer changes font size
                rotation: layer.rotation || 0,
            };
        }
    }, [layer, onSelect]);

    useEffect(() => {
        const el = layerRef.current;
        if (!el) return;

        const handlePinchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || !pinchStartRef.current) return;
            e.preventDefault();

            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentAngle = getTouchAngle(t1, t2);
            const start = pinchStartRef.current;

            // Rotation from angle change (pinch no longer resizes text)
            if (onRotate) {
                const deltaAngle = currentAngle - start.angle;
                let newRotation = (start.rotation + deltaAngle) % 360;
                if (newRotation < 0) newRotation += 360;
                // Snap to 0, 90, 180, 270 within 5 degree threshold
                const snapAngles = [0, 90, 180, 270, 360];
                for (const snap of snapAngles) {
                    if (Math.abs(newRotation - snap) < 5) {
                        newRotation = snap % 360;
                        break;
                    }
                }
                onRotate(layer.id, Math.round(newRotation));
            }
        };

        const handlePinchEnd = () => {
            setIsPinching(false);
            pinchStartRef.current = null;
        };

        el.addEventListener('touchmove', handlePinchMove, { passive: false });
        el.addEventListener('touchend', handlePinchEnd);
        el.addEventListener('touchcancel', handlePinchEnd);

        return () => {
            el.removeEventListener('touchmove', handlePinchMove);
            el.removeEventListener('touchend', handlePinchEnd);
            el.removeEventListener('touchcancel', handlePinchEnd);
        };
    }, [layer, onRotate]);

    // ============================================
    // Drag handlers
    // ============================================
    const handleDragStart = () => {
        if (isResizing || isPinching) return;
        setIsDragging(true);
        onSelect(layer.id);
    };

    const handleDragEnd = () => {
        if (isResizing || isPinching) return;
        if (!canvasRef.current) {
            setIsDragging(false);
            return;
        }

        const canvas = canvasRef.current.getBoundingClientRect();
        const deltaXPercent = (x.get() / canvas.width) * 100;
        const deltaYPercent = (y.get() / canvas.height) * 100;

        const newX = Math.max(0, Math.min(100, layer.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100, layer.y + deltaYPercent));

        onPositionChange(layer.id, newX, newY);
        x.set(0);
        y.set(0);
        setIsDragging(false);
        onGuideUpdate?.(false, false);
    };

    const handleDrag = (_: any, info: any) => {
        if (!canvasRef.current || !onGuideUpdate) return;
        const canvas = canvasRef.current.getBoundingClientRect();
        const canvasCenterX = canvas.left + canvas.width / 2;
        const canvasCenterY = canvas.top + canvas.height / 2;
        const threshold = 10;
        onGuideUpdate(
            Math.abs(info.point.x - canvasCenterX) < threshold,
            Math.abs(info.point.y - canvasCenterY) < threshold
        );
    };

    // ============================================
    // Corner / Side resize (mouse + single-touch)
    // ============================================
    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent, type: 'corner' | 'side' = 'corner') => {
        if (!resizeStartRef.current) return;

        const moveClientX = 'touches' in moveEvent
            ? (moveEvent as TouchEvent).touches[0].clientX
            : (moveEvent as MouseEvent).clientX;
        const moveClientY = 'touches' in moveEvent
            ? (moveEvent as TouchEvent).touches[0].clientY
            : (moveEvent as MouseEvent).clientY;

        const ref = resizeStartRef.current;

        if (type === 'corner' && onResize) {
            const deltaY = moveClientY - ref.y;
            const scaleFactor = deltaY * 0.5;
            const newFontSize = Math.max(6, Math.min(120, ref.fontSize + scaleFactor));
            onResize(layer.id, Math.round(newFontSize));
        } else if (type === 'side' && onTextWidthResize) {
            const deltaX = (moveClientX - ref.x) * 2;
            const newWidth = Math.max(24, Math.min(1000, ref.maxWidth + deltaX));
            onTextWidthResize(layer.id, Math.round(newWidth));
        }
    };

    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        onSelect(layer.id);

        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

        resizeStartRef.current = {
            x: clientX,
            y: clientY,
            fontSize: layer.type === 'text' ? (layer as TextLayer).fontSize : 24,
            maxWidth: layer.type === 'text' ? (layer as TextLayer).maxWidth || 400 : 400,
        };

        const handleCornerMove = (moveEvent: MouseEvent | TouchEvent) => handleMouseMove(moveEvent, 'corner');
        const handleMouseUp = () => {
            setIsResizing(false);
            resizeStartRef.current = null;
            document.removeEventListener('mousemove', handleCornerMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleCornerMove);
            document.removeEventListener('touchend', handleMouseUp);
        };

        document.addEventListener('mousemove', handleCornerMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleCornerMove);
        document.addEventListener('touchend', handleMouseUp);
    };

    const handleResizeSideStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        onSelect(layer.id);

        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

        resizeStartRef.current = {
            x: clientX,
            y: clientY,
            fontSize: 0,
            maxWidth: layer.type === 'text' ? (layer as TextLayer).maxWidth || 400 : 400,
        };

        const handleSideMove = (moveEvent: MouseEvent | TouchEvent) => handleMouseMove(moveEvent, 'side');
        const handleMouseUp = () => {
            setIsResizing(false);
            resizeStartRef.current = null;
            document.removeEventListener('mousemove', handleSideMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleSideMove);
            document.removeEventListener('touchend', handleMouseUp);
        };

        document.addEventListener('mousemove', handleSideMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleSideMove);
        document.addEventListener('touchend', handleMouseUp);
    };

    // ============================================
    // Rotation handle (mouse drag for desktop)
    // ============================================
    const handleRotateStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        onSelect(layer.id);

        if (!canvasRef.current) return;
        const canvas = canvasRef.current.getBoundingClientRect();
        // Layer center in viewport coordinates
        const layerCenterX = canvas.left + (layer.x / 100) * canvas.width;
        const layerCenterY = canvas.top + (layer.y / 100) * canvas.height;
        const startRotation = layer.rotation || 0;

        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        const startAngle = Math.atan2(clientY - layerCenterY, clientX - layerCenterX) * (180 / Math.PI);

        const handleRotateMove = (moveEvent: MouseEvent | TouchEvent) => {
            const mx = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
            const my = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;
            const currentAngle = Math.atan2(my - layerCenterY, mx - layerCenterX) * (180 / Math.PI);
            let newRotation = (startRotation + (currentAngle - startAngle)) % 360;
            if (newRotation < 0) newRotation += 360;

            // Snap to cardinal angles
            const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
            for (const snap of snapAngles) {
                if (Math.abs(newRotation - snap) < 4) {
                    newRotation = snap % 360;
                    break;
                }
            }

            onRotate?.(layer.id, Math.round(newRotation));
        };

        const handleRotateEnd = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleRotateMove);
            document.removeEventListener('mouseup', handleRotateEnd);
            document.removeEventListener('touchmove', handleRotateMove);
            document.removeEventListener('touchend', handleRotateEnd);
        };

        document.addEventListener('mousemove', handleRotateMove);
        document.addEventListener('mouseup', handleRotateEnd);
        document.addEventListener('touchmove', handleRotateMove);
        document.addEventListener('touchend', handleRotateEnd);
    };

    // ============================================
    // Locked layer
    // ============================================
    if (layer.locked) {
        return (
            <div
                className={cn(
                    "absolute cursor-not-allowed",
                    isSelected && "ring-2 ring-yellow-500 ring-offset-1 ring-offset-transparent"
                )}
                style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                    opacity: (layer.visible !== false ? layer.opacity : 0) / 100,
                    zIndex: layer.zIndex,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(layer.id);
                }}
            >
                {children}
            </div>
        );
    }

    const commonStyles: React.CSSProperties = {
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        opacity: (layer.visible !== false ? layer.opacity : 0) / 100,
        zIndex: isDragging || isResizing || isPinching ? 1000 : layer.zIndex,
    };

    if (isExporting) {
        return (
            <div
                style={{
                    ...commonStyles,
                    position: 'absolute',
                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                    cursor: 'default',
                    userSelect: 'none',
                    backgroundColor: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                }}
            >
                {children}
            </div>
        );
    }

    return (
        <motion.div
            ref={layerRef}
            drag={!isResizing && !isPinching}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={canvasRef}
            style={{
                x,
                y,
                rotate: layer.rotation || 0,
                ...commonStyles,
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrag={handleDrag}
            onTouchStart={handleTouchStart}
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isResizing && !isPinching) {
                    onSelect(layer.id);
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick?.();
            }}
            className={cn(
                "absolute cursor-grab select-none touch-none",
                "translate-x-[-50%] translate-y-[-50%]"
            )}
            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
            whileHover={{ scale: isSelected ? 1 : 1.01 }}
            transition={{ type: 'tween', duration: 0.1 }}
        >
            {children}

            {/* Selection Ring */}
            {isSelected && !isDragging && !isResizing && !isPinching && (
                <div
                    data-export-ignore="true"
                    className="absolute inset-0 ring-2 ring-primary ring-offset-2 ring-offset-black/50 rounded pointer-events-none"
                />
            )}

            {/* Drag/Resize feedback */}
            {(isDragging || isResizing || isPinching) && (
                <div
                    data-export-ignore="true"
                    className="absolute inset-0 ring-2 ring-primary/70 rounded shadow-xl pointer-events-none"
                />
            )}

            {/* Font size indicator during resize */}
            {isResizing && layer.type === 'text' && (
                <div
                    data-export-ignore="true"
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                >
                    {(layer as TextLayer).fontSize}px
                </div>
            )}

            {/* Rotation indicator during pinch */}
            {isPinching && layer.rotation !== 0 && (
                <div
                    data-export-ignore="true"
                    className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                >
                    {Math.round(layer.rotation || 0)}°
                </div>
            )}

            {/* Resize / Rotate handles */}
            {isSelected && !isDragging && (
                <ResizeHandles
                    onResizeStart={handleResizeStart}
                    onResizeSideStart={handleResizeSideStart}
                    onRotateStart={handleRotateStart}
                    showResize={layer.type === 'text' && !!onResize}
                    showSideResize={layer.type === 'text' && !!onTextWidthResize}
                    showRotate={!!onRotate}
                    isResizing={isResizing}
                />
            )}
        </motion.div>
    );
}

interface ResizeHandlesProps {
    onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
    onResizeSideStart: (e: React.MouseEvent | React.TouchEvent) => void;
    onRotateStart: (e: React.MouseEvent | React.TouchEvent) => void;
    showResize: boolean;
    showSideResize: boolean;
    showRotate: boolean;
    isResizing: boolean;
}

function ResizeHandles({ onResizeStart, onResizeSideStart, onRotateStart, showResize, showSideResize, showRotate, isResizing }: ResizeHandlesProps) {
    const cornerClass = "absolute w-2.5 h-2.5 bg-primary rounded-full border-[1.5px] border-white shadow-md";
    // Mobile: much larger touch targets (min 44px) for easy finger access
    const sideClass = "absolute w-3 h-6 md:w-1.5 md:h-5 bg-primary rounded-full border-[1.5px] border-white shadow-md cursor-ew-resize hover:scale-125 active:scale-150 transition-transform";
    const resizeClass = "absolute w-8 h-8 md:w-5 md:h-5 bg-white rounded-full border-2 border-primary shadow-lg cursor-se-resize hover:scale-125 active:scale-150 transition-transform";

    return (
        <>
            {/* Corner dots */}
            <div data-export-ignore="true" className={cn(cornerClass, "-top-1 -left-1 pointer-events-none")} />
            <div data-export-ignore="true" className={cn(cornerClass, "-top-1 -right-1 pointer-events-none")} />
            <div data-export-ignore="true" className={cn(cornerClass, "-bottom-1 -left-1 pointer-events-none")} />

            {/* Side handles for text width — larger touch area on mobile */}
            {showSideResize && (
                <>
                    <div
                        data-export-ignore="true"
                        className={cn(sideClass, "-right-2 md:-right-1 top-1/2 -translate-y-1/2")}
                        onMouseDown={onResizeSideStart}
                        onTouchStart={onResizeSideStart}
                        aria-label="Redimensionner"
                    />
                    <div
                        data-export-ignore="true"
                        className={cn(sideClass, "-left-2 md:-left-1 top-1/2 -translate-y-1/2")}
                        onMouseDown={onResizeSideStart}
                        onTouchStart={onResizeSideStart}
                        aria-label="Redimensionner"
                    />
                </>
            )}

            {/* Resize handle (bottom-right) — large touch target on mobile */}
            {showResize ? (
                <div
                    data-export-ignore="true"
                    className={cn(resizeClass, "-bottom-4 -right-4 md:-bottom-2.5 md:-right-2.5", isResizing && "scale-125 bg-primary border-white")}
                    onMouseDown={onResizeStart}
                    onTouchStart={onResizeStart}
                    title="Glisser pour redimensionner"
                    aria-label="Redimensionner"
                >
                    <svg className="w-full h-full p-1 md:p-0.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M21 21L12 12M21 21V15M21 21H15" />
                    </svg>
                </div>
            ) : (
                <div data-export-ignore="true" className={cn(cornerClass, "-bottom-1 -right-1 pointer-events-none")} />
            )}

            {/* Rotation handle (top-center) — larger on mobile */}
            {showRotate && (
                <div
                    data-export-ignore="true"
                    className="absolute -top-10 md:-top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto"
                >
                    {/* Connector line */}
                    <div className="w-px h-3 bg-primary/50" />
                    {/* Rotation handle */}
                    <div
                        className="w-7 h-7 md:w-4 md:h-4 bg-white rounded-full border-2 border-primary shadow-lg cursor-grab hover:scale-125 active:scale-150 transition-transform flex items-center justify-center"
                        onMouseDown={onRotateStart}
                        onTouchStart={onRotateStart}
                        title="Glisser pour tourner"
                        aria-label="Faire pivoter"
                    >
                        <svg className="w-3.5 h-3.5 md:w-2.5 md:h-2.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8" />
                        </svg>
                    </div>
                </div>
            )}
        </>
    );
}
