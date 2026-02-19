"use client";

import { cn } from "@/lib/utils";

interface RocketIconProps {
    className?: string;
    isLaunching?: boolean;
    showSmoke?: boolean;
}

export function RocketIcon({ className, isLaunching = false, showSmoke }: RocketIconProps) {
    const shouldRenderSmoke = isLaunching && (showSmoke ?? true);

    return (
        <div
            className={cn("relative will-change-transform", className)}
            style={{ animation: isLaunching ? 'rocket-shake 0.1s infinite' : 'rocket-float 3s ease-in-out infinite' }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 200 300"
                fill="none"
                className={cn(isLaunching && "drop-shadow-[0_0_15px_rgba(255,100,0,0.5)]")}
                style={{ containIntrinsicSize: 'auto', contain: 'paint' }}
            >

                {/* Smoke Particles — reduced to 3 for performance */}
                {shouldRenderSmoke && (
                    <g className="mix-blend-screen transition-all duration-500">
                        <circle cx="80" cy="165" r="10" fill="hsl(var(--muted-foreground) / 0.25)" style={{ animation: 'smoke-flow 0.5s infinite 0s' }} />
                        <circle cx="120" cy="165" r="10" fill="hsl(var(--muted-foreground) / 0.25)" style={{ animation: 'smoke-flow 0.5s infinite 0.1s' }} />
                        <circle cx="100" cy="180" r="14" fill="hsl(var(--muted-foreground) / 0.2)" style={{ animation: 'smoke-flow 0.5s infinite 0.2s' }} />
                    </g>
                )}

                {/* Thrust Blast */}
                <circle cx="100" cy="180" r="30" fill="hsl(var(--primary))" className={cn("transition-opacity duration-300", isLaunching ? "opacity-100" : "opacity-0")} style={{ animation: 'exhaust-force 0.15s infinite' }} />

                {/* Main Flames */}
                <g className="transition-all duration-500">
                    {/* LAUNCHING: Force Flames — reduced to 3 layers */}
                    <path d="M100 160 Q170 250 100 320 Q30 250 100 160" fill="hsl(var(--primary))" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.1s infinite alternate', transformOrigin: 'top center' }} />
                    <path d="M100 160 Q130 210 100 260 Q70 210 100 160" fill="#FFD700" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.08s infinite alternate', transformOrigin: 'top center' }} />
                    <path d="M100 160 Q108 180 100 200 Q92 180 100 160" fill="#FFFFFF" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.05s infinite', transformOrigin: 'top center' }} />

                    {/* IDLE: Small Sharp Flames */}
                    <path d="M96 158 Q100 180 104 158" fill="hsl(348 90% 60%)" className={cn(!isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-flicker 0.2s infinite', transformOrigin: 'top center' }} />
                    <path d="M98 158 Q100 175 102 158" fill="#FFD700" className={cn(!isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-flicker 0.15s infinite reverse', transformOrigin: 'top center' }} />
                </g>

                {/* Rocket Body */}
                <g transform="translate(0, -10)">
                    <path d="M70 140 L60 160 L90 150 Z" fill="hsl(var(--primary))" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
                    <path d="M130 140 L140 160 L110 150 Z" fill="hsl(var(--primary))" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
                    <ellipse cx="100" cy="100" rx="35" ry="60" fill="white" stroke="#111" strokeWidth="4" />
                    <path d="M72 70 Q100 10 128 70" fill="hsl(var(--primary))" stroke="#111" strokeWidth="4" />
                    <path d="M72 70 Q100 80 128 70" fill="hsl(var(--primary))" />
                    <circle cx="100" cy="100" r="16" fill="hsl(var(--accent))" stroke="#111" strokeWidth="4" />
                    <circle cx="100" cy="100" r="10" fill="hsl(174 100% 70%)" />
                    <circle cx="104" cy="96" r="3" fill="white" opacity="0.8" />
                    <path d="M85 145 Q100 155 115 145 L115 150 Q100 160 85 150 Z" fill="hsl(var(--accent))" stroke="#111" strokeWidth="3" />
                </g>
            </svg>
        </div>
    );
}
