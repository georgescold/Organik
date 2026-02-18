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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {collectionId && (
                <>
                    <Button size="sm" onClick={() => setOpenAdd(true)} className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
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

            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href="/api/backup/collections" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    Tout télécharger
                </Link>
            </Button>
        </div>
    );
}
