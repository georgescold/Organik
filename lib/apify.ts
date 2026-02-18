import { ApifyClient } from 'apify-client';

// Create client with user's API key ONLY (no fallback to env)
function createApifyClient(userApiKey: string): ApifyClient {
    if (!userApiKey) {
        throw new Error('Clé API Apify non configurée. Ajoutez votre clé dans l\'onglet "Clé API".');
    }
    return new ApifyClient({ token: userApiKey });
}

async function getTaskInput(userApiKey: string) {
    if (!process.env.APIFY_TASK_ID) {
        throw new Error("APIFY_TASK_ID is not set");
    }
    const client = createApifyClient(userApiKey);
    const task = await client.task(process.env.APIFY_TASK_ID).get();
    return task?.input || {};
}

async function updateTaskInput(newInput: Record<string, any>, userApiKey: string) {
    if (!process.env.APIFY_TASK_ID) return;
    const client = createApifyClient(userApiKey);
    await client.task(process.env.APIFY_TASK_ID).update({
        input: newInput
    });
}

export async function addProfileToApify(tiktokName: string, userApiKey: string) {
    try {
        const input: any = await getTaskInput(userApiKey);
        const profiles: string[] = Array.isArray(input.profiles) ? input.profiles : [];

        if (!profiles.includes(tiktokName)) {
            profiles.push(tiktokName);
            await updateTaskInput({ ...input, profiles }, userApiKey);

            // Optionally trigger the run now that it's added
            // runTikTokScraper(); // decided to not await this to avoid blocking
        }
    } catch (error) {
        console.error("Failed to add profile to Apify:", error);
    }
}

export async function removeProfileFromApify(tiktokName: string, userApiKey: string) {
    try {
        const input: any = await getTaskInput(userApiKey);
        const profiles: string[] = Array.isArray(input.profiles) ? input.profiles : [];

        const newProfiles = profiles.filter(p => p !== tiktokName);

        if (newProfiles.length !== profiles.length) {
            await updateTaskInput({ ...input, profiles: newProfiles }, userApiKey);
        }
    } catch (error) {
        console.error("Failed to remove profile from Apify:", error);
    }
}

export async function runTikTokScraper(profiles?: string[], waitForFinish: boolean = true, userApiKey?: string, postLimit: number = 50) {
    if (!userApiKey) {
        throw new Error('Clé API Apify non configurée. Ajoutez votre clé dans l\'onglet "Clé API".');
    }


    const client = createApifyClient(userApiKey);

    // Si pas de task ID, utiliser l'actor directement
    if (!process.env.APIFY_TASK_ID) {
        if (!profiles || profiles.length === 0) {
            return null;
        }

        const input = {
            profiles,
            resultsPerPage: postLimit,  // Use configurable limit instead of 200
            shouldDownloadSlideshowImages: true,
        };


        try {
            const run = await client.actor('clockworks/tiktok-scraper').call(
                input,
                waitForFinish ? {} : { waitSecs: 0 }
            );

            return run.defaultDatasetId;
        } catch (error: any) {
            console.error("❌ Apify Actor error:", error.message);
            console.error("Error details:", error);
            throw error;
        }
    }


    const inputOverride = profiles ? {
        profiles,
        resultsPerPage: postLimit,  // Use configurable limit
        shouldDownloadSlideshowImages: true
    } : {
        resultsPerPage: postLimit,  // Use configurable limit
        shouldDownloadSlideshowImages: true
    };

    const options = waitForFinish ? {} : { waitSecs: 0 };

    try {
        const run = await client.task(process.env.APIFY_TASK_ID).call(inputOverride, options);
        return run.defaultDatasetId;
    } catch (error: any) {
        // Fallback to Actor if Task fails (Permissions or Not Found)
        if (error.httpStatusCode === 403 || error.httpStatusCode === 404 || error.message?.includes('Insufficient permissions')) {

            // Ensure input has profiles if it was in override, otherwise we might fail if profiles were empty in override but required
            // In this specific logic, inputOverride is constructed from profiles/args above, so it matches what the actor needs.

            const run = await client.actor('clockworks/tiktok-scraper').call(
                inputOverride,
                options
            );

            return run.defaultDatasetId;
        }

        console.error("❌ Apify Task error and no fallback applicable:", error.message);
        throw error;
    }
}

export async function fetchTikTokDataset(datasetId: string, userApiKey: string) {
    if (!userApiKey) {
        throw new Error('Clé API Apify non configurée. Ajoutez votre clé dans l\'onglet "Clé API".');
    }
    const client = createApifyClient(userApiKey);
    const { items } = await client.dataset(datasetId).listItems();
    if (items.length > 0) {
    }
    return items;
}
