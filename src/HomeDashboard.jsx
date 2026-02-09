import React, { useMemo } from 'react';
import { SCHEDULE_DATA, COLORS } from './TimetableView';
import {
    CheckCircle2,
    Clock,
    Calendar,
    Zap,
    BookOpen,
    PlayCircle,
    CheckCircle
} from 'lucide-react';
import './App.css';
import { getCurrentLecture, getNextLecture, getPendingLectures } from './autoLectureCreator';

const HomeDashboard = ({ tasks, todayStr }) => {
    const stats = useMemo(() => {
        const activeTasks = tasks.filter(t => t.type !== 'friend_meta');

        // 1. Attendance Logic
        const lectures = activeTasks.filter(t => t.type === 'lecture');
        const totalLectures = lectures.length;
        const presentLectures = lectures.filter(t => t.present !== false).length;
        const attendancePct = totalLectures > 0 ? (presentLectures / totalLectures) * 100 : 0;

        // 2. Pending Logic
        const completedLectures = lectures.filter(t => t.completed).length;
        const pendingLectures = totalLectures - completedLectures;

        // 3. Heatmap Calculation (Last 14 days)
        const heatmapData = [];
        const data = {};
        const dates = [];

        // Initialize last 14 days
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA');
            dates.push(dateStr);
            data[dateStr] = 0;
        }

        let totalCompletedInPeriod = 0;

        // Count activities using same logic as App.jsx
        activeTasks.forEach(task => {
            // Skip incomplete lectures, assignments, and quizzes
            if (['lecture', 'assignment', 'quiz'].includes(task.type) && !task.completed) return;

            let dateStr = '';
            // Prioritize ACTUAL activity timestamp (completion or creation) over scheduled date
            const activityDate = task.completedAt || task.createdAt || task.date;

            if (activityDate) {
                const d = new Date(activityDate);
                if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('en-CA');
            }

            if (dateStr && data[dateStr] !== undefined) {
                data[dateStr] += 1;
                totalCompletedInPeriod++;
            }
        });

        // Build heatmap array
        dates.forEach(date => {
            heatmapData.push({
                date: date,
                count: data[date]
            });
        });

        const activeDaysCount = Object.values(data).filter(c => c > 0).length;

        // Streak Logic - Using same algorithm as Activity Tracker for consistency
        let currentStreak = 0;
        let maxStreak = 0;
        let tempStreak = 0;

        // Build chronological array of all dates with activity
        const allDates = dates.slice(); // Use the same 14-day window

        // Calculate max streak by iterating chronologically
        allDates.forEach(date => {
            if (data[date] > 0) {
                tempStreak++;
                maxStreak = Math.max(maxStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        // Calculate current streak by checking backwards from today
        let checkIndex = allDates.length - 1;
        if (data[allDates[checkIndex]] > 0) {
            // Active today
            while (checkIndex >= 0 && data[allDates[checkIndex]] > 0) {
                currentStreak++;
                checkIndex--;
            }
        } else if (checkIndex > 0 && data[allDates[checkIndex - 1]] > 0) {
            // Active yesterday, so streak is alive
            checkIndex--; // Start from yesterday
            while (checkIndex >= 0 && data[allDates[checkIndex]] > 0) {
                currentStreak++;
                checkIndex--;
            }
        }

        return {
            attendancePct: attendancePct.toFixed(2),
            presentLectures,
            totalLectures,
            pendingLectures,
            heatmapData,
            activeDaysCount,
            totalCompletedInPeriod,
            currentStreak,
            maxStreak
        };
    }, [tasks]);

    const todaySchedule = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat'];
        const date = new Date(todayStr); // Use the string to ensure it aligns with the local day
        const today = days[date.getDay()];
        const daySchedule = SCHEDULE_DATA.find(d => d.day === today);
        return daySchedule ? daySchedule.items : [];
    }, [todayStr]);

    const getHeatmapColor = (count) => {
        if (count === 0) return '#f1f5f9';
        if (count === 1) return '#c7d2fe';
        if (count === 2) return '#818cf8';
        if (count === 3) return '#4f46e5';
        return '#3730a3';
    };

    return (
        <div className="home-dashboard fade-in">
            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card attendance-card-home">
                    <div className="stat-icon-wrapper attendance-icon">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.attendancePct}%</div>
                        <div className="stat-label">Total Attendance</div>
                        <div className="stat-sub">{stats.presentLectures}/{stats.totalLectures} potential</div>
                    </div>
                </div>

                <div className="stat-card pending-card-home">
                    <div className="stat-icon-wrapper pending-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.pendingLectures}</div>
                        <div className="stat-label">Left Lectures</div>
                    </div>
                </div>
            </div>

            {/* Live Lecture Status Widget */}
            <LiveLectureStatus tasks={tasks} />

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', marginBottom: '24px' }}>
                {/* Left Column - Heatmap */}
                <section className="dashboard-section heatmap-section glass" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                            <Zap size={20} fill="#1e293b" /> Activity Heatmap
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                            Less <div style={{ display: 'flex', gap: '4px' }}>
                                {[0, 1, 2, 3, 4].map(v => <div key={v} style={{ width: '12px', height: '12px', borderRadius: '3px', background: getHeatmapColor(v) }} />)}
                            </div> More
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        <div className="mini-stat-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Active Days</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.activeDaysCount} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Days</span></div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{stats.totalCompletedInPeriod} Total Items</div>
                        </div>
                        <div className="mini-stat-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Streak</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{stats.maxStreak} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Days</span></div>
                        </div>
                        <div className="mini-stat-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Current Streak</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{stats.currentStreak} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Days</span></div>
                        </div>
                    </div>

                    <div className="heatmap-grid-home" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {stats.heatmapData.map((day, i) => (
                            <div
                                key={i}
                                style={{
                                    minWidth: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: getHeatmapColor(day.count),
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                title={`${day.date}: ${day.count} tasks`}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        ))}
                    </div>
                </section>

                {/* Right Sidebar - Today's Schedule */}
                <section className="dashboard-section timetable-section glass" style={{ padding: '24px' }}>
                    <div className="section-header-home" style={{ marginBottom: '20px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                            <Calendar size={20} /> Today's Schedule
                        </h2>
                    </div>

                    <div className="today-list">
                        {todaySchedule.length > 0 ? todaySchedule.map((item, i) => (
                            <div key={i} className="today-item" style={{
                                borderLeft: `4px solid ${COLORS[item.color]?.border || '#ccc'}`,
                                background: `linear-gradient(to right, ${COLORS[item.color]?.bg || '#f8f9fa'}, rgba(255,255,255,0))`,
                                marginBottom: '12px',
                                padding: '12px',
                                borderRadius: '8px'
                            }}>
                                <div className="time-col">
                                    <span className="time-text" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{item.time}</span>
                                </div>
                                <div className="info-col" style={{ marginTop: '4px' }}>
                                    <div className="class-name" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                                    <div className="class-room" style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{item.room}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="empty-state" style={{ textAlign: 'center', padding: '32px 16px' }}>
                                <div className="empty-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No classes scheduled today.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

// Live Lecture Status Component
const LiveLectureStatus = ({ tasks }) => {
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Update every second
        return () => clearInterval(timer);
    }, []);

    const currentLecture = useMemo(() => getCurrentLecture(currentTime), [currentTime]);
    const nextLecture = useMemo(() => getNextLecture(currentTime), [currentTime]);
    const pendingLectures = useMemo(() => getPendingLectures(currentTime, tasks), [currentTime, tasks]);

    const formatTimeRemaining = (minutes) => {
        if (minutes === undefined || minutes === null) return '';

        // Calculate total seconds based on the fact that 'minutes' is (TargetTime - CurrentMinutes)
        // So basic minutes result implies we are at 0 seconds of current minute.
        // We need to subtract current seconds to get precise countdown.
        const secondsPassedInMinute = currentTime.getSeconds();
        const totalSeconds = minutes * 60 - secondsPassedInMinute;

        if (totalSeconds <= 0) return '0m 0s';

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const sStr = s.toString().padStart(2, '0');

        if (h > 0) {
            return `${h}h ${m}m ${sStr}s`;
        }
        return `${m}m ${sStr}s`;
    };

    if (!currentLecture && !nextLecture && pendingLectures.length === 0) {
        return null; // Don't show widget if no relevant info
    }

    return (
        <section className="dashboard-section glass" style={{
            padding: '20px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
            border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Current Lecture */}
                {currentLecture && (
                    <div style={{
                        flex: '1',
                        minWidth: '280px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <PlayCircle size={20} fill="white" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                In Progress
                            </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
                            {currentLecture.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                            {currentLecture.room} • Ends in {formatTimeRemaining(currentLecture.minutesRemaining)}
                        </div>
                    </div>
                )}

                {/* Next Lecture */}
                {nextLecture && !currentLecture && (
                    <div style={{
                        flex: '1',
                        minWidth: '280px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <BookOpen size={20} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Up Next
                            </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
                            {nextLecture.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                            {nextLecture.room} • Starts in {formatTimeRemaining(nextLecture.minutesUntil)}
                        </div>
                    </div>
                )}

                {/* Auto-Created Lectures Status */}
                {pendingLectures.length > 0 && (
                    <div style={{
                        flex: '1',
                        minWidth: '280px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <CheckCircle size={20} fill="white" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Auto-Creating
                            </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
                            {pendingLectures.length} Lecture{pendingLectures.length > 1 ? 's' : ''} Pending
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                            Will be added automatically
                        </div>
                    </div>
                )}

                {/* Info Message */}
                {!currentLecture && nextLecture && (
                    <div style={{
                        flex: '1',
                        minWidth: '280px',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: '12px',
                        border: '1px dashed #cbd5e1'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                            <strong style={{ color: '#1e293b' }}>✨ Auto-Lecture Creator Active</strong><br />
                            Lectures will be automatically added to their respective subjects when classes end.
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default HomeDashboard;
