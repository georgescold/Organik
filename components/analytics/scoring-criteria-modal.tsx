'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export function ScoringCriteriaModal() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Info className="w-4 h-4" />
                    Critères de notation
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Critères de Notation des Posts</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Performance Score */}
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-primary">Performance Score (40%)</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Basé sur les données réelles (vues + engagement).
                        </p>

                        <div className="space-y-3">
                            <div className="bg-muted/50 p-3 rounded-lg">
                                <h4 className="font-semibold text-sm mb-2">📊 Views Score (50%)</h4>
                                <p className="text-xs text-muted-foreground mb-2">Récompense les posts viraux</p>
                                <ul className="text-sm space-y-1 ml-4">
                                    <li>• &lt; 1K vues : 0-20/100</li>
                                    <li>• 1K-10K vues : 20-40/100</li>
                                    <li>• 10K-50K vues : 40-60/100</li>
                                    <li>• 50K-100K vues : 60-80/100</li>
                                    <li>• 100K-500K vues : 80-95/100</li>
                                    <li>• <strong>≥ 500K vues : 95-100/100</strong> 🔥</li>
                                </ul>
                            </div>

                            <div className="bg-muted/50 p-3 rounded-lg">
                                <h4 className="font-semibold text-sm mb-2">💬 Engagement Score (50%)</h4>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Taux = (likes + comments + shares) / vues
                                </p>
                                <ul className="text-sm space-y-1 ml-4">
                                    <li>• <strong>≥ 10%</strong> : 100/100</li>
                                    <li>• 5-10% : 80-100/100</li>
                                    <li>• 2-5% : 50-80/100</li>
                                    <li>• &lt; 2% : 0-50/100</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Quality Score */}
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-primary">Quality Score (60%)</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Analyse IA du contenu (total sur 100).
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">Hook (25/100)</span>
                                <span className="text-muted-foreground">Accroche textuelle + verbale + visuelle</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">Body (20/100)</span>
                                <span className="text-muted-foreground">Valeur + structure + rythme + storytelling</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">Visual (15/100)</span>
                                <span className="text-muted-foreground">Qualité + engagement + branding</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">CTA (10/100)</span>
                                <span className="text-muted-foreground">Clarté + timing + urgence + visibilité</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">Music (10/100)</span>
                                <span className="text-muted-foreground">Tendance + pertinence + qualité</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">Timing (10/100)</span>
                                <span className="text-muted-foreground">Optimal + jour + contexte</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <span className="font-semibold min-w-[120px]">Persona (10/100)</span>
                                <span className="text-muted-foreground">Fit persona + fit niche</span>
                            </div>
                        </div>
                    </div>

                    {/* Intelligent Score */}
                    <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20">
                        <h3 className="font-bold text-lg mb-2">🎯 Intelligent Score Final</h3>
                        <div className="space-y-2">
                            <p className="text-sm font-mono bg-background px-3 py-2 rounded">
                                IFS = (Quality × 60%) + (Performance × 40%)
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <strong>Score maximum : 10.0/10</strong> (cappé automatiquement)
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 Les posts avec le plus de vues obtiennent maintenant les meilleures notes !
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
