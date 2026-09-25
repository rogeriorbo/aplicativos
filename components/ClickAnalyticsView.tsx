import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { ApplicationLink, DashboardProfile, LinkClickRecord, User } from '../types';
import { api } from '../services/api';
import { ChartBarIcon, ArrowTrendingUpIcon, RefreshIcon, ExternalLinkIcon, SearchIcon, ImageIcon } from './icons';
import { ConfirmationModal } from './ConfirmationModal';
import { AppFavicon } from './AppFavicon';

interface ClickAnalyticsViewProps {

  apps: ApplicationLink[];
  dashboardProfiles: DashboardProfile[];
  currentUser: User;
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e'];

export const ClickAnalyticsView: React.FC<ClickAnalyticsViewProps> = ({
  apps,
  dashboardProfiles,
  currentUser,
}) => {
  const [records, setRecords] = useState<LinkClickRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | 'all'>('30d');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getLinkClickRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load click statistics', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for live link clicks anywhere in the app
    const handleLiveClick = (e: Event) => {
      const customEvent = e as CustomEvent<LinkClickRecord | null>;
      if (customEvent.detail) {
        setRecords(prev => [...prev, customEvent.detail!]);
      } else {
        loadData();
      }
    };

    window.addEventListener('deio-link-clicked', handleLiveClick);
    return () => {
      window.removeEventListener('deio-link-clicked', handleLiveClick);
    };
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Dados atualizados com sucesso');
  };

  const handleClearData = () => {
    setIsConfirmClearOpen(true);
  };

  const confirmClearData = async () => {
    setIsRefreshing(true);
    await api.clearLinkClickRecords();
    setRecords([]);
    setIsRefreshing(false);
    setIsConfirmClearOpen(false);
    showToast('Estatísticas zeradas com sucesso');
  };

  const handleTestClick = async (app: ApplicationLink) => {
    await api.recordLinkClick(app.id, app.name, app.url, app.ownerId, currentUser);
    showToast(`Clique registrado para "${app.name}"`);
  };


  // Filter records based on selected date range & profile
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (dateRange === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (dateRange === '14d') cutoff = now - 14 * 24 * 60 * 60 * 1000;
    else if (dateRange === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;

    return records.filter(r => {
      if (cutoff > 0 && r.timestamp < cutoff) return false;
      if (profileFilter !== 'all' && r.ownerId !== profileFilter) return false;
      return true;
    });
  }, [records, dateRange, profileFilter]);

