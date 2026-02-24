import Anthropic from '@anthropic-ai/sdk';
import { PROMPTS } from './prompts';

// Removed unused default anthropic instance

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export async function analyzeImage(imageBase64: string, mediaType: string = "image/jpeg", apiKey: string) {
    if (!apiKey) {
        throw new Error("API Key is required for image analysis via Claude.");
    }

    try {
        const client = new Anthropic({
            apiKey: apiKey,
        });

        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: PROMPTS.IMAGE_ANALYSIS_SYSTEM,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType as any,
                                data: imageBase64,
                            },
                        },
                        {
                            type: "text",
                            text: "Analyse cette image."
                        }
                    ],
                },
            ],
        });

        // Parse JSON from response
        const text = (msg.content[0] as any).text;
        // Simple basic cleanup if markdown is present
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

        try {
            return JSON.parse(cleanJson);
        } catch (parseError) {
            // Claude sometimes returns a text refusal instead of JSON
            // (e.g. "I'm not able to analyze this image")
            console.error("Claude returned non-JSON response:", cleanJson.slice(0, 200));
            throw new Error(`Claude did not return valid JSON. Response: "${cleanJson.slice(0, 100)}"`);
        }
    } catch (error) {
        console.error("Claude Analysis Error:", error);
        throw error; // Rethrow to allow upstream handling (e.g. invalid user key)
    }
}

export type ImageAnalysisResult = {
    description_long: string;
    keywords: string[];
    mood: string;
    colors: string[];
    style: string;
    composition: string;
    facial_expression: string | null;
    text_content: string | null;
    quality_score: number;
};

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export async function analyzeImageQualityOnly(imageBase64: string, mediaType: string = "image/jpeg", apiKey: string): Promise<number> {
    if (!apiKey) throw new Error("API Key is required.");

    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 64,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: mediaType as any,
                            data: imageBase64,
                        },
                    },
                    {
                        type: "text",
                        text: `Score la qualité technique de cette image de 1 à 10.
Critères : netteté, éclairage, composition, rendu visuel.
7+ = pro, 4-6 = amateur, 1-3 = mauvaise.
Réponds UNIQUEMENT avec le chiffre, rien d'autre.`
                    }
                ],
            },
        ],
    });

    const text = (msg.content[0] as any).text.trim();
    const score = parseInt(text, 10);
    return (score >= 1 && score <= 10) ? score : 5;
}

export async function analyzePostContent(images: string[], textContext: string, apiKey: string) {
    if (!apiKey) throw new Error("API Key required");

    const client = new Anthropic({ apiKey });

    // Prepare content array for Claude
    // Max 20 images to stay within limits, though usually carousel is < 10
    const contentBlocks: any[] = [];

    // Add images
    for (const imageUrl of images.slice(0, 10)) {
        try {
            // Fetch the image and convert to base64
            // Note: In a real server action, we might already have base64 or need to fetch
            // Ideally we pass base64 directly, but if URLs we fetch them here.
            // For this implementation, I'll assume we fetch inside the action or pass URLs if supported?
            // Claude API needs base64. So checking if 'images' are URLs or base64.
            // If they are http links, we need to fetch them.

            // Optimization: If fetching fails or is slow, we might skip.
            // But let's assume valid public URLs for now.
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const mediaType = response.headers.get('content-type') || 'image/jpeg';

            contentBlocks.push({
                type: "image",
                source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                },
            });
        } catch (e) {
            console.warn(`Failed to process image ${imageUrl} for analysis`, e);
        }
    }

    // Add text context
    if (textContext) {
        contentBlocks.push({
            type: "text",
            text: `Contexte du post (Titre/Description/Hook) : ${textContext}`
        });
    }

    if (contentBlocks.length === 0) {
        throw new Error("No content to analyze");
    }

    const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1500, // JSON can be long
        system: PROMPTS.IFS_ANALYSIS_SYSTEM,
        messages: [
            {
                role: "user",
                content: contentBlocks
            }
        ]
    });

    const text = (msg.content[0] as any).text;
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

    try {
        return JSON.parse(cleanJson);
    } catch (parseError) {
        console.error("Claude returned non-JSON response for post analysis:", cleanJson.slice(0, 200));
        throw new Error(`Claude did not return valid JSON. Response: "${cleanJson.slice(0, 100)}"`);
    }
}
