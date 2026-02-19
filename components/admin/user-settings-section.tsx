'use client';

import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserSettings, changePassword } from '@/server/actions/user-actions';
import { toast } from 'sonner';

export function UserSettingsSection() {
    const [email, setEmail] = useState('');
    const [hasPassword, setHasPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getUserSettings().then(result => {
            if (result.success) {
                setEmail(result.email || '');
                setHasPassword(result.hasPassword || false);
            }
            setIsLoading(false);
        });
    }, []);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setIsSaving(true);
        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            toast.success('Mot de passe modifié avec succès');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setHasPassword(true);
        } else {
            toast.error(result.error || 'Erreur');
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black">Paramètres du Compte</h2>
            </div>

            {/* Email display */}
            <div className="bg-card border-2 border-border p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold">Email</h3>
                        <p className="text-xs text-muted-foreground">Votre adresse email de connexion</p>
                    </div>
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border">
                    <p className="font-mono text-sm">{email || 'Non défini'}</p>
                </div>
            </div>

            {/* Password change */}
            <div className="bg-card border-2 border-border p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold">Mot de passe</h3>
                        <p className="text-xs text-muted-foreground">
                            {hasPassword ? 'Modifier votre mot de passe' : 'Définir un mot de passe'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 max-w-md">
                    {hasPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="text-sm font-bold">
                                Mot de passe actuel
                            </Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Votre mot de passe actuel"
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-bold">
                            Nouveau mot de passe
                        </Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 caractères"
                                className="h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-bold">
                            Confirmer le nouveau mot de passe
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmez votre mot de passe"
                            className="h-11"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
                        )}
                    </div>

                    <Button
                        onClick={handleChangePassword}
                        disabled={isSaving || !newPassword || newPassword !== confirmPassword || (hasPassword && !currentPassword)}
                        className="font-bold gap-2"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {hasPassword ? 'Modifier le mot de passe' : 'Définir le mot de passe'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
