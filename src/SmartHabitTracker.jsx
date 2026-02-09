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
  BarChart,
  Bar,
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

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

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
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    manualTargets: {} // Map of 'YYYY-MM' -> targetValue
  });

  const [editingTargetMonthInfo, setEditingTargetMonthInfo] = useState({ key: '', label: '', date: new Date() });

  const [habitViewDates, setHabitViewDates] = useState({});
  const [activeReflection, setActiveReflection] = useState(null); // { habitId, date, text }
  const [showExtraWorkModal, setShowExtraWorkModal] = useState(false);
  const [selectedHabitForExtra, setSelectedHabitForExtra] = useState(null);
  const [editingExtraWork, setEditingExtraWork] = useState(null); // { date, index, entry }
  const [extraWorkData, setExtraWorkData] = useState({ description: '', duration: '1h', targetDate: '', logDate: new Date().toLocaleDateString('en-CA') });
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [collectiveDate, setCollectiveDate] = useState(new Date()); // For collective view navigation
  const [userStats, setUserStats] = useState({ xp: 0, badges: {}, completedDates: {}, dailyWorkLog: {} });
  const [rewardToast, setRewardToast] = useState(null);
  const [sortBy, setSortBy] = useState('category'); // 'category' | 'priority' | 'name'
  const [detailHabit, setDetailHabit] = useState(null);

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

    const xpTable = { '30m': 20, '1h': 40, '2h': 70, '4h': 100 };
    const xpBonus = xpTable[extraWorkData.duration] || 40;
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

  const migratePastXP = async () => {
    if (!window.confirm("This will update all past extra work entries to the new XP standards and recalculate your total XP. Continue?")) return;

    const statsRef = doc(db, 'userStats', 'global');
    const xpTable = { '30m': 20, '1h': 40, '2h': 70, '4h': 100 };

    try {
      await runTransaction(db, async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        if (!statsDoc.exists()) return;

        const data = statsDoc.data();
        const oldLog = data.extraWorkLog || {};
        let newXpTotal = data.xp || 0;
        const updatedLog = {};
        let changedTotal = false;

        Object.entries(oldLog).forEach(([date, entries]) => {
          updatedLog[date] = entries.map(entry => {
            const newXp = xpTable[entry.duration] || entry.xpAwarded;
            if (newXp !== entry.xpAwarded) {
              newXpTotal += (newXp - entry.xpAwarded);
              changedTotal = true;
              return { ...entry, xpAwarded: newXp };
            }
            return entry;
          });
        });

        if (changedTotal) {
          transaction.update(statsRef, {
            xp: newXpTotal,
            extraWorkLog: updatedLog
          });
        }
      });
      setRewardToast({ message: "Past entries updated to new standards!", type: 'xp' });
      setTimeout(() => setRewardToast(null), 3000);
    } catch (err) {
      console.error("Migration failed:", err);
      alert("Migration failed. See console for details.");
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
        activeDays: [0, 1, 2, 3, 4, 5, 6],
        manualTargets: {}
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

      // Calculate target: Use manual if set for THIS SPECIFIC MONTH, otherwise dynamic
      const monthKey = getMonthKey(viewDate);
      const manualTarget = h.manualTargets?.[monthKey];
      const thisMonthTarget = manualTarget !== undefined
        ? manualTarget
        : getDefaultMonthlyTarget(h.allowExtraWork ?? true, h.activeDays ?? [0, 1, 2, 3, 4, 5, 6], viewDate);

      // Expected XP till today
      const today = new Date();
      const isPastMonth = viewDate.getFullYear() < today.getFullYear() || (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() < today.getMonth());
      const isCurrentMonth = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();

      let monthExpected = 0;
      if (isPastMonth) {
        monthExpected = thisMonthTarget;
      } else if (isCurrentMonth) {
        let activeTillToday = 0;
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        for (let d = 1; d <= currentDay; d++) {
          if ((h.activeDays || [0, 1, 2, 3, 4, 5, 6]).includes(new Date(currentYear, currentMonth, d).getDay())) {
            activeTillToday++;
          }
        }
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const expectedExtra = (h.allowExtraWork ?? true) ? Math.floor((currentDay / daysInMonth) * 100) : 0;
        monthExpected = (activeTillToday * 10) + expectedExtra;
      }

      map[h.id] = {
        base: history.length * 10,
        extra: 0,
        monthTotal: monthHistory.length * 10,
        monthTarget: thisMonthTarget,
        monthExpected: monthExpected
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

  const currentMonthStats = useMemo(() => {
    const d = collectiveDate;
    const monthKey = getMonthKey(d);
    const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });

    let totalTarget = 0;
    let totalBaseXP = 0;
    let totalExpected = 0;

    const today = new Date();
    const isPast = d.getFullYear() < today.getFullYear() || (d.getFullYear() === today.getFullYear() && d.getMonth() < today.getMonth());
    const isCurrent = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();

    habits.forEach(h => {
      // Target for selected month
      const t = h.manualTargets?.[monthKey] !== undefined
        ? h.manualTargets[monthKey]
        : getDefaultMonthlyTarget(h.allowExtraWork ?? true, h.activeDays ?? [0, 1, 2, 3, 4, 5, 6], d);
      totalTarget += t;

      // Base XP earned in selected month
      const history = h.history || [];
      const monthHistory = history.filter(dateStr => dateStr.startsWith(monthPrefix));
      totalBaseXP += monthHistory.length * 10;

      // Expected XP calc
      let hExpected = 0;
      if (isPast) {
        hExpected = t;
      } else if (isCurrent) {
        let activeTillToday = 0;
        for (let day = 1; day <= today.getDate(); day++) {
          if ((h.activeDays || [0, 1, 2, 3, 4, 5, 6]).includes(new Date(today.getFullYear(), today.getMonth(), day).getDay())) {
            activeTillToday++;
          }
        }
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const expectedExtra = (h.allowExtraWork ?? true) ? Math.floor((today.getDate() / daysInMonth) * 100) : 0;
        hExpected = (activeTillToday * 10) + expectedExtra;
      }
      totalExpected += hExpected;
    });

    let totalExtraXP = 0;
    let extraWorkCount = 0;
    Object.entries(userStats.extraWorkLog || {}).forEach(([date, entries]) => {
      if (date.startsWith(monthPrefix)) {
        entries.forEach(e => {
          totalExtraXP += (e.xpAwarded || 0);
          extraWorkCount++;
        });
      }
    });

    const totalEarned = totalBaseXP + totalExtraXP;
    return { totalTarget, totalEarned, monthName, extraWorkCount, totalExtraXP, totalExpected };
  }, [habits, userStats.extraWorkLog, collectiveDate]);

  const todayStats = useMemo(() => {
    const completedCount = habits.filter(h => (h.history || []).includes(currentDate)).length;
    const baseXP = completedCount * 10;
    const extraXP = (userStats.extraWorkLog?.[currentDate] || []).reduce((acc, e) => acc + (e.xpAwarded || 0), 0);
    return { totalXP: baseXP + extraXP };
  }, [habits, currentDate, userStats.extraWorkLog]);

  const todayBadge = userStats.badges?.[currentDate];

  const renderHabit = (habit) => {
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
                  <span className="target-val" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                    {habitViewDates[habit.id]?.toLocaleString('default', { month: 'short' }) || new Date().toLocaleString('default', { month: 'short' })}: {habitXpMap[habit.id]?.monthTotal || 0} / {habitXpMap[habit.id]?.monthTarget} XP
                  </span>
                  <span className="target-pct">{Math.floor(((habitXpMap[habit.id]?.monthTotal || 0) / habitXpMap[habit.id]?.monthTarget) * 100)}%</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Expected: {habitXpMap[habit.id]?.monthExpected || 0} XP
                  </div>
                  {(() => {
                    const diff = (habitXpMap[habit.id]?.monthTotal || 0) - (habitXpMap[habit.id]?.monthExpected || 0);
                    return (
                      <div style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: diff >= 0 ? '#10b981' : '#f59e0b',
                        padding: '2px 6px',
                        background: diff >= 0 ? '#f0fdf4' : '#fffbeb',
                        borderRadius: '4px'
                      }}>
                        {diff >= 0 ? `Ahead by ${diff}` : `Behind by ${Math.abs(diff)}`} XP
                      </div>
                    );
                  })()}
                </div>

                <div className="target-mini-bar">
                  <div
                    className="target-expected-fill"
                    style={{ width: `${Math.min(100, ((habitXpMap[habit.id]?.monthExpected || 0) / habitXpMap[habit.id]?.monthTarget) * 100)}%` }}
                  />
                  <div
                    className="target-expected-indicator"
                    style={{ left: `${Math.min(100, ((habitXpMap[habit.id]?.monthExpected || 0) / habitXpMap[habit.id]?.monthTarget) * 100)}%` }}
                  />
                  <div
                    className="target-mini-fill"
                    style={{
                      width: `${Math.min(100, ((habitXpMap[habit.id]?.monthTotal || 0) / habitXpMap[habit.id]?.monthTarget) * 100)}%`,
                      backgroundColor: habit.color,
                      position: 'relative',
                      zIndex: 2
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
            <button className="action-btn" onClick={() => setDetailHabit(habit)} title="View Detailed Analytics">
              <TrendingUp size={16} />
            </button>
            <button className="action-btn" onClick={() => {
              const viewDate = habitViewDates[habit.id] || new Date();
              setEditingTargetMonthInfo({
                key: getMonthKey(viewDate),
                label: viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                date: viewDate
              });

              setFormData({
                name: habit.name,
                category: habit.category,
                priority: habit.priority,
                notes: habit.notes,
                color: habit.color,
                allowExtraWork: habit.allowExtraWork ?? true,
                activeDays: habit.activeDays ?? [0, 1, 2, 3, 4, 5, 6],
                manualTargets: habit.manualTargets || {}
              });
              setShowAddModal(true);
            }} title="Edit Habit">
              <Edit2 size={16} />
            </button>
            <button className="action-btn" onClick={() => deleteHabit(habit.id)} title="Delete Habit">
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
  };

  if (loading) return <div className="loading-state"><Clock className="spin" /> Loading Habits...</div>;

  return (
    <div className="habit-tracker-container">
      <header className="habit-header">
        <div className="habit-title-group">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Smart Habit Tracker</h2>
          <p style={{ color: 'var(--text-muted)' }}>Build consistent routines and track your progress.</p>
        </div>
        <div className="habit-controls">
          <div className="xp-counter" title={`${currentMonthStats.monthName} XP`}>
            <Zap size={16} fill="white" />
            <span className="xp-val">{currentMonthStats.totalEarned || 0} {currentMonthStats.monthName.split(' ')[0].toUpperCase()} XP</span>
          </div>
          <button
            className={`action-btn ${notificationsEnabled ? 'active' : ''}`}
            onClick={notificationsEnabled ? () => setNotificationsEnabled(false) : requestNotificationPermission}
            title={notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}
          >
            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          <button
            className="action-btn"
            onClick={() => setSortBy(prev => {
              if (prev === 'category') return 'priority';
              if (prev === 'priority') return 'name';
              return 'category';
            })}
            title={`Current Sort: ${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`}
            style={{ minWidth: 'auto', gap: '6px', padding: '0 12px' }}
          >
            <MoreVertical size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </span>
          </button>
          <button
            className="add-habit-btn"
            onClick={() => {
              setEditingHabit(null);
              const now = new Date();
              setEditingTargetMonthInfo({
                key: getMonthKey(now),
                label: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
                date: now
              });
              setFormData({ name: '', category: 'Health', priority: 'Medium', notes: '', color: '#4f46e5', activeDays: [0, 1, 2, 3, 4, 5, 6], allowExtraWork: true, manualTargets: {} });
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
        <div className="stat-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="calendar-nav-btn" onClick={() => setCollectiveDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                <ChevronLeft size={16} />
              </button>
              <span className="label" style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{currentMonthStats.monthName}</span>
              <button className="calendar-nav-btn" onClick={() => setCollectiveDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {currentMonthStats.extraWorkCount} Extra Logs ({currentMonthStats.totalExtraXP} XP)
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{currentMonthStats.totalEarned}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {currentMonthStats.totalTarget} XP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Expected: {currentMonthStats.totalExpected} XP
                </div>
                {(() => {
                  const diff = currentMonthStats.totalEarned - currentMonthStats.totalExpected;
                  return (
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: diff >= 0 ? '#10b981' : '#f59e0b',
                      padding: '1px 6px',
                      background: diff >= 0 ? '#f0fdf4' : '#fffbeb',
                      borderRadius: '4px'
                    }}>
                      {diff >= 0 ? `Ahead by ${diff}` : `Behind by ${Math.abs(diff)}`} XP
                    </div>
                  );
                })()}
              </div>
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
              {currentMonthStats.totalTarget > 0 ? Math.floor((currentMonthStats.totalEarned / currentMonthStats.totalTarget) * 100) : 0}%
            </span>
          </div>

          <div className="target-mini-bar" style={{ height: '8px', background: '#f1f5f9', marginTop: '4px' }}>
            <div
              className="target-expected-fill"
              style={{ width: `${currentMonthStats.totalTarget > 0 ? Math.min(100, (currentMonthStats.totalExpected / currentMonthStats.totalTarget) * 100) : 0}%` }}
            />
            <div
              className="target-expected-indicator"
              style={{ left: `${currentMonthStats.totalTarget > 0 ? Math.min(100, (currentMonthStats.totalExpected / currentMonthStats.totalTarget) * 100) : 0}%`, height: '100%' }}
            />
            <div
              className="target-mini-fill"
              style={{
                width: `${currentMonthStats.totalTarget > 0 ? Math.min(100, (currentMonthStats.totalEarned / currentMonthStats.totalTarget) * 100) : 0}%`,
                backgroundColor: 'var(--primary)',
                borderRadius: '10px',
                position: 'relative',
                zIndex: 2
              }}
            />
          </div>
        </div>
        <div className="stat-card">
          <span className="label">Today's Progress</span>
          <span className="value">{stats.completed} / {stats.total}</span>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginTop: '-4px' }}>
            +{todayStats.totalXP} XP Today
          </div>
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
        {sortBy === 'category' ? (
          CATEGORIES.map(category => {
            let categoryHabits = habits.filter(h => h.category === category);
            if (categoryHabits.length === 0) return null;

            return (
              <div key={category} className="category-section" style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
                <div className="category-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{category}</h3>
                  <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                    {categoryHabits.length}
                  </span>
                </div>
                <div className="habit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                  {categoryHabits.map(habit => renderHabit(habit))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="habit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px', gridColumn: '1 / -1' }}>
            {[...habits]
              .sort((a, b) => {
                if (sortBy === 'priority') {
                  const pMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                  return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
                } else {
                  return a.name.localeCompare(b.name);
                }
              })
              .map(habit => renderHabit(habit))
            }
          </div>
        )}

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

      {detailHabit && (
        <HabitDetailAnalyticsModal
          habit={detailHabit}
          userStats={userStats}
          xpStats={habitXpMap[detailHabit.id]}
          onClose={() => setDetailHabit(null)}
        />
      )}

      <HabitAnalytics habits={habits} userStats={userStats} />

      <div className="extra-work-history-section glass" style={{ marginTop: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Briefcase className="text-indigo-600" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Extra Grind History</h3>
          </div>
          <button
            onClick={migratePastXP}
            style={{
              fontSize: '0.75rem',
              padding: '6px 12px',
              background: '#f1f5f9',
              borderRadius: '8px',
              color: '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
            title="Recalculate all past XP to match current standards"
          >
            Update Past XP to Standards
          </button>
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

                        // Just update dependencies, target is calculated in render or manual
                        setFormData({
                          ...formData,
                          activeDays: newActive
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
                    // Just update dependencies, target is calculated in render or manual
                    setFormData({
                      ...formData,
                      allowExtraWork: allowed
                    });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="allowExtraWork" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                  Enable "Extra Effort" (Zap) for this habit
                </label>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Target for {editingTargetMonthInfo.label} (XP)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="manualTarget"
                      checked={formData.manualTargets[editingTargetMonthInfo.key] !== undefined}
                      onChange={e => {
                        const isManual = e.target.checked;
                        const targetKey = editingTargetMonthInfo.key;
                        const currentCaclulated = getDefaultMonthlyTarget(formData.allowExtraWork, formData.activeDays, editingTargetMonthInfo.date);

                        setFormData(prev => {
                          const newTargets = { ...prev.manualTargets };
                          if (isManual) {
                            newTargets[targetKey] = currentCaclulated;
                          } else {
                            delete newTargets[targetKey];
                          }
                          return { ...prev, manualTargets: newTargets };
                        });
                      }}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <label htmlFor="manualTarget" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Set Manually</label>
                  </div>
                </div>

                <input
                  type="number"
                  value={
                    formData.manualTargets[editingTargetMonthInfo.key] !== undefined
                      ? formData.manualTargets[editingTargetMonthInfo.key]
                      : getDefaultMonthlyTarget(formData.allowExtraWork, formData.activeDays, editingTargetMonthInfo.date)
                  }
                  disabled={formData.manualTargets[editingTargetMonthInfo.key] === undefined}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setFormData(prev => ({
                      ...prev,
                      manualTargets: { ...prev.manualTargets, [editingTargetMonthInfo.key]: val }
                    }));
                  }}
                  style={{
                    opacity: formData.manualTargets[editingTargetMonthInfo.key] !== undefined ? 1 : 0.7,
                    background: formData.manualTargets[editingTargetMonthInfo.key] !== undefined ? 'white' : '#f1f5f9'
                  }}
                />

                {formData.manualTargets[editingTargetMonthInfo.key] === undefined ? (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Auto-calculated for {editingTargetMonthInfo.label}. Changes to schedule will update this.
                  </p>
                ) : (
                  <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                    Fixed target for {editingTargetMonthInfo.label}. Will NOT update with schedule changes.
                  </p>
                )}
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
                      { val: '1h', label: 'Deep', xp: '+40' },
                      { val: '2h', label: 'Power', xp: '+70' },
                      { val: '4h', label: 'Grit', xp: '+100' }
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
            type="linear"
            dataKey="completed"
            stroke={color}
            fill={color}
            fillOpacity={0.1}
            strokeWidth={2}
            isAnimationActive={false}
          />
          {/* Use extraWork as a point indicator with custom Flame badge */}
          <Line
            type="linear"
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
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar' | 'line'

  const data = useMemo(() => {
    let daysToShow = period;
    if (period === 'all') {
      const earliest = habits.reduce((acc, h) => Math.min(acc, h.createdAt || Date.now()), Date.now());
      daysToShow = Math.ceil((Date.now() - earliest) / (1000 * 60 * 60 * 24)) + 1;
      daysToShow = Math.max(daysToShow, 7);
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

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: -20, bottom: 0 }
    };

    const gradientDef = (
      <defs>
        <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorExtra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
      </defs>
    );

    const cartesianGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
    const xAxis = (
      <XAxis
        dataKey="name"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
        interval={period === 'all' ? Math.floor(data.length / 10) : (period > 14 ? 2 : 0)}
      />
    );
    const yAxisLeft = <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#4f46e5' }} />;
    const yAxisRight = <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#f59e0b' }} />;

    const tooltip = (
      <Tooltip
        contentStyle={{
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          padding: '12px'
        }}
        itemStyle={{ fontWeight: 800, fontSize: '0.85rem' }}
        labelStyle={{ fontWeight: 900, marginBottom: '6px', color: '#1e293b' }}
        labelFormatter={(value, payload) => payload[0]?.payload.fullDate || value}
      />
    );

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {cartesianGrid}
          {xAxis}
          {yAxisLeft}
          {yAxisRight}
          {tooltip}
          <Bar
            yAxisId="left"
            dataKey="completed"
            fill="#4f46e5"
            radius={[6, 6, 0, 0]}
            name="Habits Done"
            barSize={24}
          />
          <Bar
            yAxisId="right"
            dataKey="extraXP"
            fill="#f59e0b"
            radius={[6, 6, 0, 0]}
            name="Extra XP"
            barSize={24}
          />
        </BarChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {cartesianGrid}
          {xAxis}
          {yAxisLeft}
          {yAxisRight}
          {tooltip}
          <Line
            yAxisId="left"
            type="linear"
            dataKey="completed"
            stroke="#4f46e5"
            strokeWidth={5}
            dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7, strokeWidth: 0 }}
            name="Habits Done"
          />
          <Line
            yAxisId="right"
            type="linear"
            dataKey="extraXP"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name="Extra XP"
          />
        </LineChart>
      );
    }

    // Default: Area Chart
    return (
      <AreaChart {...commonProps}>
        {gradientDef}
        {cartesianGrid}
        {xAxis}
        {yAxisLeft}
        {yAxisRight}
        {tooltip}
        <Area
          yAxisId="left"
          type="linear"
          dataKey="completed"
          stroke="#4f46e5"
          strokeWidth={5}
          fillOpacity={1}
          fill="url(#colorComp)"
          name="Habits Done"
        />
        <Area
          yAxisId="right"
          type="linear"
          dataKey="extraXP"
          stroke="#f59e0b"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorExtra)"
          name="Extra XP"
        />
      </AreaChart>
    );
  };

  return (
    <div className="analytics-section glass" style={{ marginTop: '32px', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'var(--primary-glow)', borderRadius: '14px' }}>
            <BarChart2 className="text-indigo-600" size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Progress Analytics</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Visualize your habit consistency</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="glass" style={{ display: 'flex', gap: '4px', padding: '5px', borderRadius: '12px', background: '#f8fafc' }}>
            {[
              { id: 'area', icon: <Activity size={16} /> },
              { id: 'bar', icon: <BarChart2 size={16} /> },
              { id: 'line', icon: <TrendingUp size={16} /> }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  background: chartType === type.id ? 'white' : 'transparent',
                  color: chartType === type.id ? 'var(--primary)' : '#94a3b8',
                  boxShadow: chartType === type.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {type.icon}
              </button>
            ))}
          </div>

          <div className="glass" style={{ display: 'flex', gap: '4px', padding: '5px', borderRadius: '12px', background: '#f8fafc' }}>
            {[
              { label: 'Week', val: 7 },
              { label: 'Month', val: 30 },
              { label: 'All', val: 'all' }
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.val)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: period === p.val ? 'white' : 'transparent',
                  color: period === p.val ? 'var(--primary)' : '#94a3b8',
                  boxShadow: period === p.val ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: '320px', width: '100%', padding: '0 10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HabitDetailAnalyticsModal = ({ habit, userStats, xpStats, onClose }) => {
  const [period, setPeriod] = useState(30);
  const [chartType, setChartType] = useState('area');

  const data = useMemo(() => {
    let daysToShow = period;
    if (period === 'all') {
      const earliest = habit.createdAt || Date.now();
      daysToShow = Math.ceil((Date.now() - earliest) / (1000 * 60 * 60 * 24)) + 1;
      daysToShow = Math.max(daysToShow, 7);
    }

    const result = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const isDone = (habit.history || []).includes(dateStr);

      let label;
      if (daysToShow <= 14) {
        label = d.toLocaleDateString('default', { weekday: 'short' });
      } else {
        label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      }

      const extraXP = (userStats?.extraWorkLog?.[dateStr] || [])
        .filter(entry => entry.habitId === habit.id)
        .reduce((acc, entry) => acc + (entry.xpAwarded || 0), 0);

      result.push({
        name: label,
        fullDate: dateStr,
        completed: isDone ? 1 : 0,
        extraXP: extraXP
      });
    }
    return result;
  }, [habit, period, userStats]);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: -20, bottom: 0 }
    };

    const gradientDef = (
      <defs>
        <linearGradient id="colorDetailComp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={habit.color} stopOpacity={0.4} />
          <stop offset="95%" stopColor={habit.color} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="colorDetailExtra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
      </defs>
    );

    const cartesianGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
    const xAxis = (
      <XAxis
        dataKey="name"
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
        interval={period === 'all' ? Math.floor(data.length / 10) : (period > 14 ? 2 : 0)}
      />
    );
    const yAxisLeft = <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: habit.color }} />;
    const yAxisRight = <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#f59e0b' }} />;

    const tooltip = (
      <Tooltip
        contentStyle={{
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          padding: '12px'
        }}
        itemStyle={{ fontWeight: 800, fontSize: '0.85rem' }}
        labelStyle={{ fontWeight: 900, marginBottom: '6px', color: '#1e293b' }}
        labelFormatter={(value, payload) => payload[0]?.payload.fullDate || value}
      />
    );

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {cartesianGrid}
          {xAxis}
          {yAxisLeft}
          {yAxisRight}
          {tooltip}
          <Bar yAxisId="left" dataKey="completed" fill={habit.color} radius={[6, 6, 0, 0]} name="Done" barSize={24} />
          <Bar yAxisId="right" dataKey="extraXP" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Extra XP" barSize={24} />
        </BarChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {cartesianGrid}
          {xAxis}
          {yAxisLeft}
          {yAxisRight}
          {tooltip}
          <Line yAxisId="left" type="linear" dataKey="completed" stroke={habit.color} strokeWidth={5} dot={{ r: 5, fill: habit.color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} name="Done" />
          <Line yAxisId="right" type="linear" dataKey="extraXP" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Extra XP" />
        </LineChart>
      );
    }

    return (
      <AreaChart {...commonProps}>
        {gradientDef}
        {cartesianGrid}
        {xAxis}
        {yAxisLeft}
        {yAxisRight}
        {tooltip}
        <Area yAxisId="left" type="linear" dataKey="completed" stroke={habit.color} strokeWidth={5} fillOpacity={1} fill="url(#colorDetailComp)" name="Done" />
        <Area yAxisId="right" type="linear" dataKey="extraXP" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDetailExtra)" name="Extra XP" />
      </AreaChart>
    );
  };

  return (
    <div className="habit-modal-overlay">
      <div className="habit-modal detail-chart-modal" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', background: `${habit.color}15`, borderRadius: '14px' }}>
              <TrendingUp style={{ color: habit.color }} size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{habit.name}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Consistency & Performance History</p>
            </div>
          </div>
          <button className="action-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {xpStats && xpStats.monthTarget > 0 && (
          <div className="glass" style={{ margin: '20px 0', padding: '16px', borderRadius: '16px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>{xpStats.monthTotal}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700 }}>/ {xpStats.monthTarget} XP This Month</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: habit.color }}>
                  {Math.floor((xpStats.monthTotal / xpStats.monthTarget) * 100)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                Expected: {xpStats.monthExpected} XP
              </div>
              {(() => {
                const diff = xpStats.monthTotal - xpStats.monthExpected;
                return (
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    color: diff >= 0 ? '#10b981' : '#f59e0b',
                    padding: '2px 8px',
                    background: diff >= 0 ? '#f0fdf4' : '#fffbeb',
                    borderRadius: '6px'
                  }}>
                    {diff >= 0 ? `Ahead by ${diff}` : `Behind by ${Math.abs(diff)}`} XP
                  </div>
                );
              })()}
            </div>

            <div className="target-mini-bar" style={{ height: '8px', background: '#e2e8f0', marginTop: '12px' }}>
              <div
                className="target-expected-fill"
                style={{ width: `${Math.min(100, (xpStats.monthExpected / xpStats.monthTarget) * 100)}%` }}
              />
              <div
                className="target-mini-fill"
                style={{
                  width: `${Math.min(100, (xpStats.monthTotal / xpStats.monthTarget) * 100)}%`,
                  backgroundColor: habit.color,
                  borderRadius: '10px'
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
          <div className="glass" style={{ display: 'flex', gap: '4px', padding: '5px', borderRadius: '12px', background: '#f8fafc' }}>
            {[
              { id: 'area', icon: <Activity size={16} /> },
              { id: 'bar', icon: <BarChart2 size={16} /> },
              { id: 'line', icon: <TrendingUp size={16} /> }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  background: chartType === type.id ? 'white' : 'transparent',
                  color: chartType === type.id ? habit.color : '#94a3b8',
                  boxShadow: chartType === type.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {type.icon}
              </button>
            ))}
          </div>

          <div className="glass" style={{ display: 'flex', gap: '4px', padding: '5px', borderRadius: '12px', background: '#f8fafc' }}>
            {[
              { label: 'Week', val: 7 },
              { label: 'Month', val: 30 },
              { label: 'All', val: 'all' }
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.val)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: period === p.val ? 'white' : 'transparent',
                  color: period === p.val ? habit.color : '#94a3b8',
                  boxShadow: period === p.val ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '350px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SmartHabitTracker