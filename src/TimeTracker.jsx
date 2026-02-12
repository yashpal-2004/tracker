import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock,
    Plus,
    Trash2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    X,
    Edit2,
    BookOpen,
    Briefcase,
    Timer,
    CheckCircle2,
    Zap,
    BarChart2,
    Filter,
    Activity,
    Moon,
    Utensils,
    Soup,
    Heart,
    MessageCircle,
    Coffee
} from 'lucide-react';
import {
    PieChart,
    Pie,
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
    ComposedChart,
    Line,
    LineChart,
    Legend
} from 'recharts';
import { db, TIME_TRACKER_COLLECTION } from './firebase';
import {
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    collection
} from 'firebase/firestore';
import { SLEEP_COLLECTION } from './firebase';
import './TimeTracker.css';

const CATEGORY_COLORS = {
    'Study': '#3730a3',    // Dark Indigo
    'Work': '#b45309',     // Dark Amber
    'Waste': '#b91c1c',    // Dark Red
    'Meal': '#059669',     // Emerald Green
    'Health': '#e11d48',    // Vibrant Rose/Red
    'Miscellaneous': '#6b21a8', // Rich Purple
    'Social': '#a21caf',   // Deep Fuchsia
    'Sleep': '#1d4ed8',    // Royal Blue
    'Break': '#0891b2',    // Teal/Cyan
    'Untracked': '#94a3b8' // Mid Slate for gap time
};

