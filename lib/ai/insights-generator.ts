'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

// Strip GPT-style long dashes from all text
function deepStripEmDashes(obj: any): any {
    if (typeof obj === 'string') return obj.replace(/[\u2014\u2015\u2E3A\u2E3B\uFE58\u2013\uFE32\uFE63]/g, '-').replace(/\u2192/g, '').replace(/\s*-{2,}\s*/g, ' - ');
    if (Array.isArray(obj)) return obj.map(deepStripEmDashes);
    if (obj && typeof obj === 'object') { const r: any = {}; for (const [k, v] of Object.entries(obj)) r[k] = deepStripEmDashes(v); return r; }
    return obj;
}

// TypeScript interface for insights structure
export interface ProfileInsightsData {
    bestHookPatterns: {
        pattern: string;
        examples: string[];
        avgScore: number;
        avgViews: number;
    }[];
    strongPoints: {
        category: string;
        avgScore: number;
        topTips: string[];
    }[];
    weakPoints: {
        category: string;
        avgScore: number;
        improvements: string[];
    }[];
    personaInsights: {
        effectiveTopics: string[];
        toneThatWorks: string;
        audienceReactions: string;
    };
    viralTriggers: string[];
    narrativeFacts: string[];
    conversionPatterns: {
        convertedHooks: string[];
        convertingAngles: string[];
        conversionTriggers: string[];
        avgViewsOnConverted: number;
        conversionRate: number;
    };
    // Deep analysis: what makes converted posts structurally different
    conversionDeepDive: {
        slideStructurePattern: string;   // How converted posts structure their slides
        productPlacementTechnique: string; // How/where product is mentioned in winning posts
        emotionalArc: string;            // Emotional journey: hook -> body -> CTA in posts that sell
        convertedVsViralDifference: string; // Key difference between posts that get views vs posts that sell
        ctaPatterns: string[];           // CTA formulations that led to conversions
    };
    // Cumulative learnings that persist across regenerations
    cumulativeLearnings: string[];
    metadata: {
        basedOnPostsCount: number;
        convertedPostsCount: number;
        generatedAt: string;
    };
}

/**
 * Generate comprehensive insights from analyzed posts using AI
 */
