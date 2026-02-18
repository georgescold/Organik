'use client';

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Folder, Image as ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { deleteCollection } from "@/server/actions/collection-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Collection {
    id: string;
    name: string;
    _count: { images: number };
}

interface CollectionsSidebarProps {
    collections: Collection[];
}

export function CollectionsSidebar({ collections }: CollectionsSidebarProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeCollectionId = searchParams.get('collection');

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Voulez-vous vraiment supprimer cette collection ? Les images ne seront pas supprimées.")) return;

        const result = await deleteCollection(id);
        if (result.success) {
            toast.success("Collection supprimée");
            router.refresh();
            if (activeCollectionId === id) {
                router.push('/dashboard?tab=collections'); // Reset to general
            }
        } else {
            toast.error("Erreur à la suppression");
        }
    };

    return (
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/30 pb-3 md:pb-0 md:pr-6 space-y-3 md:space-y-4 flex md:flex-col flex-row md:overflow-x-visible overflow-x-auto md:h-full scrollbar-hide gap-2 md:gap-0">
            <div className="space-y-1 min-w-[200px] md:min-w-0">
                <Button
                    variant={!activeCollectionId ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm"
                    asChild
                >
                    <Link href="/dashboard?tab=collections">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Toutes les images
                    </Link>
                </Button>
            </div>

            <div className="space-y-1 min-w-[200px] md:min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground px-2 pb-2">Mes Collections</h3>
                {collections.map((collection) => (
                    <div key={collection.id} className="group flex items-center relative">
                        <Button
                            variant={activeCollectionId === collection.id ? "secondary" : "ghost"}
                            className="w-full justify-start pr-8 truncate text-sm"
                            asChild
                        >
                            <Link href={`/dashboard?tab=collections&collection=${collection.id}`}>
                                <Folder className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{collection.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground shrink-0">{collection._count.images}</span>
                            </Link>
                        </Button>
                        <button
                            onClick={(e) => handleDelete(e, collection.id)}
                            className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-opacity"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-4 border-t border-border/30 min-w-[200px] md:min-w-0">
                <CreateCollectionDialog />
            </div>
        </div>
    );
}
