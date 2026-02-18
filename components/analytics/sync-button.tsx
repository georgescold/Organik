
"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { scrapeAndSyncTikTokData } from "@/server/actions/scrape-actions";
import { toast } from "sonner";

export function SyncButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSync = async () => {
        setIsLoading(true);
        try {
            toast.info("Synchronisation TikTok en cours...");
            const result = await scrapeAndSyncTikTokData();

            if (result.success) {
                toast.success(`Synchro réussie! (${result.newPosts} nouveaux, ${result.updatedPosts} mis à jour)`);
            } else {
                console.error(result.error);
                toast.error("Erreur lors de la synchro: " + result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur inattendue");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isLoading}
            className="gap-2"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync TikTok
        </Button>
    );
}
