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
  BarChart2,
  Briefcase,
  Flame
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
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
  runTransaction,
  arrayUnion
} from 'firebase/firestore';
import { db, HABITS_COLLECTION, USER_STATS_COLLECTION } from './firebase';
import './SmartHabitTracker.css';

const CATEGORIES = ['Health', 'Study', 'Work', 'Personal', 'Other'];
const PRIORITIES = [
  { label: 'Low', color: '#10b981', class: 'priority-low' },
  { label: 'Medium', color: '#f59e0b', class: 'priority-medium' },
  { label: 'High', color: '#ef4444', class: 'priority-high' }
];

const getDefaultMonthlyTarget = (allowExtra, activeDays = [0, 1, 2, 3, 4, 5, 6], targetDate = new Date()) => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let activeCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (activeDays.includes(dayOfWeek)) {
      activeCount++;
    }
  }

  return (activeCount * 10) + (allowExtra ? 100 : 0);
};

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
    color: '#4f46e5',
    monthlyTarget: getDefaultMonthlyTarget(true),
    allowExtraWork: true,
    activeDays: [0, 1, 2, 3, 4, 5, 6]
  });

  const [habitViewDates, setHabitViewDates] = useState({});
  const [activeReflection, setActiveReflection] = useState(null); // { habitId, date, text }
  const [showExtraWorkModal, setShowExtraWorkModal] = useState(false);
  const [selectedHabitForExtra, setSelectedHabitForExtra] = useState(null);
  const [editingExtraWork, setEditingExtraWork] = useState(null); // { date, index, entry }
  const [extraWorkData, setExtraWorkData] = useState({ description: '', duration: '1h', targetDate: '', logDate: new Date().toLocaleDateString('en-CA') });
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [userStats, setUserStats] = useState({ xp: 0, badges: {}, completedDates: {}, dailyWorkLog: {} });
  const [rewardToast, setRewardToast] = useState(null);

  // Hourly check for day change
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().toLocaleDateString('en-CA');
      setCurrentDate(prev => {
        if (now !== prev) return now;
        return prev;
      });
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  // Sync with Firestore
  useEffect(() => {
    const q = query(HABITS_COLLECTION, orderBy('createdAt', 'desc'));
    const unsubscribeHabits = onSnapshot(q, (snapshot) => {
      const habitList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        habitList.push({ id: doc.id, ...data });
      });
      setHabits(habitList);
      setLoading(false);
    });

    const statsRef = doc(db, 'userStats', 'global');
    const unsubscribeStats = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserStats(docSnap.data());
      } else {
        setDoc(statsRef, { xp: 0, badges: {}, completedDates: {}, dailyWorkLog: {} });
      }
    });

    return () => {
      unsubscribeHabits();
      unsubscribeStats();
    };
  }, []);

  // Reward Check Effect
  useEffect(() => {
    if (habits.length === 0 || loading) return;

    const checkNewCompletions = async () => {
      const allDates = [...new Set(habits.flatMap(h => h.history || []))];
      const today = new Date().toLocaleDateString('en-CA');

      for (const dateStr of allDates) {
        // A date is "fully completed" if all habits have it in history
        const isFullyCompleted = habits.every(h => (h.history || []).includes(dateStr));

        if (isFullyCompleted && !userStats.completedDates?.[dateStr]) {
          // New Completion Detected!
          await handleAwardReward(dateStr, today);
        }
      }
    };

    checkNewCompletions();
  }, [habits, userStats.completedDates]);

  const handleAwardReward = async (completedDateStr, today) => {
    const statsRef = doc(db, 'userStats', 'global');

    try {
      await runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        let data = statsDoc.exists() ? statsDoc.data() : { xp: 0, badges: {}, completedDates: {}, dailyWorkLog: {} };

        if (data.completedDates?.[completedDateStr]) return; // Already awarded

        let xpBonus = 50; // Standard day completion
        let rewardMsg = `Day Completed! +${xpBonus} XP`;
        let newBadge = null;

        const currentDailyLog = data.dailyWorkLog?.[today] || [];
        const updatedDailyLog = [...currentDailyLog, completedDateStr];

        // Double Down Badge Logic: If user completes 2 days worth of habits on the same calendar day
        if (updatedDailyLog.length === 2) {
          xpBonus += 100;
          newBadge = "Double Down";
          rewardMsg = `Double Down! 2 Days in 1! +150 XP & Badge earned!`;
        }

        transaction.update(statsRef, {
          xp: (data.xp || 0) + xpBonus,
          [`completedDates.${completedDateStr}`]: Date.now(),
          [`dailyWorkLog.${today}`]: updatedDailyLog,
          ...(newBadge ? { [`badges.${today}`]: newBadge } : {})
        });

        setRewardToast({ message: rewardMsg, type: newBadge ? 'badge' : 'xp' });
        setTimeout(() => setRewardToast(null), 5000);
      });
    } catch (err) {
      console.error("Reward transaction failed:", err);
    }
  };

  const handleLogExtraWork = async (e) => {
    e.preventDefault();
    if (!extraWorkData.description.trim() || !selectedHabitForExtra) return;

    const xpTable = { '30m': 20, '1h': 50, '2h': 120, '4h': 300 };
    const xpBonus = xpTable[extraWorkData.duration] || 50;
    const logDate = extraWorkData.logDate || currentDate;
    const statsRef = doc(db, 'userStats', 'global');

    try {
      await runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        let data = statsDoc.exists() ? statsDoc.data() : { xp: 0, extraWorkLog: {} };

        // Calculate XP diff if editing
        let xpTotalDiff = xpBonus;
        if (editingExtraWork) {
          xpTotalDiff = xpBonus - (editingExtraWork.entry.xpAwarded || 0);
        }

        const newEntry = {
          habitId: selectedHabitForExtra.id,
          habitName: selectedHabitForExtra.name,
          description: extraWorkData.description,
          duration: extraWorkData.duration,
          xpAwarded: xpBonus,
          timestamp: editingExtraWork ? editingExtraWork.entry.timestamp : Date.now(),
          logDate: logDate
        };

        let updatedFullLog = { ...(data.extraWorkLog || {}) };

        // Remove old entry if editing (handle date changes too)
        if (editingExtraWork) {
          const oldDate = editingExtraWork.date;
          const oldIdx = editingExtraWork.index;
          if (updatedFullLog[oldDate]) {
            const newArr = [...updatedFullLog[oldDate]];
            newArr.splice(oldIdx, 1);
            if (newArr.length === 0) delete updatedFullLog[oldDate];
            else updatedFullLog[oldDate] = newArr;
          }
        }

        // Add new/updated entry
        const currentTargetLog = updatedFullLog[logDate] || [];
        updatedFullLog[logDate] = [...currentTargetLog, newEntry];

        transaction.update(statsRef, {
          xp: (data.xp || 0) + xpTotalDiff,
          extraWorkLog: updatedFullLog,
          [`badges.${logDate}`]: "Overachiever"
        });

        // Habit catch-up logic
        if (extraWorkData.targetDate) {
          const targetDateStr = extraWorkData.targetDate;
          const habitRef = doc(db, 'habits', selectedHabitForExtra.id);
          const habitDoc = await transaction.get(habitRef);
          if (habitDoc.exists()) {
            const hData = habitDoc.data();
            const hHistory = hData.history || [];
            if (!hHistory.includes(targetDateStr)) {
              const newHistory = [...hHistory, targetDateStr];
              const { currentStreak, longestStreak } = calculateStreaks(newHistory);
              transaction.update(habitRef, {
                history: newHistory,
                currentStreak,
                longestStreak,
                lastCheckedDate: [...newHistory].sort().reverse()[0]
              });
            }
          }
        }

        setRewardToast({ message: editingExtraWork ? "Extra work updated!" : `Logged extra for ${selectedHabitForExtra.name}! +${xpBonus} XP`, type: 'xp' });
        setTimeout(() => setRewardToast(null), 5000);
      });
      setShowExtraWorkModal(false);
      setSelectedHabitForExtra(null);
      setEditingExtraWork(null);
      setExtraWorkData({ description: '', duration: '1h', targetDate: '', logDate: new Date().toLocaleDateString('en-CA') });
    } catch (err) {
      console.error("Error logging habit extra work:", err);
    }
  };

  const deleteExtraWork = async (date, index, entry) => {
    if (!window.confirm("Delete this extra work log? XP will be deducted.")) return;
    const statsRef = doc(db, 'userStats', 'global');
    try {
      await runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        if (!statsDoc.exists()) return;
        const data = statsDoc.data();
        const log = data.extraWorkLog || {};
        if (!log[date]) return;

        const newArr = [...log[date]];
        const removed = newArr.splice(index, 1)[0];

        const updates = {
          xp: (data.xp || 0) - (removed.xpAwarded || 0),
          [`extraWorkLog.${date}`]: newArr
        };
        if (newArr.length === 0) updates[`extraWorkLog.${date}`] = []; // Firestore delete handles array indices better with updates

        transaction.update(statsRef, updates);
      });
    } catch (err) {
      console.error("Error deleting extra work:", err);
    }
  };

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
      setFormData({
        name: '',
        category: 'Health',
        priority: 'Medium',
        notes: '',
        color: '#4f46e5',
        monthlyTarget: getDefaultMonthlyTarget(true),
        allowExtraWork: true,
        activeDays: [0, 1, 2, 3, 4, 5, 6]
      });
    } catch (err) {
      console.error("Error adding habit:", err);
    }
  };

  const calculateStreaks = (history, activeDays = [0, 1, 2, 3, 4, 5, 6]) => {
    if (!history || history.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const sortedDates = [...new Set(history)].sort();
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    // Helper to check if a date is a rest day
    const isRestDay = (dateStr) => !activeDays.includes(new Date(dateStr).getDay());

    // Longest Streak calculation
    let longest = 0;
    let tempStreak = 0;

    // We need a continuous range of dates to check streaks properly with rest days
    if (sortedDates.length > 0) {
      const firstDate = new Date(sortedDates[0]);
      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      let check = new Date(firstDate);

      while (check <= lastDate) {
        const dStr = check.toLocaleDateString('en-CA');
        const dayOfWeek = check.getDay();

        if (history.includes(dStr)) {
          tempStreak++;
        } else if (!activeDays.includes(dayOfWeek)) {
          // It's a rest day, streak continues if it was already going
        } else {
          // It's an active day and not completed, streak resets
          tempStreak = 0;
        }
        longest = Math.max(longest, tempStreak);
        check.setDate(check.getDate() + 1);
      }
    }

    // Current Streak calculation
    let current = 0;
    let checkDate = new Date();
    // If today is an off-day and not completed, start checking from yesterday
    const todayStr = checkDate.toLocaleDateString('en-CA');
    if (!history.includes(todayStr) && !activeDays.includes(checkDate.getDay())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toLocaleDateString('en-CA');
      const dayOfWeek = checkDate.getDay();

      if (history.includes(dStr)) {
        current++;
      } else if (!activeDays.includes(dayOfWeek)) {
        // Rest day, skip but don't break
      } else {
        // Active day and not completed, break
        break;
      }

      // Safety break for very old history range or empty
      if (current > 1000 || checkDate < new Date(sortedDates[0])) break;
      checkDate.setDate(checkDate.getDate() - 1);
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

  const toggleHabit = async (habit, currentlyChecked) => {
    const today = currentDate;
    const isChecking = !currentlyChecked;
    const statsRef = doc(db, 'userStats', 'global');
    const habitRef = doc(db, 'habits', habit.id);

    try {
      await runTransaction(db, async (transaction) => {
        const habitDoc = await transaction.get(habitRef);
        const statsDoc = await transaction.get(statsRef);

        if (!habitDoc.exists()) return;
        const hData = habitDoc.data();

        let newHistory;
        if (isChecking) {
          newHistory = [...(hData.history || []), today];
        } else {
          newHistory = (hData.history || []).filter(d => d !== today);
        }

        const { currentStreak, longestStreak } = calculateStreaks(newHistory, hData.activeDays || [0, 1, 2, 3, 4, 5, 6]);

        // Update Habit
        transaction.update(habitRef, {
          checkedToday: isChecking,
          lastCheckedDate: isChecking ? today : (newHistory.length > 0 ? [...newHistory].sort().reverse()[0] : null),
          history: newHistory,
          currentStreak,
          longestStreak
        });

        // Update Global XP
        if (statsDoc.exists()) {
          const currentXp = statsDoc.data().xp || 0;
          transaction.update(statsRef, { xp: isChecking ? currentXp + 10 : Math.max(0, currentXp - 10) });
        }
      });

      if (isChecking && notificationsEnabled) {
        new Notification("Habit Completed!", { body: `Great job on ${habit.name}! +10 XP earned.` });
      }
    } catch (err) {
      console.error("Error toggling habit with XP:", err);
    }
  };

  const toggleDate = async (habit, dateStr) => {
    const isChecking = !(habit.history || []).includes(dateStr);
    const today = currentDate;
    const statsRef = doc(db, 'userStats', 'global');
    const habitRef = doc(db, 'habits', habit.id);

    try {
      await runTransaction(db, async (transaction) => {
        const habitDoc = await transaction.get(habitRef);
        const statsDoc = await transaction.get(statsRef);

        if (!habitDoc.exists()) return;
        const hData = habitDoc.data();

        let newHistory;
        if (isChecking) {
          newHistory = [...(hData.history || []), dateStr];
        } else {
          newHistory = (hData.history || []).filter(d => d !== dateStr);
        }

        const { currentStreak, longestStreak } = calculateStreaks(newHistory, hData.activeDays || [0, 1, 2, 3, 4, 5, 6]);

        let updates = {
          history: newHistory,
          currentStreak,
          longestStreak,
          lastCheckedDate: newHistory.length > 0 ? [...newHistory].sort().reverse()[0] : null
        };

        if (dateStr === today) updates.checkedToday = isChecking;

        transaction.update(habitRef, updates);

        if (statsDoc.exists()) {
          const currentXp = statsDoc.data().xp || 0;
          transaction.update(statsRef, { xp: isChecking ? currentXp + 10 : Math.max(0, currentXp - 10) });
        }
      });
    } catch (err) {
      console.error("Error toggling date with XP:", err);
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
    const completed = habits.filter(h => (h.history || []).includes(currentDate)).length;
    const avgStreak = total > 0 ? (habits.reduce((acc, h) => acc + (h.currentStreak || 0), 0) / total).toFixed(1) : 0;
    const bestStreak = Math.max(0, ...habits.map(h => h.longestStreak || 0));

    const extraWorkTodayXP = (userStats.extraWorkLog?.[currentDate] || [])
      .reduce((acc, entry) => acc + (entry.xpAwarded || 0), 0);

    return { total, completed, avgStreak, bestStreak, extraWorkTodayXP };
  }, [habits, currentDate, userStats.extraWorkLog]);

  const habitXpMap = useMemo(() => {
    const map = {};
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    habits.forEach(h => {
      const viewDate = habitViewDates[h.id] || new Date();
      const monthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
      const history = h.history || [];
      const monthHistory = history.filter(d => d.startsWith(monthPrefix));

      // Always calculate based on the month being viewed
      const thisMonthTarget = getDefaultMonthlyTarget(h.allowExtraWork ?? true, h.activeDays ?? [0, 1, 2, 3, 4, 5, 6], viewDate);

      map[h.id] = {
        base: history.length * 10,
        extra: 0,
        monthTotal: monthHistory.length * 10,
        monthTarget: thisMonthTarget
      };
    });

    Object.entries(userStats.extraWorkLog || {}).forEach(([date, dayLogs]) => {
      dayLogs.forEach(entry => {
        if (entry.habitId && map[entry.habitId]) {
          const viewDate = habitViewDates[entry.habitId] || new Date();
          const monthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

          const xp = entry.xpAwarded || 0;
          map[entry.habitId].extra += xp;
          if (date.startsWith(monthPrefix)) {
            map[entry.habitId].monthTotal += xp;
          }
        }
      });
    });
    return map;
  }, [habits, userStats.extraWorkLog, currentDate, habitViewDates]);

  const todayBadge = userStats.badges?.[currentDate];

  if (loading) return <div className="loading-state"><Clock className="spin" /> Loading Habits...</div>;

  return (
    <div className="habit-tracker-container">
      <header className="habit-header">
        <div className="habit-title-group">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Smart Habit Tracker</h2>
          <p style={{ color: 'var(--text-muted)' }}>Build consistent routines and track your progress.</p>
        </div>
        <div className="habit-controls">
          <div className="xp-counter" title="Global lifetime points">
            <Zap size={16} fill="white" />
            <span className="xp-val">{userStats.xp || 0} TOTAL XP</span>
          </div>
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
        {stats.extraWorkTodayXP > 0 && (
          <div className="stat-card" style={{ background: '#f5f7ff', border: '1px solid #e0e7ff' }}>
            <span className="label" style={{ color: '#4338ca' }}>Today's Grind</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame className="text-indigo-600" size={24} />
              <span className="value" style={{ color: '#4338ca' }}>+{stats.extraWorkTodayXP} XP</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>Bonus from extra efforts!</span>
          </div>
        )}
        {todayBadge && (
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fcd34d' }}>
            <span className="label" style={{ color: '#92400e' }}>Daily Award</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award className="text-amber-500" size={24} />
              <span className="value" style={{ color: '#92400e', fontSize: '1.2rem' }}>{todayBadge}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Earned for 2x productivity!</span>
          </div>
        )}
      </div>

      <div className="habit-grid">
        {habits.map(habit => {
          const checkedToday = (habit.history || []).includes(currentDate);
          return (
            <div key={habit.id} className="habit-card" style={{ '--habit-color': habit.color, '--habit-glow': `${habit.color}20` }}>
              <div className="habit-info-header">
                <div className="habit-title-group" style={{ flex: 1 }}>
                  <span className="habit-category" style={{ background: `${habit.color}15`, color: habit.color }}>
                    {habit.category}
                  </span>
                  <h3 className="habit-name">{habit.name}</h3>
                  {habitXpMap[habit.id]?.monthTarget > 0 && (
                    <div className="monthly-target-info">
                      <div className="target-progress-row">
                        <span className="target-val">{habitXpMap[habit.id]?.monthTotal || 0} / {habitXpMap[habit.id]?.monthTarget} XP</span>
                        <span className="target-pct">{Math.floor(((habitXpMap[habit.id]?.monthTotal || 0) / habitXpMap[habit.id]?.monthTarget) * 100)}%</span>
                      </div>
                      <div className="target-mini-bar">
                        <div
                          className="target-mini-fill"
                          style={{
                            width: `${Math.min(100, ((habitXpMap[habit.id]?.monthTotal || 0) / habitXpMap[habit.id]?.monthTarget) * 100)}%`,
                            backgroundColor: habit.color
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="habit-actions">
                  <div className="habit-xp-group">
                    <div className="habit-xp-badge base" title="Base XP (10 per day)">
                      <Check size={10} />
                      <span>{habitXpMap[habit.id]?.base || 0}</span>
                    </div>
                    <div className="habit-xp-badge extra" title="Extra Effort XP">
                      <Flame size={10} />
                      <span>{habitXpMap[habit.id]?.extra || 0}</span>
                    </div>
                  </div>
                  {habit.allowExtraWork !== false && (
                    <button className="action-btn" onClick={() => {
                      setSelectedHabitForExtra(habit);
                      setShowExtraWorkModal(true);
                    }} title="Log Extra Effort">
                      <Zap size={16} style={{ color: habit.color }} />
                    </button>
                  )}
                  <button className="action-btn" onClick={() => {
                    setEditingHabit(habit);
                    setFormData({
                      name: habit.name,
                      category: habit.category,
                      priority: habit.priority,
                      notes: habit.notes,
                      color: habit.color,
                      monthlyTarget: habit.monthlyTarget || getDefaultMonthlyTarget(habit.allowExtraWork ?? true, habit.activeDays ?? [0, 1, 2, 3, 4, 5, 6]),
                      allowExtraWork: habit.allowExtraWork ?? true,
                      activeDays: habit.activeDays ?? [0, 1, 2, 3, 4, 5, 6]
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
                  {!(habit.activeDays || [0, 1, 2, 3, 4, 5, 6]).includes(new Date(currentDate).getDay()) ? (
                    <div className="rest-day-notice">
                      <span className="rest-lbl">REST DAY</span>
                      <CalendarIcon size={16} />
                    </div>
                  ) : (
                    <button
                      className={`habit-check-btn ${checkedToday ? 'checked' : ''}`}
                      onClick={() => toggleHabit(habit, checkedToday)}
                    >
                      <Check size={28} />
                    </button>
                  )}
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

              <HabitTrendChart history={habit.history || []} color={habit.color} habitId={habit.id} userStats={userStats} />

              <HabitCalendar
                history={habit.history || []}
                reflections={habit.reflections || {}}
                color={habit.color}
                onToggleDate={(dateStr) => toggleDate(habit, dateStr)}
                onAddReflection={(dateStr) => {
                  const text = (habit.reflections && habit.reflections[dateStr]) || '';
                  setActiveReflection({ habitId: habit.id, date: dateStr, text });
                }}
                userStats={userStats}
                habitId={habit.id}
                activeDays={habit.activeDays || [0, 1, 2, 3, 4, 5, 6]}
                viewDate={habitViewDates[habit.id] || new Date()}
                setViewDate={(d) => setHabitViewDates(prev => ({ ...prev, [habit.id]: d }))}
              />
            </div>
          );
        })}

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


      <HabitAnalytics habits={habits} userStats={userStats} />

      <div className="extra-work-history-section glass" style={{ marginTop: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Briefcase className="text-indigo-600" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Extra Grind History</h3>
        </div>
        <div className="extra-work-list">
          {Object.entries(userStats.extraWorkLog || {})
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
            .map(([date, entries]) => (
              entries.map((entry, idx) => (
                <div key={`${date}-${idx}`} className="extra-work-item glass">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '10px' }}>
                        <Flame size={16} className="text-orange-500" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{entry.description || entry.habitName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.habitName} • {date} • {entry.duration}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>+{entry.xpAwarded} XP</span>
                      <button className="action-btn" onClick={() => {
                        const habit = habits.find(h => h.id === entry.habitId);
                        if (habit) {
                          setSelectedHabitForExtra(habit);
                          setEditingExtraWork({ date, index: idx, entry });
                          setExtraWorkData({
                            description: entry.description,
                            duration: entry.duration,
                            targetDate: '',
                            logDate: date
                          });
                          setShowExtraWorkModal(true);
                        }
                      }}><Edit2 size={14} /></button>
                      <button className="action-btn" onClick={() => deleteExtraWork(date, idx, entry)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))
            ))}
          {(!userStats.extraWorkLog || Object.keys(userStats.extraWorkLog).length === 0) && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No extra work logged yet. Use the ⚡ icon on habits to start!</p>
          )}
        </div>
      </div>

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
                <label>Weekly Schedule</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`day-selector-btn ${formData.activeDays.includes(idx) ? 'active' : ''}`}
                      onClick={() => {
                        const newActive = formData.activeDays.includes(idx)
                          ? formData.activeDays.filter(d => d !== idx)
                          : [...formData.activeDays, idx].sort();

                        setFormData({
                          ...formData,
                          activeDays: newActive,
                          monthlyTarget: getDefaultMonthlyTarget(formData.allowExtraWork, newActive)
                        });
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: '2px solid #e2e8f0',
                        backgroundColor: formData.activeDays.includes(idx) ? 'var(--primary)' : 'white',
                        color: formData.activeDays.includes(idx) ? 'white' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Select days this habit is active.</p>
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  id="allowExtraWork"
                  checked={formData.allowExtraWork}
                  onChange={e => {
                    const allowed = e.target.checked;
                    setFormData({
                      ...formData,
                      allowExtraWork: allowed,
                      monthlyTarget: getDefaultMonthlyTarget(allowed, formData.activeDays)
                    });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="allowExtraWork" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                  Enable "Extra Effort" (Zap) for this habit
                </label>
              </div>

              <div className="form-group">
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                  Target dynamically scales based on schedule: <b>{formData.monthlyTarget} XP</b> for current month.
                </p>
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
        </div >
      )}

      {
        activeReflection && (
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
        )
      }

      {
        showExtraWorkModal && (
          <div className="habit-modal-overlay">
            <div className="habit-modal">
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: 'var(--primary-glow)', borderRadius: '12px' }}>
                    <Flame className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
                      {editingExtraWork ? 'Edit Extra Effort' : `Extra Work: ${selectedHabitForExtra?.name}`}
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      {editingExtraWork ? 'Update your previous log' : 'Record your over-achievement'}
                    </p>
                  </div>
                </div>
                <button className="action-btn" onClick={() => {
                  setShowExtraWorkModal(false);
                  setSelectedHabitForExtra(null);
                  setEditingExtraWork(null);
                }}><X size={24} /></button>
              </div>
              <form className="modal-form" onSubmit={handleLogExtraWork}>
                <div className="form-group">
                  <label>Effort Details</label>
                  <textarea
                    autoFocus
                    placeholder={`What extra did you do for ${selectedHabitForExtra?.name}?`}
                    value={extraWorkData.description}
                    onChange={e => setExtraWorkData({ ...extraWorkData, description: e.target.value })}
                    style={{ minHeight: '80px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Intensity Level</label>
                  <div className="intensity-selector">
                    {[
                      { val: '30m', label: 'Light', xp: '+20' },
                      { val: '1h', label: 'Deep', xp: '+50' },
                      { val: '2h', label: 'Power', xp: '+120' },
                      { val: '4h', label: 'Grit', xp: '+300' }
                    ].map(level => (
                      <button
                        key={level.val}
                        type="button"
                        className={`intensity-btn ${extraWorkData.duration === level.val ? 'active' : ''}`}
                        onClick={() => setExtraWorkData({ ...extraWorkData, duration: level.val })}
                      >
                        <span className="lvl-lbl">{level.label}</span>
                        <span className="lvl-xp">{level.xp} XP</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>XP Applied to Date</label>
                    <input
                      type="date"
                      value={extraWorkData.logDate}
                      onChange={e => setExtraWorkData({ ...extraWorkData, logDate: e.target.value })}
                      max={currentDate}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '2px solid #eef2ff',
                        background: '#f8fafc',
                        outline: 'none',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Habit Catch-up (Optional)</label>
                    <input
                      type="date"
                      value={extraWorkData.targetDate}
                      onChange={e => setExtraWorkData({ ...extraWorkData, targetDate: e.target.value })}
                      max={currentDate}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '2px solid #eef2ff',
                        background: '#f8fafc',
                        outline: 'none',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
                <button className="add-habit-btn" style={{ width: '100%', marginTop: '12px' }} type="submit">
                  {editingExtraWork ? 'Update Entry' : `Claim XP for ${extraWorkData.logDate} ${extraWorkData.targetDate ? `& Completion for ${extraWorkData.targetDate}` : ''}`}
                </button>
              </form>
            </div>
          </div>
        )}

      {rewardToast && (
        <div className="reward-popup">
          <div style={{ background: rewardToast.type === 'badge' ? '#f59e0b' : '#4f46e5', padding: '10px', borderRadius: '12px', color: 'white' }}>
            {rewardToast.type === 'badge' ? <Award size={24} /> : <Zap size={24} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#1e293b' }}>{rewardToast.type === 'badge' ? 'Challenge Complete!' : 'Points Earned!'}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{rewardToast.message}</div>
          </div>
        </div>
      )}
    </div >
  );
};

const HabitTrendChart = ({ history, color, habitId, userStats }) => {
  const data = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');

      const extraWork = (userStats?.extraWorkLog?.[dateStr] || [])
        .some(entry => entry.habitId === habitId);

      result.push({
        day: d.toLocaleDateString('default', { weekday: 'narrow' }),
        completed: history.includes(dateStr) ? 1 : 0,
        extraWork: extraWork ? 1.2 : null // Slightly above for visibility
      });
    }
    return result;
  }, [history, userStats, habitId]);

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
          {/* Use extraWork as a point indicator with custom Flame badge */}
          <Line
            type="monotone"
            dataKey="extraWork"
            stroke="#ef4444"
            strokeWidth={0}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.extraWork) {
                return (
                  <g key={props.index}>
                    <circle cx={cx} cy={cy} r={6} fill="#ef4444" />
                    <path
                      d="M12 2c0 0-7 3.5-7 10s5 10 7 10 7-3.5 7-10-7-10-7-10zm0 16c-1.1 0-2-.9-2-2s2-4 2-4 2 2.9 2 4-.9 2-2 2z"
                      fill="white"
                      transform={`translate(${cx - 3.5}, ${cy - 4.5}) scale(0.3)`}
                    />
                  </g>
                );
              }
              return null;
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const HabitCalendar = ({ history, reflections, color, onToggleDate, onAddReflection, userStats, habitId, activeDays = [0, 1, 2, 3, 4, 5, 6], viewDate, setViewDate }) => {

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
    const dObj = new Date(year, month, d);
    const dayOfWeek = dObj.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isActive = activeDays.includes(dayOfWeek);
    const isCompleted = history.includes(dateStr);
    const hasReflection = reflections && reflections[dateStr];
    const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
    const globalBadge = userStats?.badges?.[dateStr];
    // Only show extra work badge if it belongs to THIS specific habit
    const habitExtraWork = userStats?.extraWorkLog?.[dateStr]?.filter(log => log.habitId === habitId);
    const hasHabitExtra = habitExtraWork && habitExtraWork.length > 0;

    // Only show flame if it's a global badge like "Double Down" OR specifically logged extra for this habit
    const shouldShowFlame = (globalBadge && globalBadge !== "Overachiever") || hasHabitExtra;

    days.push(
      <div key={d} className="calendar-day-wrapper">
        <button
          className={`calendar-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''} ${!isActive ? 'off-day' : ''}`}
          style={isCompleted ? { background: color } : {}}
          onClick={() => onToggleDate(dateStr)}
          type="button"
          disabled={!isActive}
        >
          {d}
          {hasReflection && <span className="reflection-dot"></span>}
          {shouldShowFlame && (
            <div className="calendar-badge-mini" title={globalBadge || "Extra Grit Logged"}>
              <Flame size={8} fill="currentColor" />
            </div>
          )}
          {!isActive && <div className="off-day-indicator">Rest</div>}
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

const HabitAnalytics = ({ habits, userStats }) => {
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
      const dateStr = d.toLocaleDateString('en-CA');
      const count = habits.filter(h => (h.history || []).includes(dateStr)).length;

      let label;
      if (daysToShow <= 14) {
        label = d.toLocaleDateString('default', { weekday: 'short' });
      } else if (daysToShow <= 60) {
        label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      } else {
        label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      }

      const extraXP = (userStats?.extraWorkLog?.[dateStr] || [])
        .reduce((acc, entry) => acc + (entry.xpAwarded || 0), 0);

      result.push({
        name: label,
        fullDate: dateStr,
        completed: count,
        extraXP: extraXP
      });
    }
    return result;
  }, [habits, period, userStats]);

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
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="completed"
              stroke="#4f46e5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorComp)"
              name="Habits Done"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="extraXP"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="#f59e0b"
              fillOpacity={0.1}
              name="Extra XP"
            />
            <XAxis dataKey="name" hide />
            <YAxis yAxisId="left" hide />
            <YAxis yAxisId="right" hide />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
              labelFormatter={(value, payload) => payload[0]?.payload.fullDate || value}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SmartHabitTracker;
