
const { ApifyClient } = require('apify-client');
require('dotenv').config();

async function test() {
    console.log("--- Debugging Apify Connection (Step 2: Actor Access) ---");
    const token = process.env.APIFY_API_TOKEN;

    if (!token) {
        console.error("❌ APIFY_API_TOKEN is missing from .env");
        return;
    }

    const client = new ApifyClient({ token });

    try {
        console.log("Testing access to 'clockworks/tiktok-scraper' actor...");
        const actor = await client.actor('clockworks/tiktok-scraper').get();
        if (actor) {
            console.log(`✅ Actor access confirmed: ${actor.name} (ID: ${actor.id})`);
            console.log("👉 This confirms that the fallback mechanism will work.");
        }
    } catch (err) {
        console.error("❌ Failed to access Actor:", err.message);
    }
}

test();
