import Anthropic from '@anthropic-ai/sdk';

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract text from an image using Claude Vision API with retry logic
 * @param imageUrl - URL of the image to analyze
 * @param userApiKey - User's Anthropic API key (per-user, required)
 * @param retries - Number of retries on failure (default: 2)
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(imageUrl: string, userApiKey: string, retries = 2): Promise<string> {
    if (!userApiKey) {
        return '[Erreur: clé API Anthropic non configurée]';
    }

    const anthropic = new Anthropic({
        apiKey: userApiKey
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`   🔄 Retry attempt ${attempt}/${retries}...`);
                // Wait longer on each retry: 2s, 4s, 6s...
                await delay(2000 * attempt);
            }

            console.log(`🔍 Extracting text from image: ${imageUrl.substring(0, 60)}...`);

            // Fetch image and convert to base64
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            // Determine media type from URL or default to JPEG
            let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
            if (imageUrl.includes('.png')) mediaType = 'image/png';
            else if (imageUrl.includes('.gif')) mediaType = 'image/gif';
            else if (imageUrl.includes('.webp')) mediaType = 'image/webp';

            // Call Claude Vision API
            const message = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001', // Haiku for simple OCR tasks (cost-effective)
                max_tokens: 256, // Sufficient for carousel slide text (typically 20-150 chars)
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64
                            }
                        },
                        {
                            type: 'text',
                            text: 'Extract ALL visible text from this image. Return ONLY the text you see, preserving line breaks and formatting. Do not add any commentary, explanation, or description of the image. Just the text.'
                        }
                    ]
                }]
            });

            const extractedText = message.content[0].type === 'text'
                ? message.content[0].text
                : '';

            console.log(`✅ Extracted ${extractedText.length} characters of text`);

            // Add small delay after successful call to avoid rate limiting on next image
            await delay(1000);

            return extractedText.trim();

        } catch (error: any) {
            console.error(`❌ Vision OCR error (attempt ${attempt + 1}/${retries + 1}):`, error.message);

            // If this was the last retry, return error message
            if (attempt === retries) {
                return `[Erreur API: ${error.message?.substring(0, 50) || 'timeout'}]`;
            }
            // Otherwise, continue to next retry
        }
    }

    // Fallback (should never reach here)
    return '[Erreur: impossible d\'extraire le texte de cette image]';
}
