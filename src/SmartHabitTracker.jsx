import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar as CalendarIcon,
  TrendingUp,
  Award,
  Trophy,
  Zap,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Bell,
  BellOff,
  Star,
  MessageSquare,
  BarChart2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { db, HABITS_COLLECTION } from './firebase';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import './SmartHabitTracker.css';

const CATEGORIES = ['Health', 'Study', 'Work', 'Personal', 'Other'];
const PRIORITIES = [
  { label: 'Low', color: '#10b981', class: 'priority-low' },
  { label: 'Medium', color: '#f59e0b', class: 'priority-medium' },
  { label: 'High', color: '#ef4444', class: 'priority-high' }
];

const SmartHabitTracker = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Health',
    priority: 'Medium',
    notes: '',
    color: '#4f46e5'
  });

  const [activeReflection, setActiveReflection] = useState(null); // { habitId, date, text }

  // Sync with Firestore
  useEffect(() => {
    const q = query(HABITS_COLLECTION, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const habitList = [];
      const today = new Date().toISOString().split('T')[0];

      snapshot.forEach((doc) => {
        const data = doc.data();
        let habit = { id: doc.id, ...data };

        // Reset check if it's a new day
        if (habit.lastCheckedDate && habit.lastCheckedDate !== today) {
          // If missed a day, streak might need reset
          // Logic for reset: if lastCheckedDate is NOT yesterday, reset streak
          const lastDate = new Date(habit.lastCheckedDate);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          if (lastDate.toISOString().split('T')[0] !== yesterday.toISOString().split('T')[0]) {
            // Missed a day! Reset current streak
            // We only update if it's currently marked as checked for a past day
            // or if the streak is still active but missed today.
            // But we do this on the next "check" or "open" to avoid mass writes.
          }
        }

        habitList.push(habit);
      });

      setHabits(habitList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await addDoc(HABITS_COLLECTION, {
        ...formData,
        createdAt: Date.now(),
        checkedToday: false,
        currentStreak: 0,
        longestStreak: 0,
        history: [],
        lastCheckedDate: null
      });
      setShowAddModal(false);
      setFormData({ name: '', category: 'Health', priority: 'Medium', notes: '', color: '#4f46e5' });
    } catch (err) {
      console.error("Error adding habit:", err);
    }
  };

  const calculateStreaks = (history) => {
    if (!history || history.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Sort unique dates
    const sortedDates = [...new Set(history)].sort();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let longest = 0;
    let current = 0;
    let tempStreak = 0;

    // Longest Streak calculation
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longest = Math.max(longest, tempStreak);
    }

    // Current Streak calculation
    // Start from the latest date and count backwards
    const lastDateStr = sortedDates[sortedDates.length - 1];
    if (lastDateStr === today || lastDateStr === yesterdayStr) {
      let checkDate = new Date(lastDateStr);
      let streakCount = 0;
      let idx = sortedDates.length - 1;

      while (idx >= 0) {
        const dStr = sortedDates[idx];
        const targetStr = checkDate.toISOString().split('T')[0];

        if (dStr === targetStr) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
          idx--;
        } else {
          break;
        }
      }
      current = streakCount;
    } else {
      current = 0;
    }

    return { currentStreak: current, longestStreak: longest };
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !editingHabit) return;

    try {
      await updateDoc(doc(db, 'habits', editingHabit.id), formData);
      setEditingHabit(null);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error updating habit:", err);
    }
  };

  const toggleHabit = async (habit) => {
    const today = new Date().toISOString().split('T')[0];
    const isChecking = !habit.checkedToday;

    let newHistory;
    if (isChecking) {
      newHistory = [...(habit.history || []), today];
    } else {
      newHistory = (habit.history || []).filter(d => d !== today);
    }

    const { currentStreak, longestStreak } = calculateStreaks(newHistory);

    let updates = {
      checkedToday: isChecking,
      lastCheckedDate: isChecking ? today : (newHistory.length > 0 ? [...newHistory].sort().reverse()[0] : null),
      history: newHistory,
      currentStreak,
      longestStreak
    };

    if (isChecking && notificationsEnabled) {
      new Notification("Habit Completed!", { body: `Great job on ${habit.name}! Streak: ${currentStreak}` });
    }

    try {
      await updateDoc(doc(db, 'habits', habit.id), updates);
    } catch (err) {
      console.error("Error toggling habit:", err);
    }
  };

  const toggleDate = async (habit, dateStr) => {
    const isChecking = !(habit.history || []).includes(dateStr);
    const today = new Date().toISOString().split('T')[0];

    let newHistory;
    if (isChecking) {
      newHistory = [...(habit.history || []), dateStr];
    } else {
      newHistory = (habit.history || []).filter(d => d !== dateStr);
    }

    const { currentStreak, longestStreak } = calculateStreaks(newHistory);

    let updates = {
      history: newHistory,
      currentStreak,
      longestStreak
    };

    // If toggling today, also update checkedToday
    if (dateStr === today) {
      updates.checkedToday = isChecking;
    }

    // Update lastCheckedDate based on the actual history
    if (newHistory.length > 0) {
      updates.lastCheckedDate = [...newHistory].sort().reverse()[0];
    } else {
      updates.lastCheckedDate = null;
    }

    try {
      await updateDoc(doc(db, 'habits', habit.id), updates);
    } catch (err) {
      console.error("Error toggling date:", err);
    }
  };

  const saveReflection = async (habitId, date, text) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const reflections = { ...(habit.reflections || {}), [date]: text };
    try {
      await updateDoc(doc(db, 'habits', habitId), { reflections });
      setActiveReflection(null);
    } catch (err) {
      console.error("Error saving reflection:", err);
    }
  };

  const deleteHabit = async (id) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      try {
        await deleteDoc(doc(db, 'habits', id));
      } catch (err) {
        console.error("Error deleting habit:", err);
      }
    }
  };

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(permission => {
      setNotificationsEnabled(permission === 'granted');
    });
  };

  const stats = useMemo(() => {
    const total = habits.length;
    const completed = habits.filter(h => h.checkedToday).length;
    const avgStreak = total > 0 ? (habits.reduce((acc, h) => acc + (h.currentStreak || 0), 0) / total).toFixed(1) : 0;
    const bestStreak = Math.max(0, ...habits.map(h => h.longestStreak || 0));

    return { total, completed, avgStreak, bestStreak };
  }, [habits]);

  if (loading) return <div className="loading-state"><Clock className="spin" /> Loading Habits...</div>;

  return (
    <div className="habit-tracker-container">
      <header className="habit-header">
        <div className="habit-title-group">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Smart Habit Tracker</h2>
          <p style={{ color: 'var(--text-muted)' }}>Build consistent routines and track your progress.</p>
        </div>
        <div className="habit-controls">
          <button
            className={`action-btn ${notificationsEnabled ? 'active' : ''}`}
            onClick={notificationsEnabled ? () => setNotificationsEnabled(false) : requestNotificationPermission}
            title={notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}
          >
            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          <button
            className="add-habit-btn"
            onClick={() => {
              setEditingHabit(null);
              setFormData({ name: '', category: 'Health', priority: 'Medium', notes: '', color: '#4f46e5' });
              setShowAddModal(true);
            }}
          >
            <Plus size={20} />
            <span>New Habit</span>
          </button>
        </div>
      </header>

      <div className="habit-stats-overview">
        <div className="stat-card">
          <span className="label">Total Habits</span>
          <span className="value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="label">Today's Progress</span>
          <span className="value">{stats.completed} / {stats.total}</span>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
        <div className="stat-card">
          <span className="label">Average Streak</span>
          <span className="value">{stats.avgStreak}</span>
        </div>
        <div className="stat-card">
          <span className="label">Best Streak</span>
          <span className="value">{stats.bestStreak} <Trophy size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} /></span>
        </div>
      </div>

      <div className="habit-grid">
        {habits.map(habit => (
          <div key={habit.id} className="habit-card" style={{ '--habit-color': habit.color, '--habit-glow': `${habit.color}20` }}>
            <div className="habit-info-header">
              <div className="habit-title-group">
                <span className="habit-category" style={{ background: `${habit.color}15`, color: habit.color }}>
                  {habit.category}
                </span>
                <h3 className="habit-name">{habit.name}</h3>
              </div>
              <div className="habit-actions">
                <button className="action-btn" onClick={() => {
                  setEditingHabit(habit);
                  setFormData({
                    name: habit.name,
                    category: habit.category,
                    priority: habit.priority,
                    notes: habit.notes,
                    color: habit.color
                  });
                  setShowAddModal(true);
                }}>
                  <Edit2 size={16} />
                </button>
                <button className="action-btn" onClick={() => deleteHabit(habit.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="habit-main">
              <div className="streak-badges">
                <div className="streak-item">
                  <span className="streak-val">{habit.currentStreak || 0}</span>
                  <span className="streak-lbl">Current</span>
                </div>
                <div className="streak-item">
                  <span className="streak-val">{habit.longestStreak || 0}</span>
                  <span className="streak-lbl">Longest</span>
                </div>
              </div>
              <div className="check-container">
                <button
                  className={`habit-check-btn ${habit.checkedToday ? 'checked' : ''}`}
                  onClick={() => toggleHabit(habit)}
                >
                  <Check size={28} />
                </button>
              </div>
            </div>

            {habit.notes && (
              <div className="habit-notes" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '8px' }}>
                <MessageSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                {habit.notes}
              </div>
            )}

            <div className="habit-footer">
              <div className="habit-priority">
                <span className={`priority-dot ${PRIORITIES.find(p => p.label === habit.priority)?.class}`}></span>
                <span>{habit.priority} Priority</span>
              </div>
              <div className="last-sync">
                <Clock size={12} style={{ marginRight: '4px' }} />
                {habit.lastCheckedDate ? `Last: ${habit.lastCheckedDate}` : 'No history yet'}
              </div>
            </div>

            <HabitTrendChart history={habit.history || []} color={habit.color} />

            <HabitCalendar
              history={habit.history || []}
              reflections={habit.reflections || {}}
              color={habit.color}
              onToggleDate={(dateStr) => toggleDate(habit, dateStr)}
              onAddReflection={(dateStr) => setActiveReflection({ habitId: habit.id, date: dateStr, text: habit.reflections?.[dateStr] || '' })}
            />
          </div>
        ))}

        {habits.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">
              <Zap size={48} />
            </div>
            <h3>No Habits Yet</h3>
            <p>Start your journey by adding your first habit. Consistency is key!</p>
            <button className="add-habit-btn" onClick={() => setShowAddModal(true)}>Add Your First Habit</button>
          </div>
        )}
      </div>

      <HabitAnalytics habits={habits} />

      {showAddModal && (
        <div className="habit-modal-overlay">
          <div className="habit-modal">
            <div className="modal-header">
              <h2>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</h2>
              <button className="action-btn" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form className="modal-form" onSubmit={editingHabit ? handleUpdateSubmit : handleAddSubmit}>
              <div className="form-group">
                <label>Habit Name</label>
                <input
                  autoFocus
                  placeholder="e.g. Read for 30 mins"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Theme Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#4f46e5', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      type="button"
                      className="color-swatch"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: color,
                        border: formData.color === color ? '3px solid #1e293b' : 'none',
                        padding: 0
                      }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Daily Notes / Reflection</label>
                <textarea
                  placeholder="Any specific goals for this habit?"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <button className="add-habit-btn" style={{ width: '100%', marginTop: '12px' }} type="submit">
                {editingHabit ? 'Save Changes' : 'Start Habit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeReflection && (
        <div className="habit-modal-overlay">
          <div className="habit-modal reflection-modal">
            <div className="modal-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.2rem' }}>Daily Reflection</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeReflection.date}</span>
              </div>
              <button className="action-btn" onClick={() => setActiveReflection(null)}><X size={20} /></button>
            </div>
            <div className="modal-form">
              <textarea
                autoFocus
                placeholder="How did it go today? Any challenges or wins?"
                value={activeReflection.text}
                onChange={e => setActiveReflection({ ...activeReflection, text: e.target.value })}
                style={{ minHeight: '120px' }}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  className="add-habit-btn"
                  style={{ flex: 1 }}
                  onClick={() => saveReflection(activeReflection.habitId, activeReflection.date, activeReflection.text)}
                >
                  Save Reflection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HabitTrendChart = ({ history, color }) => {
  const data = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        day: d.toLocaleDateString('default', { weekday: 'narrow' }),
        completed: history.includes(dateStr) ? 1 : 0
      });
    }
    return result;
  }, [history]);

  return (
    <div className="habit-trend-mini" style={{ height: '40px', width: '100%', marginTop: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area
            type="monotone"
            dataKey="completed"
            stroke={color}
            fill={color}
            fillOpacity={0.1}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const HabitCalendar = ({ history, reflections, color, onToggleDate, onAddReflection }) => {
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days = [];
  // Fill empty days for start of month
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isCompleted = history.includes(dateStr);
    const hasReflection = reflections && reflections[dateStr];
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <div key={d} className="calendar-day-wrapper">
        <button
          className={`calendar-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}`}
          style={isCompleted ? { background: color } : {}}
          onClick={() => onToggleDate(dateStr)}
          type="button"
        >
          {d}
          {hasReflection && <span className="reflection-dot"></span>}
        </button>
        <button
          className="reflection-btn-mini"
          onClick={(e) => {
            e.stopPropagation();
            onAddReflection(dateStr);
          }}
          title="Add/Edit Reflection"
        >
          <MessageSquare size={10} />
        </button>
      </div>
    );
  }

  return (
    <div className="habit-calendar-mini">
      <div className="calendar-header-mini">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {viewDate.toLocaleString('default', { month: 'short' })} {year}
          </span>
          {(month !== new Date().getMonth() || year !== new Date().getFullYear()) && (
            <button
              className="today-btn-mini"
              onClick={() => setViewDate(new Date())}
              title="Jump to Current Month"
            >
              Today
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="calendar-nav-btn" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
            <ChevronLeft size={14} />
          </button>
          <button className="calendar-nav-btn" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="calendar-grid-mini">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="calendar-day-lbl">{d}</div>)}
        {days}
      </div>
    </div>
  );
};

const HabitAnalytics = ({ habits }) => {
  const [period, setPeriod] = useState(7); // default 7 days

  const data = useMemo(() => {
    // Determine how many days to show
    let daysToShow = period;

    // If "All", find the earliest habit creation date
    if (period === 'all') {
      const earliest = habits.reduce((acc, h) => Math.min(acc, h.createdAt || Date.now()), Date.now());
      daysToShow = Math.ceil((Date.now() - earliest) / (1000 * 60 * 60 * 24)) + 1;
      daysToShow = Math.max(daysToShow, 7); // Show at least 7 days
    }

    const result = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = habits.filter(h => (h.history || []).includes(dateStr)).length;

      let label;
      if (daysToShow <= 14) {
        label = d.toLocaleDateString('default', { weekday: 'short' });
      } else if (daysToShow <= 60) {
        label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      } else {
        label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      }

      result.push({
        name: label,
        fullDate: dateStr,
        completed: count
      });
    }
    return result;
  }, [habits, period]);

  if (habits.length === 0) return null;

  return (
    <div className="analytics-section glass" style={{ marginTop: '32px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart2 className="text-indigo-600" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Completion Trends</h3>
        </div>

        <div className="filter-group glass" style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '10px', background: '#f1f5f9' }}>
          {[
            { label: 'Week', val: 7 },
            { label: 'Month', val: 30 },
            { label: 'All-Time', val: 'all' }
          ].map(p => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.val)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: period === p.val ? 'white' : 'transparent',
                color: period === p.val ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: period === p.val ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'var(--transition)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
              interval={period === 'all' ? Math.floor(data.length / 10) : 0}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
              labelFormatter={(value, payload) => payload[0]?.payload.fullDate || value}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#4f46e5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorComp)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SmartHabitTracker;
