'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getActiveProfileId } from './profile-actions';
import { getCachedInsights } from '@/lib/ai/insights-generator';
import Anthropic from '@anthropic-ai/sdk';

// Claude Sonnet 4.6 — best quality/cost ratio ($3/$15 per MTok vs Opus $15/$75)
const MODEL = 'claude-sonnet-4-6';
// Haiku — for trivial tasks (image-to-slide mapping) where Sonnet is overkill
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const VIRAL_THRESHOLD = 10000; // Posts with 10k+ views are considered truly viral

// Strip em-dashes from all AI-generated text (GPT-style long dashes)
function stripEmDashes(text: string): string {
    return text.replace(/\u2014/g, '-').replace(/\u2013/g, '-');
}

// Robust JSON extraction - handles cases where the AI returns text around the JSON
function extractJSON(raw: string): any {
    // Step 1: Strip markdown code fences
    let cleaned = raw.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();

    // Step 2: Try direct parse
    try {
        return JSON.parse(cleaned);
    } catch (_) { /* continue */ }

    // Step 3: Find the outermost JSON structure (object or array)
    const objStart = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');

    let start = -1;
    let closingChar = '';

    if (objStart === -1 && arrStart === -1) throw new Error('No JSON found in response');

    if (objStart >= 0 && (arrStart === -1 || objStart < arrStart)) {
        start = objStart;
        closingChar = '}';
    } else {
        start = arrStart;
        closingChar = ']';
    }

    // Find matching closing bracket by counting depth
    let depth = 0;
    let end = -1;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') {
            depth--;
            if (depth === 0) { end = i; break; }
        }
    }

    if (end === -1) {
        // Truncated JSON — try to repair by closing open structures
        let repaired = cleaned.substring(start);
        // Remove trailing incomplete string (unterminated quote)
        repaired = repaired.replace(/,\s*"[^"]*$/, '');
        repaired = repaired.replace(/,\s*$/, '');
        // Close remaining brackets
        const openBrackets = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
        const openArrays = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openArrays; i++) repaired += ']';
        for (let i = 0; i < openBrackets; i++) repaired += '}';
        return JSON.parse(repaired);
    }

    return JSON.parse(cleaned.substring(start, end + 1));
}

// Helper to get client (User Key strict mode)
// Returns { client: Anthropic }
async function getAnthropicClient(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { anthropicApiKey: true }
    });

    const userKey = user?.anthropicApiKey;

    if (userKey && userKey.trim().length > 0) {
        return {
            client: new Anthropic({ apiKey: userKey, timeout: 120_000 }),
            apiKey: userKey
        };
    }

    throw new Error("Clé API manquante. Veuillez configurer votre clé dans les réglages.");
}

// Retry wrapper for Anthropic API calls — handles 529 overloaded errors
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 2000): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (e: any) {
            const status = e?.status || e?.error?.status || 0;
            const isOverloaded = status === 529 || (e?.message || '').includes('overloaded');
            if (isOverloaded && attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt); // 2s, 4s
                console.log(`API overloaded (529), retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw e;
        }
    }
    throw new Error('Max retries exceeded');
}

// Types
export type HookProposal = {
    id: string; // generated uuid
    angle: string;
    hook: string;
    reason: string; // The "Hypothesis"
    type?: 'wildcard' | 'optimized'; // [NEW] To identify innovation
};

export type Slide = {
    slide_number: number;
    text: string;
    intention: string;
    image_id?: string;
    image_url?: string;
};

// ===== LINGUISTIC FINGERPRINT HELPER =====
// Extracts the creator's writing style from their posts (used by both generation and optimization)
function computeLinguisticFingerprint(
    topPosts: { post: { hookText: string | null; description: string | null; slides: string | null }; views: number }[],
    existingPosts: { slides: string | null; hookText: string | null }[]
): string {
    const allCreatorTexts: string[] = [];
    const allDescriptions: string[] = [];
    const allHooks: string[] = [];

    for (const vp of topPosts) {
        if (vp.post.hookText) allHooks.push(vp.post.hookText);
        if (vp.post.description) allDescriptions.push(vp.post.description);
        try {
            const s = JSON.parse(vp.post.slides || '[]') as Slide[];
            s.forEach(slide => { if (slide.text) allCreatorTexts.push(slide.text); });
        } catch { /* skip */ }
    }

    existingPosts.forEach(p => {
        try {
            const s = JSON.parse(p.slides || '[]') as Slide[];
            s.forEach(slide => { if (slide.text) allCreatorTexts.push(slide.text); });
        } catch { /* skip */ }
        if (p.hookText) allHooks.push(p.hookText);
    });

    if (allCreatorTexts.length < 5) return '';

    const allTexts = [...allCreatorTexts, ...allHooks];
    const allJoined = allTexts.join(' ');
    const descJoined = allDescriptions.join(' ');

    // ── PONCTUATION ──
    const ellipsisCount = (allJoined.match(/\.\.\./g) || []).length;
    const questionCount = (allJoined.match(/\?/g) || []).length;
    const exclamationCount = (allJoined.match(/!/g) || []).length;
    const periodCount = (allJoined.match(/(?<!\.)\.(?!\.)/g) || []).length;
    const commaCount = (allJoined.match(/,/g) || []).length;
    const colonCount = (allJoined.match(/:/g) || []).length;
    const dashCount = (allJoined.match(/[—–-]/g) || []).length;

    // ── ÉMOJIS ──
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
    const allEmojisSlides = allJoined.match(emojiRegex) || [];
    const allEmojisDesc = descJoined.match(emojiRegex) || [];
    const usesEmojisInSlides = allEmojisSlides.length > 0;
    const usesEmojisInDesc = allEmojisDesc.length > 0;
    const emojiFreq: Record<string, number> = {};
    [...allEmojisSlides, ...allEmojisDesc].forEach(e => { emojiFreq[e] = (emojiFreq[e] || 0) + 1; });
    const topEmojis = Object.entries(emojiFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([e]) => e);

    // ── MAJUSCULES ──
    const allCapsWords = (allJoined.match(/\b[A-ZÀ-Ü]{2,}\b/g) || []);
    const usesAllCaps = allCapsWords.length > 2;
    const topCapsWords = [...new Set(allCapsWords)].slice(0, 10);

    // ── STRUCTURES DE PHRASES ──
    const sentences = allCreatorTexts;
    const avgSentenceLength = Math.round(sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length);
    const shortSentences = sentences.filter(s => s.split(/\s+/).length <= 5).length;
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 12).length;

    // ── TICS DE LANGAGE ──
    const ticsPatterns: { pattern: RegExp; label: string }[] = [
        { pattern: /\ben fait\b/gi, label: 'en fait' },
        { pattern: /\bgenre\b/gi, label: 'genre' },
        { pattern: /\bdu coup\b/gi, label: 'du coup' },
        { pattern: /\bperso\b/gi, label: 'perso' },
        { pattern: /\bfranch?ement\b/gi, label: 'franchement' },
        { pattern: /\bcarrément\b/gi, label: 'carrément' },
        { pattern: /\btranquille\b/gi, label: 'tranquille' },
        { pattern: /\blittéral?ement\b/gi, label: 'littéralement' },
        { pattern: /\bjuste\b/gi, label: 'juste' },
        { pattern: /\btrop\b/gi, label: 'trop' },
        { pattern: /\bvraiment\b/gi, label: 'vraiment' },
        { pattern: /\bstyle\b/gi, label: 'style' },
        { pattern: /\ben mode\b/gi, label: 'en mode' },
        { pattern: /\bwsh\b/gi, label: 'wsh' },
        { pattern: /\bfrr?\b/gi, label: 'frr' },
        { pattern: /\bsah\b/gi, label: 'sah' },
        { pattern: /\bgros\b/gi, label: 'gros' },
        { pattern: /\bmdr\b/gi, label: 'mdr' },
        { pattern: /\blol\b/gi, label: 'lol' },
        { pattern: /\bptdr\b/gi, label: 'ptdr' },
        { pattern: /\bbref\b/gi, label: 'bref' },
        { pattern: /\bvoilà\b/gi, label: 'voilà' },
        { pattern: /\bbon\b/gi, label: 'bon' },
        { pattern: /\balors\b/gi, label: 'alors' },
        { pattern: /\bregarde\b/gi, label: 'regarde' },
        { pattern: /\bécoute\b/gi, label: 'écoute' },
        { pattern: /\bsérieux\b/gi, label: 'sérieux' },
        { pattern: /\btu sais\b/gi, label: 'tu sais' },
        { pattern: /\btu vois\b/gi, label: 'tu vois' },
    ];
    const detectedTics: { label: string; count: number }[] = [];
    for (const tic of ticsPatterns) {
        const matches = allJoined.match(tic.pattern);
        if (matches && matches.length >= 2) {
            detectedTics.push({ label: tic.label, count: matches.length });
        }
    }
    detectedTics.sort((a, b) => b.count - a.count);

    // ── TUTOIEMENT VS VOUVOIEMENT ──
    const tuCount = (allJoined.match(/\b(tu|t'|toi|ton|ta|tes)\b/gi) || []).length;
    const vousCount = (allJoined.match(/\b(vous|votre|vos)\b/gi) || []).length;

    // ── MOTS D'OUVERTURE ──
    const slideStarts = allCreatorTexts.map(t => t.split(/\s+/)[0]?.toLowerCase());
    const startFreq: Record<string, number> = {};
    slideStarts.forEach(w => { if (w) startFreq[w] = (startFreq[w] || 0) + 1; });
    const frequentStarts = Object.entries(startFreq)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => `"${word}" (${count}x)`);

    // ── BUILD FINGERPRINT ──
    let fp = `\n🔍 EMPREINTE LINGUISTIQUE DU CRÉATEUR (analysé sur ${allCreatorTexts.length} slides + ${allHooks.length} hooks + ${allDescriptions.length} descriptions):\n`;

    fp += `\nPONCTUATION — ton profil:\n`;
    fp += `  "..." (suspense): ${ellipsisCount}x | "?" (questions): ${questionCount}x | "!" (exclamations): ${exclamationCount}x\n`;
    fp += `  "." (points simples): ${periodCount}x | "," (virgules): ${commaCount}x | ":" (deux-points): ${colonCount}x | "—/-" (tirets): ${dashCount}x\n`;
    if (ellipsisCount > questionCount && ellipsisCount > exclamationCount) {
        fp += `  → Tu privilégies le SUSPENSE avec "..." — reproduis ce style.\n`;
    } else if (questionCount > ellipsisCount) {
        fp += `  → Tu poses beaucoup de QUESTIONS — reproduis ce style interrogatif.\n`;
    } else if (exclamationCount > ellipsisCount) {
        fp += `  → Tu utilises beaucoup les EXCLAMATIONS — reproduis cette énergie.\n`;
    }

    fp += `\nÉMOJIS:\n`;
    if (usesEmojisInSlides && topEmojis.length > 0) {
        fp += `  Slides: OUI — tu utilises des émojis dans tes slides. Tes favoris: ${topEmojis.join(' ')}\n`;
        fp += `  → REPRODUIS cette utilisation d'émojis dans les nouvelles slides.\n`;
    } else {
        fp += `  Slides: NON — tu n'utilises PAS d'émojis dans tes slides. N'EN AJOUTE PAS.\n`;
    }
    if (usesEmojisInDesc && topEmojis.length > 0) {
        fp += `  Descriptions: OUI — tu utilises des émojis dans tes descriptions. Favoris: ${topEmojis.join(' ')}\n`;
    } else if (allDescriptions.length > 0) {
        fp += `  Descriptions: NON — tu n'utilises PAS d'émojis dans tes descriptions.\n`;
    }

    if (usesAllCaps) {
        fp += `\nMAJUSCULES: Tu utilises des mots en MAJUSCULES pour l'emphase. Exemples: ${topCapsWords.join(', ')}\n`;
        fp += `  → REPRODUIS cette utilisation de caps pour l'impact.\n`;
    } else {
        fp += `\nMAJUSCULES: Tu n'utilises PAS ou peu de mots en majuscules.\n`;
    }

    fp += `\nSTRUCTURE DE PHRASES:\n`;
    fp += `  Longueur moyenne: ${avgSentenceLength} mots/slide\n`;
    fp += `  Phrases courtes (≤5 mots): ${shortSentences}/${sentences.length} (${Math.round(shortSentences / sentences.length * 100)}%)\n`;
    fp += `  Phrases longues (>12 mots): ${longSentences}/${sentences.length} (${Math.round(longSentences / sentences.length * 100)}%)\n`;
    if (shortSentences / sentences.length > 0.5) {
        fp += `  → Tu as un style PUNCHY avec des phrases courtes. Reproduis ça.\n`;
    } else if (longSentences / sentences.length > 0.3) {
        fp += `  → Tu écris des phrases plus développées. Garde ce rythme.\n`;
    } else {
        fp += `  → Tu mélanges court et long. Reproduis ce rythme varié.\n`;
    }

    if (detectedTics.length > 0) {
        fp += `\nTICS DE LANGAGE (expressions que tu utilises régulièrement):\n`;
        detectedTics.slice(0, 8).forEach(t => {
            fp += `  "${t.label}" → ${t.count}x\n`;
        });
        fp += `  → INTÈGRE naturellement ces expressions dans les nouvelles slides. Ce sont TES mots.\n`;
    }

    fp += `\nADRESSE: ${tuCount > vousCount ? `Tu TUTOIES ton audience (${tuCount}x "tu/t'/toi" vs ${vousCount}x "vous"). Garde le TU.` : vousCount > tuCount ? `Tu VOUVOIES ton audience (${vousCount}x "vous" vs ${tuCount}x "tu"). Garde le VOUS.` : `Mélange tu/vous. Adapte selon le contexte.`}\n`;

    if (frequentStarts.length > 0) {
        fp += `\nMOTS D'OUVERTURE FRÉQUENTS DE TES SLIDES: ${frequentStarts.join(', ')}\n`;
    }

    return fp;
}

