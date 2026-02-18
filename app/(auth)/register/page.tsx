'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { register } from '@/server/actions/auth-actions';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(formData: FormData) {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        startTransition(async () => {
            const result = await register({ email, password });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success('Compte créé ! Connexion en cours...');

            await signIn('credentials', {
                email,
                password,
                redirect: true,
                callbackUrl: '/dashboard'
            });
        });
    }

    return (
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl transition-all rounded-2xl overflow-hidden relative">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <CardHeader className="space-y-2 text-center pt-8 pb-2">
                <CardTitle className="text-3xl sm:text-4xl font-black tracking-tighter uppercase relative inline-block">
                    <span className="relative z-10 bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">Organik</span>
                </CardTitle>
                <CardDescription className="font-medium text-muted-foreground/80 text-sm">
                    Prépare-toi à conquérir les algos.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8">
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
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="bg-background/50 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/50 h-11 rounded-xl transition-all"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 h-11 rounded-xl transition-all duration-300 text-sm"
                        disabled={isPending}
                    >
                        {isPending ? 'Création...' : "S'inscrire"}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="justify-center pb-6">
                <p className="text-xs text-muted-foreground">
                    Déjà un compte ?{' '}
                    <Link href="/login" className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors">
                        Se connecter
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
