'use client';

import { useState } from 'react';
import { Save, Loader2, Globe, Package, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateAdminPanel } from '@/server/actions/admin-panel-actions';
import { toast } from 'sonner';

interface ProductDefinitionFormProps {
    panel: any;
}

export function ProductDefinitionForm({ panel }: ProductDefinitionFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        productName: panel.productName || '',
        productDescription: panel.productDescription || '',
        productUrl: panel.productUrl || '',
        targetAudience: panel.targetAudience || '',
        positioning: panel.positioning || '',
    });

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateAdminPanel(panel.id, formData);
        if (result.success) {
            toast.success('Informations produit enregistrées');
        } else {
            toast.error('Erreur lors de la sauvegarde');
        }
        setIsSaving(false);
    };

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">
            {/* Product card */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <div className="p-5 sm:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Définition du Produit</h2>
                            <p className="text-sm text-muted-foreground">Décrivez précisément votre produit pour piloter l'acquisition</p>
                        </div>
                    </div>

                    {/* Name + URL row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="productName" className="text-sm font-bold flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" />
                                Nom du Produit
                            </Label>
                            <Input
                                id="productName"
                                value={formData.productName}
                                onChange={(e) => updateField('productName', e.target.value)}
                                placeholder="Ex: MonSaaS, MonApp..."
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="productUrl" className="text-sm font-bold flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5" />
                                URL du Site Web
                            </Label>
                            <Input
                                id="productUrl"
                                value={formData.productUrl}
                                onChange={(e) => updateField('productUrl', e.target.value)}
                                placeholder="https://www.monproduit.com"
                                className="h-11"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="productDescription" className="text-sm font-bold flex items-center gap-2">
                            <Package className="h-3.5 w-3.5" />
                            Description Complète
                        </Label>
                        <Textarea
                            id="productDescription"
                            value={formData.productDescription}
                            onChange={(e) => updateField('productDescription', e.target.value)}
                            placeholder="Décrivez votre produit en détail : fonctionnalités, avantages, prix, différenciateurs..."
                            rows={5}
                            className="resize-y"
                        />
                        <p className="text-xs text-muted-foreground">Plus la description est détaillée, meilleures seront les suggestions d'acquisition.</p>
                    </div>

                    {/* Target audience */}
                    <div className="space-y-2">
                        <Label htmlFor="targetAudience" className="text-sm font-bold flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Audience Cible
                        </Label>
                        <Textarea
                            id="targetAudience"
                            value={formData.targetAudience}
                            onChange={(e) => updateField('targetAudience', e.target.value)}
                            placeholder="Qui sont vos clients idéaux ? Démographie, intérêts, pain points, comportement d'achat..."
                            rows={4}
                            className="resize-y"
                        />
                    </div>

                    {/* Positioning */}
                    <div className="space-y-2">
                        <Label htmlFor="positioning" className="text-sm font-bold flex items-center gap-2">
                            <Target className="h-3.5 w-3.5" />
                            Positionnement
                        </Label>
                        <Textarea
                            id="positioning"
                            value={formData.positioning}
                            onChange={(e) => updateField('positioning', e.target.value)}
                            placeholder="Comment vous positionnez-vous vs la concurrence ? Quelle est votre proposition de valeur unique ?"
                            rows={4}
                            className="resize-y"
                        />
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            size="lg"
                            className="font-bold gap-2"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