export async function generateHooks() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    // ✅ PERF: Parallelize profile, recentMetrics, and rejectedPosts queries
    const [profile, recentMetrics, rejectedPosts] = await Promise.all([
        prisma.profile.findUnique({ where: { id: activeProfileId } }),
        prisma.metrics.findMany({
            where: {
                post: {
                    profileId: activeProfileId,
                    status: { not: 'draft' }
                }
            },
            take: 100,
            orderBy: { views: 'desc' },
            include: { post: true }
        }),
        prisma.post.findMany({
            where: {
                profileId: activeProfileId,
                status: 'rejected'
            },
            orderBy: { createdAt: 'desc' },
            select: { hookText: true, title: true }
        })
    ]);

    // 2. Segment Data — viral (10k+) with fallback to top 5
    const trulyViralHooks = recentMetrics.filter(m => m.views >= VIRAL_THRESHOLD);
    const topHookPosts = trulyViralHooks.length >= 3 ? trulyViralHooks.slice(0, 10) : recentMetrics.slice(0, 10);
    const isViralHookData = trulyViralHooks.length >= 3;
    const flopPosts = recentMetrics.length > 10 ? recentMetrics.slice(-5) : [];

    // 3. Construct "Brain" Context
    const authority = profile?.persona || "Expert Creator";
    const targetAudience = (profile as any)?.targetAudience || "General Audience";
    const niche = (profile as any)?.niche || "General Content";

    // Deep hook analysis — not just listing, but understanding WHY they worked
    const deepHookAnalysis = (() => {
        if (topHookPosts.length === 0) return 'Aucun post publié avec des vues. Utilise les meilleures pratiques.';

        let analysis = `${isViralHookData ? '🔥 HOOKS VIRAUX (10K+ VUES)' : '📈 TES HOOKS LES PLUS PERFORMANTS'}:\n`;

        // Detailed per-hook breakdown
        for (const m of topHookPosts.slice(0, 8)) {
            const hookText = m.post.hookText || '';
            const charCount = hookText.length;
            const hasSuspense = hookText.includes('...');
            const hasQuestion = hookText.includes('?');
            const hasExclamation = hookText.includes('!');
            const technique = hasQuestion ? 'Question' : hasSuspense ? 'Suspense' : hasExclamation ? 'Exclamation' : 'Affirmation';

            analysis += `  "${hookText}" → ${m.views.toLocaleString()} vues | ${charCount} chars | Technique: ${technique}\n`;
        }

        // Pattern analysis across hooks
        const allHooks = topHookPosts.map(m => m.post.hookText || '');
        const avgLength = Math.round(allHooks.reduce((sum, h) => sum + h.length, 0) / allHooks.length);
        const withSuspense = allHooks.filter(h => h.includes('...')).length;
        const withQuestion = allHooks.filter(h => h.includes('?')).length;
        const withTu = allHooks.filter(h => /\btu\b|\bt'/i.test(h)).length;

        analysis += `\nPATTERNS DE TES HOOKS PERFORMANTS:\n`;
        analysis += `- Longueur moyenne: ${avgLength} caractères\n`;
        analysis += `- Avec "...": ${withSuspense}/${allHooks.length} (${Math.round(withSuspense / allHooks.length * 100)}%)\n`;
        analysis += `- Avec "?": ${withQuestion}/${allHooks.length} (${Math.round(withQuestion / allHooks.length * 100)}%)\n`;
        analysis += `- Interpellation directe ("tu/t'"): ${withTu}/${allHooks.length} (${Math.round(withTu / allHooks.length * 100)}%)\n`;

        return analysis;
    })();

    const flopContext = flopPosts.length > 0
        ? `⚠️ HOOKS QUI ONT FLOPPÉ (ÉVITE CE STYLE):\n${flopPosts.map(m => `  "${m.post.hookText}" → ${m.views.toLocaleString()} vues`).join('\n')}`
        : "";

    const rejectedContext = rejectedPosts.length > 0
        ? `❌ BLACKLIST — HOOKS STRICTEMENT INTERDITS (le créateur les a REJETÉS — ne propose JAMAIS rien de similaire):
${rejectedPosts.map(p => `  - Angle BANNI: "${p.title}" | Hook BANNI: "${p.hookText}"`).join('\n')}
CRITIQUE: Tout hook qui ressemble, paraphrase ou réutilise le même concept est STRICTEMENT INTERDIT.`
        : "";

    // Get cached insights
    const { client: anthropic, apiKey: userApiKey } = await getAnthropicClient(session.user.id);
    const insights = await getCachedInsights(activeProfileId, userApiKey) || null;

    // Build insights context in French, focused on hooks
    const insightsContext = (() => {
        if (!insights) return '';
        const parts: string[] = [];

        if (insights.bestHookPatterns?.length) {
            parts.push(`🎯 PATTERNS DE HOOKS QUI PERFORMENT:`);
            insights.bestHookPatterns.forEach((p: any) => {
                parts.push(`  - "${p.pattern}" → Score: ${p.avgScore.toFixed(1)}/10, Vues: ${p.avgViews.toLocaleString()}`);
                if (p.examples?.length) parts.push(`    Exemples: ${p.examples.slice(0, 2).join(' | ')}`);
            });
        }
        if (insights.viralTriggers?.length) {
            parts.push(`⚡ Déclencheurs viraux: ${insights.viralTriggers.join(', ')}`);
        }
        if (insights.personaInsights?.toneThatWorks) {
            parts.push(`🎤 Ton qui fonctionne: ${insights.personaInsights.toneThatWorks}`);
        }
        if (insights.personaInsights?.effectiveTopics?.length) {
            parts.push(`📌 Sujets qui engagent: ${insights.personaInsights.effectiveTopics.join(', ')}`);
        }
        if (insights.narrativeFacts?.length) {
            parts.push(`📜 FAITS NARRATIFS (NE JAMAIS CONTREDIRE):`);
            insights.narrativeFacts.forEach((f: string) => parts.push(`  - ${f}`));
        }

        return parts.length > 0 ? `\n📊 INTELLIGENCE (basé sur ${insights.metadata?.basedOnPostsCount || 0} posts analysés):\n${parts.join('\n')}` : '';
    })();

    // Linguistic fingerprint for hooks — analyze the creator's hook writing style
    const hookFingerprint = (() => {
        const allHookTexts = recentMetrics.map(m => m.post.hookText || '').filter(h => h.length > 0);
        if (allHookTexts.length < 3) return '';

        const allJoined = allHookTexts.join(' ');

        // Emoji analysis
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
        const emojis = allJoined.match(emojiRegex) || [];
        const usesEmojis = emojis.length > 0;
        const emojiFreq: Record<string, number> = {};
        emojis.forEach(e => { emojiFreq[e] = (emojiFreq[e] || 0) + 1; });
        const topEmojis = Object.entries(emojiFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([e]) => e);

        // Caps analysis
        const allCapsWords = (allJoined.match(/\b[A-ZÀ-Ü]{2,}\b/g) || []);
        const usesAllCaps = allCapsWords.length > 1;

        // Punctuation
        const ellipsis = (allJoined.match(/\.\.\./g) || []).length;
        const questions = (allJoined.match(/\?/g) || []).length;
        const exclamations = (allJoined.match(/!/g) || []).length;

        // Tutoiement
        const tuCount = (allJoined.match(/\b(tu|t'|toi|ton|ta|tes)\b/gi) || []).length;

        // Tics in hooks
        const ticsPatterns = [
            { p: /\ben fait\b/gi, l: 'en fait' }, { p: /\bgenre\b/gi, l: 'genre' },
            { p: /\bdu coup\b/gi, l: 'du coup' }, { p: /\bvraiment\b/gi, l: 'vraiment' },
            { p: /\bjuste\b/gi, l: 'juste' }, { p: /\btrop\b/gi, l: 'trop' },
            { p: /\bperso\b/gi, l: 'perso' }, { p: /\bsérieux\b/gi, l: 'sérieux' },
        ];
        const tics = ticsPatterns
            .map(t => ({ label: t.l, count: (allJoined.match(t.p) || []).length }))
            .filter(t => t.count >= 2)
            .sort((a, b) => b.count - a.count);

        let fp = `\n🔍 EMPREINTE LINGUISTIQUE DE TES HOOKS (${allHookTexts.length} hooks analysés):\n`;
        fp += `  Ponctuation: "..." ${ellipsis}x | "?" ${questions}x | "!" ${exclamations}x | Tutoiement: ${tuCount}x\n`;
        if (usesEmojis) {
            fp += `  Émojis: OUI — favoris: ${topEmojis.join(' ')} → UTILISE-LES dans les hooks\n`;
        } else {
            fp += `  Émojis: NON — n'ajoute PAS d'émojis dans les hooks\n`;
        }
        if (usesAllCaps) {
            fp += `  Majuscules: OUI — pour l'emphase (ex: ${[...new Set(allCapsWords)].slice(0, 5).join(', ')})\n`;
        }
        if (tics.length > 0) {
            fp += `  Tics de langage: ${tics.map(t => `"${t.label}" (${t.count}x)`).join(', ')} → INTÈGRE-LES naturellement\n`;
        }

        return fp;
    })();


    const systemPrompt = `Tu es ${authority}. Tu ne "joues" pas un rôle — tu ES cette personne. Tu crées du contenu dans la niche "${niche}" et chaque hook que tu écris doit sonner exactement comme toi.

LANGUE: FRANCAIS natif uniquement. Tu tutoies. Direct, naturel, avec du punch.
PONCTUATION INTERDITE: N'utilise JAMAIS de tirets longs (—) ni de tirets moyens (–). Utilise uniquement des tirets courts (-), des virgules, ou des points.

TON AUDIENCE: ${targetAudience}
Tu sais ce qui les fait s'arreter de scroller. Tu connais leurs frustrations, leurs desirs, et les mots qui les captent en 2 secondes.

${'═'.repeat(50)}
🧠 ANALYSE DE TES HOOKS — C'EST TA BASE
${'═'.repeat(50)}
${deepHookAnalysis}
${flopContext}
${insightsContext}
${hookFingerprint}

OBJECTIF: Comprendre POURQUOI tes hooks ont performé, t'en INSPIRER, puis INNOVER. Tu ne recycles JAMAIS un hook existant — tu comprends les mécanismes qui ont fonctionné et tu crées quelque chose de NOUVEAU.

EMPREINTE À RESPECTER (c'est ce qui te rend reconnaissable):
1. La LONGUEUR MOYENNE de tes hooks qui marchent — reste dans la même fourchette
2. Les TECHNIQUES dominantes (suspense "...", questions "?", interpellation "tu") — utilise-les
3. Le VOCABULAIRE, le TON et les TICS DE LANGAGE — écris comme le créateur, pas comme une IA
4. ÉMOJIS: si le créateur en utilise dans ses hooks, utilise le même type. Sinon, N'EN AJOUTE PAS
5. MAJUSCULES: reproduis l'usage (ou non-usage) du créateur

CE QUI DOIT ÊTRE NOUVEAU:
- L'ANGLE: chaque hook aborde un sujet ou une perspective différente
- La FORMULATION: même technique (ex: question) mais tournure inédite
- Comprends POURQUOI les flops ont floppé — fais le contraire

${'═'.repeat(50)}
📐 RÈGLES DE CRÉATION
${'═'.repeat(50)}

PRIORITÉ 1 — STOPPER LE SCROLL:
Un hook a UN SEUL job: faire s'arrêter quelqu'un de scroller. Il doit déclencher une ÉMOTION en 2 secondes.
Crée un "curiosity gap" — le lecteur A BESOIN d'en savoir plus mais ne peut pas deviner.

PRIORITÉ 2 — SONNER HUMAIN, PAS IA:
Écris comme ${authority} parlerait vraiment. Brut, direct, imparfait. "Tu" pas "vous".
"..." pour le suspense. Phrases incomplètes. Punch, pas polish.

PRIORITÉ 3 — LONGUEUR:
Le hook sera affiché sur un slide 9:16. Il DOIT être lisible en 1-2 secondes.
Maximum 70 caractères. Plus court = mieux.

PSYCHOLOGIE COPYWRITING (choisis l'approche qui colle le mieux):
- Curiosity gap: tease un secret, une erreur, une révélation sans donner la réponse
- Identity play: fais-toi reconnaître ("Si tu fais ça...")
- Prise de position contrariante: challenge une croyance commune de la niche
- Story lead: commence une anecdote personnelle qui demande résolution
- Pattern interrupt: dis quelque chose d'inattendu

${'═'.repeat(50)}
⛔ CONTRAINTES
${'═'.repeat(50)}
- INTERDIT: le caractère flèche '→'
- COHÉRENCE NARRATIVE: ne JAMAIS contredire les "FAITS NARRATIFS" du contexte.
- Étudie les données virales vs flops. Reproduis les patterns qui marchent, évite ceux qui floppent.
${rejectedContext}

${'═'.repeat(50)}
📤 TÂCHE
${'═'.repeat(50)}
Génère exactement 3 hooks:
- Hook 1 & 2: "OPTIMIZED" — basés sur ce qui fonctionne déjà pour ce créateur.
- Hook 3: "WILDCARD" — un angle complètement différent pour tester du nouveau. Toujours dans le persona.

FORMAT (JSON UNIQUEMENT):
[
    {
        "angle": "Nom du concept (Français)",
        "hook": "Le texte affiché (Français, max 70 chars)",
        "reason": "Pourquoi ça va marcher pour ${targetAudience} (Français)",
        "type": "optimized"
    }
]
`;

    try {
        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{
                role: "user", content: `Génère 3 hooks viraux (2 Optimized, 1 Wildcard). Inspire-toi de l'analyse de tes hooks performants: garde la même voix mais propose des angles et formulations INÉDITS.`
            }]
        });

        const text = (msg.content[0] as any).text;
        const hooks = extractJSON(text);
        // Strip em-dashes from hook text
        for (const h of hooks) {
            if (h.hook) h.hook = stripEmDashes(h.hook);
            if (h.angle) h.angle = stripEmDashes(h.angle);
            if (h.reason) h.reason = stripEmDashes(h.reason);
        }
        return { hooks };
    } catch (e: any) {
        console.error("Hook Generation Error:", e);
        // Clean error message for user
        const message = e.message.includes("Clé API") ? e.message : "Erreur lors de la génération. Vérifiez votre clé API.";
        return { error: message };
    }
}