const formatTime12 = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const DayTimeline = ({ sessions }) => {
    const timeToPercent = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return ((h * 60 + (m || 0)) / (24 * 60)) * 100;
    };

    const sortedSessions = useMemo(() =>
        sessions.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        [sessions]);

    return (
        <div className="day-timeline-vertical-wrapper">
            <div className="day-timeline-container vertical glass">
                <div className="timeline-grid-vertical">
                    {Array.from({ length: 25 }, (_, i) => (
                        <div key={i} className="hour-marker-vertical" style={{ top: `${(i / 24) * 100}%` }}>
                            <span className="hour-text-vertical">{formatTime12(`${i}:00`)}</span>
                        </div>
                    ))}
                </div>
                <div className="timeline-bar-vertical">
                    {sortedSessions.map((session, idx) => {
                        let start = timeToPercent(session.startTime);
                        let end = timeToPercent(session.endTime);
                        let height = end - start;

                        // Height should already be handled by splitting in timelineSessions,
                        // but we keep this as a safety fallback for single-day renders.
                        if (height < 0) height = (100 - start) + end;

                        return (
                            <div
                                key={session.id || idx}
                                className={`timeline-block-vertical ${session.category.toLowerCase()}`}
                                style={{
                                    top: `${start}%`,
                                    height: `${Math.max(1, height)}%`,
                                    backgroundColor: CATEGORY_COLORS[session.category] || '#94a3b8',
                                    '--accent-color': CATEGORY_COLORS[session.category] || '#94a3b8'
                                }}
                            >
                                <div className="block-content">
                                    <span className="block-title">{session.title}</span>
                                    <span className="block-time">{formatTime12(session.startTime)} - {formatTime12(session.endTime)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const DayDistributionChart = ({ stats }) => {
    if (!stats) return null;

    const categories = [
        { key: 'Study', name: 'Study', color: CATEGORY_COLORS.Study },
        { key: 'Work', name: 'Work', color: CATEGORY_COLORS.Work },
        { key: 'Waste', name: 'Waste', color: CATEGORY_COLORS.Waste },
        { key: 'Meal', name: 'Meal', color: CATEGORY_COLORS.Meal },
        { key: 'Health', name: 'Health', color: CATEGORY_COLORS.Health },
        { key: 'Miscellaneous', name: 'Misc', color: CATEGORY_COLORS.Miscellaneous },
        { key: 'Social', name: 'Social', color: CATEGORY_COLORS.Social },
        { key: 'Sleep', name: 'Sleep', color: CATEGORY_COLORS.Sleep },
        { key: 'Break', name: 'Break', color: CATEGORY_COLORS.Break },
    ];

    const pieData = categories.map(cat => ({
        name: cat.name,
        value: parseFloat(stats[cat.key.toLowerCase()] || 0),
        color: cat.color
    })).filter(c => c.value > 0);

    // Add Untracked time to the chart if it exists
    const untrackedVal = parseFloat(stats.other || 0); // stats.other is the untracked duration
    if (untrackedVal > 0) {
        pieData.push({
            name: 'Untracked',
            value: untrackedVal,
            color: CATEGORY_COLORS.Untracked
        });
    }

    return (
        <div className="day-distribution-chart-container">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <defs>
                        <filter id="shadow3d_mini" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                            <feOffset dx="1" dy="2" result="offsetblur" />
                            <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
                            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="50%"
                        outerRadius="75%"
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={6}
                        style={{ filter: 'url(#shadow3d_mini)' }}
                        labelLine={false}
                        label={({ name, percent, x, y, cx }) => (
                            <text
                                x={x}
                                y={y}
                                fill="#475569"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                style={{ fontSize: '10px', fontWeight: 800 }}
                            >
                                {`${name}: ${(percent * 100).toFixed(0)}%`}
                            </text>
                        )}
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        formatter={(value) => [`${value}h`, 'Duration']}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

const TimeTracker = () => {
    const [logs, setLogs] = useState([]);
    const [sleepLogs, setSleepLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLog, setEditingLog] = useState(null);

    // View Controls
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week'); // 'week', 'month'
    const [filterCategory, setFilterCategory] = useState('All');
    const [statView, setStatView] = useState('month'); // 'all', 'month', 'week'
    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const [timelineDate, setTimelineDate] = useState(todayStr);

    // Suggestions & Custom Defaults
    const [customSuggestions, setCustomSuggestions] = useState(() => {
        const saved = localStorage.getItem('timeTracker_suggestions');
        return saved ? JSON.parse(saved) : [
            'DSA Practice', 'Web Dev Project', 'Mathematics', 'Email & Admin',
            'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Bathing', 'Gym', 'Cooking Food',
            'Social Media', 'Random Scrolling', 'Procrastination'
        ];
    });

    const [newSuggestion, setNewSuggestion] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [chartType, setChartType] = useState('pie');

    // Default Setting
    const [defaultCategory, setDefaultCategory] = useState(() => {
        return localStorage.getItem('timeTracker_defaultCategory') || 'Study';
    });

    const [formData, setFormData] = useState({
        title: '',
        category: defaultCategory,
        startTime: '',
        endTime: '',
        date: new Date().toLocaleDateString('en-CA'),
        notes: ''
    });

    useEffect(() => {
        try {
            const q = query(TIME_TRACKER_COLLECTION, orderBy('date', 'desc'), limit(500));
            const unsubscribeLogs = onSnapshot(q, (snapshot) => {
                const list = [];
                snapshot.forEach((doc) => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                setLogs(list);
            }, (error) => {
                console.error("Firestore error (logs):", error);
            });

            const qSleep = query(SLEEP_COLLECTION, orderBy('date', 'desc'), limit(100));
            const unsubscribeSleep = onSnapshot(qSleep, (snapshot) => {
                const list = [];
                snapshot.forEach((doc) => {
                    list.push({ id: doc.id, ...doc.data() });
                });
                setSleepLogs(list);
                setLoading(false);
            }, (error) => {
                console.error("Firestore error (sleep):", error);
                setLoading(false);
            });

            return () => {
                unsubscribeLogs();
                unsubscribeSleep();
            };
        } catch (err) {
            console.error("Setup error:", err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('timeTracker_defaultCategory', defaultCategory);
    }, [defaultCategory]);

    useEffect(() => {
        localStorage.setItem('timeTracker_suggestions', JSON.stringify(customSuggestions));
    }, [customSuggestions]);

    // Update form category when default changes (only for new logs)
    useEffect(() => {
        if (!editingLog) {
            setFormData(prev => ({ ...prev, category: defaultCategory }));
        }
    }, [defaultCategory, editingLog]);

    // Smart Category Prediction based on Title
    useEffect(() => {
        if (!formData.title || editingLog) return;

        const title = formData.title.trim().toLowerCase();

        // Manual override for common keywords
        if (['breakfast', 'lunch', 'dinner', 'snacks', 'eating', 'meal', 'cooking', 'making food', 'meal prep'].some(k => title.includes(k))) {
            setFormData(prev => ({ ...prev, category: 'Meal' }));
            return;
        }
        if (['gym', 'workout', 'exercise', 'self growth', 'growth', 'learning', 'self improvement'].some(k => title.includes(k))) {
            setFormData(prev => ({ ...prev, category: 'Health' }));
            return;
        }
        if (['bathing', 'shower', 'ready', 'bath', 'fresh', 'freshen'].some(k => title.includes(k))) {
            setFormData(prev => ({ ...prev, category: 'Miscellaneous' }));
            return;
        }
        if (['gf', 'talk', 'call', 'meeting', 'video call', 'talking'].some(k => title.includes(k))) {
            setFormData(prev => ({ ...prev, category: 'Social' }));
            return;
        }
        if (['break', 'rest', 'nap', 'relax', 'chilling'].some(k => title.includes(k))) {
            setFormData(prev => ({ ...prev, category: 'Break' }));
            return;
        }

        // Find the most recent session with the same title
        const lastSessionWithTitle = logs.find(l =>
            l.title.trim().toLowerCase() === title
        );

        if (lastSessionWithTitle) {
            setFormData(prev => ({ ...prev, category: lastSessionWithTitle.category }));
        }
    }, [formData.title, logs, editingLog]);

    const addSuggestion = (e) => {
        e.preventDefault();
        if (newSuggestion.trim() && !customSuggestions.includes(newSuggestion.trim())) {
            setCustomSuggestions(prev => [...prev, newSuggestion.trim()]);
            setNewSuggestion('');
        }
    };

    const removeSuggestion = (e, item) => {
        e.stopPropagation();
        setCustomSuggestions(prev => prev.filter(i => i !== item));
    };

    const calculateDuration = (start, end) => {
        if (!start || !end) return 0;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);

        let startMin = sH * 60 + sM;
        let endMin = eH * 60 + eM;

        if (endMin <= startMin) {
            // Assume session crossed midnight
            endMin += 24 * 60;
        }

        return (endMin - startMin) / 60; // Returns duration in hours
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duration = calculateDuration(formData.startTime, formData.endTime);

        const payload = {
            ...formData,
            duration,
            createdAt: editingLog ? editingLog.createdAt : Date.now()
        };

        try {
            if (editingLog) {
                await updateDoc(doc(db, 'timeTracker', editingLog.id), payload);
                setEditingLog(null);
            } else {
                await addDoc(TIME_TRACKER_COLLECTION, payload);
            }
            setShowModal(false);
            setFormData({
                title: '',
                category: defaultCategory,
                startTime: '',
                endTime: '',
                date: new Date().toLocaleDateString('en-CA'),
                notes: ''
            });
        } catch (err) {
            console.error("Error saving time log:", err);
        }
    };

    const handleEditClick = (log) => {
        setEditingLog(log);
        setFormData({
            title: log.title,
            category: log.category,
            startTime: log.startTime,
            endTime: log.endTime,
            date: log.date,
            notes: log.notes || ''
        });
        setShowModal(true);
    };

    const deleteLog = async (id) => {
        if (window.confirm('Delete this session?')) {
            try {
                await deleteDoc(doc(db, 'timeTracker', id));
            } catch (err) {
                console.error("Error deleting session:", err);
            }
        }
    };

    const stats = useMemo(() => {
        if (logs.length === 0) return null;

        const filteredLogs = logs.filter(log => {
            if (filterCategory !== 'All' && log.category !== filterCategory) return false;
            return true;
        });

        const dailyData = {};
        const monthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

        // Combine logs and sleepLogs (only from today onwards for sleep)
        const allSessions = [...logs];
        const IMPORT_START_DATE = '2026-02-09';

        sleepLogs.filter(sl => sl.date >= IMPORT_START_DATE).forEach(sl => {
            // Night Sleep
            const mainDuration = sl.totalDuration - (sl.napDuration || 0);
            allSessions.push({
                ...sl,
                category: 'Sleep',
                duration: mainDuration,
                title: 'Night Sleep (Auto)',
                startTime: sl.sleepTime,
                endTime: sl.wakeTime
            });

            // Daytime Nap
            if (sl.napDuration > 0) {
                allSessions.push({
                    ...sl,
                    category: 'Sleep',
                    duration: sl.napDuration,
                    title: 'Daytime Nap (Auto)',
                    startTime: sl.napSleepTime,
                    endTime: sl.napWakeTime
                });
            }
        });

        allSessions.forEach(log => {
            const date = log.date;
            if (!dailyData[date]) {
                dailyData[date] = {
                    Study: 0, Work: 0, Waste: 0, Meal: 0, Social: 0,
                    Health: 0, Miscellaneous: 0, Sleep: 0, Break: 0, total: 0
                };
            }
            let category = log.category;
            if (category === 'Cooking') category = 'Meal';
            if (category === 'Personal' || category === 'Other') category = 'Miscellaneous';

            if (dailyData[date].hasOwnProperty(category)) {
                dailyData[date][category] += log.duration;
            }
            dailyData[date].total += log.duration;
        });

        // Calculate 'Other' category
        Object.keys(dailyData).forEach(date => {
            const loggedTime = dailyData[date].total;
            dailyData[date].Other = Math.max(0, 24 - loggedTime);
            // We don't add Other to total because total represents logged productive/active time usually
            // but for "complete day tracking", we might want total to be 24.
        });

        // Prepare chart data based on view mode
        let chartData = [];
        const categories = ['Study', 'Work', 'Waste', 'Meal', 'Health', 'Miscellaneous', 'Social', 'Sleep', 'Break', 'Untracked'];

        if (viewMode === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('en-CA');
                const label = d.toLocaleDateString('default', { weekday: 'short' });
                const dayObj = { name: label };
                categories.forEach(cat => {
                    if (cat === 'Untracked') {
                        dayObj[cat] = parseFloat((dailyData[dateStr]?.Other || 0).toFixed(2));
                    } else {
                        dayObj[cat] = parseFloat((dailyData[dateStr]?.[cat] || 0).toFixed(2));
                    }
                });
                dayObj.total = parseFloat((dailyData[dateStr]?.total || 0).toFixed(2));
                chartData.push(dayObj);
            }
        } else {
            // Month view
            const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const dayObj = { name: i.toString() };
                categories.forEach(cat => {
                    if (cat === 'Untracked') {
                        dayObj[cat] = parseFloat((dailyData[dateStr]?.Other || 0).toFixed(2));
                    } else {
                        dayObj[cat] = parseFloat((dailyData[dateStr]?.[cat] || 0).toFixed(2));
                    }
                });
                dayObj.total = parseFloat((dailyData[dateStr]?.total || 0).toFixed(2));
                chartData.push(dayObj);
            }
        }

        // Calculate totals based on statView
        let statsLogs = allSessions;
        if (statView === 'month') {
            const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            statsLogs = allSessions.filter(l => new Date(l.date) >= startOfMonth && new Date(l.date) <= new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0));
        } else if (statView === 'week') {
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startOfWeek.setHours(0, 0, 0, 0);
            statsLogs = allSessions.filter(l => new Date(l.date) >= startOfWeek);
        }

        const getCategoryTotal = (cat) => statsLogs.filter(l => l.category === cat).reduce((acc, l) => acc + (l.duration || l.totalDuration || 0), 0);

        const studyTotal = getCategoryTotal('Study');
        const workTotal = getCategoryTotal('Work');
        const wasteTotal = getCategoryTotal('Waste');
        const mealTotal = getCategoryTotal('Meal') + getCategoryTotal('Cooking');
        const socialTotal = getCategoryTotal('Social');
        const healthTotal = getCategoryTotal('Health');
        const miscTotal = getCategoryTotal('Miscellaneous') + getCategoryTotal('Personal') + getCategoryTotal('Other');
        const sleepTotalDaily = getCategoryTotal('Sleep');
        const breakTotal = getCategoryTotal('Break');

        const grandTotal = studyTotal + workTotal + wasteTotal + mealTotal + socialTotal + healthTotal + miscTotal + sleepTotalDaily + breakTotal;

        // Calculate Untracked Total for the period
        let totalPeriodHours = 0;
        if (statView === 'month') {
            const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
            totalPeriodHours = daysInMonth * 24;
        } else if (statView === 'week') {
            totalPeriodHours = 7 * 24;
        } else {
            // All time - hard to define untracked perfectly, maybe skip or use a large range
            totalPeriodHours = grandTotal;
        }
        const untrackedTotal = Math.max(0, totalPeriodHours - grandTotal);

        return {
            chartData,
            studyTotal: studyTotal.toFixed(1),
            workTotal: workTotal.toFixed(1),
            wasteTotal: wasteTotal.toFixed(1),
            mealTotal: mealTotal.toFixed(1),
            socialTotal: socialTotal.toFixed(1),
            healthTotal: healthTotal.toFixed(1),
            miscTotal: miscTotal.toFixed(1),
            sleepTotal: sleepTotalDaily.toFixed(1),
            breakTotal: breakTotal.toFixed(1),
            untrackedTotal: untrackedTotal.toFixed(1),
            productiveTotal: (studyTotal + workTotal).toFixed(1),
            grandTotal: grandTotal.toFixed(1),
            monthName: viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
        };
    }, [logs, sleepLogs, viewDate, viewMode, filterCategory, statView]);

    const navMonth = (dir) => {
        setViewDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + dir);
            return d;
        });
    };

    const handleMonthChange = (e) => {
        const newMonth = parseInt(e.target.value);
        setViewDate(prev => {
            const d = new Date(prev);
            d.setMonth(newMonth);
            return d;
        });
    };

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value);
        setViewDate(prev => {
            const d = new Date(prev);
            d.setFullYear(newYear);
            return d;
        });
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const RenderChart = () => {
        if (!stats) return null;

        const commonProps = {
            width: 500,
            height: 300,
            data: stats.chartData,
            margin: { top: 20, right: 30, left: 10, bottom: 5 }
        };

        const cartesianGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
        const xAxis = (
            <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                interval={viewMode === 'month' ? 4 : 0}
                dy={10}
            />
        );
        const yAxis = (
            <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: 12, fill: '#64748b', fontWeight: 700 } }}
            />
        );
        const tooltip = (
            <Tooltip
                cursor={{ fill: '#f8fafc', opacity: 0.4 }}
                contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 700
                }}
            />
        );
        const legend = <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingTop: '0px', paddingBottom: '30px' }} />;

        const categoriesArr = [
            { key: 'Study', color: CATEGORY_COLORS.Study },
            { key: 'Work', color: CATEGORY_COLORS.Work },
            { key: 'Waste', color: CATEGORY_COLORS.Waste },
            { key: 'Meal', color: CATEGORY_COLORS.Meal },
            { key: 'Health', color: CATEGORY_COLORS.Health },
            { key: 'Miscellaneous', color: CATEGORY_COLORS.Miscellaneous },
            { key: 'Social', color: CATEGORY_COLORS.Social },
            { key: 'Sleep', color: CATEGORY_COLORS.Sleep },
            { key: 'Break', color: CATEGORY_COLORS.Break },
            { key: 'Untracked', color: CATEGORY_COLORS.Untracked }
        ];

        if (chartType === 'area') {
            return (
                <AreaChart {...commonProps}>
                    <defs>
                        {categoriesArr.map(cat => (
                            <linearGradient id={`color${cat.key}`} x1="0" y1="0" x2="0" y2="1" key={cat.key}>
                                <stop offset="5%" stopColor={cat.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={cat.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                        <filter id="shadow3d_area" x="-20%" y="-20%" width="140%" height="140%">
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
                    {cartesianGrid}
                    {xAxis}
                    {yAxis}
                    {tooltip}
                    {legend}
                    {categoriesArr.map(cat => (
                        <Area
                            key={cat.key}
                            type="monotone"
                            dataKey={cat.key}
                            stroke={cat.color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color${cat.key})`}
                            stackId="1"
                            style={{ filter: 'url(#shadow3d_area)' }}
                        />
                    ))}
                    <Line type="monotone" dataKey="total" stroke="#1e293b" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#1e293b' }} name="Logged Total" />
                </AreaChart>
            );
        }

        if (chartType === 'pie') {
            const chartSums = {};
            categoriesArr.forEach(cat => { chartSums[cat.key] = 0; });

            stats.chartData.forEach(day => {
                categoriesArr.forEach(cat => {
                    if (cat.key !== 'Untracked') {
                        chartSums[cat.key] += (day[cat.key] || 0);
                    }
                });
            });

            const totalHoursInView = stats.chartData.length * 24;
            const totalLoggedTotal = Object.keys(chartSums)
                .filter(k => k !== 'Untracked')
                .reduce((acc, k) => acc + chartSums[k], 0);

            chartSums['Untracked'] = Math.max(0, totalHoursInView - totalLoggedTotal);

            const pieData = categoriesArr.map(cat => ({
                name: cat.key,
                value: chartSums[cat.key],
                color: cat.color
            })).filter(c => c.value > 0);

            if (pieData.length === 0) {
                return (
                    <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Clock size={40} strokeWidth={1.5} opacity={0.5} />
                        <p style={{ marginTop: '12px', fontWeight: 700 }}>No data logged for this period</p>
                    </div>
                );
            }

            return (
                <PieChart>
                    <defs>
                        <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
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
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="75%"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={8}
                        style={{ filter: 'url(#shadow3d)' }}
                        labelLine={false}
                        label={({ name, percent, x, y, cx }) => {
                            const item = pieData.find(d => d.name === name);
                            return (
                                <text
                                    x={x}
                                    y={y}
                                    fill={CATEGORY_COLORS[name] || '#64748b'}
                                    textAnchor={x > cx ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    style={{ fontSize: '11px', fontWeight: 800, textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                                >
                                    {`${name}: ${item ? item.value.toFixed(1) : 0}h (${(percent * 100).toFixed(0)}%)`}
                                </text>
                            );
                        }}
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [`${value}h`, 'Duration']}
                    />
                </PieChart>
            );
        }

        return (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <Clock size={40} strokeWidth={1.5} opacity={0.5} />
                <p style={{ marginTop: '12px', fontWeight: 700 }}>Select a chart view</p>
            </div>
        );
    };

    const timelineSessions = useMemo(() => {
        const targetDate = timelineDate;
        const result = [];
        const IMPORT_START_DATE = '2026-02-09';

        const getPrevDate = (dateStr) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() - 1);
            return d.toLocaleDateString('en-CA');
        };

        const getNextDate = (dateStr) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() + 1);
            return d.toLocaleDateString('en-CA');
        };

        const prevDateStr = getPrevDate(targetDate);
        const nextDateStr = getNextDate(targetDate);

        // 1. Process Normal Logs (Activities)
        logs.forEach(log => {
            if (log.date === targetDate) {
                if (log.endTime < log.startTime) {
                    // Starts today, ends tomorrow. Show Part 1 (Today's part)
                    result.push({ ...log, endTime: '24:00', id: log.id + '_p1' });
                } else {
                    result.push(log);
                }
            } else if (log.date === prevDateStr && log.endTime < log.startTime) {
                // Started yesterday, ends today. Show Part 2 (Today's morning part)
                result.push({ ...log, startTime: '00:00', id: log.id + '_p2' });
            }
        });

        // 2. Process Sleep Logs
        sleepLogs.filter(sl => sl.date >= IMPORT_START_DATE).forEach(sl => {
            // Main Sleep logic (Convention: Sl.date is the wakeup day)
            if (sl.date === targetDate) {
                if (sl.wakeTime < sl.sleepTime) {
                    // Crosses midnight: Part 2 (today 00:00 to wake)
                    result.push({
                        id: sl.id + '_main_p2',
                        category: 'Sleep',
                        title: 'Night Sleep (Auto)',
                        startTime: '00:00',
                        endTime: sl.wakeTime
                    });
                } else {
                    // Same day sleep
                    result.push({
                        id: sl.id + '_main',
                        category: 'Sleep',
                        title: 'Night Sleep (Auto)',
                        startTime: sl.sleepTime,
                        endTime: sl.wakeTime
                    });
                }
            } else if (sl.date === nextDateStr && sl.wakeTime < sl.sleepTime) {
                // Starts tonight (before midnight)
                result.push({
                    id: sl.id + '_main_p1',
                    category: 'Sleep',
                    title: 'Night Sleep (Auto)',
                    startTime: sl.sleepTime,
                    endTime: '24:00'
                });
            }

            // Nap logic
            if (sl.date === targetDate && sl.napDuration > 0) {
                if (sl.napWakeTime < sl.napSleepTime) {
                    result.push({
                        id: sl.id + '_nap_p2',
                        category: 'Sleep',
                        title: 'Daytime Nap (Auto)',
                        startTime: '00:00',
                        endTime: sl.napWakeTime
                    });
                } else {
                    result.push({
                        id: sl.id + '_nap',
                        category: 'Sleep',
                        title: 'Daytime Nap (Auto)',
                        startTime: sl.napSleepTime,
                        endTime: sl.napWakeTime
                    });
                }
            } else if (sl.date === nextDateStr && sl.napDuration > 0 && sl.napWakeTime < sl.napSleepTime) {
                result.push({
                    id: sl.id + '_nap_p1',
                    category: 'Sleep',
                    title: 'Daytime Nap (Auto)',
                    startTime: sl.napSleepTime,
                    endTime: '24:00'
                });
            }
        });

        return result;
    }, [logs, sleepLogs, timelineDate]);

    const todayStats = useMemo(() => {
        const calculateDur = (start, end) => {
            if (!start || !end) return 0;
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);
            const startMin = sH * 60 + (sM || 0);
            const endMin = eH * 60 + (eM || 0);
            return Math.max(0, (endMin - startMin) / 60);
        };

        const totals = {
            Study: 0, Work: 0, Waste: 0, Meal: 0,
            Social: 0, Health: 0, Miscellaneous: 0, Sleep: 0, Break: 0
        };

        timelineSessions.forEach(session => {
            const dur = calculateDur(session.startTime, session.endTime);
            let cat = session.category;
            if (cat === 'Cooking') cat = 'Meal';
            if (cat === 'Personal' || cat === 'Other') cat = 'Miscellaneous';

            // Special keyword check for titles like "ready", "fresh" if they ended up in a generic category
            const title = (session.title || '').toLowerCase();
            if (cat === 'Miscellaneous' || cat === 'Break') { // Only re-map if it's already in a "flexible" category
                if (['ready', 'fresh', 'bath', 'shower', 'bathing'].some(k => title.includes(k))) {
                    cat = 'Miscellaneous';
                }
            }

            if (totals.hasOwnProperty(cat)) {
                totals[cat] += dur;
            }
        });

        const study = totals.Study;
        const work = totals.Work;
        const totalLogged = Object.values(totals).reduce((a, b) => a + b, 0);

        return {
            study: study.toFixed(1),
            work: totals.Work.toFixed(1),
            productive: (study + totals.Work).toFixed(1),
            waste: totals.Waste.toFixed(1),
            meal: totals.Meal.toFixed(1),
            health: totals.Health.toFixed(1),
            social: totals.Social.toFixed(1),
            miscellaneous: totals.Miscellaneous.toFixed(1),
            break: totals.Break.toFixed(1),
            sleep: totals.Sleep.toFixed(1),
            total: totalLogged.toFixed(1),
            other: Math.max(0, 24 - totalLogged).toFixed(1)
        };
    }, [timelineSessions]);

    const groupedLogs = useMemo(() => {
        // Combine logs and sleepLogs (only from today onwards for sleep)
        const allSessions = [...logs];
        const IMPORT_START_DATE = '2026-02-09';

        sleepLogs.filter(sl => sl.date >= IMPORT_START_DATE).forEach(sl => {
            // Night Sleep
            const mainDuration = sl.totalDuration - (sl.napDuration || 0);
            allSessions.push({
                ...sl,
                id: sl.id + '_main',
                category: 'Sleep',
                duration: mainDuration,
                title: 'Night Sleep (Auto)',
                startTime: sl.sleepTime,
                endTime: sl.wakeTime,
                isAuto: true
            });

            // Daytime Nap
            if (sl.napDuration > 0) {
                allSessions.push({
                    ...sl,
                    id: sl.id + '_nap',
                    category: 'Sleep',
                    duration: sl.napDuration,
                    title: 'Daytime Nap (Auto)',
                    startTime: sl.napSleepTime,
                    endTime: sl.napWakeTime,
                    isAuto: true
                });
            }
        });

        const filtered = allSessions.filter(l => filterCategory === 'All' || l.category === filterCategory);
        const groups = {};
        filtered.forEach(log => {
            if (!groups[log.date]) {
                groups[log.date] = { Study: 0, Work: 0, Waste: 0, Meal: 0, Social: 0, Sleep: 0, Break: 0, Miscellaneous: 0, Health: 0, sessions: [] };
            }
            groups[log.date].sessions.push(log);
            let targetCat = log.category;
            if (log.category === 'Cooking') targetCat = 'Meal';
            if (log.category === 'Personal') targetCat = 'Miscellaneous';

            if (groups[log.date].hasOwnProperty(targetCat)) {
                groups[log.date][targetCat] += log.duration;
            }
        });
        return Object.entries(groups)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 10); // Show last 10 days
    }, [logs, sleepLogs, filterCategory]);

    if (loading) return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spin" style={{ marginBottom: '16px' }}><Clock size={32} /></div>
            <p style={{ fontWeight: 800 }}>Syncing Flow State...</p>
        </div>
    );

    return (
        <div className="time-tracker-page glass">
            {/* Header */}
            <header className="tracker-header">
                <div className="title-section">
                    <div className="icon-wrapper glass" style={{ boxShadow: '0 6px 0 var(--primary-glow)', transform: 'translateY(-2px)' }}>
                        <Timer size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                        <h2 className="main-title">Flow State Hub</h2>
                        <p className="sub-title">Optimize your deep work and productivity</p>
                    </div>
                </div>

                <div className="controls-section">

                    <button className="add-session-btn" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>Log Session</span>
                    </button>
                </div>
            </header>

            {/* Today's Focus Summary */}
            <div className="glass today-summary-bar">
                <div className="summary-label" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <Zap size={20} fill="var(--primary)" fillOpacity={0.8} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                    <span style={{ letterSpacing: '-0.02em' }}>
                        {timelineDate === todayStr ? "Today's Achievement:" : `Flow on ${(() => {
                            const [y, m, d] = timelineDate.split('-').map(Number);
                            return new Date(y, m - 1, d).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
                        })()}:`}
                    </span>
                </div>
                <div className="today-metrics-container">
                    <div className="metric-item">
                        <span className="m-label">Productive</span>
                        <span className="m-value" style={{ color: 'var(--primary)' }}>{todayStats.productive}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Study</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Study }}>{todayStats.study}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Work</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Work }}>{todayStats.work}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Waste</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Waste }}>{todayStats.waste}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Meal</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Meal }}>{todayStats.meal}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Social</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Social }}>{todayStats.social}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Health</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Health }}>{todayStats.health}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Misc</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Miscellaneous }}>{todayStats.miscellaneous}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Sleep</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Sleep }}>{todayStats.sleep}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Break</span>
                        <span className="m-value" style={{ color: CATEGORY_COLORS.Break }}>{todayStats.break}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Total</span>
                        <span className="m-value total" style={{ color: '#1e293b' }}>{todayStats.total}h</span>
                    </div>
                    <div className="m-divider"></div>
                    <div className="metric-item">
                        <span className="m-label">Untracked</span>
                        <span className="m-value other" style={{ color: '#94a3b8' }}>{todayStats.other}h</span>
                    </div>
                </div>
            </div>

            {/* Daily Flow Timeline */}
            <div className="analytics-container glass" style={{ marginBottom: '32px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} className="text-indigo-600" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Daily Flow Timeline</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="timeline-date-picker">
                        <div className="month-nav mini" style={{ margin: 0, padding: '4px 8px' }}>
                            <button onClick={() => {
                                const d = new Date(timelineDate);
                                d.setDate(d.getDate() - 1);
                                setTimelineDate(d.toLocaleDateString('en-CA'));
                            }}><ChevronLeft size={14} /></button>
                            <input
                                type="date"
                                value={timelineDate}
                                onChange={(e) => setTimelineDate(e.target.value)}
                                className="timeline-date-input"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#475569',
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    padding: '0 4px'
                                }}
                            />
                            <button onClick={() => {
                                const d = new Date(timelineDate);
                                d.setDate(d.getDate() + 1);
                                setTimelineDate(d.toLocaleDateString('en-CA'));
                            }}><ChevronRight size={14} /></button>
                        </div>
                        {timelineDate !== todayStr && (
                            <button
                                onClick={() => setTimelineDate(todayStr)}
                                style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    background: 'rgba(var(--primary-rgb), 0.1)',
                                    border: 'none',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Today
                            </button>
                        )}
                    </div>
                </div>
                <div className="timeline-section-layout">
                    <div className="timeline-column">
                        <DayTimeline sessions={timelineSessions} />
                    </div>
                    <div className="distribution-column">
                        <div className="distribution-card glass">
                            <div className="dist-header">
                                <Activity size={16} />
                                <span>Day Distribution</span>
                            </div>
                            <DayDistributionChart stats={todayStats} />
                        </div>
                    </div>
                </div>
            </div>


            {/* Top Stats */}
            <div className="stats-section-container">
                <div className="stats-view-toggles">
                    <button className={statView === 'all' ? 'active' : ''} onClick={() => setStatView('all')}>All Time</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button className={statView === 'month' ? 'active' : ''} onClick={() => setStatView('month')}>This Month</button>
                        {statView === 'month' && (
                            <div className="month-nav mini">
                                <button onClick={() => navMonth(-1)}><ChevronLeft size={14} /></button>
                                <select
                                    value={viewDate.getMonth()}
                                    onChange={handleMonthChange}
                                    className="month-select-mini"
                                >
                                    {months.map((m, i) => (
                                        <option key={m} value={i}>{m.substring(0, 3)}</option>
                                    ))}
                                </select>
                                <button onClick={() => navMonth(1)}><ChevronRight size={14} /></button>
                            </div>
                        )}
                    </div>
                    <button className={statView === 'week' ? 'active' : ''} onClick={() => setStatView('week')}>This Week</button>
                </div>
                <div className="stats-grid">
                    <div className="stat-card total" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <div className="stat-icon" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}><Zap size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Productive Time</span>
                            <span className="stat-value" style={{ color: 'var(--primary)' }}>{stats?.productiveTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card study">
                        <div className="stat-icon"><BookOpen size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Study Time</span>
                            <span className="stat-value">{stats?.studyTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card work">
                        <div className="stat-icon"><Briefcase size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Work Time</span>
                            <span className="stat-value">{stats?.workTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#10b98122', color: '#10b981' }}><Utensils size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Meal & Cook</span>
                            <span className="stat-value" style={{ color: '#10b981' }}>{stats?.mealTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#d946ef22', color: '#d946ef' }}><MessageCircle size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Social Time</span>
                            <span className="stat-value" style={{ color: '#d946ef' }}>{stats?.socialTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#e11d4822', color: '#e11d48' }}><Activity size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Health & Growth</span>
                            <span className="stat-value" style={{ color: '#e11d48' }}>{stats?.healthTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}><Heart size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Miscellaneous</span>
                            <span className="stat-value" style={{ color: '#8b5cf6' }}>{stats?.miscTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#ef444422', color: '#ef4444' }}><Trash2 size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Time Wasted</span>
                            <span className="stat-value" style={{ color: '#ef4444' }}>{stats?.wasteTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#6366f122', color: '#6366f1' }}><Moon size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Sleep Time</span>
                            <span className="stat-value" style={{ color: '#6366f1' }}>{stats?.sleepTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon" style={{ background: '#06b6d422', color: '#06b6d4' }}><Coffee size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Break Time</span>
                            <span className="stat-value" style={{ color: '#06b6d4' }}>{stats?.breakTotal || 0}h</span>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon"><Clock size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Total Logged</span>
                            <span className="stat-value">{stats?.grandTotal || 0}h</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Analytics Section */}
            <div className="analytics-container glass">
                <div className="analytics-header">
                    <div className="left">
                        <BarChart2 size={18} />
                        <span>Workload Distribution</span>
                    </div>
                    <div className="right">
                        <div className="glass" style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '10px', background: '#f1f5f9', marginRight: '12px' }}>
                            {[
                                { id: 'area', icon: <Activity size={14} /> },
                                { id: 'pie', icon: <TrendingUp size={14} /> } // Labeling as pie
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setChartType(type.id)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: chartType === type.id ? 'white' : 'transparent',
                                        color: chartType === type.id ? 'var(--primary)' : '#94a3b8',
                                        boxShadow: chartType === type.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {type.id === 'pie' ? <Timer size={14} /> : type.icon}
                                </button>
                            ))}
                        </div>
                        <div className="view-toggle">
                            <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Week</button>
                            <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Month</button>
                        </div>
                        {viewMode === 'month' && (
                            <div className="month-nav">
                                <button onClick={() => navMonth(-1)}><ChevronLeft size={16} /></button>
                                <div className="picker-group">
                                    <select value={viewDate.getMonth()} onChange={handleMonthChange}>
                                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                    </select>
                                    <select value={viewDate.getFullYear()} onChange={handleYearChange}>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => navMonth(1)}><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                        {RenderChart()}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent History */}
            <div className="history-section">
                <div className="section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Timer size={18} />
                        <h3 className="section-title">Session History</h3>
                    </div>
                    <div className="filter-group">
                        <Filter size={14} />
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="All">All Categories</option>
                            <option value="Study">Study Only</option>
                            <option value="Work">Work Only</option>
                            <option value="Waste">Waste Only</option>
                            <option value="Meal">Meal/Cook Only</option>
                            <option value="Health">Health / Growth Only</option>
                            <option value="Miscellaneous">Miscellaneous Only</option>
                            <option value="Social">Social Only</option>
                            <option value="Sleep">Sleep Only</option>
                            <option value="Break">Break Only</option>
                        </select>
                    </div>
                </div>

                <div className="sessions-list">
                    {groupedLogs.map(([date, data]) => (
                        <div key={date} className="date-group">
                            <div className="date-group-header">
                                <span className="group-date">
                                    {date === todayStr ? "Today" : new Date(date).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <div className="group-totals">
                                    {data.Study > 0 && <span className="label study">Study: <strong>{data.Study.toFixed(1)}h</strong></span>}
                                    {data.Work > 0 && <span className="label work">Work: <strong>{data.Work.toFixed(1)}h</strong></span>}
                                    {data.Waste > 0 && <span className="label waste" style={{ color: '#ef4444' }}>Waste: <strong>{data.Waste.toFixed(1)}h</strong></span>}
                                    {data.Meal > 0 && <span className="label meal" style={{ color: '#10b981' }}>Meal/Cook: <strong>{data.Meal.toFixed(1)}h</strong></span>}
                                    {data.Health > 0 && <span className="label health" style={{ color: '#e11d48' }}>Health: <strong>{data.Health.toFixed(1)}h</strong></span>}
                                    {data.Miscellaneous > 0 && <span className="label misc" style={{ color: '#8b5cf6' }}>Misc: <strong>{data.Miscellaneous.toFixed(1)}h</strong></span>}
                                    {data.Social > 0 && <span className="label social" style={{ color: '#d946ef' }}>Social: <strong>{data.Social.toFixed(1)}h</strong></span>}
                                    {data.Sleep > 0 && <span className="label sleep" style={{ color: '#6366f1' }}>Sleep: <strong>{data.Sleep.toFixed(1)}h</strong></span>}
                                    {data.Break > 0 && <span className="label break" style={{ color: '#06b6d4' }}>Break: <strong>{data.Break.toFixed(1)}h</strong></span>}
                                    <span className="label total">Day Coverage: <strong>{(data.Study + data.Work + data.Waste + data.Meal + data.Social + data.Sleep + data.Break + data.Miscellaneous).toFixed(1)}h</strong></span>
                                </div>
                            </div>

                            <div className="group-sessions">
                                {data.sessions.map((log) => {
                                    return (
                                        <div key={log.id} className={`session-item glass ${log.category.toLowerCase()}`}>
                                            <div className="category-indicator" style={{ background: CATEGORY_COLORS[log.category] || '#94a3b8' }}></div>
                                            <div className="session-main">
                                                <div className="session-top">
                                                    <h4 className="session-title">{log.title}</h4>
                                                    <span className="session-duration">{log.duration.toFixed(1)}h</span>
                                                </div>
                                                <div className="session-details">
                                                    <span className="session-cat">{log.category}</span>
                                                    <span className="dot">•</span>
                                                    <span className="session-time">{formatTime12(log.startTime)} - {formatTime12(log.endTime)}</span>
                                                    {log.isAuto && <span className="auto-badge" style={{
                                                        marginLeft: '8px',
                                                        fontSize: '10px',
                                                        background: '#e0e7ff',
                                                        color: '#4338ca',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 2px 0 #c7d2fe',
                                                        fontWeight: 800,
                                                        transform: 'rotate(-2deg)'
                                                    }}>Imported</span>}
                                                </div>
                                            </div>
                                            <div className="session-actions">
                                                {!log.isAuto && (
                                                    <>
                                                        <button className="action-btn edit" onClick={() => handleEditClick(log)}><Edit2 size={14} /></button>
                                                        <button className="action-btn delete" onClick={() => deleteLog(log.id)}><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                                {log.isAuto && (
                                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>From Sleep Tab</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="empty-state">
                            <Clock size={40} />
                            <p>No sessions logged yet. Time to get productive!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="habit-modal-overlay">
                    <div className="habit-modal tracker-modal">
                        <div className="modal-header">
                            <h2>{editingLog ? 'Edit Session' : 'Track New Session'}</h2>
                            <button className="action-btn" onClick={() => {
                                setShowModal(false);
                                setEditingLog(null);
                            }}><X size={24} /></button>
                        </div>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label>What were you focusing on?</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        autoFocus
                                        placeholder="e.g. Solving Physics numericals"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        onFocus={() => setShowSuggestions(true)}
                                        required
                                        style={{ flex: 1 }}
                                    />
                                </div>

                                {showSuggestions && (
                                    <div className="suggestions-popover glass">
                                        <div className="suggestion-header">
                                            <span>Quick Select</span>
                                            <button type="button" onClick={() => setShowSuggestions(false)}><X size={14} /></button>
                                        </div>
                                        <div className="suggestion-list">
                                            {customSuggestions.filter(item => item !== formData.title).map(item => (
                                                <div
                                                    key={item}
                                                    className="suggestion-item"
                                                    onClick={() => {
                                                        setFormData({ ...formData, title: item });
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <span>{item}</span>
                                                    <button type="button" className="remove-btn" onClick={(e) => removeSuggestion(e, item)}><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="add-suggestion-box">
                                            <input
                                                placeholder="Add custom default title..."
                                                value={newSuggestion}
                                                onChange={e => setNewSuggestion(e.target.value)}
                                            />
                                            <button type="button" onClick={addSuggestion} disabled={!newSuggestion.trim()}>
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Study">📚 Study</option>
                                        <option value="Work">💼 Work</option>
                                        <option value="Waste">🗑️ Waste</option>
                                        <option value="Meal">🍱 Meal / 👨‍🍳 Cook</option>
                                        <option value="Health">🏃 Health / 🌱 Growth</option>
                                        <option value="Miscellaneous">💪 Miscellaneous (Bath/Ready)</option>
                                        <option value="Social">💬 Social (Calls/Events)</option>
                                        <option value="Break">☕ Break (Rest/Nap)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><Clock size={14} style={{ marginRight: '4px' }} /> Start Time</label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label><CheckCircle2 size={14} style={{ marginRight: '4px' }} /> End Time</label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {formData.startTime && formData.endTime && (
                                <div className="duration-preview">
                                    <Zap size={14} />
                                    <span>Calculated Duration: <strong>{calculateDuration(formData.startTime, formData.endTime).toFixed(1)} hours</strong></span>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Quick Notes (Optional)</label>
                                <textarea
                                    className="notes-area"
                                    placeholder="Anything to keep in mind?"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button className="add-habit-btn" type="submit">
                                {editingLog ? 'Update Session' : 'Save Session'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeTracker;