export async function generateProfileInsights(profileId: string, anthropicApiKey: string): Promise<ProfileInsightsData | null> {
    console.log(`🧠 Generating insights for profile ${profileId}...`);

    // 1. Fetch all analyzed posts with scores + converted posts (with slides for deep analysis)
    const [analyses, convertedPosts, previousInsights] = await Promise.all([
        prisma.contentAnalysis.findMany({
            where: {
                profileId,
                post: { status: { notIn: ['draft', 'rejected', 'idea'] } }
            },
            include: {
                post: {
                    include: { metrics: true }
                }
            },
            orderBy: { intelligentScore: 'desc' }
        }),
        prisma.post.findMany({
            where: { profileId, converted: true, status: { notIn: ['draft', 'rejected', 'idea'] } },
            include: { metrics: true, analysis: true },
            orderBy: { metrics: { views: 'desc' } },
            take: 20
        }),
        // Fetch previous insights to preserve cumulative learning
        prisma.profileInsights.findUnique({
            where: { profileId },
            select: { insights: true }
        })
    ]);

    if (analyses.length < 3) {
        console.log(`⚠️ Not enough analyzed posts (${analyses.length}/3 minimum)`);
        return null;
    }

    // Count total published posts for accurate conversion rate
    const totalPosts = await prisma.post.count({ where: { profileId, status: { notIn: ['draft', 'rejected', 'idea'] } } });
    const conversionRate = totalPosts > 0 ? (convertedPosts.length / totalPosts) * 100 : 0;
    const avgViewsOnConverted = convertedPosts.length > 0
        ? convertedPosts.reduce((sum, p) => sum + (p.metrics?.views || 0), 0) / convertedPosts.length
        : 0;

    console.log(`📊 Analyzing ${analyses.length} posts (${convertedPosts.length} converted)...`);

    // 2. Segment data
    const topPosts = analyses.filter(a => a.intelligentScore >= 70);
    const midPosts = analyses.filter(a => a.intelligentScore >= 50 && a.intelligentScore < 70);
    const lowPosts = analyses.filter(a => a.intelligentScore < 50);

    // 3. Calculate category averages
    const avgHook = analyses.reduce((sum, a) => sum + a.qsHookTotal, 0) / analyses.length;
    const avgBody = analyses.reduce((sum, a) => sum + a.qsBodyTotal, 0) / analyses.length;
    const avgCta = analyses.reduce((sum, a) => sum + a.qsCtaTotal, 0) / analyses.length;
    const avgVisual = analyses.reduce((sum, a) => sum + a.qsVisualTotal, 0) / analyses.length;
    const avgMusic = analyses.reduce((sum, a) => sum + a.qsMusicTotal, 0) / analyses.length;
    const avgTiming = analyses.reduce((sum, a) => sum + a.qsTimingTotal, 0) / analyses.length;
    const avgPersona = analyses.reduce((sum, a) => sum + a.qsPersonaTotal, 0) / analyses.length;

    // 4. Build deep analysis data

    // Parse slides from converted posts for structural analysis
    const convertedWithSlides = convertedPosts.slice(0, 10).map(p => {
        let slides: { slide_number: number; text: string }[] = [];
        try { slides = JSON.parse((p as any).slides || '[]'); } catch { /* ignore */ }
        return { ...p, parsedSlides: slides };
    });

    // Parse slides from top posts (non-converted) for comparison
    const topNonConverted = analyses
        .filter(a => !convertedPosts.some(cp => cp.id === a.post.id))
        .slice(0, 5);
    const topWithSlides = topNonConverted.map(a => {
        let slides: { slide_number: number; text: string }[] = [];
        try { slides = JSON.parse((a.post as any).slides || '[]'); } catch { /* ignore */ }
        return { post: a.post, scores: a, parsedSlides: slides };
    });

    // Parse previous cumulative learnings to preserve across regenerations
    let previousLearnings: string[] = [];
    if (previousInsights?.insights) {
        try {
            const prev = JSON.parse(previousInsights.insights) as Partial<ProfileInsightsData>;
            previousLearnings = prev.cumulativeLearnings || [];
        } catch { /* ignore */ }
    }

    const truncHook = (text: string | null) => text ? (text.length > 100 ? text.slice(0, 100) + '...' : text) : '(vide)';

    // Build converted posts deep section (with full slide content)
    const convertedDeepSection = convertedWithSlides.length > 0 ? `
=== POSTS QUI ONT CONVERTI (${convertedPosts.length} posts ayant mene a une VENTE) ===
Taux de conversion global: ${conversionRate.toFixed(1)}% (${convertedPosts.length}/${totalPosts})
Vues moyennes sur posts convertis: ${Math.round(avgViewsOnConverted).toLocaleString()}

${convertedWithSlides.map((p, i) => `
--- POST CONVERTI #${i + 1} ---
Hook: "${truncHook(p.hookText)}"
Vues: ${p.metrics?.views?.toLocaleString() || 0} | Likes: ${p.metrics?.likes || 0} | Saves: ${p.metrics?.saves || 0} | Shares: ${p.metrics?.shares || 0}
Score IFS: ${p.analysis?.intelligentScore?.toFixed(1) || 'N/A'}/100 (Hook: ${p.analysis?.qsHookTotal?.toFixed(1) || '-'}/25, Body: ${p.analysis?.qsBodyTotal?.toFixed(1) || '-'}/20, CTA: ${p.analysis?.qsCtaTotal?.toFixed(1) || '-'}/10)
${p.conversionNote ? `Note du createur: "${p.conversionNote}"` : ''}
${p.parsedSlides.length > 0 ? `Slides (${p.parsedSlides.length}):
${p.parsedSlides.map(s => `  [${s.slide_number}] "${s.text}"`).join('\n')}` : 'Slides: non disponibles'}
Description: "${(p as any).description?.slice(0, 200) || 'aucune'}"
`).join('\n')}` : 'Aucun post converti tague.';

    // Build top performing NON-converted posts (for comparison)
    const topPerformersSection = `
=== TOP PERFORMERS NON-CONVERTIS (${topNonConverted.length} posts, score >= 70) ===
${topWithSlides.slice(0, 5).map((a, i) => `
--- TOP #${i + 1} (PAS de conversion) ---
Hook: "${truncHook(a.post.hookText)}"
Vues: ${a.post.metrics?.views?.toLocaleString() || 0} | Likes: ${a.post.metrics?.likes || 0}
Score IFS: ${a.scores.intelligentScore.toFixed(1)}/100 (Hook: ${a.scores.qsHookTotal.toFixed(1)}/25, Body: ${a.scores.qsBodyTotal.toFixed(1)}/20, CTA: ${a.scores.qsCtaTotal.toFixed(1)}/10)
${a.parsedSlides.length > 0 ? `Slides (${a.parsedSlides.length}):
${a.parsedSlides.map(s => `  [${s.slide_number}] "${s.text}"`).join('\n')}` : ''}
`).join('\n')}`;

    const lowPerformersSection = lowPosts.length > 0 ? `
=== FLOPS (${lowPosts.length} posts, score < 50) ===
${lowPosts.slice(0, 5).map(a => `- "${truncHook(a.post.hookText)}" -> ${a.post.metrics?.views?.toLocaleString() || 0} vues, IFS: ${a.intelligentScore.toFixed(1)}/100, Hook: ${a.qsHookTotal.toFixed(1)}/25`).join('\n')}
` : '';

    const previousLearningsSection = previousLearnings.length > 0 ? `
=== APPRENTISSAGES PRECEDENTS (a conserver et enrichir) ===
${previousLearnings.map(l => `- ${l}`).join('\n')}
` : '';

    const prompt = `Tu es un analyste expert en contenu viral TikTok et en conversion. Analyse EN PROFONDEUR ces donnees de performance et identifie des patterns ACTIONNABLES en FRANCAIS.

TON OBJECTIF PRINCIPAL: Comprendre POURQUOI certains posts CONVERTISSENT (menent a une vente) et d'autres non, meme s'ils font des vues. La viralite sans conversion ne sert a rien.

${convertedDeepSection}

${topPerformersSection}

${lowPerformersSection}

MOYENNES GLOBALES (${analyses.length} posts analyses):
Hook: ${avgHook.toFixed(1)}/25 | Body: ${avgBody.toFixed(1)}/20 | CTA: ${avgCta.toFixed(1)}/10 | Visual: ${avgVisual.toFixed(1)}/15 | Music: ${avgMusic.toFixed(1)}/10 | Timing: ${avgTiming.toFixed(1)}/10 | Persona: ${avgPersona.toFixed(1)}/10

${previousLearningsSection}

ANALYSE DEMANDEE:
1. Compare les posts convertis vs non-convertis: qu'est-ce qui fait la difference? (structure des slides, hook, CTA, ton, placement produit, arc emotionnel)
2. Identifie les PATTERNS DE HOOKS qui performent et ceux qui floppent
3. Analyse la STRUCTURE DES SLIDES des posts convertis: comment le contenu est-il organise? Quelle progression?
4. Identifie comment le PRODUIT est integre dans les posts qui vendent vs ceux qui font juste des vues
5. Extrais les FAITS NARRATIFS du createur (elements biographiques, histoire personnelle)
6. ${previousLearnings.length > 0 ? 'PRESERVE et ENRICHIS les apprentissages precedents. Ajoute de nouveaux insights sans perdre les anciens.' : 'Identifie les premiers apprentissages cles.'}

Retourne UNIQUEMENT ce JSON:

{
  "bestHookPatterns": [
    { "pattern": "Nom du pattern", "examples": ["exemple1", "exemple2"], "avgScore": 8.5, "avgViews": 50000 }
  ],
  "strongPoints": [
    { "category": "Hook/Body/CTA/Visual/Timing/Persona", "avgScore": 12.5, "topTips": ["conseil actionnable 1", "conseil actionnable 2"] }
  ],
  "weakPoints": [
    { "category": "Hook/Body/CTA/Visual/Timing/Persona", "avgScore": 4.2, "improvements": ["amelioration concrete 1", "amelioration concrete 2"] }
  ],
  "personaInsights": {
    "effectiveTopics": ["sujet1", "sujet2"],
    "toneThatWorks": "description precise du ton qui fonctionne",
    "audienceReactions": "ce qui declenche l'engagement de l'audience"
  },
  "viralTriggers": ["trigger1", "trigger2", "trigger3"],
  "narrativeFacts": ["fait biographique 1", "fait biographique 2"],
  "conversionPatterns": {
    "convertedHooks": ["hook exact qui a converti 1", "hook exact qui a converti 2"],
    "convertingAngles": ["angle/approche qui convertit 1", "angle 2"],
    "conversionTriggers": ["declencheur d'achat 1", "declencheur 2"],
    "avgViewsOnConverted": ${Math.round(avgViewsOnConverted)},
    "conversionRate": ${parseFloat(conversionRate.toFixed(1))}
  },
  "conversionDeepDive": {
    "slideStructurePattern": "Description precise de la structure de slides des posts convertis (ex: hook provocateur -> probleme identifie -> agitation -> solution subtile -> preuve -> CTA)",
    "productPlacementTechnique": "Comment le produit est integre: mention directe slide X, lien bio, reponse commentaire, derniere slide, integration narrative...",
    "emotionalArc": "Arc emotionnel des posts qui vendent: quelle emotion au debut, quelle progression, quel etat a la fin qui pousse a l'action",
    "convertedVsViralDifference": "La difference CLE entre posts viraux qui ne vendent pas et posts qui vendent: qu'est-ce qui manque aux viraux?",
    "ctaPatterns": ["formulation CTA qui a converti 1", "formulation CTA 2"]
  },
  "cumulativeLearnings": [
    "Apprentissage 1: regle concrete et actionnable decouverte",
    "Apprentissage 2: pattern confirme par les donnees",
    "Apprentissage 3: erreur a ne plus jamais faire"
  ]
}

REGLES:
1. 'narrativeFacts': UNIQUEMENT des faits biographiques/historiques du createur mentionnes dans les posts. Pas d'opinions.
2. 'conversionDeepDive': analyse STRUCTURELLE en profondeur. Compare slide par slide les posts convertis vs non-convertis. Si aucun post converti, decris ce qui DEVRAIT etre fait pour convertir.
3. 'cumulativeLearnings': ${previousLearnings.length > 0 ? `REPRENDS les ${previousLearnings.length} apprentissages precedents, CONFIRME ou INFIRME-les avec les nouvelles donnees, et AJOUTE les nouveaux. Objectif: 8-15 apprentissages au total.` : 'Identifie 5-10 apprentissages cles issus de cette analyse.'}
4. Chaque apprentissage doit etre CONCRET et ACTIONNABLE (ex: "Les hooks avec suspense '...' font 3x plus de vues que les affirmations directes").
5. Retourne UNIQUEMENT le JSON, rien d'autre.`;

    try {
        // 5. Call Claude for pattern analysis
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: [{ type: "text" as const, text: prompt, cache_control: { type: "ephemeral" as const } }]
            }]
        });

        const text = (message.content[0] as any).text;
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const insightsRaw: Partial<ProfileInsightsData> = JSON.parse(cleanJson);
        const insights = deepStripEmDashes(insightsRaw) as Partial<ProfileInsightsData>;

        // 6. Merge cumulative learnings: keep previous ones not contradicted + new ones
        if (previousLearnings.length > 0 && (!insights.cumulativeLearnings || insights.cumulativeLearnings.length === 0)) {
            insights.cumulativeLearnings = previousLearnings;
        }

        // Ensure conversionDeepDive has defaults if AI didn't fill it
        if (!insights.conversionDeepDive) {
            insights.conversionDeepDive = {
                slideStructurePattern: '',
                productPlacementTechnique: '',
                emotionalArc: '',
                convertedVsViralDifference: '',
                ctaPatterns: []
            };
        }

        // 7. Add metadata
        const fullInsights: ProfileInsightsData = {
            ...insights as ProfileInsightsData,
            metadata: {
                basedOnPostsCount: analyses.length,
                convertedPostsCount: convertedPosts.length,
                generatedAt: new Date().toISOString()
            }
        };

        // 7. Cache in database
        await prisma.profileInsights.upsert({
            where: { profileId },
            create: {
                profileId,
                insights: JSON.stringify(fullInsights),
                basedOnPostsCount: analyses.length,
                lastUpdatedAt: new Date()
            },
            update: {
                insights: JSON.stringify(fullInsights),
                basedOnPostsCount: analyses.length,
                lastUpdatedAt: new Date()
            }
        });

        console.log(`✅ Insights generated and cached for profile ${profileId}`);
        return fullInsights;

    } catch (error) {
        console.error('❌ Failed to generate insights:', error);
        return null;
    }
}

