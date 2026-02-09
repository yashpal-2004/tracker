import React, { useState, useEffect, useMemo } from 'react';
import {
    Moon,
    Sun,
    Clock,
    Plus,
    Trash2,
    Calendar,
    Info,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Battery,
    Coffee,
    X,
    Star,
    Zap,
    AlertCircle,
    CheckCircle2,
    Edit2
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    ReferenceLine,
    ComposedChart,
    Line,
    Scatter
} from 'recharts';
import { db, SLEEP_COLLECTION } from './firebase';
import {
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    limit,
    where
} from 'firebase/firestore';
import './SleepTracker.css';

const SleepTracker = () => {
    const [sleepLogs, setSleepLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // View Controls
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week'); // 'week', 'month'

    // User Rules: 7.5h total. Ideally 6h night + 1.5h nap.
    const TARGET_SLEEP = 7.5;

    const [formData, setFormData] = useState({
        date: new Date().toLocaleDateString('en-CA'),
        sleepTime: '23:00',
        wakeTime: '05:00',
        napSleepTime: '',
        napWakeTime: '',
        quality: 3,
        notes: ''
    });

    useEffect(() => {
        const q = query(SLEEP_COLLECTION, orderBy('date', 'desc'), limit(100)); // Increased limit for monthly views
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = [];
            snapshot.forEach((doc) => {
                logs.push({ id: doc.id, ...doc.data() });
            });
            setSleepLogs(logs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const calculateDuration = (sleep, wake, napSleep = '', napWake = '') => {
        const sleepDate = new Date(`2000-01-01T${sleep}:00`);
        let wakeDate = new Date(`2000-01-01T${wake}:00`);
        if (wakeDate <= sleepDate) wakeDate = new Date(`2000-01-02T${wake}:00`);
        let mainDuration = (wakeDate - sleepDate) / (1000 * 60 * 60);

        let napDuration = 0;
        if (napSleep && napWake) {
            const nSleep = new Date(`2000-01-01T${napSleep}:00`);
            let nWake = new Date(`2000-01-01T${napWake}:00`);
            if (nWake <= nSleep) nWake = new Date(`2000-01-02T${napWake}:00`);
            napDuration = (nWake - nSleep) / (1000 * 60 * 60);
        }

        return { total: mainDuration + napDuration, nap: napDuration, main: mainDuration };
    };

    const timeToDecimal = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
    };

    const [editingLog, setEditingLog] = useState(null);

    // ... (rest of state)

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        const { total, nap } = calculateDuration(
            formData.sleepTime,
            formData.wakeTime,
            formData.napSleepTime,
            formData.napWakeTime
        );

        const payload = {
            ...formData,
            totalDuration: total,
            napDuration: nap,
            sleepDecimal: timeToDecimal(formData.sleepTime),
            wakeDecimal: timeToDecimal(formData.wakeTime),
            createdAt: editingLog ? editingLog.createdAt : Date.now()
        };

        try {
            if (editingLog) {
                await updateDoc(doc(db, 'sleepLogs', editingLog.id), payload);
                setEditingLog(null);
            } else {
                await addDoc(SLEEP_COLLECTION, payload);
            }
            setShowModal(false);
            setFormData({
                date: new Date().toLocaleDateString('en-CA'),
                sleepTime: '23:00',
                wakeTime: '05:00',
                napSleepTime: '',
                napWakeTime: '',
                quality: 3,
                notes: ''
            });
        } catch (err) {
            console.error("Error saving sleep log:", err);
        }
    };

    const handleEditClick = (log) => {
        setEditingLog(log);
        setFormData({
            date: log.date,
            sleepTime: log.sleepTime,
            wakeTime: log.wakeTime,
            napSleepTime: log.napSleepTime || '',
            napWakeTime: log.napWakeTime || '',
            quality: log.quality,
            notes: log.notes || ''
        });
        setShowModal(true);
    };

    const deleteLog = async (id) => {
        if (window.confirm('Delete this sleep log?')) {
            try {
                await deleteDoc(doc(db, 'sleepLogs', id));
            } catch (err) {
                console.error("Error deleting log:", err);
            }
        }
    };

    const navMonth = (dir) => {
        setViewDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + dir);
            return d;
        });
    };

    const formatTimeTick = (decimalTime) => {
        let val = decimalTime;
        if (val >= 24) val -= 24;
        const h = Math.floor(val);
        const m = Math.round((val - h) * 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`;
    };

    const stats = useMemo(() => {
        if (sleepLogs.length === 0) return null;

        const sorted = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));

        let filteredLogs = [];
        const monthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

        if (viewMode === 'all') {
            filteredLogs = sorted;
        } else if (viewMode === 'month') {
            filteredLogs = sorted.filter(log => log.date.startsWith(monthPrefix));
        } else if (viewMode === 'week') {
            filteredLogs = sorted.slice(-7);
        }

        filteredLogs.sort((a, b) => a.date.localeCompare(b.date));

        const avgDuration = filteredLogs.length > 0
            ? filteredLogs.reduce((acc, log) => acc + log.totalDuration, 0) / filteredLogs.length
            : 0;

        const totalLoggedDays = filteredLogs.length;
        const lastLog = sorted[sorted.length - 1];

        let guidance = "";
        let guidanceType = "neutral";
        if (lastLog) {
            const { totalDuration, napDuration } = lastLog;
            if (totalDuration < 5.5) {
                guidance = "Critical rest deficit. Prioritize a 90-min nap or early bedtime.";
                guidanceType = "warning";
            } else if (napDuration > 1.6) {
                guidance = `Total sleep ${totalDuration.toFixed(1)}h is good, but keep naps < 1.5h.`;
                guidanceType = "info";
            } else if (totalDuration >= 7.3 && totalDuration <= 7.8) {
                if (napDuration > 0) {
                    guidance = "Perfect balance! ~6h night + nap hits the sweet spot.";
                } else {
                    guidance = "Solid 7.5h block execution.";
                }
                guidanceType = "success";
            } else if (totalDuration < 7.3) {
                guidance = `Missed target (Logged: ${totalDuration.toFixed(1)}h). Aim to recover tonite.`;
                guidanceType = "warning";
            } else {
                guidance = "You're well rested. Maintain this baseline.";
                guidanceType = "success";
            }
        }

        // Prepare data for Consistency Graph (Range Bar Chart)
        // Chart Y-axis: 18 (6 PM) to 34 (10 AM next day)
        // Normalization rules:
        // - Bedtime 18:00-23:59 → keep as-is (18-23.99)
        // - Bedtime 00:00-11:59 → add 24 (24-35.99) to show as "next day early morning"
        // - Wake time (usually morning) → add 24 if < 12 to show as next day
        const chartData = filteredLogs.map(log => {
            let start = log.sleepDecimal;
            let end = log.wakeDecimal;

            // Normalize bedtime
            // If bedtime is after 6 PM (18:00), keep it
            // If bedtime is before 6 PM, it's likely early morning (e.g., 1 AM), add 24
            if (start < 18 && start >= 0) {
                start += 24; // Early morning bedtime (00:00 - 05:59) becomes 24-29.99
            }

            // Normalize wake time
            // Wake time is almost always in the morning, so add 24 if it's before noon
            if (end < 18) {
                end += 24;
            }

            // Ensure end is after start (handle edge cases)
            if (end <= start) {
                end += 24;
            }


            return {
                day: new Date(log.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
                range: [start, end],
                duration: parseFloat(log.totalDuration.toFixed(1)),
                quality: log.quality,
                nap: log.napDuration || 0
            };
        });

        return {
            avgDuration: avgDuration.toFixed(1),
            totalDays: totalLoggedDays,
            chartData,
            lastLog,
            monthName: viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
            guidance,
            guidanceType
        };
    }, [sleepLogs, viewDate, viewMode]);

    const getQualityColor = (q) => {
        if (q >= 4) return '#22c55e';
        if (q === 3) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading sleep data...</div>;

    return (
        <div className="sleep-tracker-section glass">
            {/* Header */}
            <div className="sleep-header">
                <div className="sleep-title-group">
                    <div className="icon-badge">
                        <Moon size={22} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="section-title">Sleep Tracker</h3>
                        <p className="section-subtitle">Target: 7.5h (6h Night + 1.5h Nap)</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="view-toggle glass-toggle">
                        <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Week</button>
                        <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Month</button>
                        <button className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')}>All</button>
                    </div>
                    <button className="add-sleep-btn" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>Log Sleep</span>
                    </button>
                </div>
            </div>

            {stats && stats.lastLog ? (
                <>
                    {/* Stats Overview */}
                    <div className="insights-grid">
                        <div className="insight-card" style={{ gridColumn: 'span 3', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="card-label">Avg Duration ({viewMode === 'all' ? 'All Time' : viewMode === 'week' ? 'Last 7 Days' : stats.monthName})</span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span className="card-value">{stats.avgDuration}h</span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 7.5h Target</span>
                                </div>
                            </div>
                            {viewMode === 'month' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button className="nav-mini-btn" onClick={() => navMonth(-1)}><ChevronLeft size={16} /></button>
                                    <span style={{ fontWeight: 700, color: '#334155' }}>{stats.monthName}</span>
                                    <button className="nav-mini-btn" onClick={() => navMonth(1)}><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Guidance Box */}
                    <div className={`guidance-box ${stats.guidanceType}`}>
                        {stats.guidanceType === 'success' ? <CheckCircle2 size={18} /> :
                            stats.guidanceType === 'warning' ? <AlertCircle size={18} /> :
                                <Info size={18} />}
                        <span>{stats.guidance}</span>
                    </div>

                    {/* Sleep Duration Chart */}
                    <div className="sleep-analytics-detailed">
                        <div className="analytics-header">
                            <TrendingUp size={16} />
                            <span>Sleep Duration & Quality Trends</span>
                        </div>
                        <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={stats.chartData}
                                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <filter id="shadow3d_sleep_dur" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                            <feOffset dx="2" dy="4" result="offsetblur" />
                                            <feComponentTransfer>
                                                <feFuncA type="linear" slope="0.2" />
                                            </feComponentTransfer>
                                            <feMerge>
                                                <feMergeNode />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                        dy={10}
                                        interval={viewMode === 'month' ? 4 : 0}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                        domain={[0, 12]}
                                        ticks={[0, 2, 4, 6, 8, 10, 12]}
                                        label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b', fontWeight: 700 } }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                const startVal = data.range[0];
                                                const endVal = data.range[1];
                                                const startStr = formatTimeTick(startVal);
                                                const endStr = formatTimeTick(endVal);
                                                return (
                                                    <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{label}</p>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                            🌙 Bedtime: <strong style={{ color: '#4f46e5' }}>{startStr}</strong>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                            ☀️ Wake: <strong style={{ color: '#4f46e5' }}>{endStr}</strong>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                                                            Total: <strong style={{ color: '#10b981', fontSize: '12px' }}>{data.duration}h</strong>
                                                            {data.nap > 0 && <span style={{ color: '#f59e0b', marginLeft: '4px' }}>(+{data.nap.toFixed(1)}h nap)</span>}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                                                            Quality: {'⭐'.repeat(data.quality)}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <ReferenceLine y={7.5} yAxisId="left" stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target (7.5h)', position: 'insideTopRight', fontSize: 10, fill: '#10b981', fontWeight: 700 }} />
                                    <ReferenceLine y={6} yAxisId="left" stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Min (6h)', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />

                                    <Bar yAxisId="left" dataKey="duration" radius={[8, 8, 0, 0]} barSize={40} style={{ filter: 'url(#shadow3d_sleep_dur)' }}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.duration >= 7.3 ? '#10b981' : entry.duration >= 6 ? '#818cf8' : '#ef4444'} fillOpacity={0.85} />
                                        ))}
                                    </Bar>
                                    <Line yAxisId="left" type="monotone" dataKey="duration" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5', r: 4 }} style={{ filter: 'url(#shadow3d_sleep_dur)' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></div>
                                <span>Excellent (≥7.3h)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#818cf8' }}></div>
                                <span>Good (6-7.3h)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></div>
                                <span>Insufficient (&lt;6h)</span>
                            </div>
                        </div>
                    </div>

                    {/* Sleep Schedule Consistency Chart */}
                    <div className="sleep-analytics-detailed" style={{ marginTop: '24px' }}>
                        <div className="analytics-header">
                            <Clock size={16} />
                            <span>Sleep Schedule Consistency</span>
                        </div>
                        <div style={{ height: '280px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={stats.chartData.map(d => ({
                                        ...d,
                                        bedtimeDisplay: d.range[0],
                                        wakeDisplay: d.range[1]
                                    }))}
                                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <filter id="shadow3d_sleep_con" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                            <feOffset dx="2" dy="4" result="offsetblur" />
                                            <feComponentTransfer>
                                                <feFuncA type="linear" slope="0.2" />
                                            </feComponentTransfer>
                                            <feMerge>
                                                <feMergeNode />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                        dy={10}
                                        interval={viewMode === 'month' ? 4 : 0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                        domain={[18, 34]}
                                        ticks={[18, 20, 22, 24, 26, 28, 30, 32, 34]}
                                        tickFormatter={formatTimeTick}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                const bedStr = formatTimeTick(data.bedtimeDisplay);
                                                const wakeStr = formatTimeTick(data.wakeDisplay);
                                                return (
                                                    <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{label}</p>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                            🌙 Bedtime: <strong style={{ color: '#8b5cf6' }}>{bedStr}</strong>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            ☀️ Wake: <strong style={{ color: '#f59e0b' }}>{wakeStr}</strong>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <ReferenceLine y={24} stroke="#8b5cf6" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'Target Bedtime (12 AM)', position: 'insideTopLeft', fontSize: 9, fill: '#8b5cf6' }} />
                                    <ReferenceLine y={31.5} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'Target Wake (7:30 AM)', position: 'insideBottomLeft', fontSize: 9, fill: '#f59e0b' }} />

                                    <Line type="monotone" dataKey="bedtimeDisplay" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: 'white' }} name="Bedtime" style={{ filter: 'url(#shadow3d_sleep_con)' }} />
                                    <Line type="monotone" dataKey="wakeDisplay" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: 'white' }} name="Wake Time" style={{ filter: 'url(#shadow3d_sleep_con)' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '3px', borderRadius: '2px', background: '#8b5cf6' }}></div>
                                <span>🌙 Bedtime</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                                <div style={{ width: '16px', height: '3px', borderRadius: '2px', background: '#f59e0b' }}></div>
                                <span>☀️ Wake Time</span>
                            </div>
                        </div>
                    </div>

                    {/* Simple List for Context */}
                    <div className="sleep-history-list">
                        <div className="list-header">Logs & Notes</div>
                        {[...stats.chartData].reverse().slice(0, 5).map((d, i) => {
                            const log = sleepLogs.find(l =>
                                new Date(l.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }) === d.day &&
                                parseFloat(l.totalDuration.toFixed(1)) === d.duration
                            );

                            return log ? (
                                <div key={log.id} className="sleep-history-item">
                                    <div className="log-left">
                                        <div className="log-date-badge">
                                            <span className="day">{new Date(log.date).toLocaleDateString('default', { weekday: 'short' })}</span>
                                            <span className="date">{new Date(log.date).getDate()}</span>
                                        </div>
                                        <div className="log-details">
                                            <div className="metric-row">
                                                <div className="time-badge">
                                                    <Moon size={12} /> {formatTimeTick(timeToDecimal(log.sleepTime))} - {formatTimeTick(timeToDecimal(log.wakeTime))}
                                                </div>
                                                {log.napDuration > 0 && (
                                                    <div className="nap-badge">
                                                        <Coffee size={10} /> +{log.napDuration.toFixed(1)}h
                                                    </div>
                                                )}
                                            </div>
                                            <div className="rating-row">
                                                {[...Array(5)].map((_, idx) => (
                                                    <Star
                                                        key={idx}
                                                        size={10}
                                                        fill={idx < log.quality ? getQualityColor(log.quality) : "#e2e8f0"}
                                                        stroke="none"
                                                    />
                                                ))}
                                                <span className="notes-preview">{log.notes}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button className="delete-mini-btn edit" onClick={() => handleEditClick(log)} title="Edit Log">
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="delete-mini-btn" onClick={() => deleteLog(log.id)} title="Delete Log">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : null;
                        })}
                    </div>
                </>
            ) : (
                <div className="empty-sleep-state">
                    <div className="empty-icon-wrapper">
                        <Moon size={32} />
                    </div>
                    <h3>Start Tracking Your Sleep</h3>
                    <p>Log your first night's sleep to unlock insights about your rest patterns.</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="habit-modal-overlay">
                    <div className="habit-modal sleep-modal">
                        <div className="modal-header">
                            <h2>{editingLog ? 'Edit Sleep Log' : 'Log Night\'s Sleep'}</h2>
                            <button className="action-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>
                        <form className="modal-form" onSubmit={handleAddSubmit}>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label><Moon size={14} style={{ marginRight: '4px' }} /> Bedtime</label>
                                    <input
                                        type="time"
                                        value={formData.sleepTime}
                                        onChange={e => setFormData({ ...formData, sleepTime: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label><Sun size={14} style={{ marginRight: '4px' }} /> Wake Up</label>
                                    <input
                                        type="time"
                                        value={formData.wakeTime}
                                        onChange={e => setFormData({ ...formData, wakeTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label><Coffee size={14} style={{ marginRight: '4px' }} /> Daytime Nap (Max 1.5h)</label>
                                <div className="form-row">
                                    <div className="form-group">
                                        <span className="sub-label">Start</span>
                                        <input
                                            type="time"
                                            value={formData.napSleepTime}
                                            onChange={e => setFormData({ ...formData, napSleepTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <span className="sub-label">End</span>
                                        <input
                                            type="time"
                                            value={formData.napWakeTime}
                                            onChange={e => setFormData({ ...formData, napWakeTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <div className="label-row">
                                    <label>Sleep Quality</label>
                                    <span className="value-display">{formData.quality}/5</span>
                                </div>
                                <div className="quality-range-wrapper">
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="1"
                                        value={formData.quality}
                                        onChange={e => setFormData({ ...formData, quality: parseInt(e.target.value) })}
                                        className="quality-slider"
                                    />
                                    <div className="range-labels">
                                        <span>Groggy</span>
                                        <span>Refreshed</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    className="notes-area"
                                    placeholder="Any disturbances? Dreams? Pre-sleep habits?"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <button className="add-habit-btn" type="submit">
                                Save Sleep Log
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SleepTracker;
