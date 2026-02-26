'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

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
    narrativeFacts: string[]; // [NEW] Immutable facts about the persona
    metadata: {
        basedOnPostsCount: number;
        generatedAt: string;
    };
}

/**
 * Generate comprehensive insights from analyzed posts using AI
 */
export async function generateProfileInsights(profileId: string, anthropicApiKey: string): Promise<ProfileInsightsData | null> {
    console.log(`🧠 Generating insights for profile ${profileId}...`);

    // 1. Fetch all analyzed posts with scores
    const analyses = await prisma.contentAnalysis.findMany({
        where: { profileId },
        include: {
            post: {
                include: { metrics: true }
            }
        },
        orderBy: { intelligentScore: 'desc' }
    });

    if (analyses.length < 3) {
        console.log(`⚠️ Not enough analyzed posts (${analyses.length}/3 minimum)`);
        return null;
    }

    console.log(`📊 Analyzing ${analyses.length} posts...`);

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

    // 4. Build AI prompt
    const prompt = `Analyze these TikTok post performances and identify actionable patterns in FRENCH.

TOP PERFORMERS (${topPosts.length} posts, score ≥ 70):
${topPosts.slice(0, 10).map(a => `
- Hook: "${a.post.hookText}"
- Views: ${a.post.metrics?.views?.toLocaleString() || 0}
- Scores: Hook=${a.qsHookTotal.toFixed(1)}/25, Body=${a.qsBodyTotal.toFixed(1)}/20, Visual=${a.qsVisualTotal.toFixed(1)}/15, CTA=${a.qsCtaTotal.toFixed(1)}/10
- Intelligent Score: ${a.intelligentScore.toFixed(1)}/100
`).join('\n')}

${lowPosts.length > 0 ? `
LOW PERFORMERS (${lowPosts.length} posts, score < 50):
${lowPosts.slice(0, 5).map(a => `
- Hook: "${a.post.hookText}"
- Views: ${a.post.metrics?.views?.toLocaleString() || 0}
- Scores: Hook=${a.qsHookTotal.toFixed(1)}/25, Body=${a.qsBodyTotal.toFixed(1)}/20
`).join('\n')}
` : ''}

CATEGORY AVERAGES (across all ${analyses.length} posts):
- Hook: ${avgHook.toFixed(1)}/25
- Body: ${avgBody.toFixed(1)}/20
- CTA: ${avgCta.toFixed(1)}/10
- Visual: ${avgVisual.toFixed(1)}/15
- Music: ${avgMusic.toFixed(1)}/10
- Timing: ${avgTiming.toFixed(1)}/10
- Persona: ${avgPersona.toFixed(1)}/10

TASK: Identify patterns and provide actionable insights in FRENCH. Output ONLY valid JSON:

{
  "bestHookPatterns": [
    {
      "pattern": "Questions provocatrices",
      "examples": ["Exemple 1", "Exemple 2"],
      "avgScore": 8.5,
      "avgViews": 50000
    }
  ],
  "strongPoints": [
    {
      "category": "Visual",
      "avgScore": 12.5,
      "topTips": ["Tes visuels colorés engagent plus", "Les contrastes forts fonctionnent"]
    }
  ],
  "weakPoints": [
    {
      "category": "CTA",
      "avgScore": 4.2,
      "improvements": ["Rendre le CTA plus visible", "Ajouter de l'urgence"]
    }
  ],
  "personaInsights": {
    "effectiveTopics": ["Lifestyle", "Motivation"],
    "toneThatWorks": "Direct et provocateur",
    "audienceReactions": "Forte engagement sur contenus émotionnels"
  },
    "audienceReactions": "Forte engagement sur contenus émotionnels"
  },
  "viralTriggers": ["Controverse", "Chiffres précis", "Questions"],
  "narrativeFacts": ["Est major de promo depuis la L1", "A redoublé son bac", "Expert en nutrition"]
}

IMPORTANT:
1. For 'narrativeFacts', extract ONLY hard facts about the creator's history/identity mentioned in the posts (e.g., "I quit my job", "I live in Bali"). Do NOT include opinions or advice.
2. Output ONLY the JSON, no explanation.`;

    try {
        // 5. Call Claude for pattern analysis
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [{ type: "text" as const, text: prompt, cache_control: { type: "ephemeral" as const } }]
            }]
        });

        const text = (message.content[0] as any).text;
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const insights: Partial<ProfileInsightsData> = JSON.parse(cleanJson);

        // 6. Add metadata
        const fullInsights: ProfileInsightsData = {
            ...insights as ProfileInsightsData,
            metadata: {
                basedOnPostsCount: analyses.length,
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
        return await generateProfileInsights(profileId, anthropicApiKey);
    }

    if (!cached) {
        return null;
    }

    console.log(`✅ Using cached insights (${cached.basedOnPostsCount} posts, ${Math.round(cacheAge / 1000 / 60 / 60)}h old)`);
    return JSON.parse(cached.insights) as ProfileInsightsData;
}
