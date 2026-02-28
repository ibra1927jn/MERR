/**
 * WeeklyReportView — Manager Weekly Summary Report
 * Premium visual design with shadows, gradients, PDF generation
 */
import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { payrollService, PickerBreakdown } from '@/services/payroll.service';
import { analyticsService } from '@/services/analytics.service';
import { TrendLineChart, TrendDataPoint, DayMeta } from '@/components/charts/TrendLineChart';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';

const useOpenProfile = () => {
    const openPickerProfile = useHarvestStore(s => s.openPickerProfile);
    const crew = useHarvestStore(s => s.crew);
    return (pickerId: string) => {
        const picker = crew.find(c => c.picker_id === pickerId);
        if (picker) openPickerProfile(picker.id);
    };
};

const WeeklyReportView: React.FC = () => {
    const orchardId = useHarvestStore(s => s.orchard?.id);
    const orchard = useHarvestStore(s => s.orchard);
    const settings = useHarvestStore(s => s.settings);
    const crew = useHarvestStore(s => s.crew);

    // Daily bin target derived from settings (target_tons × ~72 bins/ton ÷ days in season)
    // If not configured, no target line is shown
    const dailyBinTarget = settings?.target_tons ? Math.round((settings.target_tons * 72) / 30) : undefined;
    const openProfile = useOpenProfile();
    const [pickers, setPickers] = useState<PickerBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [binsTrend, setBinsTrend] = useState<TrendDataPoint[]>([]);
    const [workforceTrend, setWorkforceTrend] = useState<TrendDataPoint[]>([]);
    const [selectedDayMeta, setSelectedDayMeta] = useState<DayMeta | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
    const [exportSections, setExportSections] = useState({
        summary: true,
        charts: true,
        teams: true,
        pickerDetail: true,
    });

    useEffect(() => {
        const load = async () => {
            if (!orchardId) { setIsLoading(false); return; }
            setIsLoading(true);
            const payrollPromise = payrollService.calculateToday(orchardId)
                .then(result => setPickers(result.picker_breakdown))
                .catch(e => logger.warn('[WeeklyReport] Payroll failed:', e));
            const trendsPromise = analyticsService.getDailyTrends(orchardId, 7)
                .then(trends => { setBinsTrend(trends.totalBins); setWorkforceTrend(trends.workforceSize); })
                .catch(e => logger.warn('[WeeklyReport] Trends failed:', e));
            await Promise.allSettled([payrollPromise, trendsPromise]);
            setIsLoading(false);
        };
        load();
    }, [orchardId]);

    const totalBuckets = pickers.reduce((s, p) => s + p.buckets, 0);
    const totalHours = pickers.reduce((s, p) => s + p.hours_worked, 0);
    const totalEarnings = pickers.reduce((s, p) => s + p.total_earnings, 0);
    const avgBPA = totalHours > 0 ? totalBuckets / totalHours : 0;
    const costPerBin = totalBuckets > 0 ? totalEarnings / totalBuckets : 0;

    // Team rankings — use team_leader_id from crew store
    const teamMap = new Map<string, { buckets: number; hours: number; earnings: number; count: number }>();
    pickers.forEach(p => {
        const crewMember = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
        const leaderId = crewMember?.team_leader_id || 'unassigned';
        const leader = crew.find(c => c.id === leaderId);
        const teamName = leader?.name || 'Unassigned';
        const entry = teamMap.get(teamName) || { buckets: 0, hours: 0, earnings: 0, count: 0 };
        entry.buckets += p.buckets;
        entry.hours += p.hours_worked;
        entry.earnings += p.total_earnings;
        entry.count++;
        teamMap.set(teamName, entry);
    });
    const teamRankings = Array.from(teamMap.entries())
        .map(([name, data]) => ({ name, ...data, bpa: data.hours > 0 ? data.buckets / data.hours : 0 }))
        .sort((a, b) => b.bpa - a.bpa);

    const toggleSection = (key: keyof typeof exportSections) => {
        setExportSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleExportCSV = () => {
        const sortedPickers = [...pickers].sort((a, b) => b.buckets - a.buckets);
        const headers = ['#', 'Sticker ID', 'Name', 'Team Leader', 'Buckets', 'Hours Worked', 'Bins/Hr', 'Piece Rate ($)', 'Top-Up ($)', 'Total Earnings ($)', 'Below Minimum'];
        const rows = sortedPickers.map((p, i) => {
            const crewMember = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
            const leaderId = crewMember?.team_leader_id || '';
            const leader = crew.find(c => c.id === leaderId);
            const teamName = leader?.name || 'Unassigned';
            const bpa = p.hours_worked > 0 ? p.buckets / p.hours_worked : 0;
            return [
                i + 1,
                p.picker_id,
                p.picker_name,
                teamName,
                p.buckets,
                p.hours_worked.toFixed(1),
                bpa.toFixed(1),
                p.piece_rate_earnings.toFixed(2),
                p.top_up_required.toFixed(2),
                p.total_earnings.toFixed(2),
                p.is_below_minimum ? 'YES' : 'NO'
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harvest_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
    };

    const handleExportPDF = () => {
        const now = new Date();
        const reportDate = now.toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const shortDate = now.toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
        // Calculate week period
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
        const fmtShort = (d: Date) => d.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
        const weekNum = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
        const periodLabel = `Week ${weekNum}: ${fmtShort(weekStart)} – ${fmtShort(weekEnd)}, ${now.getFullYear()}`;
        const totalTons = (totalBuckets * 13.5 / 1000);
        const sortedPickers = [...pickers].sort((a, b) => b.buckets - a.buckets);

        // ── Compact SVG sparkline ──
        const buildSparkline = (data: TrendDataPoint[], color: string) => {
            if (data.length < 2) return '';
            const vals = data.map(d => d.value);
            const max = Math.max(...vals) * 1.1 || 1;
            const min = Math.min(...vals) * 0.9;
            const range = max - min || 1;
            const w = 380, h = 55, px = 12, py = 6;
            const points = vals.map((v, i) => {
                const x = px + (i / (vals.length - 1)) * (w - 2 * px);
                const y = py + (1 - (v - min) / range) * (h - 2 * py);
                return `${x},${y}`;
            });
            const fp = `${px},${h - py} ${points.join(' ')} ${w - px},${h - py}`;
            const labels = data.map((d, i) => {
                const x = px + (i / (vals.length - 1)) * (w - 2 * px);
                return `<text x="${x}" y="${h + 10}" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="system-ui">${d.label}</text>`;
            }).join('');
            const dots = vals.map((v, i) => {
                const x = px + (i / (vals.length - 1)) * (w - 2 * px);
                const y = py + (1 - (v - min) / range) * (h - 2 * py);
                return `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}" stroke="white" stroke-width="1"/>
                        <text x="${x}" y="${y - 6}" fill="${color}" font-size="7" text-anchor="middle" font-weight="700" font-family="system-ui">${v}</text>`;
            }).join('');
            return `<svg width="${w}" height="${h + 14}" viewBox="0 0 ${w} ${h + 14}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${fp}" fill="${color}" opacity="0.15"/>
                <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                ${dots}${labels}
            </svg>`;
        };
        const binsSvg = exportSections.charts ? buildSparkline(binsTrend, '#10b981') : '';
        const workforceSvg = exportSections.charts ? buildSparkline(workforceTrend, '#3b82f6') : '';

        // ── Team rows (compact) ──
        const maxTeamBuckets = Math.max(...teamRankings.map(t => t.buckets), 1);
        const teamRowsHtml = teamRankings.map((t, i) => {
            const pct = (t.buckets / maxTeamBuckets) * 100;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const barCol = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#6366f1';
            return `<tr style="border-bottom: 1px solid #f1f5f9; background: ${i % 2 === 0 ? '#fff' : '#fafbfc'};">
                <td style="padding: 5px 8px; text-align: center; font-size: 13px; width: 30px;">${medal}</td>
                <td style="padding: 5px 8px; font-weight: 700; font-size: 11px; color: #1e293b;">${t.name}</td>
                <td style="padding: 5px 8px; text-align: right; font-weight: 700; font-size: 11px; color: #0284c7;">${t.buckets}</td>
                <td style="padding: 5px 8px; width: 200px;">
                    <div style="background: #f1f5f9; border-radius: 4px; height: 12px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: ${barCol}; border-radius: 4px;"></div>
                    </div>
                </td>
                <td style="padding: 5px 8px; text-align: right; font-weight: 700; color: ${t.bpa >= avgBPA ? '#059669' : '#dc2626'}; font-size: 11px;">${t.bpa.toFixed(1)}/hr</td>
                <td style="padding: 5px 8px; text-align: right; font-weight: 800; font-size: 11px; color: #1e293b;">$${t.earnings.toFixed(0)}</td>
                <td style="padding: 5px 8px; text-align: right; font-size: 10px; color: #64748b;">${t.count} pickers</td>
            </tr>`;
        }).join('');

        // ── Picker rows (audit-style) ──
        const pickerRows = sortedPickers.map((p, i) => {
            const bpa = p.hours_worked > 0 ? p.buckets / p.hours_worked : 0;
            const crewMember = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
            const leaderId = crewMember?.team_leader_id || '';
            const leader = crew.find(c => c.id === leaderId);
            const teamName = leader?.name || '—';
            const tier = bpa >= avgBPA * 1.1 ? '#059669' : bpa >= avgBPA * 0.8 ? '#f59e0b' : '#ef4444';
            const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            const topUp = p.top_up_required > 0 ? `<span style="color:#dc2626;font-weight:700;">$${p.top_up_required.toFixed(2)}</span>` : '<span style="color:#cbd5e1;">—</span>';
            const status = p.is_below_minimum ? '<span style="color:#dc2626;font-weight:700;">⚠ BELOW</span>' : '<span style="color:#059669;">✓</span>';
            const days = p.hours_worked > 0 ? Math.max(1, Math.round(p.hours_worked / 8)) : 0;
            const avgPerDay = days > 0 ? (p.buckets / days).toFixed(1) : '0';
            const dollarPerHr = p.hours_worked > 0 ? (p.total_earnings / p.hours_worked).toFixed(2) : '0';
            const minWage = 23.15; // NZ minimum wage
            const wageColor = p.hours_worked > 0 && (p.total_earnings / p.hours_worked) < minWage ? '#dc2626' : '#059669';
            return `<tr style="border-bottom:1px solid #f1f5f9;background:${bg};">
                <td style="width:3px;background:${tier};padding:0;"></td>
                <td style="padding:4px 6px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700;">${i + 1}</td>
                <td style="padding:4px 6px;text-align:center;font-family:monospace;font-size:10px;color:#6366f1;font-weight:700;">${p.picker_id}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:600;color:#1e293b;">${p.picker_name}</td>
                <td style="padding:4px 6px;font-size:9px;color:#64748b;">${teamName}</td>
                <td style="padding:4px 6px;text-align:center;font-size:10px;font-weight:700;color:#64748b;">${days}d</td>
                <td style="padding:4px 6px;text-align:right;font-size:11px;font-weight:800;color:#0284c7;">${p.buckets}</td>
                <td style="padding:4px 6px;text-align:right;font-size:10px;color:#475569;">${avgPerDay}</td>
                <td style="padding:4px 6px;text-align:right;font-size:10px;color:#64748b;">${p.hours_worked.toFixed(1)}h</td>
                <td style="padding:4px 6px;text-align:right;font-size:10px;font-weight:700;color:${tier};">${bpa.toFixed(1)}</td>
                <td style="padding:4px 6px;text-align:right;font-size:10px;color:${wageColor};font-weight:700;">$${dollarPerHr}</td>
                <td style="padding:4px 6px;text-align:right;font-size:10px;color:#475569;">$${p.piece_rate_earnings.toFixed(2)}</td>
                <td style="padding:4px 6px;text-align:right;font-size:10px;">${topUp}</td>
                <td style="padding:4px 6px;text-align:right;font-size:11px;font-weight:800;color:#1e293b;">$${p.total_earnings.toFixed(2)}</td>
                <td style="padding:4px 6px;text-align:center;font-size:9px;">${status}</td>
            </tr>`;
        }).join('');

        // ── Totals ──
        const totalTopUp = sortedPickers.reduce((s, p) => s + p.top_up_required, 0);
        const totalPieceRate = sortedPickers.reduce((s, p) => s + p.piece_rate_earnings, 0);
        const belowMinCount = sortedPickers.filter(p => p.is_below_minimum).length;
        const bestPicker = sortedPickers[0];
        const aboveAvgCount = sortedPickers.filter(p => (p.hours_worked > 0 ? p.buckets / p.hours_worked : 0) >= avgBPA).length;
        const totalDays = sortedPickers.reduce((s, p) => s + Math.max(1, Math.round(p.hours_worked / 8)), 0);
        const avgDollarPerHr = totalHours > 0 ? (totalEarnings / totalHours).toFixed(2) : '0';
        const avgBinsPerDay = totalDays > 0 ? (totalBuckets / totalDays).toFixed(1) : '0';

        // ── Performance Distribution ──
        const brackets = [
            { label: '3.0+ (Excellent)', min: 3.0, max: Infinity, color: '#059669', count: 0 },
            { label: '2.0–3.0 (Good)', min: 2.0, max: 3.0, color: '#0284c7', count: 0 },
            { label: '1.0–2.0 (Below Target)', min: 1.0, max: 2.0, color: '#f59e0b', count: 0 },
            { label: '<1.0 (Needs Action)', min: 0, max: 1.0, color: '#ef4444', count: 0 },
        ];
        sortedPickers.forEach(p => {
            const bpa = p.hours_worked > 0 ? p.buckets / p.hours_worked : 0;
            const b = brackets.find(br => bpa >= br.min && bpa < br.max);
            if (b) b.count++;
        });
        const maxBracket = Math.max(...brackets.map(b => b.count), 1);
        const distHtml = brackets.map(b => {
            const pct = (b.count / maxBracket) * 100;
            return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                <span style="width:150px;font-size:10px;font-weight:600;color:#475569;text-align:right;">${b.label}</span>
                <div style="flex:1;background:#f1f5f9;border-radius:4px;height:16px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${b.color};border-radius:4px;min-width:${b.count > 0 ? '2px' : '0'};"></div>
                </div>
                <span style="width:40px;font-size:11px;font-weight:800;color:#1e293b;">${b.count}</span>
            </div>`;
        }).join('');

        // ── Cost Analysis (Top/Bottom 5) ──
        const pickersWithCost = sortedPickers.filter(p => p.buckets > 0).map(p => ({
            ...p, costPerBin: p.total_earnings / p.buckets,
            effRate: p.hours_worked > 0 ? p.total_earnings / p.hours_worked : 0
        }));
        const top5Eff = [...pickersWithCost].sort((a, b) => a.costPerBin - b.costPerBin).slice(0, 5);
        const bottom5Eff = [...pickersWithCost].sort((a, b) => b.costPerBin - a.costPerBin).slice(0, 5);
        const costTableRow = (list: typeof top5Eff, isBottom: boolean) => list.map((p, i) => `<tr style="border-bottom:1px solid #f1f5f9;background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
            <td style="padding:4px 8px;font-size:10px;color:#94a3b8;font-weight:700;">${i + 1}</td>
            <td style="padding:4px 8px;font-size:10px;font-weight:600;color:#1e293b;">${p.picker_name}</td>
            <td style="padding:4px 8px;text-align:right;font-size:10px;font-weight:800;color:#0284c7;">${p.buckets}</td>
            <td style="padding:4px 8px;text-align:right;font-size:10px;color:#475569;">$${p.total_earnings.toFixed(2)}</td>
            <td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:800;color:${isBottom ? '#dc2626' : '#059669'};">$${p.costPerBin.toFixed(2)}</td>
            <td style="padding:4px 8px;text-align:right;font-size:10px;color:${p.effRate < 23.15 ? '#dc2626' : '#059669'};font-weight:700;">$${p.effRate.toFixed(2)}/hr</td>
        </tr>`).join('');

        // ── Daily Summary (aggregated from trend data) ──
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailySummaryRows = binsTrend.map((d, i) => {
            const wf = workforceTrend[i];
            const pickers = wf?.value || 0;
            const bins = d.value || 0;
            const estHours = pickers * 8;
            const estAvgBpa = estHours > 0 ? bins / estHours : 0;
            const estCost = bins * costPerBin;
            const estCpb = bins > 0 ? estCost / bins : 0;
            return `<tr style="border-bottom:1px solid #f1f5f9;background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="padding:5px 10px;font-weight:700;font-size:11px;color:#1e293b;">${d.label || dayNames[i] || 'Day ' + (i + 1)}</td>
                <td style="padding:5px 10px;text-align:center;font-size:10px;font-weight:700;color:#4338ca;">${pickers}</td>
                <td style="padding:5px 10px;text-align:right;font-size:11px;font-weight:800;color:#0284c7;">${bins}</td>
                <td style="padding:5px 10px;text-align:right;font-size:10px;color:#64748b;">${estHours.toFixed(0)}h</td>
                <td style="padding:5px 10px;text-align:right;font-size:10px;font-weight:700;color:${estAvgBpa >= avgBPA ? '#059669' : '#dc2626'};">${estAvgBpa.toFixed(1)}</td>
                <td style="padding:5px 10px;text-align:right;font-size:10px;color:#475569;">$${estCost.toFixed(0)}</td>
                <td style="padding:5px 10px;text-align:right;font-size:10px;color:#be123c;font-weight:700;">$${estCpb.toFixed(2)}</td>
            </tr>`;
        }).join('');

        // ── Per-Team Breakdown ──
        const teamBreakdownHtml = teamRankings.map((team, ti) => {
            const teamPickers = sortedPickers.filter(p => {
                const cm = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
                const lid = cm?.team_leader_id || '';
                const ldr = crew.find(c => c.id === lid);
                return (ldr?.name || 'Unassigned') === team.name;
            });
            if (teamPickers.length === 0) return '';
            const tBins = teamPickers.reduce((s, p) => s + p.buckets, 0);
            const tHrs = teamPickers.reduce((s, p) => s + p.hours_worked, 0);
            const tErn = teamPickers.reduce((s, p) => s + p.total_earnings, 0);
            const tTopUp = teamPickers.reduce((s, p) => s + p.top_up_required, 0);
            const tBelowMin = teamPickers.filter(p => p.is_below_minimum).length;
            const tAvgBpa = tHrs > 0 ? tBins / tHrs : 0;
            const rows = teamPickers.map((p, i) => {
                const bpa = p.hours_worked > 0 ? p.buckets / p.hours_worked : 0;
                const days = p.hours_worked > 0 ? Math.max(1, Math.round(p.hours_worked / 8)) : 0;
                const avgPd = days > 0 ? (p.buckets / days).toFixed(1) : '0';
                const dph = p.hours_worked > 0 ? (p.total_earnings / p.hours_worked).toFixed(2) : '0';
                const tier = bpa >= avgBPA * 1.1 ? '#059669' : bpa >= avgBPA * 0.8 ? '#f59e0b' : '#ef4444';
                const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
                return `<tr style="border-bottom:1px solid #f1f5f9;background:${bg};">
                    <td style="width:3px;background:${tier};padding:0;"></td>
                    <td style="padding:4px 6px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700;">${i + 1}</td>
                    <td style="padding:4px 6px;font-family:monospace;font-size:10px;color:#6366f1;font-weight:700;">${p.picker_id}</td>
                    <td style="padding:4px 6px;font-size:10px;font-weight:600;color:#1e293b;">${p.picker_name}</td>
                    <td style="padding:4px 6px;text-align:center;font-size:10px;color:#64748b;">${days}d</td>
                    <td style="padding:4px 6px;text-align:right;font-size:11px;font-weight:800;color:#0284c7;">${p.buckets}</td>
                    <td style="padding:4px 6px;text-align:right;font-size:10px;color:#475569;">${avgPd}</td>
                    <td style="padding:4px 6px;text-align:right;font-size:10px;color:#64748b;">${p.hours_worked.toFixed(1)}h</td>
                    <td style="padding:4px 6px;text-align:right;font-size:10px;font-weight:700;color:${tier};">${bpa.toFixed(1)}</td>
                    <td style="padding:4px 6px;text-align:right;font-size:10px;color:#475569;">$${dph}/hr</td>
                    <td style="padding:4px 6px;text-align:right;font-size:11px;font-weight:800;color:#1e293b;">$${p.total_earnings.toFixed(2)}</td>
                    <td style="padding:4px 6px;text-align:center;font-size:9px;">${p.is_below_minimum ? '<span style="color:#dc2626;font-weight:700;">⚠</span>' : '<span style="color:#059669;">✓</span>'}</td>
                </tr>`;
            }).join('');
            return `<div style="page-break-before: always; margin: 0 30px; padding-top: 16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;">${ti === 0 ? '🥇' : ti === 1 ? '🥈' : ti === 2 ? '🥉' : '👤'}</span>
                        <span style="font-size:14px;font-weight:800;color:#1e293b;">${team.name}'s Team</span>
                        <span style="font-size:10px;color:#94a3b8;">${teamPickers.length} pickers</span>
                    </div>
                    <div style="display:flex;gap:8px;font-size:9px;">
                        <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-weight:700;">${tBins} bins</span>
                        <span style="background:${tAvgBpa >= avgBPA ? '#dcfce7' : '#fef2f2'};color:${tAvgBpa >= avgBPA ? '#059669' : '#dc2626'};padding:2px 8px;border-radius:4px;font-weight:700;">${tAvgBpa.toFixed(1)} bins/hr</span>
                        <span style="font-weight:800;color:#1e293b;">$${tErn.toFixed(0)}</span>
                        ${tTopUp > 0 ? `<span style="color:#dc2626;font-weight:700;">Top-Up: $${tTopUp.toFixed(2)}</span>` : ''}
                        ${tBelowMin > 0 ? `<span style="color:#dc2626;">⚠ ${tBelowMin} below min</span>` : ''}
                    </div>
                </div>
                <table style="width:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:collapse;font-size:10px;">
                    <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                        <th style="width:3px;"></th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;">#</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;">ID</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:left;">Name</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;">Days</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:right;">Bins</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:right;">Avg/Day</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:right;">Hours</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:right;">Bins/Hr</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:right;">$/Hr</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;text-align:right;">Total $</th>
                        <th style="padding:4px 6px;font-size:8px;text-transform:uppercase;color:#94a3b8;">Status</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                    <tfoot><tr style="background:#0f172a;color:white;font-weight:700;">
                        <td style="width:3px;background:${ti === 0 ? '#f59e0b' : ti === 1 ? '#94a3b8' : '#6366f1'};"></td>
                        <td colspan="4" style="padding:5px 6px;font-size:10px;">Team Total</td>
                        <td style="padding:5px 6px;text-align:right;font-size:10px;font-weight:800;">${tBins}</td>
                        <td></td>
                        <td style="padding:5px 6px;text-align:right;font-size:10px;">${tHrs.toFixed(1)}h</td>
                        <td style="padding:5px 6px;text-align:right;font-size:10px;font-weight:800;">${tAvgBpa.toFixed(1)}</td>
                        <td></td>
                        <td style="padding:5px 6px;text-align:right;font-size:10px;font-weight:800;">$${tErn.toFixed(2)}</td>
                        <td style="padding:5px 6px;text-align:center;font-size:9px;">${tBelowMin > 0 ? tBelowMin + ' ⚠' : '✓'}</td>
                    </tr></tfoot>
                </table>
            </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Weekly Report - ${orchard?.name || 'Orchard'}</title>
<style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: white; font-size: 10px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
    tr { page-break-inside: avoid; }
    .kpi-cell { text-align: center; padding: 8px 6px; border-right: 1px solid #e2e8f0; }
    .kpi-cell:last-child { border-right: none; }
    .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; margin-bottom: 2px; }
    .kpi-value { font-size: 18px; font-weight: 900; color: #1e293b; }
    .section-title { font-size: 11px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px; padding: 8px 0 6px; border-bottom: 2px solid #0f172a; margin-bottom: 4px; }
</style></head><body>

<!-- ═══ HEADER ═══ -->
<div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f4c75 100%); padding: 18px 30px 14px; color: white;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;">🍒</div>
                <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.5); font-weight: 700;">Weekly Harvest Report</span>
            </div>
            <h1 style="font-size: 20px; font-weight: 900; margin: 2px 0;">${orchard?.name || 'Orchard'}</h1>
            <p style="font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 600; margin-top: 2px;">📅 ${periodLabel}</p>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">Report ID</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7); font-family: monospace;">${shortDate}-WR</div>
            <div style="margin-top: 6px; font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.95);">HarvestPro<span style="color: #22d3ee;">NZ</span></div>
            <div style="font-size: 9px; color: rgba(255,255,255,0.4);">${reportDate}</div>
        </div>
    </div>
</div>

${exportSections.summary ? `<!-- ═══ COMPACT KPI STRIP ═══ -->
<div style="margin: 12px 30px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: white;">
    <table><tr>
        <td class="kpi-cell"><div class="kpi-label">Total Bins</div><div class="kpi-value" style="color: #059669;">${totalBuckets}</div></td>
        <td class="kpi-cell"><div class="kpi-label">Total Tons</div><div class="kpi-value" style="color: #1d4ed8;">${totalTons.toFixed(1)}</div></td>
        <td class="kpi-cell"><div class="kpi-label">Hours</div><div class="kpi-value" style="color: #b45309;">${totalHours.toFixed(0)}h</div></td>
        <td class="kpi-cell"><div class="kpi-label">Labour Cost</div><div class="kpi-value" style="color: #7e22ce;">$${totalEarnings.toFixed(0)}</div></td>
        <td class="kpi-cell"><div class="kpi-label">Cost / Bin</div><div class="kpi-value" style="color: #be123c;">$${costPerBin.toFixed(2)}</div></td>
        <td class="kpi-cell"><div class="kpi-label">Avg Bins/Hr</div><div class="kpi-value" style="color: #0d9488;">${avgBPA.toFixed(1)}</div></td>
        <td class="kpi-cell"><div class="kpi-label">Workforce</div><div class="kpi-value" style="color: #4338ca;">${sortedPickers.length}</div></td>
        <td class="kpi-cell" style="background: ${totalTopUp > 0 ? '#fef2f2' : '#f0fdf4'};"><div class="kpi-label" style="color: ${totalTopUp > 0 ? '#991b1b' : '#166534'};">Top-Up Bleed</div><div class="kpi-value" style="color: ${totalTopUp > 0 ? '#dc2626' : '#059669'};">$${totalTopUp.toFixed(0)}</div></td>
    </tr></table>
</div>

<!-- ═══ EXECUTIVE INSIGHTS (inline) ═══ -->
<div style="margin: 8px 30px 0; display: flex; gap: 8px; font-size: 10px;">
    <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 14px;">⭐</span>
        <span style="font-weight: 800; color: #92400e;">${bestPicker?.picker_name || 'N/A'}</span>
        <span style="color: #a16207; margin-left: auto;">${bestPicker ? bestPicker.buckets + ' bins • $' + bestPicker.total_earnings.toFixed(0) : '—'}</span>
    </div>
    <div style="flex: 1; background: ${totalTopUp > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${totalTopUp > 0 ? '#fecdd3' : '#bbf7d0'}; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 14px;">${totalTopUp > 0 ? '💸' : '✅'}</span>
        <span style="font-weight: 800; color: ${totalTopUp > 0 ? '#dc2626' : '#059669'};">Wage Bleeding: $${totalTopUp.toFixed(2)}</span>
        <span style="color: ${totalTopUp > 0 ? '#b91c1c' : '#16a34a'}; margin-left: auto;">${belowMinCount} below min</span>
    </div>
    <div style="flex: 1; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 14px;">📊</span>
        <span style="font-weight: 800; color: #4338ca;">${aboveAvgCount}/${sortedPickers.length} above avg</span>
        <span style="color: #6366f1; margin-left: auto;">${sortedPickers.length > 0 ? ((aboveAvgCount / sortedPickers.length) * 100).toFixed(0) : 0}% on target</span>
    </div>
</div>` : ''}

${exportSections.charts ? `<!-- ═══ TREND CHARTS ═══ -->
<div style="margin: 10px 30px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: white;">
        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="font-size: 11px;">📈</span>
            <span style="font-size: 10px; font-weight: 800; color: #065f46;">Harvest Velocity</span>
            <span style="font-size: 8px; color: #94a3b8; margin-left: auto;">bins/day</span>
        </div>
        ${binsSvg}
    </div>
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: white;">
        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="font-size: 11px;">👥</span>
            <span style="font-size: 10px; font-weight: 800; color: #1e40af;">Workforce Size</span>
            <span style="font-size: 8px; color: #94a3b8; margin-left: auto;">pickers/day</span>
        </div>
        ${workforceSvg}
    </div>
</div>` : ''}

${exportSections.teams ? `<!-- ═══ TEAM RANKINGS ═══ -->
<div style="margin: 10px 30px 0;">
    <div class="section-title">🏆 Team Rankings <span style="font-weight: 400; color: #94a3b8; font-size: 9px; margin-left: 4px;">${teamRankings.length} teams</span></div>
    <table style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <thead><tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; width: 30px;"></th>
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left;">Team</th>
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Bins</th>
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; width: 200px;"></th>
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Rate</th>
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Earnings</th>
            <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Size</th>
        </tr></thead>
        <tbody>${teamRowsHtml || '<tr><td colspan="7" style="padding: 12px; text-align: center; color: #94a3b8;">No team data</td></tr>'}</tbody>
    </table>
</div>` : ''}

${exportSections.pickerDetail ? `<!-- ═══ PICKER SPREADSHEET ═══ -->
<div style="margin: 10px 30px;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
        <div class="section-title" style="border: none; padding-bottom: 0; margin-bottom: 0;">📋 Picker Performance Detail <span style="font-weight: 400; color: #94a3b8; font-size: 9px; margin-left: 4px;">${sortedPickers.length} pickers</span></div>
        <div style="display: flex; gap: 8px; font-size: 9px;">
            <span style="color: #dc2626; font-weight: 700;">⚠ Below Min: ${belowMinCount}</span>
            <span style="color: #6366f1; font-weight: 700;">Top-Up: $${totalTopUp.toFixed(2)}</span>
        </div>
    </div>
    <table style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 10px;">
        <thead><tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="width: 3px;"></th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center; width: 24px;">#</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center;">ID</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left;">Name</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left;">Team</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center;">Days</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Bins</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Avg/Day</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Hours</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Bins/Hr</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">$/Hr</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Piece $</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Top-Up</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Total $</th>
            <th style="padding: 5px 6px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center;">Status</th>
        </tr></thead>
        <tbody>${pickerRows || '<tr><td colspan="15" style="padding: 20px; text-align: center; color: #94a3b8;">No picker data</td></tr>'}</tbody>
        <tfoot><tr style="background: #0f172a; color: white; font-weight: 700;">
            <td style="width: 3px; background: #6366f1;"></td>
            <td colspan="4" style="padding: 6px 8px; font-size: 10px;">TOTALS — ${sortedPickers.length} pickers</td>
            <td style="padding: 6px; text-align: center; font-size: 10px;">${totalDays}d</td>
            <td style="padding: 6px; text-align: right; font-size: 10px; font-weight: 800;">${totalBuckets}</td>
            <td style="padding: 6px; text-align: right; font-size: 10px;">${avgBinsPerDay}</td>
            <td style="padding: 6px; text-align: right; font-size: 10px;">${totalHours.toFixed(1)}h</td>
            <td style="padding: 6px; text-align: right; font-size: 10px; font-weight: 800;">${avgBPA.toFixed(1)}</td>
            <td style="padding: 6px; text-align: right; font-size: 10px;">$${avgDollarPerHr}</td>
            <td style="padding: 6px; text-align: right; font-size: 10px;">$${totalPieceRate.toFixed(2)}</td>
            <td style="padding: 6px; text-align: right; font-size: 10px; color: #fca5a5;">$${totalTopUp.toFixed(2)}</td>
            <td style="padding: 6px; text-align: right; font-size: 11px; font-weight: 900;">$${totalEarnings.toFixed(2)}</td>
            <td style="padding: 6px; text-align: center; font-size: 9px;">${belowMinCount} ⚠</td>
        </tr></tfoot>
    </table>
</div>` : ''}

<!-- ═══ PAGE 2: DAILY SUMMARY & ANALYSIS ═══ -->
<div style="page-break-before: always; margin: 0 30px; padding-top: 16px;">
    <div style="display: flex; gap: 16px;">
        <!-- Daily Summary -->
        <div style="flex: 1;">
            <div class="section-title">📅 Daily Summary <span style="font-weight: 400; color: #94a3b8; font-size: 9px; margin-left: 4px;">${periodLabel}</span></div>
            <table style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead><tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left;">Day</th>
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: center;">Pickers</th>
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Bins</th>
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Hours</th>
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Avg B/Hr</th>
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Est. Cost</th>
                    <th style="padding: 5px 10px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Cost/Bin</th>
                </tr></thead>
                <tbody>${dailySummaryRows}</tbody>
            </table>
        </div>
        <!-- Performance Distribution -->
        <div style="flex: 1;">
            <div class="section-title">📊 Performance Distribution <span style="font-weight: 400; color: #94a3b8; font-size: 9px; margin-left: 4px;">Bins/Hr brackets</span></div>
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; background: white;">
                ${distHtml}
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
                    <span>Avg: ${avgBPA.toFixed(1)} bins/hr</span>
                    <span>Target: 2.0+ bins/hr</span>
                    <span>${aboveAvgCount}/${sortedPickers.length} above avg</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Cost Analysis -->
    <div style="margin-top: 12px; display: flex; gap: 16px;">
        <div style="flex: 1;">
            <div class="section-title" style="color: #059669;">✅ Top 5 Most Efficient <span style="font-weight: 400; color: #94a3b8; font-size: 9px; margin-left: 4px;">Lowest $/bin</span></div>
            <table style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead><tr style="background: #f0fdf4; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8;">#</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left;">Name</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Bins</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Earned</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">$/Bin</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">$/Hr</th>
                </tr></thead>
                <tbody>${costTableRow(top5Eff, false)}</tbody>
            </table>
        </div>
        <div style="flex: 1;">
            <div class="section-title" style="color: #dc2626;">⚠ Top 5 Most Costly <span style="font-weight: 400; color: #94a3b8; font-size: 9px; margin-left: 4px;">Highest $/bin</span></div>
            <table style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead><tr style="background: #fef2f2; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8;">#</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: left;">Name</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Bins</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">Earned</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">$/Bin</th>
                    <th style="padding: 4px 8px; font-size: 8px; text-transform: uppercase; color: #94a3b8; text-align: right;">$/Hr</th>
                </tr></thead>
                <tbody>${costTableRow(bottom5Eff, true)}</tbody>
            </table>
        </div>
    </div>
</div>

<!-- ═══ PER-TEAM BREAKDOWN (one page per team) ═══ -->
${teamBreakdownHtml}

<!-- ═══ FOOTER ═══ -->
<div style="margin: 8px 30px 0; background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 6px; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center;">
    <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 12px;">🍒</span>
        <span style="font-size: 10px; font-weight: 800; color: white;">HarvestPro<span style="color: #22d3ee;">NZ</span></span>
        <span style="font-size: 8px; color: rgba(255,255,255,0.3);">•</span>
        <span style="font-size: 8px; color: rgba(255,255,255,0.4);">${periodLabel}</span>
    </div>
    <span style="font-size: 8px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.5px;">Confidential — Internal use only</span>
</div>

</body></html>`;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 500);
        }
        setShowExportModal(false);
    };

    const kpiCards = [
        { icon: 'inventory_2', label: 'Total Bins', value: totalBuckets.toString(), gradient: 'from-sky-50 to-blue-50', iconBg: 'bg-sky-100 text-sky-600' },
        { icon: 'schedule', label: 'Total Hours', value: `${totalHours.toFixed(0)}h`, gradient: 'from-amber-50 to-orange-50', iconBg: 'bg-amber-100 text-amber-600' },
        { icon: 'payments', label: 'Total Labour', value: `$${totalEarnings.toFixed(0)}`, gradient: 'from-emerald-50 to-teal-50', iconBg: 'bg-emerald-100 text-emerald-600' },
        { icon: 'speed', label: 'Avg Bins/Hr', value: avgBPA.toFixed(1), gradient: 'from-purple-50 to-violet-50', iconBg: 'bg-purple-100 text-purple-600' },
        { icon: 'attach_money', label: 'Cost/Bin', value: `$${costPerBin.toFixed(2)}`, gradient: 'from-rose-50 to-pink-50', iconBg: 'bg-rose-100 text-rose-600' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-5 max-w-5xl mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <LoadingSkeleton type="metric" count={5} />
                </div>
                <LoadingSkeleton type="card" count={2} />
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-text-main">Weekly Report</h2>
                    <p className="text-xs text-text-muted">{orchard?.name || 'Orchard'} — {new Date().toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary glow-primary text-white font-bold text-sm hover:scale-105 transition-all active:scale-95 shadow-lg"
                >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Export Report
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {kpiCards.map((card, i) => (
                    <div key={card.label} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-white/80 dash-card-enter`} style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg} shadow-sm`}>
                                <span className="material-symbols-outlined text-base">{card.icon}</span>
                            </div>
                            <span className="text-[10px] text-text-sub uppercase font-bold tracking-wider">{card.label}</span>
                        </div>
                        <p className="text-2xl font-black text-text-main">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Harvest Velocity */}
                <div className="glass-card card-hover p-5 relative overflow-hidden group section-enter stagger-3">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                        <span className="material-symbols-outlined text-7xl text-emerald-400">show_chart</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-base text-emerald-500">show_chart</span>
                            </div>
                            Harvest Velocity
                        </h3>
                        <p className="text-xs text-text-muted mb-3 ml-10">Daily bins produced — 7 day trend</p>
                        <TrendLineChart
                            data={binsTrend}
                            targetLine={dailyBinTarget}
                            targetLabel="Daily Target"
                            colorTheme="emerald"
                            valueSuffix=" bins"
                            higherIsBetter={true}
                            height={200}
                            onPointClick={(point) => {
                                if (point.meta) {
                                    setSelectedDayMeta(prev =>
                                        prev?.date === point.meta?.date ? null : point.meta!
                                    );
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Workforce */}
                <div className="glass-card card-hover p-5 relative overflow-hidden group section-enter stagger-4">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                        <span className="material-symbols-outlined text-7xl text-blue-300">group</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-base text-blue-500">group</span>
                            </div>
                            Workforce Size
                        </h3>
                        <p className="text-xs text-text-muted mb-3 ml-10">Active pickers per day</p>
                        <TrendLineChart
                            data={workforceTrend}
                            colorTheme="blue"
                            valueSuffix=" pickers"
                            higherIsBetter={true}
                            height={200}
                            onPointClick={(point) => {
                                if (point.meta) {
                                    setSelectedDayMeta(prev =>
                                        prev?.date === point.meta?.date ? null : point.meta!
                                    );
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Day Detail Panel (appears on chart dot click) */}
            {selectedDayMeta && (
                <div className="relative bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-5 animate-fade-in shadow-sm">
                    <button
                        onClick={() => setSelectedDayMeta(null)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm text-slate-500">close</span>
                    </button>

                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-base text-indigo-500">calendar_today</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">
                                {selectedDayMeta.date ? new Date(selectedDayMeta.date + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Day Detail'}
                            </h4>
                            <p className="text-xs text-slate-500">{selectedDayMeta.orchardName || 'Orchard'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Pickers</p>
                            <p className="text-lg font-black text-slate-800">{selectedDayMeta.totalPickers}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Buckets</p>
                            <p className="text-lg font-black text-slate-800">{selectedDayMeta.totalBuckets}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tons</p>
                            <p className="text-lg font-black text-slate-800">{selectedDayMeta.totalTons?.toFixed(1)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Cost/Bin</p>
                            <p className="text-lg font-black text-slate-800">${selectedDayMeta.costPerBin?.toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Top-Up</p>
                            <p className={`text-lg font-black ${(selectedDayMeta.topUpCost || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                ${(selectedDayMeta.topUpCost || 0).toFixed(0)}
                            </p>
                        </div>
                    </div>

                    {selectedDayMeta.teams && selectedDayMeta.teams.length > 0 && (
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">groups</span>
                                Teams on Site
                            </h5>
                            <div className="space-y-2">
                                {selectedDayMeta.teams.map((team, idx) => {
                                    const maxBuckets = Math.max(...(selectedDayMeta.teams?.map(t => t.buckets) || [1]));
                                    return (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-slate-700 w-28 truncate">{team.name}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${(team.buckets / maxBuckets) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 w-20 text-right">
                                                {team.pickers}p / {team.buckets}b
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Team Rankings */}
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 dash-card-enter" style={{ animationDelay: '250ms' }}>
                <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">emoji_events</span>
                    Team Rankings
                </h3>
                {teamRankings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-3xl text-slate-300">leaderboard</span>
                        </div>
                        <p className="text-sm font-bold text-text-sub">No team data</p>
                        <p className="text-xs text-text-muted mt-1">Rankings appear as data flows in</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {teamRankings.map((team, i) => (
                            <div key={team.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 hover:shadow-sm transition-all">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-sm ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' : 'bg-slate-100 text-text-muted'}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-text-main">{team.name}</span>
                                    <span className="text-xs text-text-muted ml-2">({team.count} pickers)</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-text-main">{team.bpa.toFixed(1)} bins/hr</p>
                                    <p className="text-[10px] text-text-muted">{team.buckets} bins • ${team.earnings.toFixed(0)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Top 10 Pickers */}
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 dash-card-enter" style={{ animationDelay: '350ms' }}>
                <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">star</span>
                    Top 10 Pickers
                </h3>
                {pickers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-3xl text-slate-300">person_search</span>
                        </div>
                        <p className="text-sm font-bold text-text-sub">No pickers yet</p>
                        <p className="text-xs text-text-muted mt-1">Picker stats appear as scans are submitted</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {[...pickers].sort((a, b) => b.buckets - a.buckets).slice(0, 10).map((p, i) => (
                            <div key={p.picker_id} onClick={() => openProfile(p.picker_id)} className="flex items-center gap-3 py-2.5 px-2 -mx-2 border-b border-border-light last:border-0 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-text-muted'}`}>{i + 1}</span>
                                <span className="flex-1 text-sm font-medium text-text-main hover:text-indigo-600 transition-colors">{p.picker_name}</span>
                                <span className="text-xs text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-full">{p.buckets} bins</span>
                                <span className="text-xs text-text-muted">{p.hours_worked.toFixed(1)}h</span>
                                <span className="text-xs text-emerald-600 font-bold">${p.total_earnings.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ EXPORT OPTIONS MODAL ═══ */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowExportModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <span className="material-symbols-outlined text-xl">download</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Export Report</h3>
                                        <p className="text-xs text-white/60">Choose sections and format</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Format Toggle */}
                        <div className="p-5 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Format</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setExportFormat('pdf')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${exportFormat === 'pdf'
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                    PDF Report
                                </button>
                                <button
                                    onClick={() => setExportFormat('csv')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${exportFormat === 'csv'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-lg">table_chart</span>
                                    CSV (Excel)
                                </button>
                            </div>
                        </div>

                        {/* Section Toggles */}
                        {exportFormat === 'pdf' && (
                            <div className="p-5 space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sections to include</p>
                                {[
                                    { key: 'summary' as const, icon: 'dashboard', label: 'Summary KPIs', desc: 'Total bins, hours, cost, earnings' },
                                    { key: 'charts' as const, icon: 'trending_up', label: 'Trend Charts', desc: 'Harvest velocity & workforce 7-day sparklines' },
                                    { key: 'teams' as const, icon: 'groups', label: 'Team Rankings', desc: 'Team bars with efficiency and earnings' },
                                    { key: 'pickerDetail' as const, icon: 'table_chart', label: 'Detailed Picker Spreadsheet', desc: 'All pickers: sticker #, buckets, hours, earnings, top-up' },
                                ].map(section => (
                                    <label
                                        key={section.key}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${exportSections[section.key]
                                            ? 'border-indigo-200 bg-indigo-50/50'
                                            : 'border-slate-100 bg-white hover:bg-slate-50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={exportSections[section.key]}
                                            onChange={() => toggleSection(section.key)}
                                            className="w-4 h-4 accent-indigo-500 rounded"
                                        />
                                        <div className={`p-1.5 rounded-lg ${exportSections[section.key] ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <span className="material-symbols-outlined text-base">{section.icon}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-800">{section.label}</div>
                                            <div className="text-[10px] text-slate-400">{section.desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        {exportFormat === 'csv' && (
                            <div className="p-5">
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-emerald-600">info</span>
                                        <span className="text-sm font-bold text-emerald-800">CSV Export</span>
                                    </div>
                                    <p className="text-xs text-emerald-700">Exports ALL pickers with complete data: Sticker ID, Name, Team, Buckets, Hours, Bins/Hr, Piece Rate, Top-Up, Total Earnings, Below Minimum flag. Opens directly in Excel.</p>
                                </div>
                            </div>
                        )}

                        {/* Export Button */}
                        <div className="p-5 pt-0">
                            <button
                                onClick={exportFormat === 'pdf' ? handleExportPDF : handleExportCSV}
                                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${exportFormat === 'pdf'
                                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/25'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25'
                                    }`}
                            >
                                <span className="material-symbols-outlined">download</span>
                                {exportFormat === 'pdf' ? 'Generate PDF' : 'Download CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyReportView;