/**
 * Get cached insights or generate new ones if needed
 */
export async function getCachedInsights(profileId: string, anthropicApiKey: string, forceRefresh = false): Promise<ProfileInsightsData | null> {
    const cached = await prisma.profileInsights.findUnique({
        where: { profileId }
    });

    const analyzedCount = await prisma.contentAnalysis.count({
        where: { profileId }
    });

    // Determine if refresh needed
    const cacheAge = cached ? Date.now() - cached.lastUpdatedAt.getTime() : Infinity;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const needsRefresh = forceRefresh
        || !cached
        || cacheAge > sevenDaysMs
        || analyzedCount > (cached.basedOnPostsCount + 5); // 5+ new analyses

    if (needsRefresh) {
        console.log(`🔄 Refreshing insights cache (force=${forceRefresh}, cached=${!!cached}, age=${Math.round(cacheAge / 1000 / 60 / 60)}h, newAnalyses=${analyzedCount - (cached?.basedOnPostsCount || 0)})`);
        // If no valid API key, return stale cache rather than null
        if (!anthropicApiKey) {
            if (cached) {
                console.log(`⚠️ No API key for refresh, returning stale cache`);
                return JSON.parse(cached.insights) as ProfileInsightsData;
            }
            return null;
        }
        const fresh = await generateProfileInsights(profileId, anthropicApiKey);
        // On refresh failure, return stale cache if available
        if (!fresh && cached) {
            console.log(`⚠️ Refresh failed, returning stale cache`);
            return JSON.parse(cached.insights) as ProfileInsightsData;
        }
        return fresh;
    }

    if (!cached) {
        return null;
    }

    console.log(`✅ Using cached insights (${cached.basedOnPostsCount} posts, ${Math.round(cacheAge / 1000 / 60 / 60)}h old)`);
    return JSON.parse(cached.insights) as ProfileInsightsData;
}

