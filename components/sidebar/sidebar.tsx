'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Folder,
    FolderPlus,
    MoreHorizontal,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronRight,
    User,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveProfileToFolder,
} from '@/server/actions/folder-actions';

interface Profile {
    id: string;
    displayName: string | null;
    username: string | null;
    platform: string;
    avatarUrl: string | null;
}

interface FolderWithProfiles {
    id: string;
    name: string;
    color: string | null;
    profiles: Profile[];
}

interface SidebarProps {
    userId: string;
    profiles: Profile[];
    ungroupedProfiles?: Profile[];
    activeProfileId: string | null;
    onProfileClick: (profileId: string) => void;
    onNewProfile?: () => void;
}

const colorOptions = [
    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const platformLabels: Record<string, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    newsletter: 'Newsletter',
    blog: 'Blog',
    twitter: 'X',
    pinterest: 'Pinterest',
};

export function Sidebar({
    userId,
    profiles,
    activeProfileId,
    onProfileClick,
    onNewProfile,
}: SidebarProps) {
    const [folders, setFolders] = useState<FolderWithProfiles[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('#6366f1');
    const [editingFolder, setEditingFolder] = useState<FolderWithProfiles | null>(null);

    useEffect(() => {
        loadFolders();
    }, [userId]);

    const loadFolders = async () => {
        setLoading(false);
        try {
            const result = await getFolders(userId);
            if (result.success && result.folders) {
                setFolders(result.folders as FolderWithProfiles[]);
                // Expand all folders by default
                setExpandedFolders(new Set(result.folders.map((f: any) => f.id)));
            }
        } catch (error) {
            console.error('Error loading folders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        await createFolder(userId, newFolderName, newFolderColor);
        setNewFolderName('');
        setNewFolderColor('#6366f1');
        setIsCreateDialogOpen(false);
        loadFolders();
    };

    const handleUpdateFolder = async () => {
        if (!editingFolder || !newFolderName.trim()) return;

        await updateFolder(editingFolder.id, {
            name: newFolderName,
            color: newFolderColor,
        });
        setEditingFolder(null);
        setNewFolderName('');
        loadFolders();
    };

    const handleDeleteFolder = async (folderId: string) => {
        await deleteFolder(folderId);
        loadFolders();
    };

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    // Get profiles not in any folder
    const ungroupedProfiles = profiles.filter(p =>
        !folders.some(f => f.profiles.some(fp => fp.id === p.id))
    );

    return (
        <div className="h-full flex flex-col bg-card/60 backdrop-blur-xl border-r border-border/50 w-64">
            {/* Header */}
            <div className="p-4 border-b border-border/30">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-black tracking-tight uppercase text-foreground/90">Mes Comptes</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                        <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {onNewProfile && (
                    <Button
                        onClick={onNewProfile}
                        size="sm"
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-all duration-200 h-9 text-xs font-semibold"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Nouveau profil
                    </Button>
                )}
            </div>

            {/* Folders & Profiles */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Folders */}
                {folders.map((folder) => (
                    <div key={folder.id} className="space-y-1">
                        {/* Folder Header */}
                        <div
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer group transition-colors duration-150"
                            onClick={() => toggleFolder(folder.id)}
                        >
                            <div
                                className="p-1 rounded-md transition-transform duration-200"
                                style={{ backgroundColor: `${folder.color || '#6366f1'}20` }}
                            >
                                <ChevronRight
                                    className="h-3 w-3 transition-transform duration-200"
                                    style={{
                                        color: folder.color || '#6366f1',
                                        transform: expandedFolders.has(folder.id) ? 'rotate(90deg)' : 'rotate(0deg)'
                                    }}
                                />
                            </div>
                            <Folder className="h-3.5 w-3.5" style={{ color: folder.color || '#6366f1' }} />
                            <span className="flex-1 text-xs text-foreground font-semibold truncate">
                                {folder.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{folder.profiles.length}</span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                    >
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingFolder(folder);
                                        setNewFolderName(folder.name);
                                        setNewFolderColor(folder.color || '#6366f1');
                                    }}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Renommer
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-red-400"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(folder.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Folder Profiles */}
                        {expandedFolders.has(folder.id) && (
                            <div className="pl-6 space-y-1">
                                {folder.profiles.map((profile) => (
                                    <ProfileItem
                                        key={profile.id}
                                        profile={profile}
                                        isActive={profile.id === activeProfileId}
                                        onClick={() => onProfileClick(profile.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Ungrouped Profiles */}
                {ungroupedProfiles.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground px-2 py-1">Non classés</div>
                        {ungroupedProfiles.map((profile) => (
                            <ProfileItem
                                key={profile.id}
                                profile={profile}
                                isActive={profile.id === activeProfileId}
                                onClick={() => onProfileClick(profile.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Folder Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-card border-border text-card-foreground">
                    <DialogHeader>
                        <DialogTitle>Nouveau dossier</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Nom du dossier"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="bg-muted/50 border-border text-foreground"
                        />
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
                            <div className="flex gap-2 flex-wrap">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-8 h-8 rounded-lg border-2",
                                            newFolderColor === color ? "border-white" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewFolderColor(color)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreateFolder} className="bg-primary">
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Folder Dialog */}
            <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
                <DialogContent className="bg-card border-border text-card-foreground">
                    <DialogHeader>
                        <DialogTitle>Modifier le dossier</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Nom du dossier"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="bg-muted/50 border-border text-foreground"
                        />
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
                            <div className="flex gap-2 flex-wrap">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-8 h-8 rounded-lg border-2",
                                            newFolderColor === color ? "border-white" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewFolderColor(color)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingFolder(null)}>
                            Annuler
                        </Button>
                        <Button onClick={handleUpdateFolder} className="bg-primary">
                            Sauvegarder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ProfileItem({
    profile,
    isActive,
    onClick,
}: {
    profile: Profile;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 text-left group/profile",
                isActive
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm shadow-primary/10"
                    : "text-foreground/80 hover:bg-muted/30 hover:translate-x-0.5"
            )}
        >
            {profile.avatarUrl ? (
                <img
                    src={profile.avatarUrl}
                    alt={profile.displayName || 'Profile'}
                    className={cn(
                        "w-7 h-7 rounded-full object-cover ring-2 transition-all",
                        isActive ? "ring-primary/50" : "ring-border/30 group-hover/profile:ring-border/60"
                    )}
                />
            ) : (
                <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all text-muted-foreground",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted/30 group-hover/profile:bg-muted/50"
                )}>
                    <User className="h-3.5 w-3.5" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate leading-tight">
                    {profile.displayName || profile.username || 'Sans nom'}
                </p>
                <p className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                    {platformLabels[profile.platform] || profile.platform}{profile.username ? ` · @${profile.username}` : ''}
                </p>
            </div>
            {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
            )}
        </button>
    );
}
