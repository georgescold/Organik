import { Heart, Bookmark, MessageCircle } from "lucide-react";

interface FloatingStatsProps {
    variant?: 'default' | 'landing';
}

export function FloatingStats({ variant = 'default' }: FloatingStatsProps) {
    const iconSize = variant === 'landing' ? "w-6 h-6 md:w-8 md:h-8" : "w-3 h-3 md:w-4 md:h-4";
    const containerClass = "absolute flex items-center justify-center opacity-0 animate-[fade-in-out_8s_linear_infinite]";

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {/* Header mode: just 3 subtle icons */}
            <div className={`${containerClass} top-[25%] left-[15%]`} style={{ animationDelay: '0s', animationDuration: '12s' }}>
                <Heart className={`${iconSize} text-primary/70 rotate-[-8deg]`} fill="currentColor" />
            </div>

            <div className={`${containerClass} top-[50%] left-[75%]`} style={{ animationDelay: '3s', animationDuration: '14s' }}>
                <Bookmark className={`${iconSize} text-amber-400/60 rotate-[10deg]`} fill="currentColor" />
            </div>

            <div className={`${containerClass} top-[70%] left-[40%]`} style={{ animationDelay: '6s', animationDuration: '10s' }}>
                <MessageCircle className={`${iconSize} text-emerald-400/60 rotate-[5deg]`} fill="currentColor" />
            </div>

            {/* Landing variant: extra volume */}
            {variant === 'landing' && (
                <>
                    <div className={`${containerClass} top-[30%] left-[50%]`} style={{ animationDelay: '1s', animationDuration: '13s' }}>
                        <Heart className={`${iconSize} text-primary/60 rotate-[5deg]`} fill="currentColor" />
                    </div>
                    <div className={`${containerClass} top-[70%] left-[30%]`} style={{ animationDelay: '5s', animationDuration: '14s' }}>
                        <Heart className={`${iconSize} text-primary/50 rotate-[-8deg]`} fill="currentColor" />
                    </div>
                    <div className={`${containerClass} top-[10%] left-[85%]`} style={{ animationDelay: '3s', animationDuration: '15s' }}>
                        <Bookmark className={`${iconSize} text-amber-400/50 rotate-[20deg]`} fill="currentColor" />
                    </div>
                </>
            )}
        </div>
    );
}
