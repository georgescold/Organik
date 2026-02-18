'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

export function MobileNav({ isOpen, onToggle, children }: MobileNavProps) {
    // Prevent body scroll when nav is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <>
            {/* Hamburger Button - Visible on mobile only */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="md:hidden h-10 w-10 relative z-50"
                aria-label="Toggle menu"
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <Menu className="h-6 w-6" />
                )}
            </Button>

            {/* Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}

            {/* Drawer Sidebar */}
            <div
                className={cn(
                    "fixed top-0 left-0 h-full w-64 bg-black/95 border-r border-white/10 z-40 transition-transform duration-300 ease-in-out md:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {children}
            </div>
        </>
    );
}

export function MobileNavTrigger({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className="md:hidden h-10 w-10"
            aria-label="Open menu"
        >
            <Menu className="h-6 w-6" />
        </Button>
    );
}
