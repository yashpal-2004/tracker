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
    X
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
    Cell
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

    const [formData, setFormData] = useState({
        date: new Date().toLocaleDateString('en-CA'),
        sleepTime: '23:00',
        wakeTime: '07:00',
        napSleepTime: '',
        napWakeTime: '',
        quality: 3, // 1-5
        notes: ''
    });

    useEffect(() => {
        const q = query(SLEEP_COLLECTION, orderBy('date', 'desc'), limit(30));
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

        return { total: mainDuration + napDuration, nap: napDuration };
    };

    const timeToDecimal = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        const { total, nap } = calculateDuration(
            formData.sleepTime,
            formData.wakeTime,
            formData.napSleepTime,
            formData.napWakeTime
        );

        try {
            await addDoc(SLEEP_COLLECTION, {
                ...formData,
                totalDuration: total,
                napDuration: nap,
                sleepDecimal: timeToDecimal(formData.sleepTime),
                wakeDecimal: timeToDecimal(formData.wakeTime),
                createdAt: Date.now()
            });
            setShowModal(false);
            setFormData({
                date: new Date().toLocaleDateString('en-CA'),
                sleepTime: '23:00',
                wakeTime: '07:00',
                napSleepTime: '',
                napWakeTime: '',
                quality: 3,
                notes: ''
            });
        } catch (err) {
            console.error("Error adding sleep log:", err);
        }
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

    const stats = useMemo(() => {
        if (sleepLogs.length === 0) return { avg: 0, last: 0, trend: [] };

        const sorted = [...sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
        const last = sorted[sorted.length - 1].totalDuration;
        const avg = sorted.reduce((acc, log) => acc + log.totalDuration, 0) / sorted.length;

        const trend = sorted.slice(-10).map(log => {
            // Adjust sleep time for chart readability: if sleep is late (e.g. 23:00), we want it near wake time
            // We'll treat hours after 18:00 as negative relative to midnight for the line chart effectively?
            // Actually, let's just use raw decimal hours for the Line chart but maybe separate ranges.
            return {
                day: new Date(log.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
                duration: parseFloat(log.totalDuration.toFixed(1)),
                sleep: log.sleepDecimal,
                wake: log.wakeDecimal,
                nap: log.napDuration || 0
            };
        });

        return {
            avg: avg.toFixed(1),
            last: last.toFixed(1),
            trend
        };
    }, [sleepLogs]);

    if (loading) return null;

    return (
        <div className="sleep-tracker-section glass">
            <div className="sleep-header">
                <div className="sleep-title-group">
                    <div className="icon-badge">
                        <Moon size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Sleep Tracker</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Track your rest and recovery metrics.</p>
                    </div>
                </div>
                <button className="add-sleep-btn" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Log Sleep</span>
                </button>
            </div>

            <div className="sleep-analytics-detailed">
                <div className="analytics-header">
                    <TrendingUp size={16} />
                    <span>Sleep & Wake Trends</span>
                </div>
                <div style={{ height: '220px', width: '100%', marginTop: '16px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.trend}>
                            <defs>
                                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' } }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="duration"
                                stroke="#818cf8"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorDuration)"
                                name="Total Sleep"
                            />
                            <Area
                                type="monotone"
                                dataKey="nap"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fill="#f59e0b"
                                fillOpacity={0.1}
                                name="Nap Duration"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ height: '180px', width: '100%', marginTop: '24px' }}>
                    <div className="analytics-header">
                        <Clock size={16} />
                        <span>Sleep/Wake Times (24h)</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.trend} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                            />
                            <YAxis
                                domain={[0, 24]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                ticks={[0, 6, 12, 18, 24]}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="sleep" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Sleep Time" />
                            <Bar dataKey="wake" fill="#10b981" radius={[4, 4, 0, 0]} name="Wake Time" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="sleep-history-list">
                {sleepLogs.length === 0 ? (
                    <div className="empty-sleep-state">
                        <Info size={16} />
                        <span>No sleep logs yet. Rest is the foundation of success!</span>
                    </div>
                ) : (
                    sleepLogs.slice(0, 3).map(log => (
                        <div key={log.id} className="sleep-history-item">
                            <div className="log-date">
                                <span className="day">{new Date(log.date).toLocaleDateString('default', { weekday: 'short' })}</span>
                                <span className="date">{new Date(log.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="log-times">
                                <div className="time-block">
                                    <Moon size={12} /> {log.sleepTime}
                                </div>
                                <div className="time-block">
                                    <Sun size={12} /> {log.wakeTime}
                                </div>
                            </div>
                            <div className="log-duration">
                                <span className="dur-val">{log.totalDuration.toFixed(1)}h</span>
                                {log.napDuration > 0 && (
                                    <span className="nap-tag" title={`${log.napSleepTime} - ${log.napWakeTime}`}>
                                        +{log.napDuration.toFixed(1)}h nap ({log.napSleepTime}-{log.napWakeTime})
                                    </span>
                                )}
                            </div>
                            <button className="delete-log-btn" onClick={() => deleteLog(log.id)}>
                                <X size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="habit-modal-overlay">
                    <div className="habit-modal sleep-modal">
                        <div className="modal-header">
                            <h2>Log Night's Sleep</h2>
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
                                    <label><Moon size={14} style={{ marginRight: '4px' }} /> Sleep Time</label>
                                    <input
                                        type="time"
                                        value={formData.sleepTime}
                                        onChange={e => setFormData({ ...formData, sleepTime: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label><Sun size={14} style={{ marginRight: '4px' }} /> Wake Time</label>
                                    <input
                                        type="time"
                                        value={formData.wakeTime}
                                        onChange={e => setFormData({ ...formData, wakeTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label><Coffee size={14} style={{ marginRight: '4px' }} /> Daytime Nap</label>
                                <div className="form-row">
                                    <div className="form-group">
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Start</span>
                                        <input
                                            type="time"
                                            value={formData.napSleepTime}
                                            onChange={e => setFormData({ ...formData, napSleepTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>End</span>
                                        <input
                                            type="time"
                                            value={formData.napWakeTime}
                                            onChange={e => setFormData({ ...formData, napWakeTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Sleep Quality</label>
                                <div className="quality-selector">
                                    {[1, 2, 3, 4, 5].map(q => (
                                        <button
                                            key={q}
                                            type="button"
                                            className={`quality-btn ${formData.quality === q ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, quality: q })}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                <div className="quality-labels">
                                    <span>Poor</span>
                                    <span>Excellent</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    placeholder="How did you feel?"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <button className="add-habit-btn" style={{ width: '100%', marginTop: '12px' }} type="submit">
                                Save Log
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SleepTracker;