export async function rejectHook(hookProposal: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const activeProfileId = await getActiveProfileId(session.user.id);
        if (!activeProfileId) return { error: 'No active profile found' };

        // Save as rejected to avoid reproposing (persisted memory)
        // We use the 'post' table with status 'rejected'
        await prisma.post.create({
            data: {
                userId: session.user.id,
                profileId: activeProfileId,
                platform: 'tiktok',
                hookText: hookProposal.hook,
                title: hookProposal.angle,
                description: `REJECTED [${hookProposal.type || 'optimized'}]: ${hookProposal.reason}`,
                status: 'rejected',
                slides: '[]',
                metrics: { create: {} }
            }
        });
        return { success: true };
    } catch (e) {
        return { error: 'Failed to reject hook' };
    }
}

// ... (generateReplacementHook)
export async function generateReplacementHook(rejectedHook: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    // Fetch profile context + ALL rejected hooks to ensure we never repeat any
    const [clientRes, profile, allRejected, insights] = await Promise.all([
        getAnthropicClient(session.user.id).catch((e: any) => ({ error: e.message })),
        prisma.profile.findUnique({
            where: { id: activeProfileId },
            select: { persona: true, targetAudience: true, niche: true, hashtags: true }
        }),
        prisma.post.findMany({
            where: { profileId: activeProfileId, status: 'rejected' },
            select: { hookText: true, title: true, description: true }
        }),
        getCachedInsights(activeProfileId, '').catch(() => null)
    ]);

    if ('error' in clientRes) return { error: clientRes.error };
    const client = clientRes.client;

    const blacklist = allRejected.map(p => `- "${p.title}": "${p.hookText}"`).join('\n');

    // Extract rejected angles to force diversity
    const rejectedAngles = allRejected.map(p => p.title).filter(Boolean);
    const rejectedAnglesList = rejectedAngles.length > 0
        ? `\n🚫 ANGLES DÉJÀ REJETÉS (n'utilise AUCUN de ces thèmes/angles) :\n${rejectedAngles.map(a => `- ${a}`).join('\n')}`
        : '';

    const isWildcard = rejectedHook.type === 'wildcard';
    const hookType = isWildcard ? 'wildcard' : 'optimized';

    const authority = profile?.persona || 'Expert Creator';
    const targetAudience = profile?.targetAudience || 'General Audience';
    const niche = profile?.niche || '';

    // Wildcard-specific: push for radically different angles
    const wildcardInstruction = isWildcard ? `
    🎲 CE HOOK DOIT ÊTRE UN WILDCARD :
    - Propose un angle RADICALEMENT différent de tout ce qui a été proposé ou rejeté.
    - Ose un sujet connexe mais inattendu, un format provocateur, un take controversé.
    - Exemples d'angles wildcards: analogie surprenante, confession personnelle, take à contre-courant, question taboue, paradoxe.
    - L'objectif est de TESTER quelque chose de complètement nouveau pour voir si ça résonne.
    - NE RÉPÈTE PAS le même type d'angle que le wildcard rejeté ("${rejectedHook.angle}").
    ` : `
    📊 CE HOOK DOIT ÊTRE OPTIMIZED :
    - Base-toi sur les patterns qui fonctionnent pour ce créateur.
    - Garde le même style et la même voix, mais propose un angle DIFFÉRENT.
    `;

    const insightsContext = insights?.bestHookPatterns
        ? `\nPATTERNS QUI FONCTIONNENT: ${insights.bestHookPatterns.map((p: any) => p.pattern).join(', ')}`
        : '';

    const systemPrompt = `Tu es ${authority}. Tu parles à ${targetAudience}.${niche ? ` Ta niche: ${niche}.` : ''}

Le créateur a REJETÉ ce hook : "${rejectedHook.hook}" (Angle: ${rejectedHook.angle})

❌ BLACKLIST COMPLÈTE (TOUS les hooks rejetés — INTERDIT de proposer quoi que ce soit de similaire) :
${blacklist || '(aucun)'}
${rejectedAnglesList}
${wildcardInstruction}
${insightsContext}

RÈGLES :
- Génère 1 SEUL nouveau hook viral en FRANÇAIS.
- INTERDIT d'utiliser le caractère '→'.
- Max 70 caractères pour le texte du hook.
- Le hook doit stopper le scroll immédiatement.
- L'angle doit être COMPLÈTEMENT DIFFÉRENT de tout ce qui a été rejeté.

FORMAT JSON (objet seul, PAS un tableau) :
{
    "angle": "Nom du concept (Français)",
    "hook": "Le texte affiché à l'écran (Français, max 70 chars)",
    "reason": "Pourquoi cet angle est meilleur (Français)",
    "type": "${hookType}"
}`;

    try {
        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 500,
            system: [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{ role: "user", content: `Génère un hook de remplacement de type ${hookType}. L'angle "${rejectedHook.angle}" ne me plaît pas, propose quelque chose de TOTALEMENT différent.` }]
        });

        const text = (msg.content[0] as any).text;
        const hook = extractJSON(text);
        // Ensure type is always set correctly
        hook.type = hookType;
        if (hook.hook) hook.hook = stripEmDashes(hook.hook);
        if (hook.angle) hook.angle = stripEmDashes(hook.angle);
        if (hook.reason) hook.reason = stripEmDashes(hook.reason);
        return { hook };
    } catch (e: any) {
        return { error: `Erreur API: ${e.message}` };
    }
}