export async function renderInsightsAsMarkdown(insights: ProfileInsightsData): Promise<string> {
    const lines: string[] = [];

    // 1. CUMULATIVE LEARNINGS (highest priority - accumulated knowledge)
    if (insights.cumulativeLearnings?.length) {
        lines.push('## APPRENTISSAGES CLES');
        insights.cumulativeLearnings.forEach(l => lines.push(`- ${l}`));
        lines.push('');
    }

    // 2. Conversion deep dive (how posts that SELL are structured)
    const dd = insights.conversionDeepDive;
    if (dd && (dd.slideStructurePattern || dd.emotionalArc || dd.convertedVsViralDifference)) {
        lines.push('## COMMENT VENDRE (analyse structurelle)');
        if (dd.slideStructurePattern) lines.push(`Structure gagnante: ${dd.slideStructurePattern}`);
        if (dd.productPlacementTechnique) lines.push(`Placement produit: ${dd.productPlacementTechnique}`);
        if (dd.emotionalArc) lines.push(`Arc emotionnel: ${dd.emotionalArc}`);
        if (dd.convertedVsViralDifference) lines.push(`Viral vs Vente: ${dd.convertedVsViralDifference}`);
        if (dd.ctaPatterns?.length) lines.push(`CTA qui convertissent: ${dd.ctaPatterns.join(' | ')}`);
        lines.push('');
    }

    // 3. Conversion patterns (stats)
    const cp = insights.conversionPatterns;
    if (cp && (cp.convertedHooks?.length || cp.convertingAngles?.length || cp.conversionTriggers?.length)) {
        lines.push('## CONVERSION (donnees)');
        if (cp.conversionRate > 0) {
            lines.push(`Taux: ${cp.conversionRate.toFixed(1)}% | Vues moy.: ${Math.round(cp.avgViewsOnConverted).toLocaleString()}`);
        }
        if (cp.convertedHooks?.length) lines.push(`Hooks convertis: ${cp.convertedHooks.slice(0, 8).join(' | ')}`);
        if (cp.convertingAngles?.length) lines.push(`Angles: ${cp.convertingAngles.join(', ')}`);
        if (cp.conversionTriggers?.length) lines.push(`Declencheurs: ${cp.conversionTriggers.join(', ')}`);
        lines.push('');
    }

    // 4. Hook patterns
    if (insights.bestHookPatterns?.length) {
        lines.push('## HOOKS PERFORMANTS');
        insights.bestHookPatterns.slice(0, 8).forEach(p => {
            const exStr = p.examples?.length ? ` ex: "${p.examples[0]}"` : '';
            lines.push(`- ${p.pattern} (score ${p.avgScore.toFixed(1)}, ${Math.round(p.avgViews).toLocaleString()} vues)${exStr}`);
        });
        lines.push('');
    }

    // 5. Viral triggers
    if (insights.viralTriggers?.length) {
        lines.push(`## DECLENCHEURS VIRAUX\n${insights.viralTriggers.join(', ')}`);
        lines.push('');
    }

    // 6. Persona tone
    if (insights.personaInsights) {
        const pi = insights.personaInsights;
        lines.push('## PERSONA');
        if (pi.toneThatWorks) lines.push(`Ton: ${pi.toneThatWorks}`);
        if (pi.effectiveTopics?.length) lines.push(`Sujets: ${pi.effectiveTopics.join(', ')}`);
        if (pi.audienceReactions) lines.push(`Audience: ${pi.audienceReactions}`);
        lines.push('');
    }

    // 7. Narrative facts
    if (insights.narrativeFacts?.length) {
        lines.push('## FAITS NARRATIFS (ne jamais contredire)');
        insights.narrativeFacts.forEach(f => lines.push(`- ${f}`));
        lines.push('');
    }

    // 8. Anti-patterns
    if (insights.weakPoints?.length) {
        lines.push('## A EVITER');
        insights.weakPoints.slice(0, 3).forEach(w => {
            lines.push(`- ${w.category} (${w.avgScore.toFixed(1)}): ${w.improvements?.slice(0, 2).join('; ')}`);
        });
        lines.push('');
    }

    return lines.join('\n').trim();
}
