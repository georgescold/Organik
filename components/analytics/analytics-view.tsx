import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDashboardStats, updateFollowers } from '@/server/actions/analytics-actions';
import { AddPostDialog } from './add-post-dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Trophy, Clock, BarChart3, Table2, Activity, Bookmark, Users, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PostsTable } from './posts-table';
import { PostDetailsModal } from './post-details-modal';
import { MetricHistoryCard } from './metric-history-card';
import { UserLeaderboard } from './user-leaderboard';

import { SyncButton } from './sync-button';
import { BestPostingTimes } from './best-posting-times';
// HookPerformance removed per user request
// CompetitorBenchmark moved to competitors tab
import { WeeklyPlan } from './weekly-plan';

export async function AnalyticsView() {
    const stats = await getDashboardStats();

    if (!stats) return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-muted rounded-lg" />
                ))}
            </div>
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
        </div>
    );

    const { posts, topPosts } = stats;
    // Safe defaults for new analytics fields
    const engagementRate = stats.stats.engagementRate ?? 0;
    const engagementRateChange = stats.stats.engagementRateChange ?? 0;
    const engagementRateTrend = stats.stats.engagementRateTrend ?? 'neutral';
    const saveRate = stats.stats.saveRate ?? 0;
    const followerGrowthRate = stats.stats.followerGrowthRate ?? 0;
    const followerGrowthDirection = stats.stats.followerGrowthDirection ?? 'neutral';
    const now = new Date();
    const tz = 'Europe/Paris';
    const today = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });

    const lastSync = stats.lastSyncAt ? new Date(stats.lastSyncAt) : null;
    const syncDate = lastSync
        ? lastSync.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })
        : null;
    const syncTime = lastSync
        ? lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
        : null;

    return (
        <div className="space-y-8 sm:space-y-10">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">Performance</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground capitalize">
                        {today}
                        {lastSync ? (
                            <> — <span className="normal-case">dernière synchro le {syncDate} à {syncTime}</span></>
                        ) : (
                            <> — <span className="normal-case">aucune synchronisation</span></>
                        )}
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <SyncButton />
                    <AddPostDialog />
                </div>
            </div>

            {/* ── Stats Cards ── */}
            {/* TODO: Consider migrating hardcoded hsl() chart colors below to CSS variables
                or theme tokens (e.g. var(--chart-1)) for better dark/light mode support
                and centralized theming. */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricHistoryCard
                    title="Vues"
                    value={stats.stats.totalViews}
                    subValue="(Total)"
                    trend={stats.stats.views > 0 ? Math.round((stats.stats.views / stats.stats.totalViews) * 100) : 0}
                    trendDirection="up"
                    data={stats.history.views}
                    chartColor="hsl(348, 90%, 55%)" /* hardcoded — future: use CSS variable */
                    rangeOptions={[
                        { key: '7d', label: '7J' },
                        { key: '30d', label: '30J' },
                        { key: '6m', label: '6M' }
                    ]}
                />

                <MetricHistoryCard
                    title="Abonnés"
                    value={stats.stats.followers}
                    trend={Math.abs(stats.stats.followersTrend)}
                    trendDirection={stats.stats.followersTrendDirection as 'up' | 'down' | 'neutral'}
                    data={stats.history.followers}
                    editable={true}
                    onSave={updateFollowers}
                    chartColor="hsl(348, 80%, 65%)" /* hardcoded — future: use CSS variable */
                    rangeOptions={[
                        { key: '30d', label: '1M' },
                        { key: '6m', label: '6M' },
                        { key: '1y', label: '1A' }
                    ]}
                />

                <MetricHistoryCard
                    title="Likes"
                    value={stats.stats.likes}
                    subValue="(Total)"
                    trend={0}
                    trendDirection="neutral"
                    data={stats.history.likes || []}
                    chartColor="hsl(15, 90%, 55%)" /* hardcoded — future: use CSS variable */
                    rangeOptions={[
                        { key: '7d', label: '7J' },
                        { key: '30d', label: '1M' },
                        { key: '6m', label: '6M' }
                    ]}
                />

                <MetricHistoryCard
                    title="Enregistrements"
                    value={stats.stats.saves}
                    subValue="(Total)"
                    trend={0}
                    trendDirection="neutral"
                    data={stats.history.saves || []}
                    chartColor="hsl(340, 70%, 45%)" /* hardcoded — future: use CSS variable */
                    rangeOptions={[
                        { key: '7d', label: '7J' },
                        { key: '30d', label: '1M' },
                        { key: '6m', label: '6M' }
                    ]}
                />
            </div>

            {/* ── KPI Cards — Engagement Rate, Save Rate, Follower Growth ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Engagement Rate */}
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 shrink-0">
                            <Activity className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Taux d&apos;engagement</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black">{engagementRate.toFixed(1)}%</span>
                                {engagementRateChange !== 0 && (
                                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${engagementRateTrend === 'up' ? 'text-emerald-400' : engagementRateTrend === 'down' ? 'text-red-400' : 'text-muted-foreground'}`}>
                                        {engagementRateTrend === 'up' ? <TrendingUp className="w-3 h-3" /> : engagementRateTrend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                                        {engagementRateChange > 0 ? '+' : ''}{engagementRateChange}%
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground/70">(Likes+Comments+Shares+Saves) / Vues</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Save Rate */}
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 shrink-0">
                            <Bookmark className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Taux de sauvegarde</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black">{saveRate.toFixed(2)}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70">Saves / Vues — indicateur de valeur perçue</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Follower Growth Rate */}
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 shrink-0">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Croissance hebdo</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xl font-black ${followerGrowthDirection === 'up' ? 'text-emerald-400' : followerGrowthDirection === 'down' ? 'text-red-400' : ''}`}>
                                    {followerGrowthRate > 0 ? '+' : ''}{followerGrowthRate}
                                </span>
                                <span className="text-xs text-muted-foreground">abonnés</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70">Évolution sur les 7 derniers jours</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Section Divider ── */}
            <div className="section-divider" />

            {/* ── Weekly AI Plan ── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold tracking-tight">Plan IA Hebdomadaire</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">Recommandations personnalisées basées sur vos données</p>
                    </div>
                </div>
                <WeeklyPlan />
            </section>

            {/* ── Section Divider ── */}
            <div className="section-divider" />

            {/* ── Best Posting Times ── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold tracking-tight">Meilleurs horaires</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">Publie quand ton audience est la plus active</p>
                    </div>
                </div>
                <BestPostingTimes />
            </section>

            {/* ── Section Divider ── */}
            <div className="section-divider" />

            {/* ── Leaderboard ── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold tracking-tight">Classements</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">Top 10 de tes meilleurs contenus par catégorie</p>
                    </div>
                </div>
                <UserLeaderboard posts={posts as any} />
            </section>

            {/* ── Section Divider ── */}
            <div className="section-divider" />

            {/* ── Posts Table ── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Table2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold tracking-tight">Tous les posts</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">{posts.length} posts analysés</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <PostsTable posts={posts} />
                </div>
            </section>
        </div>
    );
}