export async function generateCarousel(hook: string, collectionId?: string, userId?: string) {
    // If userId is provided (API), use it. Otherwise, get from session (UI)
    let finalUserId: string;
    if (userId) {
        finalUserId = userId;
    } else {
        const session = await auth();
        if (!session?.user?.id) return { error: 'Unauthorized' };
        finalUserId = session.user.id;
    }

    let client;
    let userApiKey: string;
    try {
        const res = await getAnthropicClient(finalUserId);
        client = res.client;
        userApiKey = res.apiKey;
    } catch (e: any) {
        return { error: e.message };
    }

    // 1. Generate Slides Content AND Description
    let slides: Slide[] = [];
    let description = "";

    // [DEEP LEARNING] Fetch Viral Context for Descriptions
    const activeProfileId = await getActiveProfileId(finalUserId);
    if (!activeProfileId) return { error: 'No active profile found' };

    // ✅ PERF: Parallelize profile + posts + existingSlides + insights queries
    const [profile, allTopPosts, existingPosts, narrativeInsights] = await Promise.all([
        prisma.profile.findUnique({ where: { id: activeProfileId } }),
        // Fetch top 20 posts by views — we'll segment viral (10k+) vs best performers after
        prisma.metrics.findMany({
            where: {
                post: { profileId: activeProfileId, status: { not: 'draft' } },
                views: { gte: 1 }
            },
            take: 20,
            orderBy: { views: 'desc' },
            include: { post: true }
        }),
        // Fetch slide texts from recent posts to enforce uniqueness
        prisma.post.findMany({
            where: {
                profileId: activeProfileId,
                status: { in: ['created', 'draft'] },
                slides: { not: '[]' }
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: { slides: true, hookText: true, createdAt: true }
        }),
        // Fetch narrative insights for consistency
        getCachedInsights(activeProfileId, userApiKey).catch(() => null)
    ]);

    // Segment posts: viral (10k+ views) vs top performers (best available)
    const trulyViralPosts = allTopPosts.filter(m => m.views >= VIRAL_THRESHOLD);
    // Use viral posts if available, otherwise fallback to top 5 by views
    const viralPosts = trulyViralPosts.length >= 3 ? trulyViralPosts.slice(0, 5) : allTopPosts.slice(0, 5);
    const isViralData = trulyViralPosts.length >= 3;

    // Extract existing slide texts AND image_ids from recent posts
    const existingSlideTexts: string[] = [];
    const last3PostsImageIds: string[] = []; // Images from last 3 posts — FORBIDDEN to reuse
    const last3PostsSlideTexts: string[] = []; // Slide texts from last 3 posts — STRICTLY FORBIDDEN

    existingPosts.forEach((p, idx) => {
        try {
            const parsedSlides = JSON.parse(p.slides || '[]') as Slide[];
            parsedSlides.forEach(s => {
                if (s.text && s.text.trim()) {
                    existingSlideTexts.push(s.text.trim());
                    // First 3 posts = strictly forbidden (avoid same visual/text combo)
                    if (idx < 3) {
                        last3PostsSlideTexts.push(s.text.trim());
                        if (s.image_id) last3PostsImageIds.push(s.image_id);
                    }
                }
            });
        } catch { /* ignore parse errors */ }
    });

    const uniquenessContext = (() => {
        let ctx = '';

        // STRICT: last 3 posts — absolutely no reuse (text OR images)
        if (last3PostsSlideTexts.length > 0) {
            ctx += `\n🚫 INTERDICTION ABSOLUE — SLIDES DES 3 DERNIERS POSTS (ne JAMAIS réutiliser, même reformulé):
${last3PostsSlideTexts.map(t => `  ✗ "${t}"`).join('\n')}
Ces textes viennent des 3 derniers posts créés. Chaque nouveau post DOIT avoir un contenu 100% différent pour éviter la répétition visuelle et textuelle.\n`;
        }

        // SOFT: all other existing texts — avoid duplication (limited to 20 for token efficiency)
        const olderTexts = existingSlideTexts.filter(t => !last3PostsSlideTexts.includes(t));
        if (olderTexts.length > 0) {
            ctx += `\n⚠️ TEXTES DÉJÀ UTILISÉS (évite de les réutiliser):
${olderTexts.slice(0, 20).map(t => `  - "${t}"`).join('\n')}
Génère du contenu ORIGINAL. Chaque slide doit apporter une perspective ou formulation NOUVELLE.\n`;
        }

        return ctx;
    })();

    // Build narrative consistency context from insights
    const narrativeContext = narrativeInsights?.narrativeFacts && narrativeInsights.narrativeFacts.length > 0
        ? `\n📜 NARRATIVE CONSISTENCY (IMMUTABLE FACTS - NEVER CONTRADICT):
           These are established facts about the creator from their previous posts. Your carousel content MUST NOT contradict ANY of these:
           ${narrativeInsights.narrativeFacts.map((f: string) => `- ${f}`).join('\n')}

           Example: If a fact says "major de promo depuis la L1", do NOT write slides about failing or dropping out of L1. Stay consistent with the creator's established narrative.`
        : "";

    const defaultHashtags = (profile as any)?.hashtags || "";
    const leadMagnet = (profile as any)?.leadMagnet || "Follow for more";
    const targetAudience = profile?.targetAudience || "General Audience";
    const authority = profile?.persona || "Expert Creator";

    // ═══════════════════════════════════════════════════════════════════
    // DEEP VIRAL ANALYSIS — Extract patterns, structures, and techniques
    // ═══════════════════════════════════════════════════════════════════

    // 1. Description style examples
    const descriptionStyleContext = viralPosts.length > 0
        ? `YOUR BEST-PERFORMING DESCRIPTIONS (MIMIC THIS STYLE):
           ${viralPosts.slice(0, 3).filter(p => p.post.description).map(p => `"${p.post.description}" (${p.views.toLocaleString()} views)`).join('\n           ')}`
        : "";

    // 2. Deep viral slides analysis — not just text, but STRUCTURE, PATTERNS, TECHNIQUES
    const deepViralAnalysis = (() => {
        if (viralPosts.length === 0) return '';

        const postsWithSlides: { hook: string; views: number; slides: Slide[]; description: string }[] = [];
        for (const vp of viralPosts.slice(0, 5)) {
            try {
                const vSlides = JSON.parse(vp.post.slides || '[]') as Slide[];
                if (vSlides.length > 0) {
                    postsWithSlides.push({
                        hook: vp.post.hookText || '',
                        views: vp.views,
                        slides: vSlides,
                        description: vp.post.description || ''
                    });
                }
            } catch { /* skip */ }
        }

        if (postsWithSlides.length === 0) return '';

        const viralLabel = isViralData ? '🔥 VIRAL' : '📈 TOP-PERFORMING';
        let analysis = `\n${viralLabel} POSTS — DEEP ANALYSIS (${postsWithSlides.length} posts, ${isViralData ? '10k+ views each' : 'your best performers'}):\n`;

        // Per-post detailed breakdown
        for (const post of postsWithSlides) {
            const slideTexts = post.slides.map(s => s.text);
            const avgWordsPerSlide = Math.round(slideTexts.reduce((sum, t) => sum + t.split(/\s+/).length, 0) / slideTexts.length);
            const slidesWithSuspense = slideTexts.filter(t => t.includes('...')).length;
            const slidesWithQuestion = slideTexts.filter(t => t.includes('?')).length;
            const totalSlides = post.slides.length;

            analysis += `\n━━━ "${post.hook}" (${post.views.toLocaleString()} vues) ━━━\n`;
            analysis += `Structure: ${totalSlides} slides | ~${avgWordsPerSlide} mots/slide | ${slidesWithSuspense}/${totalSlides} slides avec "..." | ${slidesWithQuestion}/${totalSlides} slides avec "?"\n`;
            analysis += `Contenu complet des slides:\n`;
            post.slides.forEach(s => {
                analysis += `  [${s.slide_number}] "${s.text}"\n`;
            });
        }

        // Cross-post pattern extraction
        analysis += `\n━━━ PATTERNS IDENTIFIÉS DANS TES POSTS ${isViralData ? 'VIRAUX' : 'PERFORMANTS'} ━━━\n`;

        // Analyze common techniques across posts
        const allSlideTexts = postsWithSlides.flatMap(p => p.slides.map(s => s.text));
        const totalSuspense = allSlideTexts.filter(t => t.includes('...')).length;
        const totalQuestions = allSlideTexts.filter(t => t.includes('?')).length;
        const totalExclamation = allSlideTexts.filter(t => t.includes('!')).length;
        const avgWords = Math.round(allSlideTexts.reduce((sum, t) => sum + t.split(/\s+/).length, 0) / allSlideTexts.length);
        const totalSlideCount = allSlideTexts.length;

        analysis += `- Suspense ("..."): ${totalSuspense}/${totalSlideCount} slides (${Math.round(totalSuspense / totalSlideCount * 100)}%)\n`;
        analysis += `- Questions ("?"): ${totalQuestions}/${totalSlideCount} slides (${Math.round(totalQuestions / totalSlideCount * 100)}%)\n`;
        analysis += `- Exclamations ("!"): ${totalExclamation}/${totalSlideCount} slides (${Math.round(totalExclamation / totalSlideCount * 100)}%)\n`;
        analysis += `- Longueur moyenne: ${avgWords} mots/slide\n`;
        analysis += `- Nombre de slides moyen: ${Math.round(postsWithSlides.reduce((sum, p) => sum + p.slides.length, 0) / postsWithSlides.length)}\n`;

        // Extract common opening patterns (slide 2 — after hook)
        const secondSlides = postsWithSlides.filter(p => p.slides.length > 1).map(p => p.slides[1].text);
        if (secondSlides.length > 0) {
            analysis += `- Patterns d'ouverture (slide 2 après le hook): ${secondSlides.map(s => `"${s}"`).join(' | ')}\n`;
        }

        // Extract CTA patterns (last slides)
        const lastSlides = postsWithSlides.map(p => p.slides[p.slides.length - 1].text);
        analysis += `- Patterns de CTA (dernière slide): ${lastSlides.map(s => `"${s}"`).join(' | ')}\n`;

        return analysis;
    })();

    // 3. Performance intelligence from cached insights
    const performanceIntelligence = (() => {
        if (!narrativeInsights) return '';
        const parts: string[] = [];

        if (narrativeInsights.bestHookPatterns?.length) {
            parts.push(`🎯 Tes patterns de hooks qui performent le mieux:`);
            narrativeInsights.bestHookPatterns.forEach((p: any) => {
                parts.push(`  - "${p.pattern}" → Score moyen: ${p.avgScore.toFixed(1)}/10, Vues moyennes: ${p.avgViews.toLocaleString()}`);
                if (p.examples?.length) parts.push(`    Exemples: ${p.examples.slice(0, 2).join(' | ')}`);
            });
        }

        if (narrativeInsights.viralTriggers?.length) {
            parts.push(`⚡ Tes déclencheurs viraux: ${narrativeInsights.viralTriggers.join(', ')}`);
        }

        if (narrativeInsights.personaInsights?.toneThatWorks) {
            parts.push(`🎤 Ton qui fonctionne avec ton audience: ${narrativeInsights.personaInsights.toneThatWorks}`);
        }
        if (narrativeInsights.personaInsights?.effectiveTopics?.length) {
            parts.push(`📌 Sujets qui engagent ton audience: ${narrativeInsights.personaInsights.effectiveTopics.join(', ')}`);
        }

        if (narrativeInsights.strongPoints?.length) {
            parts.push(`💪 Tes forces (à exploiter): ${narrativeInsights.strongPoints.map((s: any) => `${s.category} (${s.avgScore.toFixed(1)}pts)`).join(', ')}`);
        }
        if (narrativeInsights.weakPoints?.length) {
            parts.push(`⚠️ Axes d'amélioration: ${narrativeInsights.weakPoints.map((w: any) => `${w.category} → ${w.improvements[0] || ''}`).join(', ')}`);
        }

        return parts.length > 0 ? `\n📊 INTELLIGENCE DE PERFORMANCE (basé sur ${narrativeInsights.metadata?.basedOnPostsCount || 0} posts analysés):\n${parts.join('\n')}` : '';
    })();

    // 4. Linguistic fingerprint — use shared helper
    const linguisticFingerprint = (() => {
        let fp = computeLinguisticFingerprint(allTopPosts, existingPosts);
        if (!fp) return '';

        // ── FORMATTING BLUEPRINT (visual text analysis per slide type) ──
        // Analyze CTA (last slide) vs body slides vs hook to extract formatting rules
        const allCTAs: string[] = [];
        const allBodySlides: string[] = [];
        const allHookSlides: string[] = [];
        const slideCountsPerPost: number[] = [];

        for (const vp of allTopPosts) {
            try {
                const vSlides = JSON.parse(vp.post.slides || '[]') as Slide[];
                if (vSlides.length < 3) continue;
                slideCountsPerPost.push(vSlides.length);

                // Hook = slide 1
                if (vSlides[0]?.text) allHookSlides.push(vSlides[0].text);
                // CTA = last slide
                const lastSlide = vSlides[vSlides.length - 1];
                if (lastSlide?.text) allCTAs.push(lastSlide.text);
                // Body = slides 2 to N-1
                for (let i = 1; i < vSlides.length - 1; i++) {
                    if (vSlides[i]?.text) allBodySlides.push(vSlides[i].text);
                }
            } catch { /* skip */ }
        }

        // Also include existing posts for more CTA data
        existingPosts.forEach(p => {
            try {
                const pSlides = JSON.parse(p.slides || '[]') as Slide[];
                if (pSlides.length < 3) return;
                slideCountsPerPost.push(pSlides.length);
                if (pSlides[0]?.text) allHookSlides.push(pSlides[0].text);
                const lastSlide = pSlides[pSlides.length - 1];
                if (lastSlide?.text) allCTAs.push(lastSlide.text);
                for (let i = 1; i < pSlides.length - 1; i++) {
                    if (pSlides[i]?.text) allBodySlides.push(pSlides[i].text);
                }
            } catch { /* skip */ }
        });

        if (allCTAs.length > 0 || allBodySlides.length > 0) {
            fp += `\n📐 FORMATTING BLUEPRINT (analyse visuelle de tes slides):\n`;

            // Body slide stats
            if (allBodySlides.length > 0) {
                const bodyChars = allBodySlides.map(t => t.length);
                const bodyWords = allBodySlides.map(t => t.split(/\s+/).filter(Boolean).length);
                const bodyLineBreaks = allBodySlides.map(t => (t.match(/\n/g) || []).length);
                const avgBodyChars = Math.round(bodyChars.reduce((a, b) => a + b, 0) / bodyChars.length);
                const avgBodyWords = Math.round(bodyWords.reduce((a, b) => a + b, 0) / bodyWords.length);
                const minBodyChars = Math.min(...bodyChars);
                const maxBodyChars = Math.max(...bodyChars);
                const hasLineBreaks = bodyLineBreaks.some(lb => lb > 0);
                const avgLineBreaks = bodyLineBreaks.reduce((a, b) => a + b, 0) / bodyLineBreaks.length;

                fp += `  SLIDES CORPS (${allBodySlides.length} slides analysées):\n`;
                fp += `    Caractères: ${avgBodyChars} en moyenne (min: ${minBodyChars}, max: ${maxBodyChars})\n`;
                fp += `    Mots: ${avgBodyWords} en moyenne\n`;
                if (hasLineBreaks) {
                    fp += `    Sauts de ligne: OUI (${avgLineBreaks.toFixed(1)} en moyenne par slide)\n`;
                } else {
                    fp += `    Sauts de ligne: NON — tes slides body sont en texte continu\n`;
                }
                fp += `    → RESPECTE cette fourchette de ${minBodyChars}-${maxBodyChars} caractères pour les slides body.\n`;
            }

            // CTA stats (CRITICAL — this is where the main issue is)
            if (allCTAs.length > 0) {
                const ctaChars = allCTAs.map(t => t.length);
                const ctaWords = allCTAs.map(t => t.split(/\s+/).filter(Boolean).length);
                const ctaLineBreaks = allCTAs.map(t => (t.match(/\n/g) || []).length);
                const avgCtaChars = Math.round(ctaChars.reduce((a, b) => a + b, 0) / ctaChars.length);
                const avgCtaWords = Math.round(ctaWords.reduce((a, b) => a + b, 0) / ctaWords.length);
                const minCtaChars = Math.min(...ctaChars);
                const maxCtaChars = Math.max(...ctaChars);
                const hasCtaLineBreaks = ctaLineBreaks.some(lb => lb > 0);
                const avgCtaLineBreaks = ctaLineBreaks.reduce((a, b) => a + b, 0) / ctaLineBreaks.length;

                // Detect CTA structural pattern
                const ctaHasEmojis = allCTAs.filter(t => t.match(/[\u{1F600}-\u{1FAFF}]/u)).length;
                const ctaEmojiRatio = ctaHasEmojis / allCTAs.length;

                fp += `  CTA / DERNIÈRE SLIDE (${allCTAs.length} CTA analysés):\n`;
                fp += `    Caractères: ${avgCtaChars} en moyenne (min: ${minCtaChars}, max: ${maxCtaChars})\n`;
                fp += `    Mots: ${avgCtaWords} en moyenne\n`;
                if (hasCtaLineBreaks) {
                    fp += `    Sauts de ligne: OUI (${avgCtaLineBreaks.toFixed(1)} en moyenne) — le CTA utilise des paragraphes\n`;
                } else {
                    fp += `    Sauts de ligne: NON — le CTA est en bloc continu\n`;
                }
                if (ctaEmojiRatio > 0.5) {
                    fp += `    Émojis dans CTA: OUI (${Math.round(ctaEmojiRatio * 100)}% des CTA) — les émojis font partie de ton style CTA\n`;
                } else if (ctaEmojiRatio > 0) {
                    fp += `    Émojis dans CTA: PARFOIS (${Math.round(ctaEmojiRatio * 100)}%)\n`;
                } else {
                    fp += `    Émojis dans CTA: NON\n`;
                }

                // Show 2 best CTA examples with their structure
                const ctaSamples = allCTAs.slice(0, 3);
                fp += `    EXEMPLES RÉELS DE TES CTA (reproduis cette LONGUEUR et cette STRUCTURE):\n`;
                ctaSamples.forEach((cta, i) => {
                    fp += `      ${i + 1}. [${cta.length} chars, ${cta.split(/\s+/).length} mots]: "${cta}"\n`;
                });

                fp += `    → CRITIQUE: Ton CTA fait ~${avgCtaChars} caractères. RESPECTE cette longueur. `;
                if (avgCtaChars > 150) {
                    fp += `Tu écris des CTA LONGS et détaillés — c'est ta force, ne raccourcis PAS.\n`;
                } else if (avgCtaChars > 80) {
                    fp += `Tu écris des CTA de longueur moyenne — ni trop courts ni trop longs.\n`;
                } else {
                    fp += `Tu écris des CTA COURTS et directs — ne surcharge PAS.\n`;
                }
            }

            // Hook stats
            if (allHookSlides.length > 0) {
                const hookChars = allHookSlides.map(t => t.length);
                const avgHookChars = Math.round(hookChars.reduce((a, b) => a + b, 0) / hookChars.length);
                fp += `  HOOK / SLIDE 1: ~${avgHookChars} caractères en moyenne\n`;
            }

            // Overall carousel length pattern
            if (slideCountsPerPost.length > 0) {
                const avgSlides = Math.round(slideCountsPerPost.reduce((a, b) => a + b, 0) / slideCountsPerPost.length);
                const minSlides = Math.min(...slideCountsPerPost);
                const maxSlides = Math.max(...slideCountsPerPost);
                fp += `  NOMBRE DE SLIDES: ${avgSlides} en moyenne (${minSlides}-${maxSlides})\n`;
            }
        }

        return fp;
    })();

    // ── ADAPTIVE FORMATTING STATS (computed from existing posts) ──
    const formattingStats = (() => {
        const slideCounts: number[] = [];
        const bodyCharCounts: number[] = [];
        const ctaCharCounts: number[] = [];

        const allPostSources = [...allTopPosts.map(vp => vp.post.slides), ...existingPosts.map(p => p.slides)];
        for (const slidesJson of allPostSources) {
            try {
                const parsed = JSON.parse(slidesJson || '[]') as Slide[];
                if (parsed.length < 3) continue;
                slideCounts.push(parsed.length);
                // CTA = last slide
                ctaCharCounts.push(parsed[parsed.length - 1].text.length);
                // Body = slides 2..N-1
                for (let i = 1; i < parsed.length - 1; i++) {
                    bodyCharCounts.push(parsed[i].text.length);
                }
            } catch { /* skip */ }
        }

        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

        return {
            avgSlideCount: avg(slideCounts) || 7,
            minSlideCount: slideCounts.length > 0 ? Math.min(...slideCounts) : 7,
            maxSlideCount: slideCounts.length > 0 ? Math.max(...slideCounts) : 8,
            avgBodyChars: avg(bodyCharCounts) || 60,
            maxBodyChars: bodyCharCounts.length > 0 ? Math.max(...bodyCharCounts) : 80,
            avgBodyWords: bodyCharCounts.length > 0 ? Math.round(avg(bodyCharCounts) / 5.5) : 10, // ~5.5 chars/word in French
            avgCtaChars: avg(ctaCharCounts) || 150,
            maxCtaChars: ctaCharCounts.length > 0 ? Math.max(...ctaCharCounts) : 300,
            hasData: slideCounts.length > 0,
        };
    })();

    try {
        const carouselSystemPrompt = `Tu es ${authority}. Tu ne "joues" pas un rôle — tu ES cette personne. Chaque mot que tu écris doit sonner exactement comme ${authority} parlerait à son audience en DM. Tu es un expert de la niche "${(profile as any)?.niche || 'General'}" et tu crées du contenu carrousel qui génère des milliers de vues.

LANGUE: FRANCAIS natif uniquement. Tu tutoies. Tu parles comme un vrai createur francais, naturel, direct, avec du rythme. JAMAIS de ton robotique ou corporate.
PONCTUATION INTERDITE: N'utilise JAMAIS de tirets longs (—) ni de tirets moyens (–). Utilise uniquement des tirets courts (-), des virgules, ou des points. Les tirets longs font "GPT/IA" et cassent l'authenticite.

TON AUDIENCE: ${targetAudience}
Tu sais exactement ce qui les empêche de dormir, ce qu'ils désirent, et quels mots les font s'arrêter de scroller. Chaque slide doit leur parler DIRECTEMENT, comme si tu leur envoyais un message personnel.

--- ANALYSE DE TES POSTS ${isViralData ? 'VIRAUX (10K+ VUES)' : 'LES PLUS PERFORMANTS'} ---
${deepViralAnalysis}
${performanceIntelligence}
${linguisticFingerprint}

OBJECTIF: Comprendre POURQUOI tes posts ont performé, t'en INSPIRER, puis INNOVER. Tu ne copies JAMAIS un post existant — tu comprends les mécanismes qui ont fonctionné (structure, rythme, ton, techniques de suspense) et tu les appliques à un NOUVEAU sujet avec une approche FRAÎCHE.

EMPREINTE STYLISTIQUE À RESPECTER (c'est ce qui te rend reconnaissable):
1. La LONGUEUR MOYENNE de tes slides — reste dans la même fourchette
2. Le PROFIL DE PONCTUATION "..." vs "." vs "?" vs "!" — c'est ta signature, garde-la
3. Les ÉMOJIS: si tu en utilises, utilise le même type. Si tu n'en utilises PAS, n'en ajoute PAS
4. Les TICS DE LANGAGE: intègre naturellement les expressions que tu utilises régulièrement
5. Les MAJUSCULES: reproduis ton usage (ou non-usage) de mots en CAPS
6. Le RYTHME: phrases courtes/longues/mélangées — c'est ton empreinte sonore
7. Le VOCABULAIRE naturel — les mots qui sonnent comme TOI, pas comme une IA

CE QUI DOIT ÊTRE NOUVEAU À CHAQUE POST:
- L'ANGLE: un regard différent, une idée qu'on n'a pas encore vue
- Les EXEMPLES et ANECDOTES: jamais les mêmes histoires ou faits
- La STRUCTURE NARRATIVE: même si l'arc émotionnel est similaire, le chemin doit être surprenant
- La RÉVÉLATION: chaque post doit apporter un insight ou twist inédit

En résumé: MÊME VOIX (style, ton, tics) + NOUVEAU CONTENU (angle, exemples, révélations) = post qui sonne comme toi mais qui surprend ton audience.

--- RÈGLES DE CRÉATION ---

RÉTENTION & SWIPE:
- Chaque slide (sauf CTA) doit donner envie de voir la suivante.
- Utilise les techniques que TU utilises dans tes posts performants (suspense, questions, cliffhangers...).
- Chaque slide = une unité complète de sens. Le lecteur doit comprendre la slide sans lire la précédente.

STRUCTURE:
- ADAPTE-TOI au hook fourni. Si le hook est de type "Les X signes/erreurs/raisons que...", utilise un format LISTE NUMÉROTÉE (1. ..., 2. ..., etc.), chaque numéro AU DÉBUT de sa propre slide.
- Si le hook est de type narratif/story, utilise un arc narratif avec tension et révélation.
- ANALYSE tes posts performants pour identifier TA structure préférée et reproduis-la.
- Slide 1 = HOOK (texte exact fourni — NE PAS le modifier). Dernière slide = CTA.

NOMBRE DE SLIDES: ${formattingStats.hasData ? `${formattingStats.avgSlideCount} slides (basé sur tes posts: fourchette ${formattingStats.minSlideCount}-${formattingStats.maxSlideCount}).` : '7-8.'}

TEXTE PAR SLIDE (slides 2 à avant-dernière): ${formattingStats.hasData ? `Vise ~${formattingStats.avgBodyChars} caractères par slide (max ~${formattingStats.maxBodyChars + 20} chars). C'est TON rythme.` : 'Adapte la longueur du texte au contenu — chaque slide doit être lisible sur une image TikTok.'}
- Répartis le contenu uniformément. Aucune slide ne doit avoir 3x plus de texte qu'une autre.

CTA (DERNIÈRE SLIDE):
Call To Action lié à: "${leadMagnet}"
${formattingStats.hasData ? `- LONGUEUR CTA: Tes CTA font en moyenne ~${formattingStats.avgCtaChars} caractères (max observé: ${formattingStats.maxCtaChars}). RESPECTE cette longueur — c'est ton style. ${formattingStats.avgCtaChars > 150 ? "Tu écris des CTA LONGS et détaillés — reproduis exactement cette richesse." : formattingStats.avgCtaChars > 80 ? "Tu écris des CTA de taille moyenne — ni trop courts ni trop longs." : "Tu écris des CTA COURTS et percutants — ne surcharge pas."}` : '- Le CTA est CRUCIAL pour la conversion. Il peut être aussi long que nécessaire.'}
- INSPIRE-TOI FORTEMENT de tes CTA qui ont fonctionné — tu peux reprendre presque la même structure et les mêmes formulations en adaptant au sujet du carrousel.
${(() => {
    // Extract CTA patterns from viral posts
    const ctaExamples: string[] = [];
    for (const vp of viralPosts.slice(0, 5)) {
        try {
            const vSlides = JSON.parse(vp.post.slides || '[]') as Slide[];
            if (vSlides.length > 0) {
                const lastSlide = vSlides[vSlides.length - 1];
                if (lastSlide.text) ctaExamples.push(`"${lastSlide.text}" (${vp.views.toLocaleString()} vues)`);
            }
        } catch { /* skip */ }
    }
    return ctaExamples.length > 0
        ? `- TES CTA QUI ONT PERFORMÉ (reprends ce style, cette structure, cette énergie):\n${ctaExamples.map(c => `  → ${c}`).join('\n')}`
        : `- Il doit sonner comme ${authority}, pas comme un template.`;
})()}
- Crée un sentiment de "j'ai besoin de ça MAINTENANT."

DESCRIPTION:
Génère aussi une description TikTok/Instagram pour le post.
- La description COMPLÈTE le carrousel, ne le répète pas. Crée de l'urgence ou de la curiosité.
${descriptionStyleContext ? `- Voici des exemples de descriptions qui ont bien fonctionné pour te donner le ton général:\n${descriptionStyleContext}\n- Tu peux t'en inspirer LIBREMENT: garde le même ton et la même personnalité, mais tu as carte blanche sur la STRUCTURE, la LONGUEUR, et l'APPROCHE. Chaque description doit être UNIQUE et adaptée au contenu du carrousel.` : '- Écris une description naturelle qui ressemble à ce que tu posterais vraiment.'}
- La description doit rester COHÉRENTE avec le personnage de ${authority} (même registre de langue, même énergie globale).
- OBLIGATOIRE: Les TICS DE LANGAGE du créateur s'appliquent AUSSI à la description. Ce sont ses mots signature — ils doivent apparaître naturellement dans la description comme dans les slides.
- Tu es LIBRE de varier:
  * La longueur (courte et percutante OU plus développée)
  * La structure (question, affirmation, storytelling, interpellation directe, etc.)
  * Le style (mystérieux, direct, provocateur, informatif, personnel...)
  * L'utilisation d'émojis (tu peux en mettre plus, moins, ou différemment selon le post)
- L'OBJECTIF: que chaque description soit mémorable et donne envie de swiper, PAS qu'elle ressemble aux précédentes.
- N'inclus PAS de hashtags (ajoutés automatiquement).

--- CONTRAINTES ---
- INTERDIT: le caractère flèche '→'
${narrativeContext}
${uniquenessContext}

--- FORMAT DE SORTIE ---
Retourne UNIQUEMENT un objet JSON:
{
    "slides": [
        { "slide_number": 1, "text": "TEXTE EXACT du hook fourni", "intention": "Hook" },
        { "slide_number": 2, "text": "texte slide...", "intention": "Tension" },
        ...
    ],
    "description": "La description générée"
}`;
        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: [{ type: "text" as const, text: carouselSystemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{ role: "user", content: `Hook: "${hook}". Génère un carrousel viral optimal (7-8 slides) ET une description assortie. Inspire-toi de l'analyse de tes posts performants: garde la même voix et le même style, mais apporte un angle NOUVEAU et des idées FRAÎCHES.` }]
        });
        const text = (msg.content[0] as any).text;
        const result = extractJSON(text);
        slides = result.slides;

        // ===== POST-GENERATION VALIDATION =====

        // 0. Strip em-dashes from all generated text
        for (const s of slides) {
            s.text = stripEmDashes(s.text);
            if (s.intention) s.intention = stripEmDashes(s.intention);
        }

        // 1. Force first slide to match hook exactly
        if (slides.length > 0) {
            slides[0].text = hook;
        }

        // 2. Validate slide count (target 7-8, accept 6-9)
        if (slides.length < 6) {
        } else if (slides.length > 9) {
            slides = slides.slice(0, 9);
        }

        // 3. Fix orphaned numbers — if a slide ends with a lonely number like "2." or "😊 3.",
        // move it to the beginning of the next slide
        for (let i = 0; i < slides.length - 1; i++) {
            const text = slides[i].text;
            // Match patterns like "... 2.", "...😊 3.", "... 4." at end of text
            const orphanMatch = text.match(/\s*[\p{Emoji}\s]*(\d+)\.\s*$/u);
            if (orphanMatch) {
                const number = orphanMatch[1];
                // Remove the orphaned number from current slide
                slides[i].text = text.substring(0, text.length - orphanMatch[0].length).trim();
                // Prepend to next slide if it doesn't already start with this number
                const nextText = slides[i + 1].text;
                if (!nextText.startsWith(`${number}.`)) {
                    slides[i + 1].text = `${number}. ${nextText}`;
                }
            }
        }

        // Narrative consistency is enforced via the system prompt (narrativeFacts + NEVER CONTRADICT)
        // No separate validation call needed — saves ~500 tokens per carousel

        // 4. Append hashtags (no debug message in production)
        let aiDescription = stripEmDashes(result.description || "");
        if (defaultHashtags && defaultHashtags.trim() !== '') {
            aiDescription += `\n\n${defaultHashtags}`;
        }
        description = aiDescription;

    } catch (e: any) {
        return { error: `Erreur API: ${e.message}` };
    }

    // ... (image matching logic remains same)

    // ... (inside image matching logic)
    // 2. Fetch Candidate Images
    // Logic: exclude images utilized in last 15 posts (strict diversity)
    // ✅ PERF: Fetch lastPosts and ALL candidate images in parallel, then filter in-memory
    const [lastPosts, allImages] = await Promise.all([
        prisma.post.findMany({
            where: { userId: finalUserId },
            orderBy: { createdAt: 'desc' },
            take: 15,
            select: { slides: true }
        }),
        prisma.image.findMany({
            where: {
                // When a specific collection is selected, don't filter by userId (collections are shared)
                // When "all" is selected, only show the user's own images
                ...(collectionId && collectionId !== 'all'
                    ? { collections: { some: { id: collectionId } } }
                    : { userId: finalUserId }
                )
            },
            select: { id: true, humanId: true, descriptionLong: true, keywords: true, mood: true, style: true, colors: true, qualityScore: true, storageUrl: true }
        })
    ]);

    const usedImageIds = new Set<string>();
    lastPosts.forEach(p => {
        try {
            const s = JSON.parse(p.slides || '[]') as Slide[];
            s.forEach(slide => {
                if (slide.image_id) usedImageIds.add(slide.image_id);
            });
        } catch (e) {
            // ignore
        }
    });

    // Filter out recently used images in-memory (avoids a second DB query)
    const images = allImages.filter(img => !usedImageIds.has(img.id));

    if (images.length === 0) {
        return { slides: slides, description, warning: "Pas assez d'images disponibles dans cette collection (ou filtre anti-répétition activé)." };
    }

    // 3. Pre-filter by relevance + quality, then match with Claude
    try {
        const slidesText = slides.map(s =>
            `Slide ${s.slide_number}: "${s.text}" [Intention: ${s.intention}]`
        ).join('\n');

        // Build context keywords from all slides (hook text + slide texts)
        const allSlideText = slides.map(s => s.text).join(' ').toLowerCase();
        const contextWords = allSlideText
            .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s]/gi, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);
        const contextSet = new Set(contextWords);

        // Score each image: relevance (keywords + description match) × quality
        const scored = images.map(img => {
            let relevance = 0;

            // Keyword matching (strongest signal)
            try {
                const imgKeywords: string[] = JSON.parse(img.keywords || '[]');
                for (const kw of imgKeywords) {
                    const kwLower = kw.toLowerCase();
                    // Exact keyword found in slide text
                    if (allSlideText.includes(kwLower)) relevance += 3;
                    // Partial match (keyword word found in context)
                    else if ([...contextSet].some(w => kwLower.includes(w) || w.includes(kwLower))) relevance += 1;
                }
            } catch { /* ignore parse errors */ }

            // Description matching (weaker signal, broader coverage)
            const descWords = (img.descriptionLong || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
            for (const w of descWords) {
                if (contextSet.has(w)) relevance += 0.5;
            }

            // Mood bonus: boost images whose mood relates to slide intentions
            const mood = (img.mood || '').toLowerCase();
            const intentions = slides.map(s => (s.intention || '').toLowerCase());
            if (intentions.some(i => mood.includes(i) || i.includes(mood))) relevance += 2;

            const quality = img.qualityScore ?? 5;
            // Combined score: relevance weighted heavily, quality as multiplier
            const combined = (relevance + 1) * (quality / 10);

            return { ...img, _relevance: relevance, _quality: quality, _score: combined };
        });

        // Sort by combined score (relevance × quality), take top 50
        scored.sort((a, b) => b._score - a._score);
        const preFiltered = scored.slice(0, 50);

        // Shuffle within the top 50 for variety (avoid always picking same images)
        for (let i = preFiltered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [preFiltered[i], preFiltered[j]] = [preFiltered[j], preFiltered[i]];
        }
        const candidateImages = preFiltered;

        const imagesText = candidateImages.map(i =>
            `ID: ${i.id} | Quality: ${i.qualityScore ?? 5}/10 | Desc: ${i.descriptionLong} | Keywords: ${i.keywords} | Mood: ${i.mood || 'N/A'} | Style: ${i.style || 'N/A'} | Colors: ${i.colors || 'N/A'}`
        ).join('\n---\n');

        const matchingPrompt = `You are a visual director for viral TikTok carousels. Match the BEST image to each slide.

MATCHING CRITERIA (in order of priority):
1. **Image Quality**: STRONGLY prefer images with Quality score 7+/10. Avoid images below 5/10 unless no alternative exists.
2. **Emotional Match**: The image mood MUST match the slide intention:
   - Hook slides -> Bold, eye-catching, high-contrast images
   - Tension slides -> Dark, mysterious, intriguing images
   - Value slides -> Clean, clear, trustworthy images
   - CTA slides -> Warm, inviting, personal images
3. **Visual Storytelling**: Images should create a VISUAL PROGRESSION through the carousel. Don't use visually similar images back-to-back.
4. **Content Relevance**: Image description/keywords should relate to the slide text topic.
5. **Color Cohesion**: Prefer images that share a similar color palette for visual consistency across the carousel.

CONSTRAINTS:
- Each slide MUST have a UNIQUE image ID. NO duplicates.
- If no image fits well, pick the least-bad option — NEVER leave a slide without an image.

Return ONLY a JSON object: { "1": "image-id", "2": "image-id", ... }

SLIDES:
${slidesText}

AVAILABLE IMAGES:
${imagesText}`;

        const msg = await client.messages.create({
            model: HAIKU_MODEL, // Trivial mapping task — Haiku is sufficient
            max_tokens: 1024,
            messages: [{ role: "user", content: matchingPrompt }]
        });
        const matchText = (msg.content[0] as any).text;
        const mapping = extractJSON(matchText);

        // Apply mapping with uniqueness enforcement + fallback for unmatched slides
        const usedInThisCarousel = new Set<string>();
        const imageMap = new Map(candidateImages.map(i => [i.id, i]));

        slides = slides.map(s => {
            let imgId = mapping[s.slide_number.toString()] || mapping[s.slide_number];

            // Enforce uniqueness — if duplicate, find next best unused image
            if (!imgId || usedInThisCarousel.has(imgId) || !imageMap.has(imgId)) {
                // Fallback: pick first unused candidate image
                const fallback = candidateImages.find(i => !usedInThisCarousel.has(i.id));
                imgId = fallback?.id || null;
            }

            if (imgId) usedInThisCarousel.add(imgId);

            const img = imgId ? (imageMap.get(imgId) || images.find(i => i.id === imgId)) : null;
            return {
                ...s,
                image_id: img?.id,
                image_url: img?.storageUrl
            };
        });

    } catch (e) {
        console.error("Image matching failed:", e);
        // Fallback: assign images sequentially rather than returning blank slides
        const fallbackImages = images.slice(0, slides.length);
        slides = slides.map((s, idx) => ({
            ...s,
            image_id: fallbackImages[idx]?.id,
            image_url: fallbackImages[idx]?.storageUrl
        }));
    }

    return { slides: slides, description };
}

