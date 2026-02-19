"use client";

import { cn } from "@/lib/utils";

interface RocketIconProps {
    className?: string;
    isLaunching?: boolean;
    showSmoke?: boolean;
}

export function RocketIcon({ className, isLaunching = false }: RocketIconProps) {
    return (
        <div
            className={cn("relative", className)}
            style={{
                animation: isLaunching
                    ? 'rocket-launch 1.2s ease-in forwards'
                    : 'rocket-float 4s ease-in-out infinite',
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 160"
                fill="none"
                style={{ contain: 'paint' }}
            >
                {/* Exhaust glow — subtle on idle, bright on launch */}
                <ellipse
                    cx="50"
                    cy="128"
                    rx={isLaunching ? 14 : 6}
                    ry={isLaunching ? 24 : 8}
                    fill="hsl(var(--primary))"
                    opacity={isLaunching ? 0.5 : 0.2}
                    className="transition-all duration-500"
                >
                    {isLaunching && (
                        <animate attributeName="ry" values="20;28;20" dur="0.3s" repeatCount="indefinite" />
                    )}
                </ellipse>

                {/* Flame — clean single shape */}
                <path
                    d={isLaunching
                        ? "M42 118 Q46 152 50 158 Q54 152 58 118"
                        : "M44 118 Q47 130 50 134 Q53 130 56 118"
                    }
                    fill="hsl(var(--primary))"
                    opacity={isLaunching ? 0.9 : 0.7}
                    className="transition-all duration-500"
                >
                    {isLaunching && (
                        <animate attributeName="d"
                            values="M42 118 Q46 152 50 158 Q54 152 58 118;M40 118 Q46 156 50 162 Q54 156 60 118;M42 118 Q46 152 50 158 Q54 152 58 118"
                            dur="0.2s" repeatCount="indefinite" />
                    )}
                </path>

                {/* Inner flame core */}
                <path
                    d={isLaunching
                        ? "M46 118 Q48 140 50 146 Q52 140 54 118"
                        : "M47 118 Q49 126 50 128 Q51 126 53 118"
                    }
                    fill="white"
                    opacity={isLaunching ? 0.8 : 0.4}
                    className="transition-all duration-500"
                />

                {/* Rocket body — clean teardrop/capsule */}
                <path
                    d="M50 16 C38 40 34 70 36 100 L36 118 L64 118 L64 100 C66 70 62 40 50 16Z"
                    fill="white"
                    stroke="hsl(var(--primary) / 0.15)"
                    strokeWidth="1"
                />

                {/* Nose accent line */}
                <path
                    d="M50 16 C44 30 42 42 41 54"
                    stroke="hsl(var(--primary) / 0.3)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />

                {/* Window */}
                <circle cx="50" cy="68" r="8" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" />
                <circle cx="50" cy="68" r="5" fill="hsl(var(--primary))" opacity="0.2" />
                <circle cx="52" cy="66" r="2" fill="white" opacity="0.6" />

                {/* Left fin */}
                <path
                    d="M36 100 L24 118 L36 118Z"
                    fill="hsl(var(--primary))"
                    opacity="0.8"
                />

                {/* Right fin */}
                <path
                    d="M64 100 L76 118 L64 118Z"
                    fill="hsl(var(--primary))"
                    opacity="0.8"
                />

                {/* Bottom edge detail */}
                <rect x="40" y="116" width="20" height="3" rx="1.5" fill="hsl(var(--primary) / 0.3)" />
            </svg>
        </div>
    );
}
