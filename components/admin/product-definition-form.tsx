'use client';

import { useState } from 'react';
import { Save, Loader2, Globe, Package, Users, Target, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [showBibleGuide, setShowBibleGuide] = useState(false);
    const [formData, setFormData] = useState({
        productName: panel.productName || '',
        productDescription: panel.productDescription || '',
        productUrl: panel.productUrl || '',
        targetAudience: panel.targetAudience || '',
        positioning: panel.positioning || '',
        productBible: panel.productBible || '',
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

            {/* Product Bible card */}
            <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500/60 via-amber-500 to-amber-500/60" />
                <div className="p-5 sm:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-black">Product Bible</h2>
                            <p className="text-sm text-muted-foreground">Base de connaissances complète de votre produit pour le placement subtil dans les posts</p>
                        </div>
                    </div>

                    {/* Guide toggle */}
                    <button
                        onClick={() => setShowBibleGuide(!showBibleGuide)}
                        className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-500 transition-colors"
                    >
                        {showBibleGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {showBibleGuide ? 'Masquer le guide' : 'Comment rédiger votre Product Bible ?'}
                    </button>

                    {showBibleGuide && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 sm:p-6 text-sm space-y-4">
                            <p className="font-bold text-amber-600">Le Product Bible permet à Organik de comprendre en profondeur votre produit pour le mentionner de façon naturelle et pertinente dans vos posts.</p>

                            <div className="space-y-3">
                                <div>
                                    <p className="font-bold">1. Identité du produit</p>
                                    <p className="text-muted-foreground">Nom, concept en une phrase, URL, proposition de valeur unique</p>
                                </div>
                                <div>
                                    <p className="font-bold">2. Fonctionnalités / Offres détaillées</p>
                                    <p className="text-muted-foreground">Listez TOUTES les fonctionnalités, catégories, types avec leurs caractéristiques. Plus c'est précis, mieux c'est.</p>
                                </div>
                                <div>
                                    <p className="font-bold">3. Vocabulaire & termes propres</p>
                                    <p className="text-muted-foreground">Les noms/termes spécifiques à votre produit que vous voulez voir apparaître naturellement</p>
                                </div>
                                <div>
                                    <p className="font-bold">4. Angles de placement</p>
                                    <p className="text-muted-foreground">Comment le produit peut être mentionné selon le sujet du post (exemples de phrases d'accroche, références subtiles, CTA naturels)</p>
                                </div>
                                <div>
                                    <p className="font-bold">5. Ce qu'il ne faut PAS faire</p>
                                    <p className="text-muted-foreground">Tons à éviter, formulations interdites, limites du placement</p>
                                </div>
                            </div>

                            <div className="border-t border-amber-500/20 pt-3">
                                <p className="font-bold text-amber-600 mb-2">Exemple de structure :</p>
                                <pre className="text-xs bg-background/50 rounded p-3 overflow-x-auto whitespace-pre-wrap text-muted-foreground">{`# Mon Produit — Product Bible

## Concept
[Nom] est [description en 1 phrase]. URL: [lien]

## Fonctionnalités détaillées
### Catégorie 1 : [Nom]
- [Fonctionnalité A] : [description + ce que ça apporte]
- [Fonctionnalité B] : [description + ce que ça apporte]

### Catégorie 2 : [Nom]
- [Type 1] : [caractéristiques détaillées]
- [Type 2] : [caractéristiques détaillées]
(...)

## Vocabulaire clé
- "[Terme 1]" : [explication]
- "[Terme 2]" : [explication]

## Angles de placement par thème
- Post sur [thème A] → mentionner [aspect du produit], ex: "[phrase exemple]"
- Post sur [thème B] → référencer [aspect du produit], ex: "[phrase exemple]"

## Règles de placement
- TOUJOURS : rester subtil, la mention doit apporter de la VALEUR au lecteur
- JAMAIS : faire de publicité directe, forcer une mention qui ne colle pas au sujet
- Le produit doit apparaître comme une SOLUTION naturelle, pas comme un sponsor`}</pre>
                            </div>
                        </div>
                    )}

                    {/* Product Bible textarea */}
                    <div className="space-y-2">
                        <Label htmlFor="productBible" className="text-sm font-bold flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5" />
                            Contenu du Product Bible
                        </Label>
                        <Textarea
                            id="productBible"
                            value={formData.productBible}
                            onChange={(e) => updateField('productBible', e.target.value)}
                            placeholder="Décrivez votre produit en profondeur : fonctionnalités détaillées, vocabulaire spécifique, angles de placement par thème, exemples de mentions subtiles..."
                            rows={16}
                            className="resize-y font-mono text-sm"
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                Plus le Product Bible est détaillé, plus les mentions produit seront naturelles et pertinentes.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formData.productBible.length.toLocaleString()} caractères
                            </p>
                        </div>
                    </div>

                    {/* Save button for Bible */}
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
