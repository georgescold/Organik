'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export async function register(formData: z.infer<typeof RegisterSchema>) {
    const validatedFields = RegisterSchema.safeParse(formData);

    if (!validatedFields.success) {
        return { error: 'Invalid fields' };
    }

    const { email, password } = validatedFields.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: 'Email already in use' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    try {
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
    } catch (error) {
        return { error: 'Failed to create user' };
    }

    // Attempt to sign in
    /*
    try {
      await signIn('credentials', {
        email,
        password,
        redirectTo: '/onboarding',
      });
    } catch (error) {
      if (error instanceof AuthError) {
         // handle auth error
         return { error: 'Something went wrong during auto-login.' };
      }
      throw error; // Rethrow redirect
    }
    */

    return { success: 'Account created!' };
}
