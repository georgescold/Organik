'use server';

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

// ============= TYPES =============

export interface MacroAnalysisData {
    globalInsights: {
        alignmentScore: number; // 0-100: how well content aligns with product
        conversionPatterns: string[];
        keyFindings: string[];
    };
    profileBreakdowns: {
        profileId: string;
        displayName: string;
        username: string;
        alignmentScore: number;
        conversionRate: number; // % of posts that converted
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        suggestedAngles: {
            hook: string;           // Accroche prête à l'emploi, dans le style du compte
            angle: string;          // L'angle émotionnel / la façon d'amener vers le produit
            format: string;         // Format recommandé (ex: "carrousel 7 slides")
            productMention: string; // Comment/où intégrer le produit naturellement
            viralPotential: 'high' | 'medium';
        }[];
    }[];
    crossProfileComparison: {
        bestConverter: string;
        bestReach: string;
        whyBestConverts: string;
        synergies: string[];
    };
    actionPlan: {
        immediate: string[]; // This week
        shortTerm: string[]; // This month
        strategic: string[]; // Long term
    };
    metadata: {
        basedOnPostsCount: number;
        profileCount: number;
        generatedAt: string;
    };
}

// ============= GENERATOR =============

export async function generateMacroAnalysis(
    panelId: string,
    anthropicApiKey: string
): Promise<MacroAnalysisData | null> {
    console.log(`🧠 Generating macro analysis for panel ${panelId}...`);

    // 1. Fetch panel with product info
    const panel = await prisma.adminPanel.findUnique({
        where: { id: panelId },
        select: {
            id: true,
            name: true,
            productName: true,
            productUrl: true,
            targetAudience: true,
            positioning: true,
            productBible: true,
            selectedProfiles: {
                include: {
                    profile: {
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                            platform: true,
                            niche: true,
                            persona: true,
                            targetAudience: true,
                            followersCount: true,
                            likesCount: true,
                            videoCount: true,
                        }
                    }
                }
            }
        }
    });

    if (!panel) {
        console.log('❌ Panel not found');
        return null;
    }

    const profiles = panel.selectedProfiles.map(sp => sp.profile);

    if (profiles.length === 0) {
        console.log('⚠️ No profiles in panel');
        return null;
    }

    // 2. Fetch data per profile: posts, conversion stats, content analyses
    const profileDataPromises = profiles.map(async (profile) => {
        const [posts, analyses, insightsRecord] = await Promise.all([
            // Top 50 posts by views (compressed data)
            prisma.post.findMany({
                where: { profileId: profile.id },
                orderBy: { metrics: { views: 'desc' } },
                take: 50,
                select: {
                    id: true,
                    hookText: true,
                    description: true,
                    converted: true,
                    conversionNote: true,
                    publishedAt: true,
                    metrics: {
                        select: { views: true, likes: true, comments: true, shares: true, saves: true }
                    }
                }
            }),
            // ContentAnalysis averages
            prisma.contentAnalysis.aggregate({
                where: { profileId: profile.id },
                _avg: {
                    qualityScore: true,
                    performanceScore: true,
                    intelligentScore: true,
                    qsHookTotal: true,
                    qsBodyTotal: true,
                    qsCtaTotal: true,
                    qsVisualTotal: true,
                    qsPersonaTotal: true,
                },
                _count: true,
            }),
            // Cached insights
            prisma.profileInsights.findUnique({
                where: { profileId: profile.id },
                select: { insights: true }
            })
        ]);

        const totalPosts = posts.length;
        const convertedPosts = posts.filter(p => p.converted);
        const conversionRate = totalPosts > 0 ? (convertedPosts.length / totalPosts) * 100 : 0;

        // Parse cached insights summary
        let insightsSummary: string | null = null;
        if (insightsRecord?.insights) {
            try {
                const parsed = JSON.parse(insightsRecord.insights);
                insightsSummary = [
                    parsed.personaInsights?.toneThatWorks,
                    parsed.viralTriggers?.slice(0, 3)?.join(', '),
                    parsed.strongPoints?.slice(0, 2)?.map((s: any) => s.category)?.join(', '),
                ].filter(Boolean).join(' | ');
            } catch { /* ignore */ }
        }

        return {
            profile,
            posts,
            convertedPosts,
            conversionRate,
            analyses: analyses,
            insightsSummary,
            totalPosts,
        };
    });

    const profilesData = await Promise.all(profileDataPromises);

    // 3. Compute total posts for metadata
    const totalPostsCount = profilesData.reduce((sum, pd) => sum + pd.totalPosts, 0);

    // 4. Build compressed prompt data
    const profileBlocks = profilesData.map(pd => {
        const avgScores = pd.analyses._avg;
        const topPosts = pd.posts.slice(0, 5);
        const convertedExamples = pd.convertedPosts.slice(0, 3);

        return `
### @${pd.profile.username || pd.profile.displayName || 'N/A'}
- Niche: ${pd.profile.niche || 'N/A'} | Persona: ${pd.profile.persona?.slice(0, 100) || 'N/A'}
- Followers: ${pd.profile.followersCount.toLocaleString()} | Likes: ${pd.profile.likesCount.toLocaleString()}
- Posts analysés: ${pd.analyses._count} | Taux conversion: ${pd.conversionRate.toFixed(1)}% (${pd.convertedPosts.length}/${pd.totalPosts})
- Scores moyens: Quality=${avgScores.qualityScore?.toFixed(1) || 'N/A'}/100, Performance=${avgScores.performanceScore?.toFixed(1) || 'N/A'}/100, IFS=${avgScores.intelligentScore?.toFixed(1) || 'N/A'}/100
- Hook avg: ${avgScores.qsHookTotal?.toFixed(1) || '-'}/25, Body avg: ${avgScores.qsBodyTotal?.toFixed(1) || '-'}/20, CTA avg: ${avgScores.qsCtaTotal?.toFixed(1) || '-'}/10, Visual avg: ${avgScores.qsVisualTotal?.toFixed(1) || '-'}/15
${pd.insightsSummary ? `- Insights: ${pd.insightsSummary}` : ''}

Top 5 posts (par vues):
${topPosts.map((p, i) => `  ${i + 1}. "${p.hookText?.slice(0, 60) || '?'}" — ${p.metrics?.views?.toLocaleString() || 0} vues, ${p.metrics?.likes || 0} likes${p.converted ? ' ✅ CONVERTI' : ''}`).join('\n')}

${convertedExamples.length > 0 ? `Posts convertis:
${convertedExamples.map(p => `  ✅ "${p.hookText?.slice(0, 60) || '?'}" — ${p.metrics?.views?.toLocaleString() || 0} vues${p.conversionNote ? ` (note: ${p.conversionNote})` : ''}`).join('\n')}` : 'Aucun post converti tagué.'}
`;
    }).join('\n');

    // 5. Build the prompt
    const prompt = `Tu es un stratège marketing TikTok expert spécialisé dans le placement de produit organique. Analyse l'ensemble des comptes TikTok qui marketent un produit et fournis un rapport stratégique complet EN FRANÇAIS.

## PRODUIT
- Nom: ${panel.productName || 'Non défini'}
- URL: ${panel.productUrl || 'Non défini'}
- Audience cible: ${panel.targetAudience || 'Non définie'}
- Positionnement: ${panel.positioning || 'Non défini'}
${panel.productBible ? `\n### Product Bible (résumé):\n${panel.productBible.slice(0, 2000)}${panel.productBible.length > 2000 ? '\n[...tronqué...]' : ''}` : ''}