export async function saveCarousel(hook: string, slides: Slide[], description: string, status: 'created' | 'draft' = 'created', userId?: string, editorData?: string) {
    // If userId is provided (API), use it. Otherwise, get from session (UI)
    let finalUserId: string;
    if (userId) {
        finalUserId = userId;
    } else {
        const session = await auth();
        if (!session?.user?.id) return { error: 'Unauthorized' };
        finalUserId = session.user.id;
    }

    try {
        const activeProfileId = await getActiveProfileId(finalUserId);
        if (!activeProfileId) return { error: 'No active profile found. Please select a profile first.' };

        // [NEW] 1. Check for Duplicate Hook (within same profile)
        // Exclude 'idea' status — ideas are just saved hooks without content,
        // and should be upgradeable to drafts/posts with the same hookText.
        const existingPost = await prisma.post.findFirst({
            where: {
                userId: finalUserId,
                profileId: activeProfileId,
                hookText: hook,
                status: { notIn: ['idea'] }
            }
        });

        if (existingPost) {
            return { error: 'Un post avec ce hook existe déjà.' };
        }

        // [NEW] 2. Check for Duplicate Images in Slides
        const imageIds = new Set<string>();
        for (const slide of slides) {
            if (slide.image_id) {
                if (imageIds.has(slide.image_id)) {
                    return { error: 'Duplicate image detected within the post. Each slide must have a unique image.' };
                }
                imageIds.add(slide.image_id);
            }
        }

        const slidesJson = JSON.stringify(slides);

        const post = await prisma.post.create({
            data: {
                userId: finalUserId,
                profileId: activeProfileId, // [NEW] Link to active profile
                platform: 'tiktok', // default for generated
                hookText: hook,
                description: description,
                slideCount: slides.length,
                slides: slidesJson,
                editorData: editorData || null, // Full EditorSlide[] with styling
                status: status,
                publishedAt: status === 'created' ? new Date() : null,
                metrics: { create: {} }
            }
        });

        revalidatePath('/dashboard');
        return { success: true, postId: post.id };
    } catch (e) {
        console.error('[ERROR] Failed to save carousel:', e);
        return { error: 'Failed to save post' };
    }
}