  // Aggregate stats per app
  const appStats = useMemo(() => {
    const map = new Map<
      string,
      {
        appId: string;
        name: string;
        url: string;
        ownerId: string;
        iconUrl?: string;
        totalClicks: number;
        uniqueUsers: Set<string>;
        lastClickedAt: number;
        type?: 'app' | 'youtube_video';
      }
    >();

    // Pre-populate with all apps to guarantee complete representation
    apps.forEach(app => {
      if (profileFilter !== 'all' && app.ownerId !== profileFilter) return;
      map.set(app.id, {
        appId: app.id,
        name: app.name,
        url: app.url,
        ownerId: app.ownerId,
        iconUrl: app.iconUrl,
        totalClicks: 0,
        uniqueUsers: new Set(),
        lastClickedAt: 0,
        type: app.type,
      });
    });

    // Populate with filtered click records
    filteredRecords.forEach(r => {
      let stat = map.get(r.appId);
      if (!stat) {
        // App might have been deleted or from another dashboard
        const knownApp = apps.find(a => a.id === r.appId || a.name === r.appName);
        stat = {
          appId: r.appId,
          name: r.appName,
          url: r.url,
          ownerId: r.ownerId || 'default',
          iconUrl: knownApp?.iconUrl,
          totalClicks: 0,
          uniqueUsers: new Set(),
          lastClickedAt: 0,
          type: knownApp?.type,
        };
        map.set(r.appId, stat);
      }
      stat.totalClicks += 1;
      const userKey = r.userId || r.userNickname || 'guest';
      stat.uniqueUsers.add(userKey);
      if (r.timestamp > stat.lastClickedAt) {
        stat.lastClickedAt = r.timestamp;
      }
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      uniqueUsersCount: item.uniqueUsers.size,
    }));

    // Sort by clicks descending
    return list.sort((a, b) => b.totalClicks - a.totalClicks);
  }, [apps, filteredRecords, profileFilter]);

  // Total clicks in current view
  const totalClicksCount = filteredRecords.length;

  // Search filtered apps for the table
  const displayedAppStats = useMemo(() => {
    if (!searchTerm.trim()) return appStats;
    const lower = searchTerm.toLowerCase();
    return appStats.filter(
      item => item.name.toLowerCase().includes(lower) || item.url.toLowerCase().includes(lower)
    );
  }, [appStats, searchTerm]);

  // Top 8 apps for BarChart
  const topAppsForBarChart = useMemo(() => {
    return appStats
      .filter(a => a.totalClicks > 0)
      .slice(0, 8)
      .map(app => ({
        name: app.name.length > 15 ? app.name.slice(0, 14) + '…' : app.name,
        fullName: app.name,
        clicks: app.totalClicks,
        percentage: totalClicksCount > 0 ? Math.round((app.totalClicks / totalClicksCount) * 100) : 0,
      }));
  }, [appStats, totalClicksCount]);

  // Time-series data for AreaChart (Daily Clicks)
  const timeSeriesData = useMemo(() => {
    const daysMap = new Map<string, { date: string; displayDate: string; clicks: number; timestamp: number }>();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const numDays = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;

    // Pre-populate last N days
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      daysMap.set(key, { date: key, displayDate, clicks: 0, timestamp: d.getTime() });
    }

    filteredRecords.forEach(r => {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = daysMap.get(key);
      if (entry) {
        entry.clicks += 1;
      } else if (dateRange === 'all') {
        const displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        daysMap.set(key, { date: key, displayDate, clicks: 1, timestamp: d.getTime() });
      }
    });

    return Array.from(daysMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredRecords, dateRange]);

  // Device & Type breakdown for PieChart
  const deviceData = useMemo(() => {
    const counts = { desktop: 0, mobile: 0, tablet: 0 };
    filteredRecords.forEach(r => {
      const d = r.deviceType || 'desktop';
      if (d === 'mobile') counts.mobile += 1;
      else if (d === 'tablet') counts.tablet += 1;
      else counts.desktop += 1;
    });

    const list = [
      { name: 'Desktop', value: counts.desktop, color: '#6366f1' },
      { name: 'Mobile', value: counts.mobile, color: '#06b6d4' },
      { name: 'Tablet', value: counts.tablet, color: '#ec4899' },
    ];
    return list.filter(item => item.value > 0);
  }, [filteredRecords]);

  // Recent 8 clicks
  const recentClicks = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [filteredRecords]);

  // Overall KPIs
  const topApp = appStats[0]?.totalClicks > 0 ? appStats[0] : null;
  const activeLinksCount = appStats.filter(a => a.totalClicks > 0).length;
  const daysInPeriod = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : Math.max(1, Math.round((Date.now() - (filteredRecords[0]?.timestamp || Date.now())) / (24 * 60 * 60 * 1000)) || 1);
  const avgClicksPerDay = (totalClicksCount / daysInPeriod).toFixed(1);

  // Profile display label helper
  const getProfileName = (ownerId: string) => {
    if (ownerId === 'default') return 'Público Padrão';
    const profile = dashboardProfiles.find(p => p.id === ownerId);
    if (profile) return profile.name;
    return 'Dashboard Personalizado';
  };

  // CSV Export
  const exportCsv = () => {
    if (appStats.length === 0) return;
    const header = ['Aplicativo', 'URL', 'Dashboard', 'Total de Cliques', 'Usuários Únicos', 'Último Acesso'];
    const rows = appStats.map(app => [
      `"${app.name.replace(/"/g, '""')}"`,
      `"${app.url.replace(/"/g, '""')}"`,
      `"${getProfileName(app.ownerId)}"`,
      app.totalClicks,
      app.uniqueUsersCount,
      app.lastClickedAt ? new Date(app.lastClickedAt).toISOString() : 'Nunca',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deio_cliques_stats_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório CSV baixado');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center space-x-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Control Bar: Filters, Date Range & Actions */}
      <div className="bg-card-background border border-border-color rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 text-accent" />
              Estatísticas & Popularidade de Links
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Visualização analítica de cliques com Recharts para monitorar os aplicativos mais acessados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center bg-input-background border border-input-border rounded-lg p-1">
              {(['7d', '14d', '30d', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    dateRange === range
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {range === '7d' ? '7 dias' : range === '14d' ? '14 dias' : range === '30d' ? '30 dias' : 'Tudo'}
                </button>
              ))}
            </div>

            {/* Dashboard Selector */}
            <select
              value={profileFilter}
              onChange={e => setProfileFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-input-background border border-input-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Todos os Dashboards</option>
              <option value="default">Público Padrão</option>
              {dashboardProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Action Buttons */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-input-background border border-input-border text-text-secondary hover:text-text-primary hover:bg-background/50 transition-colors flex items-center gap-1.5"
              title="Atualizar estatísticas"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>

            <button
              onClick={exportCsv}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-input-background border border-input-border text-text-secondary hover:text-text-primary hover:bg-background/50 transition-colors"
            >
              Exportar CSV
            </button>

            <button
              onClick={handleClearData}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
              title="Zera todas as estatísticas para reiniciar a contagem do zero"
            >
              Zerar Estatísticas
            </button>
          </div>
        </div>
      </div>

      {/* Real Data Status Banner */}
      {records.length === 0 && (
        <div className="bg-background/60 border border-border-color rounded-xl p-4 flex items-center space-x-3 text-xs text-text-secondary">
          <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
          <div>
            <span className="font-semibold text-text-primary">Monitoramento em Tempo Real Ativo:</span> Nenhum dado simulado. Os gráficos e tabelas são alimentados exclusivamente com dados 100% reais conforme os usuários acessarem os links do portal.
          </div>
        </div>
      )}


      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Clicks */}
        <div className="bg-card-background border border-border-color rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Total de Cliques</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-accent">
              <ChartBarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-text-primary font-mono tabular-nums">
              {totalClicksCount.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              No período selecionado ({dateRange === 'all' ? 'histórico total' : `últimos ${dateRange}`})
            </div>
          </div>
        </div>

        {/* Card 2: Most Popular App */}
        <div className="bg-card-background border border-border-color rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Aplicativo Mais Popular</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <ArrowTrendingUpIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold text-text-primary truncate" title={topApp?.name || 'Nenhum'}>
              {topApp?.name || 'Sem acessos'}
            </div>
            <div className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 font-mono tabular-nums">
              {topApp ? (
                <>
                  <span className="text-accent font-semibold">{topApp.totalClicks} cliques</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {totalClicksCount > 0
                      ? `${Math.round((topApp.totalClicks / totalClicksCount) * 100)}% de participação`
                      : '0%'}
                  </span>
                </>
              ) : (
                'Nenhum clique registrado'
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Daily Average */}
        <div className="bg-card-background border border-border-color rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Média Diária</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-text-primary font-mono tabular-nums">
              {avgClicksPerDay}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              Acessos médios por dia
            </div>
          </div>
        </div>

        {/* Card 4: Active Links */}
        <div className="bg-card-background border border-border-color rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Links Ativos Engajados</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <ExternalLinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-text-primary font-mono tabular-nums">
              {activeLinksCount} <span className="text-sm font-normal text-text-secondary">/ {appStats.length}</span>
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {appStats.length > 0 ? Math.round((activeLinksCount / appStats.length) * 100) : 0}% dos links receberam cliques
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Bar Chart - Top Apps Ranking (2 columns) */}
        <div className="lg:col-span-2 bg-card-background border border-border-color rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary">Top Aplicativos por Acessos</h3>
              <p className="text-xs text-text-secondary mt-0.5">Ranking dos links mais populares no período</p>
            </div>
            <span className="text-xs font-mono text-text-secondary tabular-nums">
              {topAppsForBarChart.length} aplicativos exibidos
            </span>
          </div>

          {topAppsForBarChart.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topAppsForBarChart}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4338ca" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 shadow-xl text-xs space-y-1">
                            <div className="font-semibold text-accent">{data.fullName}</div>
                            <div className="font-mono tabular-nums text-slate-300">
                              Total de Cliques: <span className="font-bold text-white">{data.clicks}</span>
                            </div>
                            <div className="text-slate-400">
                              Participação: <span className="font-semibold text-emerald-400">{data.percentage}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="clicks"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-center text-text-secondary border border-dashed border-border-color rounded-lg p-6">
              <ChartBarIcon className="w-10 h-10 text-text-secondary/30 mb-2" />
              <p className="text-sm font-medium text-text-primary">Nenhum clique registrado no período selecionado</p>
              <p className="text-xs text-text-secondary mt-1 max-w-sm">
                As métricas e posições do ranking serão preenchidas automaticamente assim que os links forem acessados pelos usuários.
              </p>
            </div>

          )}
        </div>

        {/* Chart 2: Device & Engagement Donut Chart (1 column) */}
        <div className="bg-card-background border border-border-color rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary">Distribuição por Dispositivo</h3>
            <p className="text-xs text-text-secondary mt-0.5">Origem dos acessos aos links</p>
          </div>

          {deviceData.length > 0 ? (
            <div className="h-56 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const pct = totalClicksCount > 0 ? Math.round((data.value / totalClicksCount) * 100) : 0;
                        return (
                          <div className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 shadow-xl text-xs">
                            <span className="font-semibold" style={{ color: data.color }}>
                              {data.name}:
                            </span>{' '}
                            <span className="font-mono tabular-nums font-bold">{data.value}</span> ({pct}%)
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-text-secondary">
              Sem dados de dispositivos
            </div>
          )}

          <div className="border-t border-border-color pt-3 text-xs text-text-secondary flex justify-between font-mono tabular-nums">
            <span>Desktop: {deviceData.find(d => d.name === 'Desktop')?.value || 0}</span>
            <span>Mobile: {deviceData.find(d => d.name === 'Mobile')?.value || 0}</span>
            <span>Tablet: {deviceData.find(d => d.name === 'Tablet')?.value || 0}</span>
          </div>
        </div>
      </div>

      {/* Chart 3: Area Chart - Access Trends Over Time */}
      <div className="bg-card-background border border-border-color rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-accent" />
              Evolução Temporal dos Acessos
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Volume diário de cliques ao longo do tempo para identificar picos de uso
            </p>
          </div>
          <div className="text-xs text-text-secondary font-mono tabular-nums">
            Janela de análise: <span className="font-semibold text-text-primary">{timeSeriesData.length} dias</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeSeriesData}
              margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="displayDate"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                minTickGap={15}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 shadow-xl text-xs space-y-1">
                        <div className="text-slate-400">Data: {data.displayDate}</div>
                        <div className="font-bold text-accent font-mono tabular-nums">
                          {data.clicks} {data.clicks === 1 ? 'clique' : 'cliques'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High-Density Detailed Table: Link Popularity Leaderboard */}
      <div className="bg-card-background border border-border-color rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border-color flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-text-primary">Tabela Detalhada de Cliques por Link</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Comparativo de acessos individuais, usuários únicos e data do último clique
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar aplicativo..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-input-background border border-input-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <SearchIcon className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-color text-left text-xs">
            <thead className="bg-background/50 text-text-secondary font-medium uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3 w-16">Rank</th>
                <th scope="col" className="px-5 py-3">Aplicativo</th>
                <th scope="col" className="px-5 py-3">Dashboard</th>
                <th scope="col" className="px-5 py-3 text-right">Cliques</th>
                <th scope="col" className="px-5 py-3">Participação</th>
                <th scope="col" className="px-5 py-3">Último Acesso</th>
                <th scope="col" className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color bg-card-background">
              {displayedAppStats.length > 0 ? (
                displayedAppStats.map((item, index) => {
                  const sharePct = totalClicksCount > 0 ? ((item.totalClicks / totalClicksCount) * 100).toFixed(1) : '0';
                  return (
                    <tr
                      key={item.appId}
                      className="hover:bg-background/40 transition-colors"
                    >
                      {/* Rank */}
                      <td className="px-5 py-3.5 font-mono tabular-nums text-text-secondary">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                          index === 0
                            ? 'bg-amber-500/20 text-amber-300'
                            : index === 1
                            ? 'bg-slate-300/20 text-slate-300'
                            : index === 2
                            ? 'bg-amber-700/20 text-amber-500'
                            : 'text-text-secondary'
                        }`}>
                          #{index + 1}
                        </span>
                      </td>

                      {/* App Name and Icon */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-background/60 border border-border-color flex items-center justify-center overflow-hidden flex-shrink-0">
                            <AppFavicon
                              url={item.url}
                              name={item.name}
                              iconUrl={item.iconUrl}
                              className="w-full h-full object-contain p-0.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-[11px] text-text-secondary truncate max-w-xs" title={item.url}>
                              {item.url}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dashboard */}
                      <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                        {getProfileName(item.ownerId)}
                      </td>

                      {/* Total Clicks */}
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums font-bold text-text-primary">
                        {item.totalClicks.toLocaleString()}
                      </td>

                      {/* Share progress bar */}
                      <td className="px-5 py-3.5 whitespace-nowrap w-44">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-background/60 rounded-full h-1.5 overflow-hidden border border-border-color/50">
                            <div
                              className="bg-accent h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, parseFloat(sharePct)))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-text-secondary">
                            {sharePct}%
                          </span>
                        </div>
                      </td>

                      {/* Last Access */}
                      <td className="px-5 py-3.5 text-text-secondary font-mono tabular-nums whitespace-nowrap">
                        {item.lastClickedAt
                          ? new Date(item.lastClickedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleTestClick(item as any)}
                            className="px-2 py-1 text-[11px] font-medium rounded bg-accent/10 hover:bg-accent hover:text-white text-accent transition-colors"
                            title="Simula 1 clique para testar"
                          >
                            +1 Clique
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleTestClick(item as any)}
                            className="p-1 rounded text-text-secondary hover:text-accent hover:bg-background/50 transition-colors"
                            title="Acessar link externo"
                          >
                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-secondary">
                    Nenhum aplicativo encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Clicks Live Feed */}
      <div className="bg-card-background border border-border-color rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Feed em Tempo Real de Acessos Recentes
            </h3>
            <p className="text-xs text-text-secondary">Últimos cliques registrados pelos usuários e visitantes</p>
          </div>
          {filteredRecords.length > 0 && (
            <button
              onClick={handleClearData}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Zerar Histórico
            </button>
          )}
        </div>

        {recentClicks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentClicks.map(r => (
              <div
                key={r.id}
                className="bg-background/40 border border-border-color rounded-lg p-3 text-xs flex flex-col justify-between space-y-2 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary truncate" title={r.appName}>
                    {r.appName}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-background/80 text-text-secondary border border-border-color">
                    {r.deviceType || 'desktop'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-secondary">
                  <span>{r.userNickname || 'Visitante'}</span>
                  <span className="font-mono tabular-nums">
                    {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary py-2">Nenhum clique recente registrado.</p>
        )}
      </div>

      <ConfirmationModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={confirmClearData}
        title="Confirmar: Zerar Estatísticas"
        message="Atenção: Esta ação é irreversível e excluirá permanentemente todo o histórico de cliques, acessos e posições do ranking registrados até o momento. Tem certeza de que deseja zerar todos os dados?"
        confirmButtonText="Sim, Zerar Estatísticas"
        confirmButtonVariant="danger"
      />
    </div>
  );
};