## COMPTES TIKTOK (${profiles.length} comptes)
${profileBlocks}

## TÂCHE
Analyse ces données en profondeur et produis un rapport structuré JSON. Croise les données produit avec les données des comptes pour identifier :
1. L'alignement entre le product bible et le contenu réellement produit
2. Pourquoi certains posts convertissent et d'autres non
3. Les patterns de conversion (hooks, angles, formats)
4. Les forces/faiblesses de chaque compte par rapport au produit
5. Un plan d'action concret
6. **Des idées de posts (angles marketing) adaptées à chaque compte**

Retourne UNIQUEMENT le JSON suivant:

{
  "globalInsights": {
    "alignmentScore": <0-100>,
    "conversionPatterns": ["pattern 1", "pattern 2", "pattern 3"],
    "keyFindings": ["finding 1", "finding 2", "finding 3"]
  },
  "profileBreakdowns": [
    {
      "profileId": "<id>",
      "displayName": "<nom>",
      "username": "<username>",
      "alignmentScore": <0-100>,
      "conversionRate": <number>,
      "strengths": ["force 1", "force 2"],
      "weaknesses": ["faiblesse 1", "faiblesse 2"],
      "recommendations": ["reco 1", "reco 2"],
      "suggestedAngles": [
        {
          "hook": "Accroche prête à poster, dans le style d'écriture exact du compte",
          "angle": "L'angle émotionnel : comment ce post amène subtilement vers le produit",
          "format": "Carrousel 7 slides / Storytelling / Liste / etc.",
          "productMention": "Comment et où mentionner le produit naturellement dans ce post",
          "viralPotential": "high"
        }
      ]
    }
  ],
  "crossProfileComparison": {
    "bestConverter": "<username>",
    "bestReach": "<username>",
    "whyBestConverts": "explication",
    "synergies": ["synergie 1", "synergie 2"]
  },
  "actionPlan": {
    "immediate": ["action immédiate 1", "action immédiate 2"],
    "shortTerm": ["action court terme 1", "action court terme 2"],
    "strategic": ["action stratégique 1", "action stratégique 2"]
  }
}

