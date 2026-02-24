'use client';

import { useState, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createProfile } from '@/server/actions/profile-actions';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { RocketIcon } from '@/components/ui/rocket-icon';

export function OnboardingModal() {
    const [open, setOpen] = useState(false); // Initially false, user clicks button to open
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        tiktokName: '',
        tiktokBio: '',
        persona: '',
        targetAudience: '', // [NEW] Persona (Cible)
        leadMagnet: '', // [NEW]
    });
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Prompt says: display overlay with button "Créer ton profil" first.
    // Then modal/stepper.

    // So this component will handle the Overlay + Modal
    const [showOverlay, setShowOverlay] = useState(true);

    // Load draft from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('onboarding-draft');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.formData) {
                    setFormData(prev => ({
                        ...prev,
                        ...(data.formData.tiktokName && { tiktokName: data.formData.tiktokName }),
                        ...(data.formData.tiktokBio && { tiktokBio: data.formData.tiktokBio }),
                        ...(data.formData.persona && { persona: data.formData.persona }),
                        ...(data.formData.targetAudience && { targetAudience: data.formData.targetAudience }),
                        ...(data.formData.leadMagnet && { leadMagnet: data.formData.leadMagnet }),
                    }));
                }
                if (data.step) setStep(data.step);
            }
        } catch {}
    }, []);

    // Save draft to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('onboarding-draft', JSON.stringify({
                formData,
                step,
            }));
        } catch {}
    }, [formData, step]);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        startTransition(async () => {
            const result = await createProfile(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                localStorage.removeItem('onboarding-draft');
                toast.success("Profil créé avec succès !");
                setShowOverlay(false);
                setOpen(false);
                router.refresh(); // This should trigger layout to re-check profile and unmount this component
            }
        });
    };

    if (!showOverlay) return null;

    return (
        <>
            {/* Overlay Background */}
            {/* Overlay Welcome Screen */}
            {/* Overlay Welcome Screen */}
            <style jsx global>{`
                @keyframes space-fly {
                    from { background-position: 0 0; }
                    to { background-position: 0 400px; }
                }
            `}</style>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl"
                >
                    {/* Realistic Star Field - Randomized & Slower & Brighter */}
                    {/* Layer 1: Distant Stars (Slow) */}
                    <div className="absolute inset-0 z-0 opacity-60"
                        style={{
                            backgroundImage: `
                                radial-gradient(1.5px 1.5px at 10% 10%, white, transparent),
                                radial-gradient(1.5px 1.5px at 20% 80%, white, transparent),
                                radial-gradient(1.5px 1.5px at 30% 30%, white, transparent),
                                radial-gradient(1.5px 1.5px at 40% 70%, white, transparent),
                                radial-gradient(1.5px 1.5px at 50% 20%, white, transparent),
                                radial-gradient(1.5px 1.5px at 60% 90%, white, transparent),
                                radial-gradient(1.5px 1.5px at 70% 40%, white, transparent),
                                radial-gradient(1.5px 1.5px at 80% 10%, white, transparent),
                                radial-gradient(1.5px 1.5px at 90% 60%, white, transparent)
                            `,
                            backgroundSize: '400px 400px',
                            animation: 'space-fly 8s linear infinite'
                        }}
                    />
                    {/* Layer 2: Closer Stars (Faster) */}
                    <div className="absolute inset-0 z-0 opacity-80"
                        style={{
                            backgroundImage: `
                                radial-gradient(2px 2px at 15% 15%, #E0F2F1, transparent),
                                radial-gradient(2px 2px at 35% 85%, #E0F2F1, transparent),
                                radial-gradient(2px 2px at 55% 35%, #E0F2F1, transparent),
                                radial-gradient(2px 2px at 75% 75%, #E0F2F1, transparent),
                                radial-gradient(2px 2px at 95% 45%, #E0F2F1, transparent)
                            `,
                            backgroundSize: '400px 400px',
                            animation: 'space-fly 4s linear infinite'
                        }}
                    />
                    {/* Layer 3: Closest Stars (Brighter) */}
                    <div className="absolute inset-0 z-0 opacity-90"
                        style={{
                            backgroundImage: `
                                radial-gradient(2.5px 2.5px at 5% 50%, #B2EBF2, transparent),
                                radial-gradient(2.5px 2.5px at 25% 25%, #B2EBF2, transparent),
                                radial-gradient(2.5px 2.5px at 45% 75%, #B2EBF2, transparent),
                                radial-gradient(2.5px 2.5px at 65% 10%, #B2EBF2, transparent),
                                radial-gradient(2.5px 2.5px at 85% 90%, #B2EBF2, transparent)
                            `,
                            backgroundSize: '400px 400px',
                            animation: 'space-fly 3s linear infinite'
                        }}
                    />

                    {/* Animated Glows */}
                    <div className="absolute top-0 left-1/4 h-32 w-32 rounded-full bg-[#25F4EE]/20 blur-[60px] animate-pulse z-0" />
                    <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-[#FE2C55]/20 blur-[60px] animate-pulse delay-700 z-0" />

                    <div className="relative z-10 flex flex-col items-center p-10 text-center">
                        {/* Rocket Animation - Propelling Upwards */}
                        <RocketIcon className="relative mb-8 h-40 w-40" />

                        <h2 className="mb-4 text-4xl font-black tracking-tighter text-white">
                            ORGANIK
                        </h2>

                        <p className="mb-8 text-lg font-light text-zinc-400 leading-relaxed">
                            L'outil ultime pour exploser sur TikTok. <br />
                            <span className="text-white font-medium">Configure ton identité maintenant.</span>
                        </p>

                        <Button
                            size="lg"
                            onClick={() => setOpen(true)}
                            className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold tracking-wide px-10 py-6 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(254,44,85,0.4)]"
                        >
                            COMMENCER L'AVENTURE
                        </Button>

                        <p className="mt-6 text-xs text-zinc-600 uppercase tracking-widest">
                            Powered by Georgescold
                        </p>
                    </div>
                </motion.div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card border-primary/20">
                    <DialogHeader>
                        <DialogTitle className="text-gradient">Configuration du compte</DialogTitle>
                        <DialogDescription>
                            Dis-nous en plus sur ton compte TikTok pour calibrer l'IA.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nom de ton compte TikTok ?</Label>
                                        <Input
                                            value={formData.tiktokName}
                                            onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                                            placeholder="@moncompte"
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Biographie actuelle ?</Label>
                                        <Textarea
                                            value={formData.tiktokBio}
                                            onChange={(e) => setFormData({ ...formData, tiktokBio: e.target.value })}
                                            placeholder="Copie ta bio ici..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Qui incarnes-tu ? (Persona)</Label>
                                        <Input
                                            value={formData.persona}
                                            onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                                            placeholder="Coach sportif expert, Humouriste cynique..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Quelle est ta cible ? (Persona)</Label>
                                        <Input
                                            value={formData.targetAudience}
                                            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                            placeholder="Étudiants, Entrepreneurs, etc..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 5 && (
                                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Ton Leadmagnet ? (Cadeau)</Label>
                                        <Input
                                            value={formData.leadMagnet}
                                            onChange={(e) => setFormData({ ...formData, leadMagnet: e.target.value })}
                                            placeholder="Ebook gratuit, Consultation offerte..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-between mt-4">
                        {step > 1 ? (
                            <Button variant="outline" onClick={handleBack}>Retour</Button>
                        ) : (
                            <div></div> // Spacer
                        )}

                        {step < 5 ? (
                            <Button onClick={handleNext} disabled={
                                (step === 1 && !formData.tiktokName.trim()) ||
                                (step === 2 && !formData.tiktokBio.trim()) ||
                                (step === 3 && !formData.persona.trim()) ||
                                (step === 4 && !formData.targetAudience.trim())
                            }>Suivant</Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isPending || !formData.leadMagnet.trim()} className="bg-primary text-primary-foreground">
                                {isPending ? 'Enregistrement...' : 'Valider'}
                            </Button>
                        )}
                    </div>

                    <div className="flex justify-center mt-2 gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-1 w-8 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary/20'}`} />
                        ))}
                    </div>

                </DialogContent>
            </Dialog>
        </>
    );
}
