'use client';

import { useState, useEffect } from 'react';
import { Brain, Loader2, RefreshCw, Target, TrendingUp, Users, Zap, ChevronDown, ChevronUp, ArrowUpRight, AlertTriangle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runMacroAnalysis, getCachedMacroAnalysis } from '@/server/actions/admin-panel-actions';
import { toast } from 'sonner';
import type { MacroAnalysisData } from '@/lib/ai/macro-analysis-generator';

interface PanelMacroAnalysisProps {
    panelId: string;
}

function ScoreGauge({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' }) {
    const color = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';
    const bg = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className={`relative ${size === 'sm' ? 'w-14 h-14' : 'w-20 h-20'} rounded-full border-4 border-muted flex items-center justify-center`}>
                <div
                    className={`absolute inset-0 rounded-full ${bg}/10`}
                    style={{
                        background: `conic-gradient(${score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'} ${score * 3.6}deg, transparent 0deg)`
                    }}
                />
                <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center">
                    <span className={`${size === 'sm' ? 'text-lg' : 'text-2xl'} font-black ${color}`}>{score}</span>
                </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground text-center">{label}</span>
        </div>
    );
}

export function PanelMacroAnalysis({ panelId }: PanelMacroAnalysisProps) {
    const [analysis, setAnalysis] = useState<MacroAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [cachedAt, setCachedAt] = useState<string | null>(null);
    const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadCached();
    }, [panelId]);

    const loadCached = async () => {
        setIsLoading(true);
        const result = await getCachedMacroAnalysis(panelId);
        if (result.success && result.analysis) {
            setAnalysis(result.analysis as MacroAnalysisData);
            setCachedAt(result.cachedAt || null);
        }
        setIsLoading(false);
    };

    const handleGenerate = async (force: boolean = false) => {
        setIsGenerating(true);
        const result = await runMacroAnalysis(panelId, force);
        if (result.success && result.analysis) {
            setAnalysis(result.analysis as MacroAnalysisData);
            setCachedAt(result.fromCache ? result.cachedAt || null : new Date().toISOString());
            toast.success(result.fromCache ? 'Analyse chargée depuis le cache' : 'Analyse macro générée avec succès !');
        } else {
            toast.error(result.error || 'Erreur lors de la génération');
        }
        setIsGenerating(false);
    };

    const toggleProfile = (profileId: string) => {
        setExpandedProfiles(prev => {
            const next = new Set(prev);
            if (next.has(profileId)) next.delete(profileId);
            else next.add(profileId);
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // No analysis yet — show CTA
    if (!analysis) {
        return (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 gap-6">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-violet-500" />
                </div>
                <div className="text-center space-y-2 max-w-md">
                    <h3 className="text-xl font-black">Analyse Macro IA</h3>
                    <p className="text-sm text-muted-foreground">
                        Lancez une analyse complète de vos comptes TikTok par rapport à votre produit.
                        L'IA analysera l'alignement, les patterns de conversion et fournira des recommandations stratégiques.
                    </p>
                </div>
                <Button
                    onClick={() => handleGenerate(false)}
                    disabled={isGenerating}
                    size="lg"
                    className="gap-2 font-bold bg-violet-600 hover:bg-violet-700"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyse en cours...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Lancer l'Analyse
                        </>
                    )}
                </Button>
            </div>
        );
    }

    // Render analysis
    return (
        <div className="space-y-6">
            {/* Header with refresh */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black">Analyse Macro</h2>
                        {cachedAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(cachedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {' · '}{analysis.metadata.profileCount} comptes · {analysis.metadata.basedOnPostsCount} posts
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                    className="gap-2 font-bold"
                >
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Rafraîchir
                </Button>
            </div>

            {/* Global Alignment Score + Key Findings */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500/60 via-violet-500 to-violet-500/60" />
                <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <ScoreGauge score={analysis.globalInsights.alignmentScore} label="Alignement Produit" />
                        <div className="flex-1 space-y-3">
                            <h3 className="font-black text-lg flex items-center gap-2">
                                <Target className="h-4 w-4 text-violet-500" />
                                Constats Clés
                            </h3>
                            <ul className="space-y-2">
                                {analysis.globalInsights.keyFindings.map((finding, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <span>{finding}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversion Patterns */}
            {analysis.globalInsights.conversionPatterns.length > 0 && (
                <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-emerald-500/60 via-emerald-500 to-emerald-500/60" />
                    <div className="p-5 sm:p-6">
                        <h3 className="font-black text-lg flex items-center gap-2 mb-4">
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            Patterns de Conversion
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {analysis.globalInsights.conversionPatterns.map((pattern, i) => (
                                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                    <Zap className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-sm">{pattern}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Cross-Profile Comparison */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <div className="p-5 sm:p-6">
                    <h3 className="font-black text-lg flex items-center gap-2 mb-4">
                        <Users className="h-4 w-4 text-primary" />
                        Comparaison Inter-Comptes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Meilleur Convertisseur</p>
                            <p className="font-black text-lg">@{analysis.crossProfileComparison.bestConverter}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Meilleure Portée</p>
                            <p className="font-black text-lg">@{analysis.crossProfileComparison.bestReach}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/20 border border-border/30 mb-4">
                        <p className="text-sm font-bold mb-1">Pourquoi le meilleur convertit ?</p>
                        <p className="text-sm text-muted-foreground">{analysis.crossProfileComparison.whyBestConverts}</p>
                    </div>

                    {analysis.crossProfileComparison.synergies.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-bold">Synergies identifiées :</p>
                            {analysis.crossProfileComparison.synergies.map((syn, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <span>{syn}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Breakdowns (Accordions) */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <div className="p-5 sm:p-6">
                    <h3 className="font-black text-lg flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Détail par Compte
                    </h3>

                    <div className="space-y-3">
                        {analysis.profileBreakdowns.map((profile) => {
                            const isExpanded = expandedProfiles.has(profile.profileId);
                            return (
                                <div key={profile.profileId} className="border border-border/50 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleProfile(profile.profileId)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm truncate">@{profile.username || profile.displayName}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                    profile.alignmentScore >= 70 ? 'bg-emerald-500/10 text-emerald-500' :
                                                    profile.alignmentScore >= 40 ? 'bg-amber-500/10 text-amber-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {profile.alignmentScore}/100
                                                </span>
                                                {profile.conversionRate > 0 && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                                                        {profile.conversionRate.toFixed(1)}% conv.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                                            {/* Strengths */}
                                            <div>
                                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Forces</p>
                                                <ul className="space-y-1">
                                                    {profile.strengths.map((s, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                            <span>{s}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Weaknesses */}
                                            <div>
                                                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Faiblesses</p>
                                                <ul className="space-y-1">
                                                    {profile.weaknesses.map((w, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                                            <span>{w}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Recommendations */}
                                            <div>
                                                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Recommandations</p>
                                                <ul className="space-y-1">
                                                    {profile.recommendations.map((r, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                                            <span>{r}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Action Plan */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500/60 via-amber-500 to-amber-500/60" />
                <div className="p-5 sm:p-6">
                    <h3 className="font-black text-lg flex items-center gap-2 mb-5">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Plan d'Action
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Immediate */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <p className="text-sm font-black uppercase tracking-wider">Immédiat</p>
                            </div>
                            {analysis.actionPlan.immediate.map((action, i) => (
                                <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-sm">
                                    {action}
                                </div>
                            ))}
                        </div>

                        {/* Short term */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <p className="text-sm font-black uppercase tracking-wider">Court Terme</p>
                            </div>
                            {analysis.actionPlan.shortTerm.map((action, i) => (
                                <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm">
                                    {action}
                                </div>
                            ))}
                        </div>

                        {/* Strategic */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-sm font-black uppercase tracking-wider">Stratégique</p>
                            </div>
                            {analysis.actionPlan.strategic.map((action, i) => (
                                <div key={i} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-sm">
                                    {action}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
