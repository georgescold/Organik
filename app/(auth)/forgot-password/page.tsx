'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { requestPasswordReset } from '@/server/actions/password-reset-actions';
import { ArrowLeft, Mail, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [isPending, startTransition] = useTransition();
    const [emailSent, setEmailSent] = useState(false);

    async function handleSubmit(formData: FormData) {
        const email = formData.get('email') as string;

        startTransition(async () => {
            const result = await requestPasswordReset({ email });

            if (result.error) {
                toast.error(result.error);
            } else if (result.success) {
                setEmailSent(true);
                toast.success('Email envoye !');
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
                    {emailSent ? 'Verifie ta boite mail' : 'Reinitialise ton mot de passe'}
                </CardDescription>
            </CardHeader>

            <CardContent className="px-6 sm:px-8">
                {emailSent ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Check className="w-7 h-7 text-emerald-500" />
                        </div>
                        <p className="text-sm text-center text-muted-foreground leading-relaxed">
                            Si un compte existe avec cet email, tu recevras un lien pour reinitialiser ton mot de passe.
                            Verifie aussi tes spams.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full mt-2 rounded-xl h-11"
                            onClick={() => setEmailSent(false)}
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            Renvoyer un email
                        </Button>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                className="bg-background/50 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/50 h-11 rounded-xl transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 h-11 rounded-xl transition-all duration-300 text-sm"
                            disabled={isPending}
                        >
                            {isPending ? 'Envoi en cours...' : 'Envoyer le lien'}
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
