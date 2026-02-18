import { ImageUploader } from "./image-uploader";
import { ImageGrid } from "./image-grid";
import { getUserImages } from "@/server/actions/image-actions";
import { getUserCollections } from "@/server/actions/collection-actions";
import { Button } from "@/components/ui/button";
import { Download, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { CollectionsSidebar } from "./collections-sidebar";
import { CollectionHeaderActions } from "./collection-header-actions";

interface CollectionsViewProps {
    collectionId?: string;
}

export async function CollectionsView({ collectionId }: CollectionsViewProps) {
    // Parallel fetching
    const [imagesResult, collectionsResult] = await Promise.all([
        getUserImages(collectionId),
        getUserCollections()
    ]);

    const images = imagesResult.success ? imagesResult.images : [];
    const collections = collectionsResult.success ? collectionsResult.collections : [];

    const activeCollection = collections?.find(c => c.id === collectionId);
    const title = activeCollection ? activeCollection.name : "Toutes les images";

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-0 h-auto md:h-[calc(100vh-12rem)]">

            <CollectionsSidebar collections={collections as any} />

            <div className="flex-1 md:pl-6 overflow-y-auto space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-end">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center">
                            {collectionId && <LayoutGrid className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />}
                            <span className="truncate">{title}</span>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {collectionId
                                ? "Images dans cette collection"
                                : "Toutes les images partagées par la communauté."}
                        </p>
                    </div>
                    <CollectionHeaderActions
                        collectionId={collectionId}
                        currentImageIds={images.map((img: any) => img.id)}
                    />
                </div>

                {/* Only show Uploader if we are NOT in a specific collection, OR if we pass the ID to it */}
                {/* Actually user requested: "Une nouvelle image ajoutée à sa propre collection..." so we pass appropriate ID */}
                <ImageUploader collectionId={collectionId} />

                <ImageGrid images={images as any} collectionId={collectionId} />
            </div>
        </div>
    )
}
