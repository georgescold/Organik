'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, Radar, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createAdminPanel, deleteAdminPanel, updateAdminPanel } from '@/server/actions/admin-panel-actions';
import { toast } from 'sonner';

interface Panel {
    id: string;
    name: string;
    productName?: string | null;
    createdAt: string | Date;
    _count: { selectedProfiles: number };
}

interface AdminPanelListProps {
    initialPanels: Panel[];
}

export function AdminPanelList({ initialPanels }: AdminPanelListProps) {
    const router = useRouter();
    const [panels, setPanels] = useState<Panel[]>(initialPanels);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleCreate = async () => {
        setIsCreating(true);
        const result = await createAdminPanel('Nouveau Panel');
        if (result.success && result.panelId) {
            toast.success('Panel créé');
            router.push(`/dashboard/admin/${result.panelId}`);
        } else {
            toast.error('Erreur lors de la création');
        }
        setIsCreating(false);
    };

    const handleDelete = async (panelId: string) => {
        setDeletingId(panelId);
        const result = await deleteAdminPanel(panelId);
        if (result.success) {
            setPanels(prev => prev.filter(p => p.id !== panelId));
            toast.success('Panel supprimé');
        } else {
            toast.error('Erreur lors de la suppression');
        }
        setDeletingId(null);
    };

    const handleRename = async (panelId: string) => {
        if (!editName.trim()) {
            setEditingId(null);
            return;
        }
        const result = await updateAdminPanel(panelId, { name: editName.trim() });
        if (result.success) {
            setPanels(prev => prev.map(p => p.id === panelId ? { ...p, name: editName.trim() } : p));
            toast.success('Panel renommé');
        }
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            {/* Create button */}
            <div className="flex justify-center sm:justify-end">
                <Button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="gap-2 font-bold"
                    size="lg"
                >
                    <Plus className="h-5 w-5" />
                    Créer un panel
                </Button>
            </div>

            {/* Panel grid */}
            {panels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Radar className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Aucun panel créé</p>
                    <p className="text-muted-foreground/70 text-sm">Créez votre premier panel pour piloter une niche</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {panels.map((panel) => (
                        <div
                            key={panel.id}
                            className="group relative bg-card border-2 border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                            onClick={() => {
                                if (editingId !== panel.id) router.push(`/dashboard/admin/${panel.id}`);
                            }}
                        >
                            {/* Top accent */}
                            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

                            <div className="p-5 sm:p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    {editingId === panel.id ? (
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => handleRename(panel.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(panel.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            className="text-lg font-bold h-9"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <h3 className="text-lg font-bold text-foreground truncate pr-2">
                                            {panel.name}
                                        </h3>
                                    )}

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingId(panel.id);
                                                setEditName(panel.name);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Supprimer ce panel ?')) handleDelete(panel.id);
                                            }}
                                            disabled={deletingId === panel.id}
                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Product name if set */}
                                {panel.productName && (
                                    <p className="text-sm text-muted-foreground mb-3 truncate">
                                        Produit : {panel.productName}
                                    </p>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span className="tabular-nums font-medium">{panel._count.selectedProfiles}</span>
                                        <span>profil{panel._count.selectedProfiles !== 1 ? 's' : ''}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
