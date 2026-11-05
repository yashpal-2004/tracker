import React, { useMemo } from 'react';
import { SCHEDULE_DATA, SEM5_SCHEDULE_DATA, COLORS } from './TimetableView';
import {
    Calendar,
    Zap,
    Check,
    X,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import './App.css';
import { getCurrentLecture, getNextLecture } from './autoLectureCreator';
import { getSubjectFromLecture } from './timetableMapping';
import { isAttendanceRecorded } from './attendance';

const readDailyAttendanceOverrides = () => {
    try {
        const value = JSON.parse(localStorage.getItem('daily_lecture_attendance') || '{}');
        return value && typeof value === 'object' ? value : {};
    } catch {
        return {};
    }
};

const HomeDashboard = ({ tasks, todayStr, activeSemester = '4', onAttendanceChange }) => {
    const [liveTime, setLiveTime] = React.useState(new Date());
    const [pastLectureView, setPastLectureView] = React.useState({});
    React.useEffect(() => {
        const timer = setInterval(() => setLiveTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const stats = useMemo(() => {
        const activeTasks = tasks.filter(t => t.type !== 'friend_meta');

        // 1. Attendance Logic
        const regularLectures = activeTasks.filter(t => t.type === 'lecture');
        const attendanceMeta = tasks.filter(t => t.type === 'friend_meta' && t.myAttendanceBySubject);
        const baselineEntries = attendanceMeta.flatMap(meta => Object.entries(meta.myAttendanceBySubject || {}).map(([subject, counts]) => ({ meta, subject, counts })));
        const hasBaseline = baselineEntries.length > 0;
        const baselineTotal = baselineEntries.reduce((sum, entry) => sum + Number(entry.counts.total || 0), 0);
        const baselineAttended = baselineEntries.reduce((sum, entry) => sum + Number(entry.counts.attended || 0), 0);
        const cutoff = (attendanceMeta.find(meta => meta.myAttendanceAsOf)?.myAttendanceAsOf || '').slice(0, 10);
        const laterLectures = hasBaseline ? regularLectures.filter(lecture => lecture.date && lecture.date > cutoff) : [];
        const recordedLaterLectures = laterLectures.filter(isAttendanceRecorded);
        const recordedLectures = regularLectures.filter(isAttendanceRecorded);
        const totalLectures = hasBaseline ? baselineTotal + recordedLaterLectures.length : recordedLectures.length;
        const presentLectures = hasBaseline
            ? baselineAttended + recordedLaterLectures.filter(lecture => lecture.present !== false).length
            : recordedLectures.filter(t => t.present !== false).length;
        const attendancePct = totalLectures > 0 ? (presentLectures / totalLectures) * 100 : 0;

        // 2. Pending Logic
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
        const scheduleData = activeSemester === '5' ? SEM5_SCHEDULE_DATA : SCHEDULE_DATA;
        const daySchedule = scheduleData.find(d => d.day === today);
        if (!daySchedule) return [];

        const nowMinutes = liveTime.getHours() * 60 + liveTime.getMinutes();
        return daySchedule.items.filter(item => {
            const isBreak = /\b(lunch|snacks? break)\b/i.test(item.name);
            return !isBreak && item.start + (item.duration || 0) > nowMinutes;
        });
    }, [todayStr, liveTime, activeSemester]);

    const pastTodaySchedule = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat'];
        const date = new Date(todayStr);
        const today = days[date.getDay()];
        const scheduleData = activeSemester === '5' ? SEM5_SCHEDULE_DATA : SCHEDULE_DATA;
        const daySchedule = scheduleData.find(day => day.day === today);
        if (!daySchedule) return [];

        const nowMinutes = liveTime.getHours() * 60 + liveTime.getMinutes();
        return daySchedule.items.filter(item => {
            const isBreak = /\b(lunch|snacks? break)\b/i.test(item.name);
            return !isBreak && Boolean(getSubjectFromLecture(item.name, activeSemester)) && item.start + (item.duration || 0) <= nowMinutes;
        });
    }, [todayStr, liveTime, activeSemester]);

    const allLecturesFinishedToday = todaySchedule.length === 0 && pastTodaySchedule.length > 0;
    const isPastLecturesExpanded = pastLectureView[todayStr] ?? allLecturesFinishedToday;

    const getAttendanceState = (item, subjectName) => {
        const overrideKey = `${activeSemester}|${todayStr}|${item.name}`;
        const overrides = readDailyAttendanceOverrides();
        if (Object.prototype.hasOwnProperty.call(overrides, overrideKey)) return overrides[overrideKey] === true;

        const lectureTask = subjectName && tasks.find(task => task.type === 'lecture' && task.subjectName === subjectName && task.name === item.name && task.date === todayStr);
        if (!lectureTask) return true;
        return isAttendanceRecorded(lectureTask) ? lectureTask.present !== false : null;
    };

    const currentLecture = useMemo(() => getCurrentLecture(liveTime, activeSemester), [liveTime, activeSemester]);
    const nextLecture = useMemo(() => getNextLecture(liveTime, activeSemester), [liveTime, activeSemester]);
    const formatCountdown = (minutes) => {
        const seconds = Math.max(0, minutes * 60 - liveTime.getSeconds());
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return hours ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
    };

    const getHeatmapColor = (count) => {
        if (count === 0) return '#f1f5f9';
        if (count === 1) return '#c7d2fe';
        if (count === 2) return '#818cf8';
        if (count === 3) return '#4f46e5';
        return '#3730a3';
    };

    return (
        <div className="home-dashboard fade-in">
            {/* Main Layout Grid */}
            <div className="dashboard-main-grid">

                {/* Left Column: Today's Schedule & Heatmap */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Today's Schedule Widget */}
                    <section className="dashboard-section timetable-section glass" style={{ padding: '24px', margin: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="section-header-home" style={{ marginBottom: '20px' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                <Calendar size={20} /> Today's Schedule
                            </h2>
                        </div>

                        <div className="today-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
                            {todaySchedule.length > 0 ? todaySchedule.map((item, i) => {
                                const subjectName = getSubjectFromLecture(item.name, activeSemester);
                                const attendanceState = getAttendanceState(item, subjectName);
                                return (
                                <div key={i} className="today-item" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    borderLeft: `4px solid ${COLORS[item.color]?.border || '#ccc'}`,
                                    background: `linear-gradient(to right, ${COLORS[item.color]?.bg || '#f8f9fa'}, rgba(255,255,255,0))`,
                                    marginBottom: '12px',
                                    padding: '12px',
                                    borderRadius: '8px'
                                }}>
                                    <div className="time-col">
                                        <span className="time-text" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{item.time}</span>
                                    </div>
                                    <div className="info-col" style={{ marginTop: '4px', flex: 1, minWidth: 0 }}>
                                        <div className="class-name" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                                        <div className="class-room" style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                            {item.room}
                                            {attendanceState === null && <strong style={{ marginLeft: '10px', color: '#64748b' }}>Not recorded</strong>}
                                            {currentLecture?.startTime === item.start && currentLecture.name === item.name && (
                                                <strong style={{ marginLeft: '10px', color: '#059669' }}>
                                                    In progress · ends in {formatCountdown(currentLecture.minutesRemaining)}
                                                </strong>
                                            )}
                                            {nextLecture?.startTime === item.start && nextLecture.name === item.name && (
                                                <strong style={{ marginLeft: '10px', color: '#4f46e5' }}>
                                                    Up next · starts in {formatCountdown(nextLecture.minutesUntil)}
                                                </strong>
                                            )}
                                        </div>
                                    </div>
                                    {subjectName && onAttendanceChange && (
                                        <div role="group" aria-label={`${item.name} attendance`} className="attendance-toggle-group">
                                            <button
                                                type="button"
                                                className={`attendance-toggle present ${attendanceState === true ? 'selected' : ''}`}
                                                aria-pressed={attendanceState === true}
                                                onClick={() => onAttendanceChange(item, true)}
                                                title={`Mark ${item.name} present`}
                                            >
                                                <Check size={14} /> Present
                                            </button>
                                            <button
                                                type="button"
                                                className={`attendance-toggle absent ${attendanceState === false ? 'selected' : ''}`}
                                                aria-pressed={attendanceState === false}
                                                onClick={() => onAttendanceChange(item, false)}
                                                title={`Mark ${item.name} absent`}
                                            >
                                                <X size={14} /> Absent
                                            </button>
                                        </div>
                                    )}
                                </div>
                                );
                            }) : (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '32px 16px' }}>
                                    <div className="empty-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No more classes scheduled today.</p>
                                </div>
                            )}
                        </div>
                        {pastTodaySchedule.length > 0 && (
                            <div className="past-lectures-section">
                                <button
                                    type="button"
                                    className="past-lectures-toggle"
                                    aria-expanded={isPastLecturesExpanded}
                                    onClick={() => setPastLectureView(current => ({ ...current, [todayStr]: !isPastLecturesExpanded }))}
                                >
                                    <span>Earlier today · {pastTodaySchedule.length} lectures</span>
                                    {isPastLecturesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {isPastLecturesExpanded && (
                                    <div className="past-lectures-list">
                                        {pastTodaySchedule.map((item, i) => {
                                            const subjectName = getSubjectFromLecture(item.name, activeSemester);
                                            const attendanceState = getAttendanceState(item, subjectName);
                                            return (
                                                <div key={`${item.name}-${i}`} className="today-item past-lecture-item" style={{ borderLeft: `4px solid ${COLORS[item.color]?.border || '#ccc'}`, background: `linear-gradient(to right, ${COLORS[item.color]?.bg || '#f8f9fa'}, rgba(255,255,255,0))` }}>
                                                    <div className="time-col"><span className="time-text">{item.time}</span></div>
                                                    <div className="info-col">
                                                        <div className="class-name">{item.name}</div>
                                                        <div className="class-room">{item.room}{attendanceState === null && <strong style={{ marginLeft: '10px', color: '#64748b' }}>Not recorded</strong>}</div>
                                                    </div>
                                                    <div role="group" aria-label={`${item.name} attendance`} className="attendance-toggle-group">
                                                        <button type="button" aria-pressed={attendanceState === true} onClick={() => onAttendanceChange(item, true)} className={`attendance-toggle present ${attendanceState === true ? 'selected' : ''}`}><Check size={14} /> Present</button>
                                                        <button type="button" aria-pressed={attendanceState === false} onClick={() => onAttendanceChange(item, false)} className={`attendance-toggle absent ${attendanceState === false ? 'selected' : ''}`}><X size={14} /> Absent</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Activity Heatmap */}
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
                </div>

            </div>
        </div>
    );
};

export default HomeDashboard;
