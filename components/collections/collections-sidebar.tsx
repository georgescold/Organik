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
                router.push('/dashboard?tab=collections');
            }
        } else {
            toast.error("Erreur à la suppression");
        }
    };

    return (
        <>
            {/* Mobile: Horizontal chip layout with wrapping */}
            <div className="md:hidden space-y-3 pb-3 border-b border-border/30">
                {/* Create button + "All images" on same row */}
                <div className="flex gap-2">
                    <Link href="/dashboard?tab=collections" className="flex-1">
                        <Button
                            variant={!activeCollectionId ? "secondary" : "outline"}
                            className="w-full justify-center h-10 text-sm font-medium touch-manipulation"
                        >
                            <ImageIcon className="mr-1.5 h-4 w-4" />
                            Toutes les images
                        </Button>
                    </Link>
                    <CreateCollectionDialog />
                </div>

                {/* Collection chips - wrapping layout */}
                {collections.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {collections.map((collection) => (
                            <Link
                                key={collection.id}
                                href={`/dashboard?tab=collections&collection=${collection.id}`}
                                className="touch-manipulation"
                            >
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors",
                                    activeCollectionId === collection.id
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/60 text-foreground hover:bg-muted"
                                )}>
                                    <Folder className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate max-w-[150px]">{collection.name}</span>
                                    <span className="text-xs opacity-60">{collection._count.images}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop: Vertical sidebar (unchanged) */}
            <div className="hidden md:flex md:w-64 md:border-r border-border/30 md:pr-6 md:flex-col md:h-full space-y-4">
                <div className="space-y-1">
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

                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground px-2 pb-2">Collections</h3>
                    {collections.map((collection) => (
                        <div key={collection.id} className="group flex items-center gap-1">
                            <Button
                                variant={activeCollectionId === collection.id ? "secondary" : "ghost"}
                                className="flex-1 justify-start truncate text-sm min-w-0"
                                asChild
                            >
                                <Link href={`/dashboard?tab=collections&collection=${collection.id}`}>
                                    <Folder className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">{collection.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground shrink-0 pl-2">{collection._count.images}</span>
                                </Link>
                            </Button>
                            <button
                                onClick={(e) => handleDelete(e, collection.id)}
                                className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-opacity"
                                title="Supprimer la collection"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-border/30">
                    <CreateCollectionDialog />
                </div>
            </div>
        </>
    );
}
