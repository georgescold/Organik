'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Pencil } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, useTransition, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Maximize2 } from 'lucide-react';

export interface MetricHistoryCardProps {
    title: string;
    value: number | string;
    subValue?: string;
    trend: number;
    trendDirection: 'up' | 'down' | 'neutral';
    data: { date: string; value: number; originalDate?: Date | string }[];
    onSave?: (newValue: number) => Promise<{ error?: string; success?: boolean }>;
    editable?: boolean;
    chartColor?: string;
    rangeOptions?: { key: string; label: string }[];
}

export function MetricHistoryCard({
    title,
    value,
    subValue,
    trend,
    trendDirection,
    data,
    onSave,
    editable = false,
    chartColor,
    rangeOptions = [
        { key: '7d', label: '7J' },
        { key: '30d', label: '30J' },
        { key: '6m', label: '6M' },
        { key: '1y', label: '1A' }
    ]
}: MetricHistoryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value.toString());
    const [isPending, startTransition] = useTransition();

    // Local state needed for optimistic updates
    const [localData, setLocalData] = useState(data);
    const [localValue, setLocalValue] = useState(value);

    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        setLocalData(data);
        setLocalValue(value);
    }, [data, value]);

    const defaultRange = rangeOptions.find(o => o.key === '30d') ? '30d' : rangeOptions[0]?.key;
    const [timeRange, setTimeRange] = useState<string>(defaultRange);

    // Use brand-derived chart color if not specified
    const resolvedChartColor = chartColor || 'hsl(348, 90%, 55%)';

    const handleSave = () => {
        if (!onSave) return;
        const num = parseInt(editValue.toString().replace(/\s/g, ''), 10);
        if (isNaN(num)) {
            toast.error("Valeur invalide");
            return;
        }

        const previousValue = localValue;
        const previousData = [...localData];

        setLocalValue(num);
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const newData = [...localData];
        const lastIndex = newData.length - 1;

        if (lastIndex >= 0 && newData[lastIndex].date === todayFormatted) {
            newData[lastIndex] = { ...newData[lastIndex], value: num };
        } else {
            newData.push({ date: todayFormatted, value: num, originalDate: today });
        }
        setLocalData(newData);
        setIsEditing(false);

        startTransition(async () => {
            const res = await onSave(num);
            if (res.error) {
                toast.error(res.error);
                setLocalValue(previousValue);
                setLocalData(previousData);
            } else {
                toast.success("Mis à jour !");
            }
        });
    };

    const trendColor = trendDirection === 'up' ? 'text-green-500' : trendDirection === 'down' ? 'text-red-500' : 'text-muted-foreground';
    const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

    const getFilteredData = () => {
        if (!localData || localData.length === 0) return [{ date: 'Aujourd\'hui', value: typeof localValue === 'number' ? localValue : 0 }];

        const hasDateObjects = localData.some(d => d.originalDate);
        if (!hasDateObjects) {
            const sortedData = [...localData];
            let itemsToKeep = 30;
            if (timeRange === '7d') itemsToKeep = 7;
            else if (timeRange === '30d') itemsToKeep = 30;
            else if (timeRange === '6m') itemsToKeep = 180;
            else if (timeRange === '1y') itemsToKeep = 365;
            return sortedData.slice(-itemsToKeep);
        }

        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setHours(0, 0, 0, 0);

        if (timeRange === '7d') cutoffDate.setDate(now.getDate() - 7);
        else if (timeRange === '30d') cutoffDate.setDate(now.getDate() - 30);
        else if (timeRange === '6m') cutoffDate.setMonth(now.getMonth() - 6);
        else if (timeRange === '1y') cutoffDate.setFullYear(now.getFullYear() - 1);

        return localData.filter(item => {
            if (!item.originalDate) return true;
            const itemDate = new Date(item.originalDate);
            return itemDate >= cutoffDate;
        });
    };

    const chartData = getFilteredData();

    // Reused Chart Component
    const ChartComponent = ({ height = "100%", hideAxis = true }: { height?: number | `${number}%`; hideAxis?: boolean }) => (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
                <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={resolvedChartColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={resolvedChartColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground) / 0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={20}
                    hide={hideAxis}
                />
                {!hideAxis && (
                    <YAxis
                        stroke="hsl(var(--muted-foreground) / 0.3)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    />
                )}
                <Tooltip
                    contentStyle={{
                        background: 'hsl(var(--card) / 0.95)',
                        border: '1px solid hsl(var(--border) / 0.5)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(12px)',
                    }}
                    cursor={{ stroke: 'hsl(var(--primary) / 0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    labelFormatter={(label) => label}
                    formatter={(val: number | undefined) => [(val ?? 0).toLocaleString(), title]}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={resolvedChartColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: resolvedChartColor, fill: 'hsl(var(--card))' }}
                    fillOpacity={1}
                    fill={`url(#gradient-${title})`}
                    animationDuration={800}
                    animationEasing="ease-out"
                />
            </AreaChart>
        </ResponsiveContainer>
    );

    return (
        <>
            <Card className="bg-card/40 backdrop-blur-md overflow-hidden border-border/50 hover:border-primary/20 transition-all duration-300 group relative organik-interactive">
                {/* Top accent line — colored per metric */}
                <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${resolvedChartColor}, transparent)` }}
                />

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute top-3 right-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                            onClick={() => setIsExpanded(true)}
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                        {editable && !isEditing && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col space-y-3 sm:space-y-4">
                        <div className="flex items-baseline justify-between">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="h-8 w-20 sm:w-24 text-base sm:text-lg font-bold"
                                        type="number"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    />
                                    <Button size="sm" onClick={handleSave} disabled={isPending} className="h-8 px-2.5">OK</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 px-2">X</Button>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-xl sm:text-3xl font-bold flex items-baseline gap-1 sm:gap-2 font-display tracking-tight">
                                        {typeof localValue === 'number' ? localValue.toLocaleString() : localValue}
                                        {subValue && <span className="text-xs sm:text-sm font-normal text-muted-foreground">{subValue}</span>}
                                    </div>
                                    <div className={`flex items-center text-[10px] sm:text-xs ${trendColor} mt-1 font-medium`}>
                                        <TrendIcon className="h-3 w-3 mr-1" />
                                        {trendDirection === 'up' ? '+' : ''}{trend}%
                                        <span className="text-muted-foreground/50 ml-1.5 align-middle hidden sm:inline">vs période préc.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mini Chart */}
                        <div className="h-[70px] sm:h-[80px] w-full -mx-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                            <ChartComponent height="100%" hideAxis={true} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Expanded Modal */}
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border-border/50">
                    <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 pb-4 sm:pb-6 border-b border-border/30">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-base sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
                                {title}
                                <span className={`text-[10px] sm:text-sm font-normal px-2 py-0.5 rounded-full bg-muted/50 border border-border/50 ${trendColor} flex items-center gap-1`}>
                                    <TrendIcon className="h-3 w-3" /> {trendDirection === 'up' ? '+' : ''}{trend}%
                                </span>
                            </DialogTitle>
                            <p className="text-muted-foreground text-xs sm:text-sm">Vue détaillée et évolution temporelle</p>
                        </div>

                        {/* Range Selector in Modal */}
                        <div className="flex bg-muted/30 rounded-xl p-1 border border-border/30">
                            {rangeOptions.map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => setTimeRange(option.key)}
                                    className={`
                                        text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 rounded-lg transition-all font-medium touch-manipulation
                                        ${timeRange === option.key
                                            ? 'bg-primary/15 text-primary shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'}
                                    `}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </DialogHeader>

                    <div className="h-[220px] sm:h-[400px] w-full mt-3 sm:mt-6">
                        <ChartComponent height="100%" hideAxis={false} />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
