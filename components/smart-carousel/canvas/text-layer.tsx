'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { TextLayer } from '@/types/post';

interface TextLayerContentProps {
    layer: TextLayer;
    isEditing: boolean;
    onStartEdit: () => void;
    onEndEdit: () => void;
    onContentChange: (content: string) => void;
    isExporting?: boolean;
}

export function TextLayerContent({
    layer,
    isEditing,
    onStartEdit,
    onEndEdit,
    onContentChange,
    isExporting,
}: TextLayerContentProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [localContent, setLocalContent] = useState(layer.content);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setLocalContent(layer.content);
    }, [layer.content]);

    const handleBlur = () => {
        onContentChange(localContent);
        onEndEdit();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setLocalContent(layer.content);
            onEndEdit();
        }
        // Enter inserts a line break (default textarea behavior)
        // Only Escape cancels editing; clicking outside (blur) validates
    };

    const maxWidth = layer.maxWidth || 320;
    const textMode = layer.textMode || 'outline';

    // Helper: split text into emoji and non-emoji segments
    // Emojis will be rendered without text-shadow to avoid ugly black outlines
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)/gu;
    const renderContentWithCleanEmojis = (text: string) => {
        const parts = text.split(emojiRegex).filter(Boolean);
        if (parts.length <= 1 && !emojiRegex.test(text)) return text;
        // Reset regex lastIndex
        emojiRegex.lastIndex = 0;
        return parts.map((part, i) => {
            emojiRegex.lastIndex = 0;
            if (emojiRegex.test(part)) {
                return <span key={i} style={{ textShadow: 'none' }}>{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    // TikTok-style text rendering based on mode
    const hasOutline = textMode === 'outline' && layer.outlineWidth && layer.outlineWidth > 0;
    const outlineColor = layer.outlineColor || '#000000';
    const strokeWidth = hasOutline ? layer.outlineWidth! : 0;

    // Generate TikTok-authentic outline using multiple text-shadows
    // Creates a thick, clean, smooth outline like TikTok's native editor
    // Uses 3 concentric rings of shadows for complete coverage without gaps
    const generateTikTokOutline = (width: number, color: string): string => {
        if (width <= 0) return '';
        const shadows: string[] = [];

        // Outer ring — full width, 24 points for smooth circle
        const outerSteps = 24;
        for (let i = 0; i < outerSteps; i++) {
            const angle = (2 * Math.PI * i) / outerSteps;
            shadows.push(`${(Math.cos(angle) * width).toFixed(1)}px ${(Math.sin(angle) * width).toFixed(1)}px 0 ${color}`);
        }

        // Middle ring — 75% width, 16 points for fill
        if (width >= 1.5) {
            const midWidth = width * 0.75;
            const midSteps = 16;
            for (let i = 0; i < midSteps; i++) {
                const angle = (2 * Math.PI * i) / midSteps;
                shadows.push(`${(Math.cos(angle) * midWidth).toFixed(1)}px ${(Math.sin(angle) * midWidth).toFixed(1)}px 0 ${color}`);
            }
        }

        // Inner ring — 40% width, 8 points for core fill
        if (width >= 2) {
            const innerWidth = width * 0.4;
            for (let i = 0; i < 8; i++) {
                const angle = (2 * Math.PI * i) / 8;
                shadows.push(`${(Math.cos(angle) * innerWidth).toFixed(1)}px ${(Math.sin(angle) * innerWidth).toFixed(1)}px 0 ${color}`);
            }
        }

        // Soft drop shadow for depth (like TikTok)
        shadows.push(`0 1px 3px rgba(0,0,0,0.5)`);
        return shadows.join(', ');
    };

    // Build mode-specific styles
    // isBoxMode drives a special inline-span rendering (see return below)
    const isBoxMode = textMode === 'box';

    const getModeStyles = (): React.CSSProperties => {
        switch (textMode) {
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    textShadow: hasOutline ? generateTikTokOutline(strokeWidth, outlineColor) : undefined,
                } as React.CSSProperties;
            case 'box':
                // For box mode, the background is applied via inline spans per line
                return {
                    backgroundColor: 'transparent',
                };
            case 'shadow':
                return {
                    backgroundColor: 'transparent',
                    textShadow: `0 2px 8px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.9)`,
                };
            default:
                return {};
        }
    };

    const modeStyles = getModeStyles();

    const textStyles: React.CSSProperties = {
        fontSize: `${layer.fontSize}px`,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
        textAlign: layer.textAlign,
        color: layer.color,
        lineHeight: layer.lineHeight || 1.4,
        letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : undefined,
        textDecoration: layer.textDecoration || 'none',
        width: `${maxWidth}px`,
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        ...modeStyles,
    };

    if (isEditing) {
        return (
            <textarea
                ref={inputRef}
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="bg-black/50 backdrop-blur border-2 border-primary rounded p-2 resize-none outline-none min-w-[120px]"
                style={{
                    ...textStyles,
                    minHeight: '1.5em',
                }}
                rows={Math.max(1, localContent.split('\n').length)}
            />
        );
    }

    // TikTok Box mode: uses box-decoration-break: clone for natural word-wrap backgrounds
    // This CSS property makes the background/padding/border-radius apply to each wrapped line
    // independently — exactly how TikTok renders its text boxes
    if (isBoxMode && !isEditing) {
        const boxBg = layer.backgroundColor || 'rgba(255,255,255,0.95)';

        return (
            <div
                style={{
                    ...textStyles,
                    textAlign: layer.textAlign || 'center',
                    lineHeight: 1.6,
                    backgroundColor: 'transparent',
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onStartEdit();
                }}
            >
                <span
                    style={{
                        backgroundColor: boxBg,
                        padding: '4px 12px',
                        borderRadius: '8px',
                        // box-decoration-break: clone makes each wrapped line get its own bg/padding/radius
                        WebkitBoxDecorationBreak: 'clone',
                        boxDecorationBreak: 'clone' as React.CSSProperties['boxDecorationBreak'],
                        lineHeight: 1.8,
                    }}
                >
                    {renderContentWithCleanEmojis(layer.content || 'Double-cliquez pour modifier')}
                </span>
            </div>
        );
    }

    // TikTok Caption mode: each visual line gets its OWN separate box with gaps
    // Closer to TikTok's native caption style where lines are visually separated
    if (textMode === 'caption' && !isEditing) {
        const boxBg = layer.backgroundColor || 'rgba(255,255,255,0.92)';
        const content = layer.content || 'Double-cliquez pour modifier';
        // Split by explicit newlines first, then we let CSS handle word-wrap per segment
        const lines = content.split('\n').filter(l => l.trim());

        return (
            <div
                style={{
                    ...textStyles,
                    textAlign: layer.textAlign || 'center',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: layer.textAlign === 'left' ? 'flex-start' : layer.textAlign === 'right' ? 'flex-end' : 'center',
                    gap: '4px',
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onStartEdit();
                }}
            >
                {lines.map((line, i) => (
                    <span
                        key={i}
                        style={{
                            backgroundColor: boxBg,
                            padding: '6px 14px',
                            borderRadius: '6px',
                            display: 'inline',
                            WebkitBoxDecorationBreak: 'clone',
                            boxDecorationBreak: 'clone' as React.CSSProperties['boxDecorationBreak'],
                            lineHeight: 1.7,
                        }}
                    >
                        {renderContentWithCleanEmojis(line)}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div
            className="whitespace-pre-wrap"
            style={textStyles}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onStartEdit();
            }}
        >
            {renderContentWithCleanEmojis(layer.content || 'Double-cliquez pour modifier')}
        </div>
    );
}
