'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateProfile, deleteProfile } from '@/server/actions/profile-actions';
import { Loader2, AtSign, Sparkles, User, Target, Trash } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface ProfileFormProps {
    initialData: {
        tiktokName: string;
        tiktokBio: string;
        persona: string;
        targetAudience?: string;
        niche?: string;
        leadMagnet?: string;
        avatarUrl?: string;
        followersCount?: number;
        hashtags?: string;
        syncPostLimit?: number;  // NEW: Sync configuration
    }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [formData, setFormData] = useState({
        ...initialData,
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData.avatarUrl || null);
    const [isPending, startTransition] = useTransition();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const formDataToSend = new FormData();
            formDataToSend.append('tiktokName', formData.tiktokName);
            formDataToSend.append('tiktokBio', formData.tiktokBio);
            formDataToSend.append('persona', formData.persona);
            formDataToSend.append('targetAudience', formData.targetAudience || '');
            formDataToSend.append('niche', formData.niche || '');
            formDataToSend.append('leadMagnet', formData.leadMagnet || '');
            formDataToSend.append('hashtags', formData.hashtags || '');
            formDataToSend.append('syncPostLimit', (formData.syncPostLimit || 50).toString());  // NEW
            if (avatarFile) {
                formDataToSend.append('avatar', avatarFile);
            }

            const result = await updateProfile(formDataToSend);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Profil mis à jour avec succès ! 🚀");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar Section */}
                <div className="space-y-4 flex-shrink-0 mx-auto md:mx-0">
                    <Label className="text-base font-bold flex items-center gap-2 justify-center md:justify-start">
                        <User className="w-4 h-4 text-primary" /> Avatar
                    </Label>
                    <div className="relative group w-32 h-32 mx-auto">
                        <div className={`w-32 h-32 rounded-full border-4 border-border overflow-hidden bg-muted flex items-center justify-center group-hover:border-primary transition-colors ${!previewUrl ? 'animate-pulse' : ''}`}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-muted-foreground" />
                            )}
                        </div>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-xs font-bold uppercase">Modifier</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-2">
                        <Label htmlFor="tiktokName" className="text-base font-bold flex items-center gap-2">
                            <AtSign className="w-4 h-4 text-primary" /> Nom TikTok
                        </Label>
                        <Input
                            id="tiktokName"
                            value={formData.tiktokName}
                            onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                            className="border-2 border-border focus-visible:border-primary h-12"
                            placeholder="@tonpseudo"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tiktokBio" className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" /> Bio
                        </Label>
                        <Textarea
                            id="tiktokBio"
                            value={formData.tiktokBio}
                            onChange={(e) => setFormData({ ...formData, tiktokBio: e.target.value })}
                            className="min-h-[80px] border-2 border-border focus-visible:border-primary resize-none"
                            placeholder="Ta bio qui déchire..."
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="persona" className="text-base font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Autorité
                </Label>
                <Textarea
                    id="persona"
                    value={formData.persona}
                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                    className="min-h-[100px] border-2 border-border focus-visible:border-primary resize-none"
                    placeholder="Qui incarnes-tu ?"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="niche" className="text-base font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Niche (Thématique)
                </Label>
                <Input
                    id="niche"
                    value={formData.niche || ""}
                    onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    className="border-2 border-border focus-visible:border-primary h-12"
                    placeholder="Ex: Nutrition Sportive, Immobilier, Tech..."
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-base font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Persona
                </Label>
                <Textarea
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="min-h-[100px] border-2 border-border focus-visible:border-primary resize-none"
                    placeholder="Quelle est ta cible à travers ton contenu ?"
                />
            </div>





            <div className="space-y-2">
                <Label htmlFor="leadMagnet" className="text-base font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Leadmagnet
                </Label>
                <Textarea
                    id="leadMagnet"
                    value={formData.leadMagnet}
                    onChange={(e) => setFormData({ ...formData, leadMagnet: e.target.value })}
                    className="min-h-[80px] border-2 border-border focus-visible:border-primary resize-none"
                    placeholder="Qu'as-tu à offrir à ta communauté afin de récupérer leur email ?"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="hashtags" className="text-base font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Hashtags par défaut
                </Label>
                <Textarea
                    id="hashtags"
                    value={formData.hashtags}
                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                    className="min-h-[80px] border-2 border-border focus-visible:border-primary resize-none"
                    placeholder="#viral #student #..."
                />
            </div>

            {/* Sync Configuration Section */}
            <div className="space-y-2">
                <Label htmlFor="syncPostLimit" className="text-base font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Limite de posts synchronisés
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                        (économise des crédits Apify)
                    </span>
                </Label>
                <Input
                    id="syncPostLimit"
                    name="syncPostLimit"
                    type="number"
                    min={10}
                    max={200}
                    value={formData.syncPostLimit || 50}
                    onChange={(e) => setFormData({ ...formData, syncPostLimit: parseInt(e.target.value) || 50 })}
                    className="border-2 border-border focus-visible:border-primary h-12"
                    placeholder="50"
                />
                <p className="text-xs text-muted-foreground">
                    Scrape uniquement les <strong>{formData.syncPostLimit || 50} posts avec le plus de vues</strong>.<br />
                    Recommandé : 50 posts pour un bon équilibre données/coûts.
                </p>
                {(formData.syncPostLimit || 50) < 50 && (
                    <p className="text-xs text-yellow-600 flex items-start gap-1">
                        <span>⚠️</span>
                        <span>Limite basse : moins de données pour l'analyse</span>
                    </p>
                )}
                {(formData.syncPostLimit || 50) > 100 && (
                    <p className="text-xs text-orange-600 flex items-start gap-1">
                        <span>💰</span>
                        <span>Limite haute : coûts Apify plus élevés</span>
                    </p>
                )}
            </div>

            {/* Apparence Section */}
            <div className="space-y-2 pt-4">
                <Label className="text-base font-bold">Apparence</Label>
                <ThemeToggle />
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between items-center pt-8 border-t border-border mt-8 gap-4">
                <Button
                    type="button"
                    onClick={async () => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.')) {
                            const result = await deleteProfile();
                            if (result.error) {
                                toast.error(result.error);
                            } else {
                                toast.success('Profil supprimé');
                                window.location.href = '/dashboard'; // Force refresh/redirect
                            }
                        }
                    }}
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full md:w-auto"
                >
                    <Trash className="mr-2 h-4 w-4" />
                    Supprimer ce profil
                </Button>

                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-primary hover:bg-primary text-white font-black text-lg px-8 py-6 rounded-none glitch-hover uppercase tracking-wider w-full md:w-auto"
                >
                    {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Sauvegarder
                </Button>
            </div>
        </form>
    );
}
