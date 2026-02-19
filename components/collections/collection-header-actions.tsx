"use client";

import { Button } from "@/components/ui/button";
import { Download, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AddExistingImagesDialog } from "./add-existing-images-dialog";

interface CollectionHeaderActionsProps {
    collectionId?: string;
    currentImageIds: string[];
}

export function CollectionHeaderActions({ collectionId, currentImageIds }: CollectionHeaderActionsProps) {
    const [openAdd, setOpenAdd] = useState(false);

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

            <Button variant="outline" asChild className="flex-1 sm:flex-none h-10 text-sm touch-manipulation">
                <Link href="/api/backup/collections" target="_blank">
                    <Download className="mr-1.5 h-4 w-4" />
                    Tout télécharger
                </Link>
            </Button>
        </div>
    );
}
