'use client';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { resetPassword } from '@/server/actions/password-reset-actions';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl transition-all rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <CardHeader className="space-y-2 text-center pt-8 pb-2">
                    <CardTitle className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">
                        <span className="bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">Organik</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 sm:px-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                        Lien invalide ou manquant. Demandez un nouveau lien de reinitialisation.
                    </p>
                    <Link href="/forgot-password">
                        <Button className="rounded-xl h-11 w-full">
                            Demander un nouveau lien
                        </Button>
                    </Link>
                </CardContent>
                <CardFooter className="justify-center pb-6">
                    <Link href="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-3 h-3" />
                        Retour a la connexion
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    async function handleSubmit(formData: FormData) {
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            toast.error('Le mot de passe doit contenir au moins 6 caracteres');
            return;
        }

        startTransition(async () => {
            const result = await resetPassword({ token: token!, password });

            if (result.error) {
                toast.error(result.error);
            } else if (result.success) {
                setSuccess(true);
                toast.success('Mot de passe reinitialise !');
                setTimeout(() => router.push('/login'), 3000);
            }
        });
    }

    return (
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl transition-all rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <CardHeader className="space-y-2 text-center pt-8 pb-2">
                <CardTitle className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">
                    <span className="bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">Organik</span>
                </CardTitle>
                <CardDescription className="font-medium text-muted-foreground/80 text-sm">
                    {success ? 'C\'est fait !' : 'Choisis ton nouveau mot de passe'}
                </CardDescription>
            </CardHeader>

            <CardContent className="px-6 sm:px-8">
                {success ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7 text-emerald-500" />
                        </div>
                        <p className="text-sm text-center text-muted-foreground leading-relaxed">
                            Ton mot de passe a ete reinitialise. Tu vas etre redirige vers la page de connexion...
                        </p>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Nouveau mot de passe</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                placeholder="6 caracteres minimum"
                                className="bg-background/50 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/50 h-11 rounded-xl transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmer le mot de passe</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={6}
                                placeholder="Confirme ton mot de passe"
                                className="bg-background/50 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/50 h-11 rounded-xl transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 h-11 rounded-xl transition-all duration-300 text-sm"
                            disabled={isPending}
                        >
                            {isPending ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
                        </Button>
                    </form>
                )}
            </CardContent>

            <CardFooter className="justify-center pb-6">
                <Link href="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                    <ArrowLeft className="w-3 h-3" />
                    Retour a la connexion
                </Link>
            </CardFooter>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl">
                <CardContent className="p-8 text-center text-muted-foreground">
                    Chargement...
                </CardContent>
            </Card>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
