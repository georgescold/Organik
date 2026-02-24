'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type TabId = 'overview' | 'analytics' | 'competitors' | 'comparison' | 'collections' | 'creation' | 'apikey';

type DashboardTabsProps = {
    overviewContent?: React.ReactNode;
    analyticsContent: React.ReactNode;
    competitorsContent?: React.ReactNode;
    comparisonContent?: React.ReactNode;
    collectionsContent: React.ReactNode;
    creationContent: React.ReactNode;
    apiKeyContent: React.ReactNode;
    userNav?: React.ReactNode;
    activeProfile?: any;
};

export function DashboardTabs({
    overviewContent,
    analyticsContent,
    competitorsContent,
    comparisonContent,
    collectionsContent,
    creationContent,
    apiKeyContent,
    userNav,
    activeProfile,
}: DashboardTabsProps) {
    // Restore active tab from URL param or sessionStorage, default to 'analytics'
    const validTabs: TabId[] = ['overview', 'analytics', 'competitors', 'comparison', 'collections', 'creation', 'apikey'];
    const getInitialTab = (): TabId => {
        if (typeof window === 'undefined') return 'analytics';
        const urlTab = new URLSearchParams(window.location.search).get('tab');
        if (urlTab && validTabs.includes(urlTab as TabId)) return urlTab as TabId;
        const stored = sessionStorage.getItem('dashboard-active-tab');
        if (stored && validTabs.includes(stored as TabId)) return stored as TabId;
        return 'analytics';
    };
    const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
    const [animatingTab, setAnimatingTab] = useState<TabId | null>(null);
    // Track which tabs have been visited (lazy mount: only render once visited)
    const visitedTabs = useRef(new Set<TabId>([getInitialTab()]));
    // Scroll indicator
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);

    const checkScroll = useCallback(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
        setCanScrollLeft(el.scrollLeft > 4);
    }, []);

    useEffect(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        const observer = new ResizeObserver(checkScroll);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            observer.disconnect();
        };
    }, [checkScroll]);

    const handleTabChange = (tab: TabId) => {
        if (tab === activeTab) return;
        visitedTabs.current.add(tab);
        setAnimatingTab(tab);
        setActiveTab(tab);
        // Persist active tab to sessionStorage for page refresh recovery
        try { sessionStorage.setItem('dashboard-active-tab', tab); } catch {}
        // Clear animation class after transition
        setTimeout(() => setAnimatingTab(null), 300);
    };

    // Listen for remix-hook-selected event to switch to creation tab
    useEffect(() => {
        const handler = () => handleTabChange('creation');
        window.addEventListener('remix-hook-selected', handler);
        return () => window.removeEventListener('remix-hook-selected', handler);
    }, []);

    // Build tabs based on platform
    const getTabs = () => {
        const platform = activeProfile?.platform || 'tiktok';

        interface Tab { id: TabId; label: string }
        const tabs: Tab[] = [];

        switch (platform) {
            case 'tiktok':
                tabs.push(
                    { id: 'analytics', label: 'PERFORMANCE' },
                    { id: 'competitors', label: 'CONCURRENTS' },
                    { id: 'comparison', label: 'COMPARAISON' },
                    { id: 'collections', label: 'COLLECTIONS' },
                    { id: 'creation', label: 'CRÉATION' },
                    { id: 'apikey', label: 'CLÉ API' },
                );
                break;
            case 'instagram':
                tabs.push(
                    { id: 'analytics', label: 'INSIGHTS' },
                    { id: 'collections', label: 'POSTS' },
                    { id: 'creation', label: 'CRÉATION' },
                    { id: 'apikey', label: 'CLÉ API' },
                );
                break;
            case 'newsletter':
                tabs.push(
                    { id: 'analytics', label: 'STATS' },
                    { id: 'collections', label: 'EMAILS' },
                    { id: 'creation', label: 'RÉDACTION' },
                    { id: 'apikey', label: 'CLÉ API' },
                );
                break;
            case 'blog':
                tabs.push(
                    { id: 'analytics', label: 'SEO' },
                    { id: 'collections', label: 'ARTICLES' },
                    { id: 'creation', label: 'RÉDACTION' },
                    { id: 'apikey', label: 'CLÉ API' },
                );
                break;
            default:
                tabs.push(
                    { id: 'analytics', label: 'ANALYTICS' },
                    { id: 'collections', label: 'COLLECTIONS' },
                    { id: 'creation', label: 'CRÉATION' },
                    { id: 'apikey', label: 'CLÉ API' },
                );
        }

        return tabs;
    };

    const tabs = getTabs();

    const renderTabContent = (id: TabId, content: React.ReactNode) => {
        if (!visitedTabs.current.has(id)) return null;
        return (
            <div
                style={{ display: activeTab === id ? 'block' : 'none' }}
                className={animatingTab === id ? 'tab-content-enter' : ''}
            >
                {content}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs Navigation — Floating Glass Bar with subtle cosmic glow */}
            <div className="sticky top-0 z-30 pt-2 md:pt-4 pb-2 px-2 sm:px-3 md:px-8 pointer-events-none">
                <div className="pointer-events-auto relative bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-1 sm:p-1.5 flex items-center justify-between shadow-2xl mx-auto max-w-7xl overflow-hidden">
                    {/* Cosmic accent line at top */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                    {/* Scroll fade indicators */}
                    {canScrollLeft && (
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card/90 to-transparent z-10 pointer-events-none rounded-l-2xl" />
                    )}
                    {canScrollRight && (
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/90 to-transparent z-10 pointer-events-none rounded-r-2xl" />
                    )}

                    <div ref={tabsScrollRef} className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1 -mx-0.5 px-0.5 snap-x snap-proximity">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`
                                    relative px-3 sm:px-3.5 md:px-6 py-2.5 md:py-2.5 font-bold text-[11px] sm:text-xs md:text-sm transition-all duration-200 rounded-xl whitespace-nowrap snap-start min-h-[44px] touch-manipulation
                                    ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/40'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-primary/10'
                                    }
                                `}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/5 h-[3px] bg-primary-foreground/90 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Right Side User Nav */}
                    {userNav && (
                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 md:pl-4 border-l border-border/50 ml-1.5 sm:ml-2 md:ml-4">
                            {userNav}
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Content — Lazy mounted with fade transition */}
            <div className="flex-1 overflow-auto px-2 sm:px-3 md:px-8 py-3 sm:py-4 md:py-6">
                <div className="max-w-7xl mx-auto">
                    {renderTabContent('overview', overviewContent)}
                    {renderTabContent('analytics', analyticsContent)}
                    {renderTabContent('competitors', competitorsContent)}
                    {renderTabContent('comparison', comparisonContent)}
                    {renderTabContent('collections', collectionsContent)}
                    {renderTabContent('creation', creationContent)}
                    {renderTabContent('apikey', apiKeyContent)}
                </div>
            </div>
        </div>
    );
}