IMPORTANT:
- Pour profileBreakdowns, inclus TOUS les profils (${profiles.length} profils).
- Utilise les profileId exacts fournis ci-dessus.
- Chaque recommandation doit être concrète et actionnable, pas vague.
- L'alignmentScore reflète comment le contenu du compte s'aligne avec le Product Bible.
- Si aucun post converti, base-toi sur l'engagement et la pertinence.

POUR LES suggestedAngles (3-5 par profil) :
- Le "hook" doit être écrit EXACTEMENT dans le style du compte (ton, vocabulaire, tics de langage). Si le compte est anonyme et provocateur, le hook doit l'être aussi. Si le compte est personnel et inspirant, idem.
- L'"angle" décrit la dynamique émotionnelle : comment le contenu mène naturellement le prospect vers le produit SANS vendre frontalement. Angle ≠ produit. L'angle = l'émotion, la curiosité, le besoin que le post crée.
- Le "format" doit correspondre à ce qui performe le mieux pour ce compte (basé sur les données).
- "productMention" explique précisément où et comment glisser le produit (slide X, en réponse commentaire, lien bio, dernière slide, etc.)
- "viralPotential": "high" si le hook exploite des triggers viraux connus du compte, "medium" sinon.
- VARIER les angles : ne pas répéter le même type d'approche.
- Retourne UNIQUEMENT le JSON, rien d'autre.`;

    try {
        // 6. Call Claude
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            messages: [{
                role: 'user',
                content: [{ type: 'text' as const, text: prompt, cache_control: { type: 'ephemeral' as const } }]
            }]
        });

        // Check if response was truncated
        if (message.stop_reason === 'max_tokens') {
            console.error('⚠️ Macro analysis response truncated (max_tokens reached)');
        }

        const text = (message.content[0] as any).text;
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

        let analysis: Partial<MacroAnalysisData>;
        try {
            analysis = JSON.parse(cleanJson);
        } catch (parseError) {
            // Attempt to repair truncated JSON by closing open structures
            console.warn('⚠️ JSON parse failed, attempting repair...');
            let repaired = cleanJson;
            // Count open/close braces and brackets
            const openBraces = (repaired.match(/\{/g) || []).length;
            const closeBraces = (repaired.match(/\}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/\]/g) || []).length;
            // Close open brackets then braces
            for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
            for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
            try {
                analysis = JSON.parse(repaired);
                console.log('✅ JSON repair succeeded');
            } catch {
                console.error('❌ JSON repair failed, raw text length:', text.length);
                throw parseError;
            }
        }

        // 7. Add metadata
        const fullAnalysis: MacroAnalysisData = {
            ...analysis as MacroAnalysisData,
            metadata: {
                basedOnPostsCount: totalPostsCount,
                profileCount: profiles.length,
                generatedAt: new Date().toISOString(),
            }
        };

        // 8. Cache in database
        await prisma.panelMacroAnalysis.upsert({
            where: { adminPanelId: panelId },
            create: {
                adminPanelId: panelId,
                analysis: JSON.stringify(fullAnalysis),
                basedOnPostsCount: totalPostsCount,
                profileCount: profiles.length,
                lastUpdatedAt: new Date(),
            },
            update: {
                analysis: JSON.stringify(fullAnalysis),
                basedOnPostsCount: totalPostsCount,
                profileCount: profiles.length,
                lastUpdatedAt: new Date(),
            }
        });

        console.log(`✅ Macro analysis generated and cached for panel ${panelId}`);
        return fullAnalysis;

    } catch (error) {
        console.error('❌ Failed to generate macro analysis:', error);
        return null;
    }
}
