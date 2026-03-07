"use client";

import { Button } from "@/components/ui/button";
import { Download, PlusCircle } from "lucide-react";
import { useState } from "react";
import { AddExistingImagesDialog } from "./add-existing-images-dialog";

interface CollectionHeaderActionsProps {
    collectionId?: string;
    currentImageIds: string[];
}

export function CollectionHeaderActions({ collectionId, currentImageIds }: CollectionHeaderActionsProps) {
    const [openAdd, setOpenAdd] = useState(false);

    const downloadUrl = collectionId
        ? `/api/backup/collections?collectionId=${collectionId}`
        : '/api/backup/collections';

    return (
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {collectionId && (
                <>
                    <Button onClick={() => setOpenAdd(true)} className="bg-primary hover:bg-primary/90 text-white flex-1 sm:flex-none h-10 text-sm touch-manipulation">
                        <PlusCircle className="mr-1.5 h-4 w-4" />
                        Ajouter des images
                    </Button>
                    <AddExistingImagesDialog
                        open={openAdd}
                        onOpenChange={setOpenAdd}
                        collectionId={collectionId}
                        currentImageIds={currentImageIds}
                    />
                </>
            )}

            <Button
                variant="outline"
                className="flex-1 sm:flex-none h-10 text-sm touch-manipulation"
                onClick={() => window.open(downloadUrl, '_blank')}
            >
                <Download className="mr-1.5 h-4 w-4" />
                Tout télécharger
            </Button>
        </div>
    );
}
