'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, AlertCircle, Loader2, Key, Database } from "lucide-react";
import { toast } from "sonner";
import { updateUserApiKey, updateUserApifyKey, getAllUserApiKeys } from '@/server/actions/user-actions';

export function ApiKeySettings() {
    const [anthropicKey, setAnthropicKey] = useState('');
    const [apifyKey, setApifyKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingAnthropic, setIsSavingAnthropic] = useState(false);
    const [isSavingApify, setIsSavingApify] = useState(false);
    const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
    const [hasApifyKey, setHasApifyKey] = useState(false);

    useEffect(() => {
        const loadKeys = async () => {
            const result = await getAllUserApiKeys();
            if (result.success) {
                setHasAnthropicKey(!!result.hasAnthropicKey);
                setHasApifyKey(!!result.hasApifyKey);
            }
            setIsLoading(false);
        };
        loadKeys();
    }, []);

    const handleSaveAnthropic = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingAnthropic(true);

        if (anthropicKey.trim().length === 0) {
            toast.error("La clé ne peut pas être vide");
            setIsSavingAnthropic(false);
            return;
        }

        if (!anthropicKey.startsWith("sk-ant-")) {
            toast.warning("Le format de la clé semble incorrect (devrait commencer par sk-ant-...)");
        }

        const result = await updateUserApiKey(anthropicKey);

        if (result.success) {
            toast.success("Clé API Anthropic mise à jour avec succès");
            setHasAnthropicKey(true);
        } else {
            toast.error("Erreur lors de la sauvegarde de la clé");
        }
        setIsSavingAnthropic(false);
    };

    const handleSaveApify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingApify(true);

        if (apifyKey.trim().length === 0) {
            toast.error("La clé ne peut pas être vide");
            setIsSavingApify(false);
            return;
        }

        if (!apifyKey.startsWith("apify_api_")) {
            toast.warning("Le format de la clé semble incorrect (devrait commencer par apify_api_...)");
        }

        const result = await updateUserApifyKey(apifyKey);

        if (result.success) {
            toast.success("Clé API Apify mise à jour avec succès");
            setHasApifyKey(true);
        } else {
            toast.error("Erreur lors de la sauvegarde de la clé Apify");
        }
        setIsSavingApify(false);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Anthropic API Key Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        Configuration de l'IA (Claude)
                    </CardTitle>
                    <CardDescription>
                        Utilisez votre propre clé API Anthropic pour générer du contenu sans limites.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSaveAnthropic} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="anthropicKey">Clé API Anthropic (Claude)</Label>
                            <div className="relative">
                                <Input
                                    id="anthropicKey"
                                    type="password"
                                    placeholder="sk-ant-api03-..."
                                    value={anthropicKey}
                                    onChange={(e) => setAnthropicKey(e.target.value)}
                                    className="pl-10"
                                />
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Votre clé est stockée de manière sécurisée et utilisée uniquement pour vos générations.
                                Le modèle utilisé sera <strong>Claude Sonnet 4.6</strong>.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                {hasAnthropicKey ? (
                                    <div className="flex items-center text-green-500 text-sm bg-green-500/10 px-3 py-1 rounded-full">
                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                        Clé active
                                    </div>
                                ) : (
                                    <div className="flex items-center text-amber-500 text-sm bg-amber-500/10 px-3 py-1 rounded-full">
                                        <AlertCircle className="h-4 w-4 mr-1.5" />
                                        Aucune clé configurée
                                    </div>
                                )}
                            </div>

                            <Button type="submit" disabled={isSavingAnthropic}>
                                {isSavingAnthropic && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Apify API Key Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-orange-500" />
                        Configuration Apify (Scraping TikTok)
                    </CardTitle>
                    <CardDescription>
                        Utilisez votre propre clé API Apify pour synchroniser les données de vos concurrents TikTok.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSaveApify} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apifyKey">Clé API Apify</Label>
                            <div className="relative">
                                <Input
                                    id="apifyKey"
                                    type="password"
                                    placeholder="apify_api_..."
                                    value={apifyKey}
                                    onChange={(e) => setApifyKey(e.target.value)}
                                    className="pl-10"
                                />
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Obtenez votre clé API sur <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.apify.com</a>.
                                Cette clé permet de scraper les profils TikTok de vos concurrents.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                {hasApifyKey ? (
                                    <div className="flex items-center text-green-500 text-sm bg-green-500/10 px-3 py-1 rounded-full">
                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                        Clé active
                                    </div>
                                ) : (
                                    <div className="flex items-center text-amber-500 text-sm bg-amber-500/10 px-3 py-1 rounded-full">
                                        <AlertCircle className="h-4 w-4 mr-1.5" />
                                        Aucune clé configurée
                                    </div>
                                )}
                            </div>

                            <Button type="submit" disabled={isSavingApify}>
                                {isSavingApify && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
