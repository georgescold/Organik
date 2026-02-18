'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Loader2,
    AlertTriangle,
    Lightbulb,
    Clock,
    CheckCircle2,
    ArrowUp,
    ArrowRight,
    ArrowDown,
    BookmarkPlus,
    Check,
} from 'lucide-react';
import { generateWeeklyPlan } from '@/server/actions/analytics-actions';
import { saveHookAsIdea } from '@/server/actions/creation-actions';

interface PlanAction {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
    metric: string;
}

interface ContentIdea {
    idea: string;
    hookSuggestion: string;
    bestTime: string;
}

interface WeeklyPlan {
    summary: string;
    score: number;
    actions: PlanAction[];
    contentIdeas: ContentIdea[];
    warnings: string[];
}

export function WeeklyPlan() {
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [isLoading, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [savedIdeas, setSavedIdeas] = useState<Set<number>>(new Set());
    const [savingIdea, setSavingIdea] = useState<number | null>(null);

    const handleGenerate = () => {
        setError(null);
        setSavedIdeas(new Set());
        startTransition(async () => {
            const res = await generateWeeklyPlan();
            if ('plan' in res && res.plan) {
                setPlan(res.plan);
            } else if ('error' in res) {
                setError(res.error || 'Erreur inconnue');
            }
        });
    };

    const handleSaveIdea = async (idea: ContentIdea, index: number) => {
        setSavingIdea(index);
        try {
            const res = await saveHookAsIdea({
                id: `plan-${Date.now()}-${index}`,
                hook: idea.hookSuggestion,
                angle: idea.idea,
                reason: `Plan IA — ${idea.bestTime}`,
            });
            if (res && 'success' in res && res.success) {
                setSavedIdeas(prev => new Set(prev).add(index));
            }
        } catch {
            // silently fail
        } finally {
            setSavingIdea(null);
        }
    };

    const priorityConfig = {
        high: { color: 'text-red-400', bg: 'bg-red-500/10', icon: ArrowUp, label: 'Urgent' },
        medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: ArrowRight, label: 'Moyen' },
        low: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: ArrowDown, label: 'Optionnel' },
    };

    if (!plan) {
        return (
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6 text-center space-y-4">
                    <Sparkles className="w-10 h-10 text-primary/40 mx-auto" />
                    <div>
                        <h4 className="font-bold text-sm">Plan d&apos;action IA hebdomadaire</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Analyse automatique de vos données + recommandations concrètes
                        </p>
                    </div>
                    {error && (
                        <p className="text-xs text-red-400">{error}</p>
                    )}
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyse en cours...</>
                        ) : (
                            <><Sparkles className="w-4 h-4 mr-2" />Générer mon plan</>
                        )}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const scoreColor = plan.score >= 7 ? 'text-emerald-400' : plan.score >= 4 ? 'text-amber-400' : 'text-red-400';

    return (
        <div className="space-y-4">
            {/* Summary + Score */}
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className={`text-3xl font-black ${scoreColor}`}>{plan.score}/10</div>
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Score de santé du compte</p>
                            <p className="text-sm mt-1">{plan.summary}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isLoading} className="shrink-0">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Actualiser'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Warnings */}
            {plan.warnings && plan.warnings.length > 0 && (
                <div className="space-y-2">
                    {plan.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">{w}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm">Actions prioritaires</span>
                    </div>
                    <div className="space-y-2">
                        {plan.actions.map((action, i) => {
                            const config = priorityConfig[action.priority] || priorityConfig.medium;
                            const Icon = config.icon;
                            return (
                                <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-md ${config.bg} shrink-0`}>
                                        <Icon className={`w-3 h-3 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold">{action.action}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{action.reason}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] shrink-0">{action.metric}</Badge>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Content Ideas — with Save to Creation Studio */}
            {plan.contentIdeas && plan.contentIdeas.length > 0 && (
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-sm">Idées de contenu</span>
                        </div>
                        <div className="space-y-2">
                            {plan.contentIdeas.map((idea, i) => {
                                const isSaved = savedIdeas.has(i);
                                const isSaving = savingIdea === i;
                                return (
                                    <div key={i} className="p-3 bg-muted/20 rounded-lg space-y-2 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 space-y-1.5">
                                                <p className="text-xs font-semibold">{idea.idea}</p>
                                                <p className="text-[11px] text-primary/80 italic">&ldquo;{idea.hookSuggestion}&rdquo;</p>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {idea.bestTime}
                                                </div>
                                            </div>
                                            <Button
                                                variant={isSaved ? 'ghost' : 'outline'}
                                                size="sm"
                                                className={`shrink-0 text-[10px] h-7 px-2.5 ${isSaved ? 'text-emerald-400 hover:text-emerald-400' : ''}`}
                                                disabled={isSaved || isSaving}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveIdea(idea, i);
                                                }}
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : isSaved ? (
                                                    <><Check className="w-3 h-3 mr-1" />Sauvegardé</>
                                                ) : (
                                                    <><BookmarkPlus className="w-3 h-3 mr-1" />Sauvegarder</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