export async function getDrafts() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { success: true, drafts: [] };

    try {
        const drafts = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                status: 'draft',
                profileId: activeProfileId
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                hookText: true,
                title: true,
                description: true,
                slides: true,
                editorData: true,
                slideCount: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Ensure dates are serializable (convert to ISO strings)
        const serializedDrafts = drafts.map(d => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString()
        }));

        return { success: true, drafts: serializedDrafts };
    } catch (e) {
        console.error('[SERVER] getDrafts error:', e);
        return { error: 'Failed to fetch drafts' };
    }
}

export async function saveHookAsIdea(hookProposal: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        await prisma.post.create({
            data: {
                userId: session.user.id,
                profileId: activeProfileId,
                platform: 'tiktok',
                hookText: hookProposal.hook,
                title: hookProposal.angle,
                description: hookProposal.reason,
                status: 'idea',
                slides: '[]',
                metrics: { create: {} }
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to save idea' };
    }
}

export async function getSavedIdeas() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { success: true, ideas: [] };

    try {
        const ideas = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                status: 'idea',
                profileId: activeProfileId
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, ideas };
    } catch (e) {
        return { error: 'Failed to fetch ideas' };
    }
}

// ===== COMPETITOR REMIX =====
// Takes a competitor's viral post and generates hooks adapted to user's persona
export async function remixCompetitorPost(competitorPostText: string, competitorViews: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        const [clientRes, profile, insights] = await Promise.all([
            getAnthropicClient(session.user.id),
            prisma.profile.findUnique({ where: { id: activeProfileId } }),
            getCachedInsights(activeProfileId, '').catch(() => null)
        ]);

        const client = clientRes.client;
        const authority = profile?.persona || "Expert Creator";
        const niche = (profile as any)?.niche || "General";
        const targetAudience = profile?.targetAudience || "General Audience";

        const narrativeFacts = insights?.narrativeFacts?.length
            ? `\nNARRATIVE FACTS (NEVER contradict): ${insights.narrativeFacts.join(', ')}`
            : '';

        const remixSystemPrompt = `Tu es un stratège de contenu pour "${authority}" dans la niche "${niche}", ciblant ${targetAudience}.
LANGUE: FRANÇAIS uniquement. Sonne HUMAIN, pas IA. Écris comme un vrai créateur français.
INTERDIT: Ne copie aucune phrase de l'original. N'utilise JAMAIS le caractère '→' ni les tirets longs (—/–).
${narrativeFacts}

Génère 3 hooks REMIXÉS qui: reprennent le MÊME concept viral, l'adaptent à ta persona et audience, sont COMPLÈTEMENT ORIGINAUX.
JSON UNIQUEMENT: [{"angle":"Concept","hook":"Texte","reason":"Pourquoi ça marche","type":"remix"}]`;

        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: [{ type: "text" as const, text: remixSystemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{
                role: "user",
                content: `Post viral concurrent (${competitorViews.toLocaleString()} vues):
"${competitorPostText}"

Génère 3 hooks remixés pour ${authority}.`
            }]
        });

        const text = (msg.content[0] as any).text;
        const hooks = extractJSON(text);
        for (const h of hooks) { if (h.hook) h.hook = stripEmDashes(h.hook); if (h.angle) h.angle = stripEmDashes(h.angle); if (h.reason) h.reason = stripEmDashes(h.reason); }
        return { hooks };
    } catch (e: any) {
        return { error: `Erreur: ${e.message}` };
    }
}

