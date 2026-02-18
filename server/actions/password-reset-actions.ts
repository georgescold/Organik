'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const RequestResetSchema = z.object({
    email: z.string().email(),
});

const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
});

/**
 * Build the HTML email template for password reset
 */
function buildResetEmailHtml(resetUrl: string): string {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin: 0;">ORGANIK</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
                <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px;">Mot de passe oublie ?</h2>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                    Cliquez sur le bouton ci-dessous pour reinitialiser votre mot de passe. Ce lien expire dans 1 heure.
                </p>
                <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    Reinitialiser mon mot de passe
                </a>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; line-height: 1.5;">
                    Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
                </p>
            </div>
        </div>
    `;
}

/**
 * Send email using Resend API (no SDK needed, just fetch)
 */
async function sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.error('[PASSWORD_RESET] RESEND_API_KEY is not configured');
        return false;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL || 'Organik <onboarding@resend.dev>',
                to: [to],
                subject: 'Reinitialisation de votre mot de passe - Organik',
                html: buildResetEmailHtml(resetUrl),
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[PASSWORD_RESET] Resend API error:', response.status, errorBody);
            return false;
        }

        const result = await response.json();
        console.log('[PASSWORD_RESET] Email sent successfully, id:', result.id);
        return true;
    } catch (err) {
        console.error('[PASSWORD_RESET] Failed to send email:', err);
        return false;
    }
}

/**
 * Step 1: Request a password reset email
 */
export async function requestPasswordReset(formData: z.infer<typeof RequestResetSchema>) {
    const validated = RequestResetSchema.safeParse(formData);
    if (!validated.success) {
        return { error: 'Email invalide' };
    }

    const { email } = validated.data;

    // Always return success to avoid email enumeration
    const successMessage = 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.';

    try {
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal that the email doesn't exist
            return { success: successMessage };
        }

        // Delete any existing tokens for this email
        await prisma.passwordResetToken.deleteMany({ where: { email } });

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Save token to database
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt,
            },
        });

        // Build reset URL
        const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://organik-n804.onrender.com';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        // Send email via Resend
        const emailSent = await sendResetEmail(email, resetUrl);

        if (!emailSent) {
            console.error('[PASSWORD_RESET] Failed to send email to:', email);
            // Don't reveal the error to prevent email enumeration
        }

        return { success: successMessage };
    } catch (error) {
        console.error('[PASSWORD_RESET] Error:', error);
        return { error: 'Une erreur est survenue. Reessayez plus tard.' };
    }
}

/**
 * Step 2: Reset the password using the token
 */
export async function resetPassword(formData: z.infer<typeof ResetPasswordSchema>) {
    const validated = ResetPasswordSchema.safeParse(formData);
    if (!validated.success) {
        return { error: 'Donnees invalides' };
    }

    const { token, password } = validated.data;

    try {
        // Find the token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
        });

        if (!resetToken) {
            return { error: 'Lien invalide ou expire. Demandez un nouveau lien.' };
        }

        // Check expiration
        if (resetToken.expiresAt < new Date()) {
            // Clean up expired token
            await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
            return { error: 'Ce lien a expire. Demandez un nouveau lien de reinitialisation.' };
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: resetToken.email },
        });

        if (!user) {
            return { error: 'Utilisateur introuvable.' };
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Delete the used token
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

        return { success: 'Mot de passe reinitialise avec succes ! Vous pouvez maintenant vous connecter.' };
    } catch (error) {
        console.error('[PASSWORD_RESET] Reset error:', error);
        return { error: 'Une erreur est survenue. Reessayez plus tard.' };
    }
}
