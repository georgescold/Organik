'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, GitBranch, BarChart3, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { updateAdminPanel } from '@/server/actions/admin-panel-actions';
import { toast } from 'sonner';
import { ProductDefinitionForm } from './product-definition-form';
import { AccountTreeView } from './account-tree-view';
import { PanelMetricsOverview } from './panel-metrics-overview';

interface AdminPanelDashboardProps {
    panel: any;
}

type TabId = 'product' | 'accounts' | 'metrics';

export function AdminPanelDashboard({ panel }: AdminPanelDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabId>('accounts');
    const [panelName, setPanelName] = useState(panel.name);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState(panel.name);

    const handleRenameSave = async () => {
        if (!editNameValue.trim()) {
            setIsEditingName(false);
            return;
        }
        const result = await updateAdminPanel(panel.id, { name: editNameValue.trim() });
        if (result.success) {
            setPanelName(editNameValue.trim());
            toast.success('Panel renommé');
        }
        setIsEditingName(false);
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'accounts', label: 'COMPTES', icon: <GitBranch className="h-4 w-4" /> },
        { id: 'product', label: 'PRODUIT', icon: <Package className="h-4 w-4" /> },
        { id: 'metrics', label: "VUE D'ENSEMBLE", icon: <BarChart3 className="h-4 w-4" /> },
    ];

    return (
        <div className="container max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <Link
                    href="/dashboard/admin"
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border hover:bg-muted hover:border-primary/30 transition-all shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>

                <div className="flex-1 min-w-0">
                    {isEditingName ? (
                        <Input
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={handleRenameSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSave();
                                if (e.key === 'Escape') setIsEditingName(false);
                            }}
                            className="text-2xl sm:text-3xl font-black h-12"
                            autoFocus
                        />
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight truncate">
                                {panelName}
                            </h1>
                            <button
                                onClick={() => {
                                    setEditNameValue(panelName);
                                    setIsEditingName(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-card/90 backdrop-blur border border-border rounded-2xl mb-6 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap min-h-[44px] touch-manipulation flex-1 justify-center
                            ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg shadow-primary/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }
                        `}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[60vh]">
                {activeTab === 'product' && (
                    <ProductDefinitionForm panel={panel} />
                )}
                {activeTab === 'accounts' && (
                    <AccountTreeView panel={panel} />
                )}
                {activeTab === 'metrics' && (
                    <PanelMetricsOverview panelId={panel.id} />
                )}
            </div>
        </div>
    );
}