// ===== PREDICTIVE SCORING =====
// Scores a carousel BEFORE publication based on historical performance patterns
export async function scoreCarouselBeforePublish(hookText: string, slides: Slide[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        const [clientRes, topPosts, insights] = await Promise.all([
            getAnthropicClient(session.user.id),
            // Get top 20 posts with their metrics for pattern analysis
            prisma.metrics.findMany({
                where: { post: { profileId: activeProfileId, status: { not: 'draft' } } },
                take: 20,
                orderBy: { views: 'desc' },
                include: { post: { select: { hookText: true, slideCount: true, description: true } } }
            }),
            getCachedInsights(activeProfileId, '').catch(() => null)
        ]);

        const client = clientRes.client;
        const allSlideText = slides.map(s => `Slide ${s.slide_number}: "${s.text}" [${s.intention}]`).join('\n');

        const topPostsContext = topPosts.length > 0
            ? topPosts.slice(0, 10).map(m =>
                `- Hook: "${m.post.hookText}" | Slides: ${m.post.slideCount} | Views: ${m.views.toLocaleString()} | Likes: ${m.likes}`
            ).join('\n')
            : "No historical data yet.";

        const avgViews = topPosts.length > 0
            ? Math.round(topPosts.reduce((sum, m) => sum + m.views, 0) / topPosts.length)
            : 0;

        const insightsContext = insights?.bestHookPatterns
            ? `Best patterns: ${insights.bestHookPatterns.map(p => p.pattern).join(', ')}`
            : '';

        const scoreSystemPrompt = `Tu es un analyste de performance TikTok. Évalue les carrousels AVANT publication.
IMPORTANT: Dans TOUS les textes (improvements, strengths, formattingIssues), n'utilise JAMAIS de tirets longs (—) ou moyens (–). Utilise uniquement des tirets courts (-), des virgules ou des points.
LANGUE: Réponds UNIQUEMENT en FRANÇAIS.

Évalue sur 6 critères (chaque /20, total /120 puis normalisé à /100):
1. hookPower (/20): Stoppe le scroll ? Patterns viraux prouvés ?
2. retentionFlow (/20): Cliffhangers et boucles ouvertes forcent le swipe ?
3. textQuality (/20): Humain, authentique, pas IA ? Équilibré entre slides ?
4. valueDensity (/20): Contenu actionnable ?
5. ctaStrength (/20): Convertit en followers/engagement ?
6. slideFormatting (/20): Lisibilité TikTok — texte trop long (30+ mots), slides vides (<3 mots), phrases coupées, numérotation orpheline (numéro seul en fin de slide, pas les listes "1. ...").

JSON UNIQUEMENT:
{"scores":{"hookPower":16,"retentionFlow":14,"textQuality":17,"valueDensity":15,"ctaStrength":12,"slideFormatting":18},"total":74,"prediction":"above_average|average|below_average","estimatedViews":"8000-12000","improvements":["suggestion 1"],"formattingIssues":["Slide 3: issue"],"strengths":["point fort 1"]}`;

        const msg = await withRetry(() => client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: [{ type: "text" as const, text: scoreSystemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{
                role: "user",
                content: `HISTORIQUE DES TOP PERFORMERS:
${topPostsContext}

Vues moyennes des top posts: ${avgViews.toLocaleString()}
${insightsContext}

CARROUSEL À ÉVALUER:
Hook: "${hookText}"
${allSlideText}`
            }]
        }));

        const scoreText = (msg.content[0] as any).text;
        const score = extractJSON(scoreText);

        // Normalize total to /100 if 6 criteria returned (sum is /120)
        if (score && score.scores) {
            const rawSum = Object.values(score.scores).reduce((sum: number, v: any) => sum + (typeof v === 'number' ? v : 0), 0);
            if (rawSum > 100) {
                score.total = Math.round((rawSum / 120) * 100);
            } else if (!score.total) {
                score.total = rawSum;
            }
        }

        // Strip em-dashes from all text fields in score
        if (score) {
            if (score.improvements) score.improvements = score.improvements.map((s: string) => stripEmDashes(s));
            if (score.strengths) score.strengths = score.strengths.map((s: string) => stripEmDashes(s));
            if (score.formattingIssues) score.formattingIssues = score.formattingIssues.map((s: string) => stripEmDashes(s));
        }

        return { success: true, score };
    } catch (e: any) {
        console.error("Scoring failed:", e);
        return { error: 'Scoring unavailable' };
    }
}

