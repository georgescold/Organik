'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    fallbackSrc?: string;
    alt: string;
}

export function ImageWithFallback({ src, fallbackSrc, alt, className, ...props }: ImageWithFallbackProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    const handleError = () => {
        if (!hasError) {
            // First attempt: Try the fallback URL (Production) if we haven't already
            // We detect if we are already on the fallback by checking if current imgSrc matches fallbackSrc
            // But fallbackSrc here is dynamic.
            // Let's assume the passed `src` was local.

            const isAlreadyRemote = imgSrc.includes('onrender.com');
            const isApiRoute = imgSrc.includes('/api/uploads/');

            if (!isApiRoute && src.startsWith('/uploads/')) {
                // Try switching to API route which reads directly from disk
                setImgSrc(`/api${src}`);
            } else if (!isAlreadyRemote && !isApiRoute) {
                // Try switching to render url (last resort)
                setImgSrc(`https://revolution-m2wr.onrender.com${src}`);
            } else {
                // Already tried everything
                setHasError(true);
            }
        }
    };

    if (hasError) {
        return (
            <div className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className}`}>
                <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Introuvable</span>
            </div>
        );
    }

    return (
        <img
            {...props}
            src={imgSrc}
            alt={alt}
            className={className}
            onError={handleError}
        />
    );
}