// ===== IMPROVE FROM SCORE =====
// Takes the current carousel + predictive score improvements and regenerates improved slides
export async function improveCarouselFromScore(
    hookText: string,
    currentSlides: Slide[],
    improvements: string[],
    scores: Record<string, number>
) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        const [clientRes, profile, insights, topPosts, recentPosts] = await Promise.all([
            getAnthropicClient(session.user.id),
            prisma.profile.findUnique({ where: { id: activeProfileId } }),
            getCachedInsights(activeProfileId, '').catch(() => null),
            // Fetch top posts for linguistic fingerprint
            prisma.metrics.findMany({
                where: {
                    post: { profileId: activeProfileId, status: { not: 'draft' } },
                    views: { gte: 1 }
                },
                take: 20,
                orderBy: { views: 'desc' },
                include: { post: true }
            }),
            // Fetch recent posts for more style data
            prisma.post.findMany({
                where: {
                    profileId: activeProfileId,
                    status: { in: ['created', 'draft'] },
                    slides: { not: '[]' }
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { slides: true, hookText: true }
            })
        ]);

        const client = clientRes.client;
        const authority = profile?.persona || "Expert Creator";
        const targetAudience = profile?.targetAudience || "General Audience";

        // Compute the creator's linguistic fingerprint for style-consistent improvements
        const linguisticFingerprint = computeLinguisticFingerprint(topPosts, recentPosts);

        const currentSlidesText = currentSlides.map(s =>
            `Slide ${s.slide_number} [${s.intention}]: "${s.text}"`
        ).join('\n');

        const narrativeFacts = insights?.narrativeFacts?.length
            ? `\nNARRATIVE FACTS (NEVER contradict): ${insights.narrativeFacts.join(', ')}`
            : '';

        // Find the weakest criteria to focus on
        const weakest = Object.entries(scores)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 2)
            .map(([k]) => k);

        const improveSystemPrompt = `Tu es un optimiseur de contenu viral pour "${authority}", ciblant ${targetAudience}.
LANGUE: FRANÇAIS uniquement. Tu tutoies. Tu parles comme un vrai créateur français, naturel, direct.
PONCTUATION INTERDITE: N'utilise JAMAIS de tirets longs (—) ni de tirets moyens (–). Utilise uniquement des tirets courts (-), des virgules, ou des points.
${linguisticFingerprint ? `
${linguisticFingerprint}
RÈGLE CRITIQUE: Les améliorations DOIVENT respecter l'empreinte linguistique ci-dessus. Garde les mêmes tics de langage, la même ponctuation, le même registre, la même énergie. Le texte amélioré doit sonner EXACTEMENT comme le créateur, pas comme une IA.` : ''}

Règles de réécriture:
- Slide 1 = hook exact (ne pas modifier)
- Garder le même nombre de slides
- Ne pas changer les images
- Sonner HUMAIN, pas IA
- PRÉSERVER la structure existante (listes numérotées ou flux narratif)
- Chaque slide = unité complète de sens

JSON UNIQUEMENT (tableau de slides):
[{"slide_number":1,"text":"hook exact","intention":"Hook"},{"slide_number":2,"text":"texte amélioré","intention":"Tension"}]`;

        const msg = await withRetry(() => client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: [{ type: "text" as const, text: improveSystemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{
                role: "user",
                content: `CARROUSEL ACTUEL (à améliorer):
Hook: "${hookText}"
${currentSlidesText}

ANALYSE DU SCORE PRÉDICTIF:
${Object.entries(scores).map(([k, v]) => `- ${k}: ${v}/20`).join('\n')}
Points faibles: ${weakest.join(', ')}

AMÉLIORATIONS SPÉCIFIQUES REQUISES:
${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}
${narrativeFacts}

Réécris les slides en appliquant TOUTES les améliorations. Concentre-toi sur: ${weakest.join(', ')}. Garde ${currentSlides.length} slides, hook exact: "${hookText}".`
            }]
        }));

        const text = (msg.content[0] as any).text;
        const improvedSlides: { slide_number: number; text: string; intention: string }[] =
            extractJSON(text);

        // Merge: keep image assignments from current slides, take text/intention from improved
        const mergedSlides: Slide[] = improvedSlides.map((improved, idx) => {
            const original = currentSlides[idx];
            return {
                slide_number: improved.slide_number,
                text: stripEmDashes(improved.text),
                intention: stripEmDashes(improved.intention),
                image_id: original?.image_id,
                image_url: original?.image_url,
            };
        });

        return { success: true, slides: mergedSlides };
    } catch (e: any) {
        console.error("Improve from score failed:", e);
        return { error: `Erreur: ${e.message}` };
    }
}

export async function getPost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                hookText: true,
                title: true,
                description: true,
                slides: true,
                editorData: true,
                slideCount: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                publishedAt: true,
                platform: true,
                userId: true
            }
        });

        if (!post || post.userId !== session.user.id) return { error: 'Post not found' };

        // Serialize dates
        return {
            success: true,
            post: {
                ...post,
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
                publishedAt: post.publishedAt?.toISOString() || null
            }
        };
    } catch (e) {
        console.error('[SERVER] getPost error:', e);
        return { error: 'Failed to fetch post' };
    }
}

export async function updatePostContent(postId: string, slides: Slide[], description: string, status?: 'draft' | 'created', editorData?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const slidesJson = JSON.stringify(slides);

        await prisma.post.update({
            where: { id: postId, userId: session.user.id },
            data: {
                slides: slidesJson,
                editorData: editorData || null, // Full EditorSlide[] with styling
                slideCount: slides.length,
                description: description,
                ...(status && { status }),
                updatedAt: new Date()
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error('[ERROR] Failed to update post content:', e);
        return { error: 'Failed to update post content' };
    }
}

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.delete({
            where: {
                id: postId,
                userId: session.user.id // Ensure ownership
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete post' };
    }
}

export async function getUserPublishedPosts() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { success: true, posts: [] };

    try {
        const posts = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                profileId: activeProfileId,
                status: { notIn: ['draft', 'idea', 'rejected'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return { success: true, posts };
    } catch (e) {
        return { error: 'Failed to fetch posts' };
    }
}

export async function generateVariations(seedHook: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });

    const authority = profile?.persona || "Expert Creator";
    const targetAudience = (profile as any)?.targetAudience || "General Audience";
    const niche = (profile as any)?.niche || "General Content";
    const tone = "Authentic, engaging, and direct (French Language)";

    const systemPrompt = `
    You are an advanced AI Content Strategist.
    
    OBJECTIVE:
    Generate 3 NEW viral hook variations based on a specific "seed" concept.
    
    SEED CONCEPT:
    - Angle: "${seedHook.angle}"
    - Hook: "${seedHook.hook}"
    - Why it works: "${seedHook.reason}"
    
    LANGUAGE: 
    FRENCH (Français) ONLY. All output must be in perfect French.
    
    PERSONA & AUDIENCE:
    - Authority: ${authority}
    - Niche: ${niche}
    - Target: ${targetAudience}
    - Tone: ${tone}
    
    TASK:
    Create 3 variations that explore this SAME concept but with different framings:
    1. Variation 1: More controversial/bold.
    2. Variation 2: More curiosity-driven (Gap Theory).
    3. Variation 3: A direct benefit/outcome focus.
    
    CONSTRAINTS:
    - FORBIDDEN: Do NOT use the arrow character '→'.
    - Keep it short and punchy.
    
    OUTPUT FORMAT (JSON Only):
    [
        {
            "angle": "Variation Name",
            "hook": "The actual text",
            "reason": "How this varies from the seed.",
            "type": "optimized"
        }
    ]
    `;

    try {
        const { client: anthropic } = await getAnthropicClient(session.user.id);

        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }],
            messages: [{ role: "user", content: "Generate 3 variations." }]
        });

        const text = (msg.content[0] as any).text;
        const hooks = extractJSON(text);
        for (const h of hooks) { if (h.hook) h.hook = stripEmDashes(h.hook); if (h.angle) h.angle = stripEmDashes(h.angle); if (h.reason) h.reason = stripEmDashes(h.reason); }
        return { hooks };
    } catch (e: any) {
        console.error("Variation Generation Error:", e);
        return { error: e.message };
    }
}
