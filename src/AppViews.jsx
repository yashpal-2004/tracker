import React, { useState, useEffect, useMemo } from 'react';
import { getAttendanceStats } from './attendance';
import { SEM5_ASSESSMENT_ROADMAP } from './semester5Assessments';
import {
  BarChart as ReBarChart,
  Bar as ReBar,
  XAxis as ReXAxis,
  YAxis as ReYAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Area
} from 'recharts';
import {
  BookOpen,
  FileCheck,
  BrainCircuit,
  GraduationCap,
  Trash2,
  Edit2,
  Star,
  Plus,
  Calendar,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Cloud,
  CloudOff,
  ChevronRight,
  Hash,
  X,
  Save,
  BarChart3,
  PieChart,
  Rocket,
  Award,
  Trophy,
  Layers,
  Check,
  MessageSquare,
  Link2,
  Clock,
  Zap,
  ShieldCheck,
  TrendingUp,
  Activity,
  Archive,
  Search,
  Table,
  Home,
  Moon,
  Timer,
  Coffee,
  User,
  Users,
  Target,
  Github
} from 'lucide-react';
import { CONTEST_SCHEDULE, EXAM_DATES, NotionLogo, formatDate, getSubjectWeights } from './AppComponents';
export const ContestScheduleTable = () => {
  const now = new Date();
  return (
    <div className="overall-card glass contest-schedule-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Calendar size={20} style={{ color: '#f59e0b' }} />
        Official Contest Schedule
      </h3>
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {CONTEST_SCHEDULE.map((event, index) => {
            const eventDate = new Date(event.date);
            const isPast = eventDate < now;
            const isNext = !isPast && (index === 0 || new Date(CONTEST_SCHEDULE[index - 1].date) < now);

            return (
              <tr key={index} className={`${isPast ? 'past' : ''} ${isNext ? 'next' : ''} ${!isPast && !isNext ? 'upcoming' : ''}`}>
                <td>{event.name}</td>
                <td>{formatDate(event.date)}</td>
                <td>{isPast ? '✅ Completed' : isNext ? '🔥 Next Up' : '⏳ Upcoming'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityHeatmap({ tasks }) {
  const { activityData, stats } = useMemo(() => {
    const data = {};
    const today = new Date();
    // Last 90 days to cover roughly 3 months
    const dates = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      data[dateStr] = 0;
    }
    dates.reverse(); // Chronological order

    let totalActivities = 0;

    tasks.forEach(task => {
      if (['lecture', 'assignment', 'quiz'].includes(task.type) && !task.completed) return;

      let dateStr = '';
      // Prioritize ACTUAL activity timestamp (completion or creation) over scheduled date
      const activityDate = task.completedAt || task.createdAt || task.date;

      if (activityDate) {
        const d = new Date(activityDate);
        if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
      }

      if (dateStr && data[dateStr] !== undefined) {
        data[dateStr] += 1;
        totalActivities++;
      }
    });

    // Calculate Streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Iterate chronologically
    dates.forEach(date => {
      if (data[date] > 0) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // For current streak, check backwards from today
    // If today has activity or yesterday has activity (allowing for today to be incomplete)
    let checkIndex = dates.length - 1;
    if (data[dates[checkIndex]] > 0) {
      // Active today
      while (checkIndex >= 0 && data[dates[checkIndex]] > 0) {
        currentStreak++;
        checkIndex--;
      }
    } else if (checkIndex > 0 && data[dates[checkIndex - 1]] > 0) {
      // Active yesterday, so streak is alive
      checkIndex--; // Start from yesterday
      while (checkIndex >= 0 && data[dates[checkIndex]] > 0) {
        currentStreak++;
        checkIndex--;
      }
    }


    const sortedData = dates.map(date => ({ date, count: data[date] }));
    const totalActiveDays = Object.values(data).filter(c => c > 0).length;

    return {
      activityData: sortedData,
      stats: { totalActivities, maxStreak, currentStreak, totalActiveDays }
    };
  }, [tasks]);

  const getColor = (count) => {
    if (count === 0) return '#f1f5f9'; // Slate-100
    if (count === 1) return '#c7d2fe'; // Indigo-200
    if (count === 2) return '#a5b4fc'; // Indigo-300
    if (count <= 4) return '#6366f1'; // Indigo-500
    return '#4338ca'; // Indigo-700
  };

  return (
    <div className="heatmap-container glass" style={{ padding: '24px' }}>
      <div className="heatmap-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Zap size={20} className="text-primary" fill="currentColor" />
            Activity Heatmap
          </h4>
          <div className="heatmap-legend" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            <span>Less</span>
            {[0, 1, 3, 5, 8].map((level, i) => (
              <div key={i} style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                background: getColor(level),
                border: level === 0 ? '1px solid #e2e8f0' : 'none'
              }}></div>
            ))}
            <span>More</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
          <div className="stat-pill glass" style={{ flex: 1, padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Days</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.totalActiveDays} <small style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Days</small></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>{stats.totalActivities} Total Items</span>
          </div>
          <div className="stat-pill glass" style={{ flex: 1, padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Streak</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{stats.maxStreak} Days</span>
          </div>
          <div className="stat-pill glass" style={{ flex: 1, padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Streak</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{stats.currentStreak} Days</span>
          </div>
        </div>
      </div>

      <div className="heatmap-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(14px, 1fr))',
        gap: '4px',
        marginTop: '16px'
      }}>
        {activityData.map(({ date, count }) => (
          <div
            key={date}
            style={{
              aspectRatio: '1',
              borderRadius: '4px',
              background: getColor(count),
              border: count === 0 ? '1px solid #e2e8f0' : 'none',
              boxShadow: count > 0 ? '0 2px 0 rgba(0,0,0,0.1), 0 2px 3px rgba(0,0,0,0.05)' : 'inset 0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              position: 'relative'
            }}
            title={`${date}: ${count} activities`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
              e.currentTarget.style.zIndex = '10';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1), 0 2px 0 rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.zIndex = '1';
              e.currentTarget.style.boxShadow = count > 0 ? '0 2px 0 rgba(0,0,0,0.1), 0 2px 3px rgba(0,0,0,0.05)' : 'inset 0 1px 3px rgba(0,0,0,0.05)';
            }}
          >
          </div>
        ))}
      </div>
    </div>
  );
}

export function SummaryView({ tasks, subjects, threshold, mode = 'overview', onUpdate, comparisonPeople = [] }) {
  const legacyComparisonName = comparisonPeople.find(person => person.id === 'dhruv')?.name || 'Dhruv';
  const [confirmTask, setConfirmTask] = useState(null);

  const calculateCGPA = (totalScore, count) => {
    if (count === 0) return 0;
    const avg = totalScore / count;
    // Piecewise estimation based on provided Student 1, 2 and 3 benchmarks
    // Higher marks (A/A+) contribute more significantly to the CGPA curve
    return avg > 68.75
      ? (0.1260 * (avg - 68.75) + 7.190)
      : (0.1029 * (avg - 59.5) + 6.238);
  };

  const getSubjectScore = (data, name, isDhruv = false, personId = null) => {
    const { weights } = getSubjectWeights(name);

    // Attendance component
    const currentAtt = personId ? 0 : isDhruv
      ? (((data.class.dhruvAttendancePercent || 0) * 0.5) + ((data.lab.dhruvAttendancePercent || 0) * 0.5))
      : (((data.class.attendancePercent || 0) * 0.5) + ((data.lab.attendancePercent || 0) * 0.5));

    const attScore = (currentAtt / 100) * (weights.attendance || 0) * 100;

    const getCompScore = (key) => {
      const classData = data.class[key] || { totalMarks: 0, dhruvTotalMarks: 0 };
      const labData = data.lab[key] || { totalMarks: 0, dhruvTotalMarks: 0 };

      if (['contest', 'midSem', 'endSem'].includes(key)) {
        if (personId) return (classData.comparisonTotalMarks?.[personId] || 0) + (labData.comparisonTotalMarks?.[personId] || 0);
        return isDhruv ? ((classData.dhruvTotalMarks || 0) + (labData.dhruvTotalMarks || 0)) : ((classData.totalMarks || 0) + (labData.totalMarks || 0));
      }

      // Assignments: fixed 70% for You, 50% for Dhruv — not based on tasks entered
      if (key === 'assignment') {
        if (personId) return ((classData.comparisonPercentByPerson?.[personId] || 0) * 0.5 + (labData.comparisonPercentByPerson?.[personId] || 0) * 0.5) / 100 * (weights[key] || 0) * 100;
        const fixedPercent = isDhruv ? 50 : 70;
        return (fixedPercent / 100) * (weights[key] || 0) * 100;
      }

      // Project: based on actual completion
      const avgPercent = personId
        ? ((classData.comparisonPercentByPerson?.[personId] || 0) * 0.5 + (labData.comparisonPercentByPerson?.[personId] || 0) * 0.5)
        : ((classData.percent || 0) * 0.5 + (labData.percent || 0) * 0.5);
      return (avgPercent / 100) * (weights[key] || 0) * 100;
    };

    const breakdown = {
      attendance: attScore,
      assignment: getCompScore('assignment'),
      project: getCompScore('project'),
      contest: getCompScore('contest'),
      midSem: getCompScore('midSem'),
      endSem: getCompScore('endSem')
    };

    const finalScore = Object.values(breakdown).reduce((acc, curr) => acc + curr, 0);

    // Unlocked calculation for projection
    let unlockedWeight = (weights.attendance || 0) + (weights.assignment || 0);
    if ((data.class.project?.maxMarks || 0) > 0 || (data.lab.project?.maxMarks || 0) > 0 || (data.class.project?.total || 0) > 0) unlockedWeight += (weights.project || 0);
    if ((data.class.contest?.maxMarks || 0) > 0 || (data.lab.contest?.maxMarks || 0) > 0) unlockedWeight += (weights.contest || 0);
    if ((data.class.midSem?.maxMarks || 0) > 0 || (data.lab.midSem?.maxMarks || 0) > 0) unlockedWeight += (weights.midSem || 0);
    if ((data.class.endSem?.maxMarks || 0) > 0 || (data.lab.endSem?.maxMarks || 0) > 0) unlockedWeight += (weights.endSem || 0);

    return {
      finalScore: Number(finalScore.toFixed(2)),
      breakdown,
      weights,
      unlockedWeight
    };
  };

  const subjectGroups = useMemo(() => {
    const groups = {};
    subjects.forEach(s => {
      const baseName = s.replace(' Class', '').replace(' Lab', '');
      if (!groups[baseName]) groups[baseName] = { class: {}, lab: {} };

      const subjectTasks = tasks.filter(t => t.subjectName === s);
      const getCategoryStats = (type) => {
        const filtered = subjectTasks.filter(t => t.type === type);
        const total = filtered.length;
        const done = filtered.filter(t => t.completed).length;
        const totalMarks = filtered.reduce((acc, t) => acc + (t.marks || 0), 0);
        const dhruvTotalMarks = filtered.reduce((acc, t) => acc + (t.dhruvMarks || 0), 0);
        const maxMarks = filtered.reduce((acc, t) => acc + (t.maxMarks || 0), 0);
        const comparisonTotalMarks = Object.fromEntries(comparisonPeople.map(person => [
          person.id,
          filtered.reduce((acc, task) => acc + Number(person.id === 'dhruv' ? (task.dhruvMarks || 0) : (task.comparisonMarks?.[person.id] || 0)), 0)
        ]));
        const comparisonPercentByPerson = Object.fromEntries(comparisonPeople.map(person => [
          person.id,
          maxMarks > 0 ? (comparisonTotalMarks[person.id] / maxMarks) * 100 : 0
        ]));

        let percent = 0;
        let dhruvPercent = 0;

        if (type === 'project') {
          const baseName = s.replace(' Class', '').replace(' Lab', '');
          const meta = tasks.find(t => t.type === 'friend_meta' && (t.subjectName === baseName || t.subject === baseName || t.subjectName === s || t.subject === s));
          if (meta && meta.maxProjectMarks > 0) {
            percent = (meta.myProjectMarks || 0) / meta.maxProjectMarks * 100;
            dhruvPercent = (meta.dhruvProjectMarks || (meta.myProjectMarks || 0)) / meta.maxProjectMarks * 100;
            return {
              total: filtered.length,
              done: filtered.filter(t => t.completed).length,
              percent,
              dhruvPercent,
              totalMarks: meta.myProjectMarks || 0,
              dhruvTotalMarks: meta.dhruvProjectMarks || 0,
              comparisonTotalMarks,
              comparisonPercentByPerson,
              maxMarks: meta.maxProjectMarks
            };
          }
        }

        if (type === 'assignment') {
          // Default: You = 70%, Dhruv = 50% of total marks when no marks are set
          if (maxMarks > 0) {
            percent = totalMarks > 0 ? (totalMarks / maxMarks) * 100 : 70;
            dhruvPercent = dhruvTotalMarks > 0 ? (dhruvTotalMarks / maxMarks) * 100 : 50;
          } else if (total > 0) {
            percent = done > 0 ? (done / total) * 100 : 70;
            dhruvPercent = 50;
          }
        } else {
          if (maxMarks > 0) percent = (totalMarks / maxMarks) * 100;
          else if (total > 0) percent = (done / total) * 100;
          dhruvPercent = maxMarks > 0 ? (dhruvTotalMarks / maxMarks) * 100 : percent;
        }

        return { total, done, dhruvDone: filtered.filter(t => t.dhruvCompleted).length, percent, dhruvPercent, totalMarks, dhruvTotalMarks, comparisonTotalMarks, comparisonPercentByPerson, maxMarks };
      };

      const lects = subjectTasks.filter(t => t.type === 'lecture');
      // Metadata may be stored once for the base subject and shared by its class/lab.
      const subjectFriendMeta = tasks.filter(t => t.type === 'friend_meta' &&
        (t.subjectName === baseName || t.subject === baseName || t.subjectName === s || t.subject === s))
        .sort((a, b) => {
          const aOffset = a.attendanceOffset !== undefined;
          const bOffset = b.attendanceOffset !== undefined;
          if (aOffset && !bOffset) return -1;
          if (!aOffset && bOffset) return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        })[0];

      const attendance = getAttendanceStats(lects, subjectFriendMeta, s);
      const attCount = attendance.attended;
      const dhruvAttCount = subjectFriendMeta?.attendanceOffset !== undefined
        ? attCount + (subjectFriendMeta.attendanceOffset || 0)
        : (subjectFriendMeta?.attendanceCount ?? attCount);

      const stats = {
        total: attendance.total,
        attendanceCount: attCount,
        attendancePercent: attendance.total > 0 ? (attCount / attendance.total) * 100 : 0,
        dhruvAttendanceCount: dhruvAttCount,
        dhruvAttendancePercent: attendance.total > 0 ? (dhruvAttCount / attendance.total) * 100 : 0,
        completionPercent: getCategoryStats('lecture').percent,
        completionCount: getCategoryStats('lecture').done,
        assignment: getCategoryStats('assignment'),
        project: getCategoryStats('project'),
        contest: getCategoryStats('contest'),
        midSem: getCategoryStats('midSem'),
        endSem: getCategoryStats('endSem')
      };

      if (s.includes('Class')) groups[baseName].class = stats;
      else groups[baseName].lab = stats;
    });
    return groups;
  }, [tasks, subjects, comparisonPeople]);

  const summaryData = useMemo(() => {
    let totalAttendanceWeighted = 0;
    let totalCompletionWeighted = 0;
    let count = 0;
    let grandTotalLectures = 0;
    let grandTotalAttended = 0;
    let grandTotalCompleted = 0;

    const items = Object.entries(subjectGroups).map(([name, data]) => {
      const attWeighted = ((data.class.attendancePercent || 0) * 0.5) + ((data.lab.attendancePercent || 0) * 0.5);
      const dhruvAttWeighted = ((data.class.dhruvAttendancePercent || 0) * 0.5) + ((data.lab.dhruvAttendancePercent || 0) * 0.5);
      const compWeighted = ((data.class.completionPercent || 0) * 0.5) + ((data.lab.completionPercent || 0) * 0.5);

      totalAttendanceWeighted += attWeighted;
      totalCompletionWeighted += compWeighted;
      count++;

      grandTotalLectures += ((data.class.total || 0) + (data.lab.total || 0));
      grandTotalAttended += ((data.class.attendanceCount || 0) + (data.lab.attendanceCount || 0));
      grandTotalCompleted += ((data.class.completionCount || 0) + (data.lab.completionCount || 0));

      const classGap = (data.class.total || 0) - (data.class.completionCount || 0);
      const labGap = (data.lab.total || 0) - (data.lab.completionCount || 0);
      const studyGap = classGap + labGap;

      const scoreData = getSubjectScore(data, name);
      const dhruvScoreData = getSubjectScore(data, name, true);
      const comparisonScores = Object.fromEntries(comparisonPeople.map(person => [
        person.id,
        person.id === 'dhruv' ? dhruvScoreData.finalScore : getSubjectScore(data, name, false, person.id).finalScore
      ]));

      return {
        name,
        attWeighted,
        dhruvAttWeighted,
        compWeighted,
        ...data,
        studyGap,
        classGap,
        labGap,
        score: scoreData.finalScore,
        dhruvScore: dhruvScoreData.finalScore,
        comparisonScores,
        unlockedWeight: scoreData.unlockedWeight,
        dhruvUnlockedWeight: dhruvScoreData.unlockedWeight,
        breakdown: scoreData.breakdown,
        dhruvBreakdown: dhruvScoreData.breakdown,
        weights: scoreData.weights
      };
    });

    const totalProjectedScore = items.reduce((acc, curr) => acc + curr.score, 0);
    const totalDhruvScore = items.reduce((acc, curr) => acc + curr.dhruvScore, 0);
    const totalUnlockedWeight = items.reduce((acc, curr) => acc + curr.unlockedWeight, 0);
    const totalDhruvUnlockedWeight = items.reduce((acc, curr) => acc + curr.dhruvUnlockedWeight, 0);
    const maxPossibleScore = count * 100;

    return {
      items,
      overallAttendance: grandTotalLectures > 0 ? (grandTotalAttended / grandTotalLectures) * 100 : 0,
      overallCompletion: grandTotalLectures > 0 ? (grandTotalCompleted / grandTotalLectures) * 100 : 0,
      grandTotalLectures,
      grandTotalAttended,
      grandTotalCompleted,
      grandTotalPending: grandTotalLectures - grandTotalCompleted,
      totalProjectedScore,
      totalDhruvScore,
      totalUnlockedWeight,
      totalDhruvUnlockedWeight,
      maxPossibleScore
    };
  }, [subjectGroups, comparisonPeople]);

  const getCombinedSafeZone = (item, target = 75) => {
    const pC = item.class.attendanceCount;
    const tC = item.class.total;
    const pL = item.lab.attendanceCount;
    const tL = item.lab.total;
    const targetW = target / 100;
    const currentW = (item.class.attendancePercent * 0.5) + (item.lab.attendancePercent * 0.5);

    if (tC === 0 || tL === 0) return null;

    if (currentW >= target) {
      // Skips
      const targetC = (targetW - 0.4 * (pL / tL)) / 0.6;
      const targetL = (targetW - 0.6 * (pC / tC)) / 0.4;

      const skipC = targetC > 0 ? Math.floor((pC / targetC) - tC) : Infinity;
      const skipL = targetL > 0 ? Math.floor((pL / targetL) - tL) : Infinity;

      let msg = "";
      if (skipC > 0 && skipL > 0) {
        msg = `Safe! Skip ${skipC} Cls OR ${skipL} Lab`;
      } else if (skipC > 0) {
        msg = `Safe! Skip ${skipC} Cls (Lab at edge)`;
      } else if (skipL > 0) {
        msg = `Safe! Skip ${skipL} Lab (Cls at edge)`;
      } else {
        msg = "At the edge! Attend next of both.";
      }
      return { msg, status: skipC > 0 || skipL > 0 ? 'safe' : 'warning' };
    } else {
      // Needs
      const targetC = (targetW - 0.5 * (pL / tL)) / 0.5;
      const targetL = (targetW - 0.5 * (pC / tC)) / 0.5;

      const needRatioC = 1 - targetC;
      const needRatioL = 1 - targetL;

      let msg = "";
      if (targetC > 1 && targetL > 1) {
        msg = "DANGER! Must attend BOTH Class & Lab";
      } else if (targetC >= 1) {
        const needL = Math.ceil((targetL * tL - pL) / needRatioL);
        msg = `DANGER! Attend next ${needL} Labs (Cls alone not enough)`;
      } else if (targetL >= 1) {
        const needC = Math.ceil((targetC * tC - pC) / needRatioC);
        msg = `DANGER! Attend next ${needC} Class (Lab alone not enough)`;
      } else {
        const needC = Math.ceil((targetC * tC - pC) / needRatioC);
        const needL = Math.ceil((targetL * tL - pL) / needRatioL);
        msg = `Attend next ${needC} Cls OR ${needL} Lab to reach ${target}%`;
      }
      return { msg, status: 'danger' };
    }
  };

  const format2 = (val) => Number(val).toFixed(2);

  const chartData = useMemo(() => {
    return summaryData.items.map(item => ({
      name: item.name,
      You: Number(item.score.toFixed(2)),
      [legacyComparisonName]: Number(item.dhruvScore.toFixed(2)),
      diff: Number((item.score - item.dhruvScore).toFixed(2))
    }));
  }, [summaryData.items]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip glass" style={{
          padding: '12px',
          border: '1px solid #e2e8f0',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>{label}</p>
          {payload.map((p, index) => (
            <p key={index} style={{ color: p.color, fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span>{p.name}:</span>
              <span>{p.value}</span>
            </p>
          ))}
          {payload.length > 1 && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
              Difference: {format2(Math.abs(payload[0].value - payload[1].value))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="summary-container">
      {(mode === 'overview' || mode === 'detailed') && comparisonPeople.some(person => person.id !== 'dhruv') && (
        <section className="glass" style={{ padding: 20, borderRadius: 18, marginBottom: 24, overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 14px', color: '#1e293b' }}>Semester 5 score comparison</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: 9 }}>Subject</th>
              <th style={{ textAlign: 'right', padding: 9 }}>You</th>
              {comparisonPeople.map(person => <th key={person.id} style={{ textAlign: 'right', padding: 9 }}>{person.name}</th>)}
            </tr></thead>
            <tbody>
              {summaryData.items.map(item => <tr key={item.name} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: 9 }}>{item.name}</td>
                <td style={{ textAlign: 'right', padding: 9 }}>{format2(item.score)}</td>
                {comparisonPeople.map(person => <td key={person.id} style={{ textAlign: 'right', padding: 9 }}>{format2(item.comparisonScores?.[person.id] || 0)}</td>)}
              </tr>)}
              <tr style={{ borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                <td style={{ padding: 9 }}>Total</td>
                <td style={{ textAlign: 'right', padding: 9 }}>{format2(summaryData.totalProjectedScore)}</td>
                {comparisonPeople.map(person => <td key={person.id} style={{ textAlign: 'right', padding: 9 }}>{format2(summaryData.items.reduce((sum, item) => sum + (item.comparisonScores?.[person.id] || 0), 0))}</td>)}
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '0.8rem' }}>Scores use your subject weightages. Add each person’s marks on the assessment cards to fill this comparison.</p>
        </section>
      )}
      {(mode === 'overview' || mode === 'detailed') && (
        <div className="overall-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Attendance Card */}
          <div className="overall-card analytics-card-premium" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            borderLeft: '5px solid #3b82f6'
          }}>
            <div className="card-top-accent">
              <div className="icon-box" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                <PieChart size={24} strokeWidth={2.5} />
              </div>
              <span className="card-type-tag">Attendance</span>
            </div>
            <div className="card-main-content">
              <div className="main-value-group">
                <h2 style={{ color: '#1e3a8a' }}>{format2(summaryData.overallAttendance)}<span className="percent-sign">%</span></h2>
                <p className="value-label">Global Attendance Rate</p>
              </div>
              <div className="mini-stats-row">
                <div className="mini-stat">
                  <span className="ms-label">Attended</span>
                  <span className="ms-value">{summaryData.grandTotalAttended}</span>
                </div>
                <div className="ms-divider"></div>
                <div className="mini-stat">
                  <span className="ms-label">Total</span>
                  <span className="ms-value">{summaryData.grandTotalLectures}</span>
                </div>
              </div>
            </div>
            <div className="card-progress-track">
              <div className="card-progress-fill" style={{ width: `${summaryData.overallAttendance}%`, background: '#3b82f6' }}></div>
            </div>
          </div>

          {/* Completion Card */}
          <div className="overall-card analytics-card-premium" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
            borderLeft: '5px solid #10b981'
          }}>
            <div className="card-top-accent">
              <div className="icon-box" style={{ background: '#dcfce7', color: '#059669' }}>
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
              <span className="card-type-tag">Completion</span>
            </div>
            <div className="card-main-content">
              <div className="main-value-group">
                <h2 style={{ color: '#064e3b' }}>{format2(summaryData.overallCompletion)}<span className="percent-sign">%</span></h2>
                <p className="value-label">Study Progression</p>
              </div>
              <div className="mini-stats-row">
                <div className="mini-stat">
                  <span className="ms-label">Completed</span>
                  <span className="ms-value">{summaryData.grandTotalCompleted}</span>
                </div>
                <div className="ms-divider"></div>
                <div className="mini-stat">
                  <span className="ms-label">Left</span>
                  <span className="ms-value" style={{ color: '#ef4444' }}>{summaryData.grandTotalPending}</span>
                </div>
              </div>
            </div>
            <div className="card-progress-track">
              <div className="card-progress-fill" style={{ width: `${summaryData.overallCompletion}%`, background: '#10b981' }}></div>
            </div>
          </div>

          {/* Score/Comparison Card */}
          <div className="overall-card analytics-card-premium comparison-card" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
            borderLeft: '5px solid #8b5cf6',
            gridColumn: 'span 1'
          }}>
            <div className="card-top-accent">
              <div className="icon-box" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                <Award size={24} strokeWidth={2.5} />
              </div>
              <span className="card-type-tag">Performance Hub</span>
            </div>

            <div className="comparison-display">
              <div className="user-score-box">
                <div className="score-header">
                  <div className="avatar-mini" style={{ background: '#eff6ff', color: '#1d4ed8' }}>U</div>
                  <span>You</span>
                </div>
                <h3>{format2(summaryData.totalProjectedScore)}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="score-percent">{(summaryData.maxPossibleScore > 0 ? (summaryData.totalProjectedScore / summaryData.maxPossibleScore) * 100 : 0).toFixed(2)}% Current</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>{calculateCGPA(summaryData.totalProjectedScore, summaryData.items.length).toFixed(3)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '2px', borderLeft: '2px solid #e0e7ff' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>End-Sem Prediction</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4f46e5' }}>
                      {calculateCGPA(
                        summaryData.totalUnlockedWeight > 0 ? (summaryData.totalProjectedScore / summaryData.totalUnlockedWeight) : 0,
                        1
                      ).toFixed(3)} CGPA
                    </span>
                  </div>
                </div>
              </div>

              <div className="vs-badge">VS</div>

              <div className="user-score-box friend">
                <div className="score-header">
                  <div className="avatar-mini" style={{ background: '#fffbeb', color: '#f59e0b' }}>D</div>
                  <span>{legacyComparisonName}</span>
                </div>
                <h3>{format2(summaryData.totalDhruvScore)}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row-reverse' }}>
                    <span className="score-percent">{(summaryData.maxPossibleScore > 0 ? (summaryData.totalDhruvScore / summaryData.maxPossibleScore) * 100 : 0).toFixed(2)}% Current</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>{calculateCGPA(summaryData.totalDhruvScore, summaryData.items.length).toFixed(3)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '2px', borderRight: '2px solid #fef3c7', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>End-Sem Prediction</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#d97706' }}>
                      {calculateCGPA(
                        summaryData.totalDhruvUnlockedWeight > 0 ? (summaryData.totalDhruvScore / summaryData.totalDhruvUnlockedWeight) : 0,
                        1
                      ).toFixed(3)} CGPA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="performance-footer">
              <div className={`leader-indicator ${summaryData.totalProjectedScore >= summaryData.totalDhruvScore ? 'win' : 'lose'}`}>
                <Trophy size={14} />
                <span>
                  {Math.abs(summaryData.totalProjectedScore - summaryData.totalDhruvScore) < 0.01
                    ? "Scores are tied!"
                    : summaryData.totalProjectedScore > summaryData.totalDhruvScore
                      ? `Ahead by ${format2(summaryData.totalProjectedScore - summaryData.totalDhruvScore)} pts`
                      : `Trailing by ${format2(summaryData.totalDhruvScore - summaryData.totalProjectedScore)} pts`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'overview' && (
        <div className="analytics-insights-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '24px',
          marginBottom: '48px',
          marginTop: '24px'
        }}>
          <div className="overall-card glass shadow-md chart-container-card" style={{ padding: '24px', height: '420px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <BarChart3 size={20} style={{ color: '#6366f1' }} />
              Subject-wise Marks Comparison
            </h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <ReXAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    dy={10}
                  />
                  <ReYAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '0.8rem', fontWeight: 700 }} />
                  <ReBar dataKey="You" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
                  <ReBar dataKey={legacyComparisonName} fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overall-card glass shadow-md chart-container-card" style={{ padding: '24px', height: '420px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <Trophy size={20} style={{ color: '#10b981' }} />
              Mark Advantage (+/-)
            </h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <ReXAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    dy={10}
                  />
                  <ReYAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  />
                  <ReTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const diff = payload[0].value;
                        return (
                          <div className="custom-tooltip glass" style={{
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '12px'
                          }}>
                            <p style={{ fontWeight: 800, marginBottom: '4px' }}>{label}</p>
                            <p style={{ color: diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>
                              {diff >= 0 ? 'You Lead by: ' : `${legacyComparisonName} Leads by: `}
                              {Math.abs(diff).toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReBar dataKey="diff" name="Advantage">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.diff >= 0 ? '#10b981' : '#ef4444'} opacity={0.6} />
                    ))}
                  </ReBar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {mode === 'detailed' && (
        <div className="subject-grid" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {summaryData.items.map(item => (
            <div key={item.name} className="subject-card premium-card glass">
              <div className="subject-card-header" style={{ padding: '24px', borderBottom: '1.5px solid #f1f5f9', background: 'rgba(255,255,255,0.4)' }}>
                <div className="subj-title-group">
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>{item.name}</h3>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span className="lecture-count-pill" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe', padding: '4px 12px', fontWeight: 700 }}>{item.class.total + item.lab.total} Total Lectures</span>
                  </div>
                </div>

                <div className="header-performance-stats" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Aggregated Score</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>
                      {format2(item.score)} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>/ 100</span>
                    </div>
                  </div>
                  <div className={`leader-badge ${item.score >= item.dhruvScore ? 'me' : 'dhruv'}`} style={{
                    padding: '12px 20px',
                    borderRadius: '16px',
                    background: item.score >= item.dhruvScore ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                    color: item.score >= item.dhruvScore ? '#15803d' : '#92400e',
                    border: `1.5px solid ${item.score >= item.dhruvScore ? '#bbf7d0' : '#fde68a'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '130px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }}>
                    <Star size={16} fill="currentColor" style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{Math.abs(item.score - item.dhruvScore) < 0.01 ? "Tie" : item.score > item.dhruvScore ? "You Lead" : "Dhruv Leads"}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 700 }}>Gap: {format2(Math.abs(item.score - item.dhruvScore))}</span>
                  </div>
                </div>
              </div>

              <div className="subject-card-body" style={{ padding: '32px' }}>
                <div className="dual-progress-section" style={{ background: 'transparent', padding: 0, border: 'none', gap: '48px', marginBottom: '40px' }}>
                  {/* Attendance Section */}
                  <div className="metric-column">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span className="metric-hdr" style={{ margin: 0 }}>Attendance Progress</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '8px' }}>U: {format2(item.attWeighted)}%</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: '#fffbeb', color: '#f59e0b', borderRadius: '8px' }}>D: {format2(item.dhruvAttWeighted)}%</span>
                      </div>
                    </div>

                    <div className="performance-row-detailed">
                      <div className="pr-label">
                        <span className="pr-type">Theory Classes</span>
                        <span className="pr-count">{item.class.attendanceCount}/{item.class.total}</span>
                      </div>
                      <div className="dual-bar-container" style={{ height: '14px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', position: 'relative' }}>
                        <div className="bar-u" style={{ width: `${item.class.attendancePercent}%`, background: 'linear-gradient(to right, #60a5fa, #3b82f6)', height: '100%', position: 'absolute', top: 0, left: 0, opacity: 1, zIndex: 2 }}></div>
                        <div className="bar-d" style={{ width: `${item.class.dhruvAttendancePercent}%`, background: '#f59e0b', height: '4px', position: 'absolute', bottom: 0, left: 0, zIndex: 3 }}></div>
                      </div>
                    </div>

                    <div className="performance-row-detailed" style={{ marginTop: '16px' }}>
                      <div className="pr-label">
                        <span className="pr-type">Lab Sessions</span>
                        <span className="pr-count">{item.lab.attendanceCount}/{item.lab.total}</span>
                      </div>
                      <div className="dual-bar-container" style={{ height: '14px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', position: 'relative' }}>
                        <div className="bar-u" style={{ width: `${item.lab.attendancePercent}%`, background: 'linear-gradient(to right, #34d399, #10b981)', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 2 }}></div>
                        <div className="bar-d" style={{ width: `${item.lab.dhruvAttendancePercent}%`, background: '#f59e0b', height: '4px', position: 'absolute', bottom: 0, left: 0, zIndex: 3 }}></div>
                      </div>
                    </div>

                    {getCombinedSafeZone(item, threshold) && (
                      <div className={`safe-zone-pill-premium ${getCombinedSafeZone(item, threshold).status}`} style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: getCombinedSafeZone(item, threshold).status === 'safe' ? '#f0fdf4' : getCombinedSafeZone(item, threshold).status === 'warning' ? '#fffbeb' : '#fef2f2',
                        color: getCombinedSafeZone(item, threshold).status === 'safe' ? '#166534' : getCombinedSafeZone(item, threshold).status === 'warning' ? '#92400e' : '#991b1b',
                        border: `1.5px solid ${getCombinedSafeZone(item, threshold).status === 'safe' ? '#bbf7d0' : getCombinedSafeZone(item, threshold).status === 'warning' ? '#fde68a' : '#fecaca'}`
                      }}>
                        <div className="zap-box" style={{ padding: '6px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                          <Zap size={16} fill="currentColor" />
                        </div>
                        <span>{getCombinedSafeZone(item, threshold).msg}</span>
                      </div>
                    )}
                  </div>

                  <div className="vertical-divider" style={{ width: '2px', background: 'linear-gradient(to bottom, transparent, #e2e8f0, transparent)' }}></div>

                  {/* Completion Section */}
                  <div className="metric-column">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span className="metric-hdr" style={{ margin: 0 }}>Study Completion</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: '#f0fdf4', color: '#166534', borderRadius: '8px' }}>Avg: {format2(item.compWeighted)}%</span>
                    </div>

                    <div className="performance-row-detailed">
                      <div className="pr-label">
                        <span className="pr-type">Theory Backlog</span>
                        <span className="pr-count" style={{ color: item.classGap > 0 ? '#ef4444' : '#10b981' }}>{item.classGap > 0 ? `${item.classGap} pending` : 'All caught up'}</span>
                      </div>
                      <div className="progress-bar-premium" style={{ height: '14px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                        <div className="fill" style={{ width: `${item.class.completionPercent}%`, background: 'linear-gradient(to right, #8b5cf6, #7c3aed)', height: '100%' }}></div>
                      </div>
                    </div>

                    <div className="performance-row-detailed" style={{ marginTop: '16px' }}>
                      <div className="pr-label">
                        <span className="pr-type">Lab Work</span>
                        <span className="pr-count" style={{ color: item.labGap > 0 ? '#ef4444' : '#10b981' }}>{item.labGap > 0 ? `${item.labGap} pending` : 'All caught up'}</span>
                      </div>
                      <div className="progress-bar-premium" style={{ height: '14px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                        <div className="fill" style={{ width: `${item.lab.completionPercent}%`, background: 'linear-gradient(to right, #ec4899, #db2777)', height: '100%' }}></div>
                      </div>
                    </div>

                    {item.studyGap > 0 && (
                      <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #ffe4e6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={18} style={{ color: '#f43f5e' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9f1239' }}>{item.studyGap} Lectures still pending study across both modes.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="score-breakdown-grid-detailed" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  padding: '24px',
                  background: '#f8fafc',
                  borderRadius: '24px',
                  border: '1.5px solid #f1f5f9'
                }}>
                  {[
                    { label: 'Attendance', key: 'attendance', icon: CheckCircle, color: '#3b82f6', weightKey: 'attendance' },
                    { label: 'Assignments', key: 'assignment', icon: FileText, color: '#6366f1', weightKey: 'assignment' },
                    { label: 'Projects', key: 'project', icon: Layers, color: '#8b5cf6', weightKey: 'project' },
                    { label: 'Contests', key: 'contest', icon: Trophy, color: '#10b981', weightKey: 'contest' },
                    { label: 'Mid Sem', key: 'midSem', icon: Rocket, color: '#f59e0b', weightKey: 'midSem' },
                    { label: 'End Sem', key: 'endSem', icon: Award, color: '#3b82f6', weightKey: 'endSem' }
                  ].map(comp => (
                    (item.weights[comp.weightKey] > 0 || comp.key === 'attendance') && (
                      <div key={comp.key} className="breakdown-stat-item" style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1.5px solid #f1f5f9', transition: 'all 0.2s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ pading: '6px', borderRadius: '8px', background: `${comp.color}10`, color: comp.color }}>
                            <comp.icon size={16} strokeWidth={2.5} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{comp.label}</span>
                          {comp.key === 'assignment' && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 800, color: '#8b5cf6', background: '#ede9fe', padding: '2px 7px', borderRadius: '100px', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>70% / 50%</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>Score</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{format2(item.breakdown[comp.key])}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>Dhruv</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>{format2(item.dhruvBreakdown[comp.key])}</span>
                          </div>
                        </div>

                        <div className="mini-comparison-progress" style={{ height: '6px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: comp.color, width: `${(item.breakdown[comp.key] / (item.weights[comp.weightKey] * 100)) * 100}%`, borderRadius: '100px', opacity: 0.8, zIndex: 2 }}></div>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: '#f59e0b', width: `${(item.dhruvBreakdown[comp.key] / (item.weights[comp.weightKey] * 100)) * 100}%`, zIndex: 3 }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                          <span>Max: {format2(item.weights[comp.weightKey] * 100)}</span>
                          <span style={{ color: item.breakdown[comp.key] >= item.dhruvBreakdown[comp.key] ? '#10b981' : '#f59e0b' }}>
                            {item.breakdown[comp.key] >= item.dhruvBreakdown[comp.key] ? 'Ahead' : 'Behind'}
                          </span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'pending' && (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            padding: '20px 24px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '16px', margin: 0 }}>
              <div style={{ padding: '10px', background: '#ffe4e6', borderRadius: '16px', color: '#f43f5e', boxShadow: '0 2px 5px rgba(244, 63, 94, 0.2)' }}>
                <Clock size={28} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>Pending Work Queue</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Track and complete your backlog</span>
              </div>
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ padding: '8px 16px', borderRadius: '100px', background: '#eff6ff', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #dbeafe' }}>
                {tasks.filter(t => !t.completed).length} Total Pending
              </div>
            </div>
          </div>

          <div style={{ columns: '1', columnGap: '24px', maxWidth: '100%' }}>
            {/* Use a simple grid for responsiveness if columns doesn't work well or use media query logic in CSS, but inline style columns is decent for masonry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
              {subjects.map(subjectName => {
                const pendingTasks = tasks
                  .filter(t => t.subjectName === subjectName && !t.completed)
                  .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

                if (pendingTasks.length === 0) return null;

                return (
                  <div key={subjectName} className="pending-card glass" style={{
                    breakInside: 'avoid',
                    marginBottom: '0',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,0.5))',
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                        {subjectName}
                      </h4>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #e2e8f0'
                      }}>
                        {pendingTasks.length}
                      </span>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingTasks.map(task => {
                        let Icon = BookOpen;
                        let colorClass = '#3b82f6';
                        let bgClass = '#eff6ff';

                        if (task.type === 'assignment') {
                          Icon = FileText;
                          colorClass = '#f43f5e';
                          bgClass = '#fff1f2';
                        } else if (task.type === 'quiz') {
                          Icon = BrainCircuit;
                          colorClass = '#8b5cf6';
                          bgClass = '#f5f3ff';
                        } else if (task.type === 'project') {
                          Icon = Rocket;
                          colorClass = '#10b981';
                          bgClass = '#ecfdf5';
                        } else if (task.type === 'contest' || task.type === 'midSem' || task.type === 'endSem') {
                          Icon = GraduationCap;
                          colorClass = '#6366f1';
                          bgClass = '#f5f7ff';
                        }

                        return (
                          <div key={task.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: task.hasDoubt ? 'rgba(254, 242, 242, 0.9)' : 'rgba(255,255,255,0.6)',
                            borderRadius: '16px',
                            border: task.hasDoubt ? '1px solid #fecaca' : '1px solid rgba(255,255,255,0.8)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                              e.currentTarget.style.background = task.hasDoubt ? '#fff1f2' : 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.background = task.hasDoubt ? 'rgba(254, 242, 242, 0.9)' : 'rgba(255,255,255,0.6)';
                            }}
                          >
                            <div style={{
                              padding: '10px',
                              borderRadius: '12px',
                              background: bgClass,
                              color: colorClass,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Icon size={18} strokeWidth={2.5} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                <span style={{ color: '#64748b', marginRight: '8px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px', fontSize: '0.8em', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>#{task.number}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colorClass, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                  {task.type === 'midSem' ? 'Mid Sem' : task.type === 'endSem' ? 'End Sem' : task.type}
                                </span>
                                {task.date && (
                                  <>
                                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                                      {formatDate(task.date)}
                                    </span>
                                  </>
                                )}
                                {task.hasDoubt && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                    DOUBT
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdate) {
                                  setConfirmTask(task);
                                }
                              }}
                              style={{
                                padding: '8px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f0fdf4';
                                e.currentTarget.style.borderColor = '#bbf7d0';
                                e.currentTarget.style.color = '#166534';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.color = '#cbd5e1';
                              }}
                              title="Mark as Done"
                            >
                              <Check size={18} strokeWidth={3} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {summaryData.grandTotalPending === 0 && tasks.filter(t => !t.completed).length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              marginTop: '40px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '32px',
              backdropFilter: 'blur(10px)',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{ padding: '24px', background: '#f0fdf4', borderRadius: '50%', marginBottom: '24px' }}>
                <Trophy size={64} style={{ color: '#10b981' }} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>All Caught Up!</h3>
              <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 600 }}>You have 0 pending items. Time to relax!</p>
            </div>
          )}
        </div>
      )}

      {confirmTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setConfirmTask(null)}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transform: 'scale(1)',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid #f1f5f9'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#ecfdf5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: '#059669'
            }}>
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              Mark as Completed?
            </h3>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to mark <strong style={{ color: '#334155' }}>"{confirmTask.name}"</strong> as done? This will remove it from your pending list.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmTask(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = '#f8fafc'}
                onMouseLeave={e => e.target.style.background = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onUpdate) {
                    await onUpdate(confirmTask.id, { completed: true, present: true });
                  }
                  setConfirmTask(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                  transition: 'transform 0.1s'
                }}
                onMouseEnter={e => e.target.style.background = '#059669'}
                onMouseLeave={e => e.target.style.background = '#10b981'}
                onMouseDown={e => e.target.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.target.style.transform = 'scale(1)'}
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SafeZoneView({ tasks, subjects, threshold, setThreshold }) {
  const target = threshold;

  const subjectGroups = useMemo(() => {
    const groups = {};
    subjects.forEach(s => {
      const baseName = s.replace(' Class', '').replace(' Lab', '');
      if (!groups[baseName]) {
        groups[baseName] = {
          class: { total: 0, attendanceCount: 0, attendancePercent: 0 },
          lab: { total: 0, attendanceCount: 0, attendancePercent: 0 }
        };
      }

      const subjectTasks = tasks.filter(t => t.subjectName === s);
      const lects = subjectTasks.filter(t => t.type === 'lecture');
      const meta = tasks.find(t => t.type === 'friend_meta' &&
        (t.subjectName === baseName || t.subject === baseName || t.subjectName === s || t.subject === s));
      const attendance = getAttendanceStats(lects, meta, s);
      const attCount = attendance.attended;

      const stats = {
        total: attendance.total,
        attendanceCount: attCount,
        attendancePercent: attendance.total > 0 ? (attCount / attendance.total) * 100 : 0,
      };

      if (s.includes('Class')) groups[baseName].class = stats;
      else groups[baseName].lab = stats;
    });
    return groups;
  }, [tasks, subjects]);

  const calculateZone = (stats, weight, otherStats, otherWeight, targetVal) => {
    if (stats.total === 0) return { status: 'nodata', msg: 'No Data', sub: 'Empty' };

    const tPct = targetVal / 100;
    const otherContrib = (otherStats.attendancePercent / 100) * otherWeight;

    // weight * req + otherContrib >= tPct
    // req >= (tPct - otherContrib) / weight
    const req = (tPct - otherContrib) / weight;

    if (req >= 1) return { status: 'danger', msg: 'Unreachable', sub: 'Maximize Other' };
    if (req <= 0) return { status: 'safe', msg: 'MAX', sub: 'Always Safe' };

    const current = stats.attendanceCount / stats.total;

    if (current >= req) {
      // Safe: How many skips?
      // (P) / (T + k) >= req  => k <= P/req - T
      const k = Math.floor(stats.attendanceCount / req - stats.total);
      return { status: 'safe', msg: Math.max(0, k), sub: 'Skips Left' };
    } else {
      // Danger: How many need?
      // (P + k) / (T + k) >= req => k >= (req*T - P)/(1-req)
      const k = Math.ceil((req * stats.total - stats.attendanceCount) / (1 - req));
      return { status: 'danger', msg: Math.max(0, k), sub: 'To Attend' };
    }
  };

  return (
    <div className="safe-zone-manager glass" style={{ padding: '32px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
            <ShieldCheck size={32} style={{ color: '#10b981' }} />
            Skip Manager
          </h2>

          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Target Goal</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6', lineHeight: 1 }}>{target}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="1"
              value={target}
              onChange={e => setThreshold(parseInt(e.target.value))}
              style={{ width: '140px', accentColor: '#3b82f6', cursor: 'grab' }}
            />
          </div>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '600px' }}>
          Adjust the slider to simulate different attendance targets. Calculations are based on a
          <strong style={{ color: '#334155' }}> 50% Class / 50% Lab</strong> weighted split.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {Object.entries(subjectGroups).map(([name, item]) => {
          const weighted = (item.class.attendancePercent * 0.5 + item.lab.attendancePercent * 0.5).toFixed(2);
          const isSafe = parseFloat(weighted) >= target;

          // Analyze Components
          const classZone = calculateZone(item.class, 0.5, item.lab, 0.5, target);
          const labZone = calculateZone(item.lab, 0.5, item.class, 0.5, target);

          return (
            <div key={name} className="glass" style={{
              padding: '24px',
              borderRadius: '24px',
              border: `1px solid ${isSafe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              background: isSafe ? 'rgba(240, 253, 244, 0.4)' : 'rgba(254, 242, 242, 0.4)',
              transition: 'transform 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isSafe ? '#10b981' : '#ef4444' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{name}</h3>
                <div style={{ padding: '6px 12px', borderRadius: '100px', background: isSafe ? '#dcfce7' : '#fee2e2', color: isSafe ? '#15803d' : '#b91c1c', fontSize: '0.9rem', fontWeight: 800 }}>
                  {weighted}% Current
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Class Box */}
                <div style={{ flex: 1, background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Class (50%)</span>
                  <div style={{ fontSize: classZone.status === 'nodata' ? '1.2rem' : '2rem', fontWeight: 900, color: classZone.status === 'safe' ? '#10b981' : (classZone.status === 'nodata' ? '#cbd5e1' : '#f59e0b'), lineHeight: 1 }}>
                    {classZone.msg}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: classZone.status === 'safe' ? '#059669' : (classZone.status === 'nodata' ? '#94a3b8' : '#d97706') }}>{classZone.sub}</span>
                  <div style={{ width: '100%', height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {item.class.attendanceCount} <span style={{ color: '#cbd5e1' }}>/</span> {item.class.total}
                  </span>
                </div>

                {/* Lab Box */}
                <div style={{ flex: 1, background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Lab (50%)</span>
                  <div style={{ fontSize: labZone.status === 'nodata' ? '1.2rem' : '2rem', fontWeight: 900, color: labZone.status === 'safe' ? '#10b981' : (labZone.status === 'nodata' ? '#cbd5e1' : '#f59e0b'), lineHeight: 1 }}>
                    {labZone.msg}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: labZone.status === 'safe' ? '#059669' : (labZone.status === 'nodata' ? '#94a3b8' : '#d97706') }}>{labZone.sub}</span>
                  <div style={{ width: '100%', height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {item.lab.attendanceCount} <span style={{ color: '#cbd5e1' }}>/</span> {item.lab.total}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityView({ tasks, subjects }) {
  const subjectActivity = useMemo(() => {
    const stats = {};
    subjects.forEach(s => stats[s] = {
      count: 0,
      lastStudied: null,
      types: {
        lecture: { count: 0, last: null },
        assignment: { count: 0, last: null },
        quiz: { count: 0, last: null },
        project: { count: 0, last: null },
        contest: { count: 0, last: null }
      }
    });

    tasks.forEach(task => {
      if (task.subjectName && stats[task.subjectName] !== undefined) {
        // Filter: only count completed items for "Work Distribution"
        if (['lecture', 'assignment', 'quiz'].includes(task.type) && !task.completed) return;

        stats[task.subjectName].count++;

        let taskDate = null;
        if (task.date) taskDate = new Date(task.date);
        else if (task.createdAt) taskDate = new Date(task.createdAt);

        if (taskDate && !isNaN(taskDate.getTime())) {
          // Global last studied
          if (!stats[task.subjectName].lastStudied || taskDate > stats[task.subjectName].lastStudied) {
            stats[task.subjectName].lastStudied = taskDate;
          }

          // Per-type last studied
          if (task.type && stats[task.subjectName].types[task.type]) {
            stats[task.subjectName].types[task.type].count++;
            if (!stats[task.subjectName].types[task.type].last || taskDate > stats[task.subjectName].types[task.type].last) {
              stats[task.subjectName].types[task.type].last = taskDate;
            }
          }
        }
      }
    });

    // Keep sidebar order
    return subjects.map(s => [s, stats[s]]);
  }, [tasks, subjects]);

  return (
    <div className="sections-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <ActivityHeatmap tasks={tasks} />

      <div style={{ marginTop: '12px' }}>
        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers style={{ color: 'var(--primary)' }} />
          Work Distribution by Subject
        </h3>
        <div className="activity-subjects-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {subjectActivity.map(([name, data]) => (
            <div key={name} className="subject-card glass" style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s ease',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{name}</h4>
                  {data.lastStudied && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Last active: {data.lastStudied.toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{data.count}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Activities</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {Object.entries(data.types).map(([type, stats]) => {
                  if (stats.count === 0 && !['lecture', 'assignment', 'quiz'].includes(type)) return null;

                  const Icon = type === 'lecture' ? BookOpen :
                    type === 'assignment' ? FileText :
                      type === 'quiz' ? CheckCircle2 :
                        type === 'project' ? Rocket : Trophy;

                  return (
                    <div key={type} className="activity-mini-badge" style={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      padding: '8px 12px',
                      height: 'auto'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                        <Icon size={12} />
                        <span style={{ fontSize: '0.65rem', textTransform: 'capitalize', opacity: 0.7 }}>{type}s</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 900, color: 'var(--primary)' }}>{stats.count}</span>
                      </div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                        {stats.last ? `Last: ${stats.last.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : 'No activity'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SEM5_COURSE_ASSESSMENTS = [
  {
    name: 'Advanced Machine Learning', code: 'CSA333', credits: 4,
    components: [
      ['In-class & Post-class Assignments', 5], ['Weekly Contests', 10], ['Projects & Viva', 20],
      ['Mid Semester Exam', 25], ['End Semester Exam', 40]
    ],
    description: 'Builds conceptual and mathematical foundations from scratch. Continuous assessments and coding labs form the bulk of the internal weightage.'
  },
  {
    name: 'Computer Networks', code: 'CSA223', credits: 4,
    components: [
      ['Contests', 20], ['Projects', 20], ['Mid Semester Exam', 20], ['End Semester Exam', 40]
    ],
    description: 'Heavily project and contest driven. Emphasizes protocol execution structures and routing simulations.'
  },
  {
    name: 'Deep Learning', code: 'CSA343', credits: 4,
    components: [
      ['In Class & Post Class Assignments', 5], ['Weekly Contests', 10], ['Projects & Practical Labs', 25],
      ['Mid Semester Exam', 20], ['End Semester Exam', 40]
    ],
    description: 'Strong focus on implementation: biological model logic, feedforward neural nets, backpropagation, and CNNs.'
  },
  {
    name: 'Modern Computer Architecture', code: 'CSA213', credits: 4,
    components: [
      ['Assignments & Class Participation', 10], ['Mini Projects', 10], ['Weekly Contests', 20],
      ['Mid Semester Exam', 20], ['End Semester Exam', 40]
    ],
    description: 'Covers assembly programming, digital logic networks, logic gate simplification, and memory hierarchy concepts.'
  }
];

const SEM5_HOLIDAYS = [
  ['Independence Day', 'National Holiday', '15 Aug 2026'],
  ['Rakshabandhan', 'Regional Holiday', '28 Aug 2026'],
  ['Gandhi Jayanti', 'National Holiday', '02 Oct 2026'],
  ['Navaratari Celebration', 'Cultural celebration day', '16 Oct 2026'],
  ['Dussehra', 'Gazetted Holiday', '20 Oct 2026'],
  ['Diwali Semester Break', 'One-week academic recess', '06–13 Nov 2026'],
  ['Winter Break', 'End-of-semester winter break', '25–31 Dec 2026'],
  ["New Year's Day", 'National holiday (Even Sem)', '01 Jan 2027'],
  ['Makar Sankranti', 'Harvest festival celebration', '14 Jan 2027'],
  ['Republic Day', 'National Holiday', '26 Jan 2027'],
  ['Basant Panchami', 'Saraswati Puja / Cultural celebration', '11 Feb 2027'],
  ['Mahashivratri', 'Cultural Holiday', '06 Mar 2027'],
  ['Holi Break', 'Spring break and festival break', '22–26 Mar 2027']
];

function SemesterFiveSchedule() {
  return (
    <div className="sections-container" style={{ gap: 28 }}>
      <section className="task-section glass" style={{ padding: 24, width: '100%' }}>
        <h2 style={{ margin: '0 0 8px' }}>Semester 5 Assessment Weights</h2>
        <p style={{ margin: '0 0 22px', color: 'var(--text-muted)' }}>Odd Semester 2026 · 4 courses · 4 credits each</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {SEM5_COURSE_ASSESSMENTS.map(course => (
            <article key={course.code} style={{ padding: 20, borderRadius: 18, background: 'rgba(255,255,255,.8)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', marginBottom: 14 }}>
                <div><h3 style={{ margin: 0 }}>{course.name}</h3><div style={{ color: 'var(--text-muted)', fontSize: '.84rem', marginTop: 5 }}>{course.code} · {course.credits} Credits</div></div>
                <span style={{ whiteSpace: 'nowrap', borderRadius: 99, padding: '5px 10px', background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 800, fontSize: '.78rem' }}>100% total</span>
              </div>
              <table className="schedule-table"><thead><tr><th>Component</th><th style={{ textAlign: 'right' }}>Weightage</th></tr></thead>
                <tbody>{course.components.map(([label, weight]) => <tr key={label}><td>{label}</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{weight}%</td></tr>)}</tbody>
              </table>
              <p style={{ margin: '14px 0 0', color: 'var(--text-muted)', lineHeight: 1.55, fontSize: '.9rem' }}>{course.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="task-section glass" style={{ padding: 24, width: '100%' }}>
        <h2 style={{ margin: '0 0 6px' }}>Assessment Roadmap</h2>
        <p style={{ margin: '0 0 18px', color: 'var(--text-muted)' }}>Week-wise schedule of internal contests and mid-term examinations for Odd Semester 2026.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {SEM5_ASSESSMENT_ROADMAP.map((event, index) => {
            const isPast = new Date(`${event.date}T23:59:59`) < new Date();
            return <article key={event.name} style={{ padding: 18, borderRadius: 16, border: '1px solid #e2e8f0', background: isPast ? 'rgba(148,163,184,.08)' : 'rgba(255,255,255,.82)', opacity: isPast ? .75 : 1 }}>
              <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800, fontSize: '.72rem' }}>Assessment {index + 1}</div>
              <h3 style={{ margin: '8px 0' }}>{event.name}</h3>
              <div style={{ color: 'var(--primary)', fontWeight: 800, marginBottom: 8 }}>{event.dateLabel || formatDate(event.date)}</div>
              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>{event.description}</p>
            </article>;
          })}
        </div>
      </section>

      <section className="task-section glass" style={{ padding: 24, width: '100%' }}>
        <h2 style={{ margin: '0 0 6px' }}>Holidays & Breaks</h2>
        <p style={{ margin: '0 0 18px', color: 'var(--text-muted)' }}>Official list of national holidays and semester breaks scheduled for 2026–27.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {SEM5_HOLIDAYS.map(([name, description, date]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.78)', border: '1px solid #e2e8f0' }}>
            <div><strong>{name}</strong><div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 4 }}>{description}</div></div>
            <strong style={{ whiteSpace: 'nowrap', color: 'var(--primary)' }}>{date}</strong>
          </div>)}
        </div>
      </section>
    </div>
  );
}

export function ScheduleView({ tasks, currentTime, activeSemester = '4' }) {
  if (activeSemester === '5') return <SemesterFiveSchedule />;
  const now = currentTime || new Date();

  // Helper to find actual contest task from firestore tasks
  const findActualContest = (scheduledName) => {
    // scheduledName e.g. "GenAI Contest 1"
    const parts = scheduledName.split(' ');
    const subjectPrefix = parts[0]; // e.g., "GenAI"
    const contestNum = parts[parts.length - 1]; // e.g., "1"

    return tasks.find(t =>
      t.type === 'contest' &&
      t.subjectName.toLowerCase().includes(subjectPrefix.toLowerCase()) &&
      (t.name == contestNum || t.number == contestNum || t.name.includes(`Contest ${contestNum}`))
    );
  };

  const subjectDistribution = [
    { name: "Discrete Mathematics", type: "Paper/System", contests: 3 },
    { name: "GenAI", type: "System", contests: 2 },
    { name: "System Design", type: "System", contests: 3 },
    { name: "Data and Visual Analytics", type: "System", contests: 3 }
  ];

  return (
    <div className="sections-container" style={{ gap: '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', width: '100%' }}>
        <div className="task-section glass" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy style={{ color: '#f59e0b' }} />
            Course-wise Distribution (2024 Batch)
          </h3>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Exam Type</th>
                <th style={{ textAlign: 'center' }}>Total Contests</th>
              </tr>
            </thead>
            <tbody>
              {subjectDistribution.map((row, i) => (
                <tr key={i}>
                  <td>{row.name}</td>
                  <td>{row.type}</td>
                  <td style={{ textAlign: 'center' }}>{row.contests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="task-section glass" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap style={{ color: '#f59e0b' }} />
            Quick Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="overall-stats-pill" style={{ height: 'auto', padding: '16px', flexDirection: 'column', gap: '4px' }}>
              <span className="stats-label">Total Events</span>
              <span className="stats-value" style={{ fontSize: '1.5rem' }}>{CONTEST_SCHEDULE.length}</span>
            </div>
            <div className="overall-stats-pill" style={{ height: 'auto', padding: '16px', flexDirection: 'column', gap: '4px' }}>
              <span className="stats-label">Remaining</span>
              <span className="stats-value" style={{ fontSize: '1.5rem', color: '#f59e0b' }}>
                {CONTEST_SCHEDULE.filter(c => new Date(c.date) >= now).length}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid var(--primary-glow)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Tip: Contests are usually on Fridays. Check the timeline for exact dates.
            </p>
          </div>
        </div>
      </div>

      <div className="task-section glass" style={{ padding: '24px', width: '100%' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar style={{ color: '#f59e0b' }} />
          Chronological Timeline
        </h3>
        <div className="timeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {CONTEST_SCHEDULE.map((event, index) => {
            const dateObj = new Date(event.date);
            const isPast = new Date(dateObj).setHours(23, 59, 59) < now;
            const prevEventPast = index === 0 || new Date(CONTEST_SCHEDULE[index - 1].date).setHours(23, 59, 59) < now;
            const isNext = !isPast && prevEventPast;
            const actualTask = findActualContest(event.name);

            return (
              <div key={index} className={`timeline-card glass ${isPast ? 'past' : ''} ${isNext ? 'active' : ''}`} style={{
                padding: '16px',
                borderRadius: '16px',
                border: `1px solid ${isNext ? 'var(--primary)' : actualTask ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0,0,0,0.05)'}`,
                background: isNext ? 'var(--primary-glow)' : actualTask ? 'rgba(16, 185, 129, 0.02)' : 'white',
                opacity: isPast && !actualTask ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {(isNext && !actualTask) && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '0.6rem', padding: '4px 10px', fontWeight: 900, borderRadius: '0 0 0 12px' }}>NEXT UP</div>}
                {actualTask && <div style={{ position: 'absolute', top: 0, right: 0, background: '#10b981', color: 'white', fontSize: '0.6rem', padding: '4px 10px', fontWeight: 900, borderRadius: '0 0 0 12px' }}>DATA SYNCED</div>}

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>WEEK {index + 1}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: isNext ? 'var(--primary)' : 'var(--text-main)' }}>{event.name}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Calendar size={14} /> {formatDate(event.date)}
                  </div>
                </div>

                {actualTask ? (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700 }}>You:</span>
                      <span style={{ fontWeight: 800, color: '#10b981' }}>{actualTask.marks ?? 0} <small style={{ fontWeight: 600, color: '#94a3b8' }}>/ {actualTask.maxMarks || 5}</small></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700 }}>Dhruv:</span>
                      <span style={{ fontWeight: 800, color: '#f59e0b' }}>{actualTask.dhruvMarks ?? 0} <small style={{ fontWeight: 600, color: '#94a3b8' }}>/ {actualTask.maxMarks || 5}</small></span>
                    </div>
                    <div style={{
                      marginTop: '4px',
                      height: '4px',
                      background: '#f1f5f9',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${((actualTask.marks || 0) / (actualTask.maxMarks || 5)) * 100}%`,
                        background: '#10b981',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        opacity: 0.6
                      }}></div>
                      <div style={{
                        width: `${((actualTask.dhruvMarks || 0) / (actualTask.maxMarks || 5)) * 100}%`,
                        background: '#f59e0b',
                        height: '2px',
                        position: 'absolute',
                        bottom: 0,
                        left: 0
                      }}></div>
                    </div>
                  </div>
                ) : (
                  isPast && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', fontStyle: 'italic' }}>
                      Data not entered yet
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AllLecturesView({ tasks, subjects = [], activeSemester = '4', onUpdate, onDelete, onEdit }) {
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Present', 'Absent'
  const [searchQuery, setSearchQuery] = useState('');

  const allLectures = useMemo(() => {
    let filtered = tasks.filter(t => t.type === 'lecture' && (!subjects.length || subjects.includes(t.subjectName)));

    // Subject Filter
    if (filterSubject !== 'All') {
      filtered = filtered.filter(t => t.subjectName === filterSubject);
    }

    // Status Filter (Attendance)
    if (filterStatus === 'Present') {
      filtered = filtered.filter(t => t.present === true);
    } else if (filterStatus === 'Absent') {
      filtered = filtered.filter(t => t.present === false);
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.number && t.number.toString().includes(q))
      );
    }

    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [tasks, subjects, filterSubject, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    // Current filtered view stats
    const filteredTotal = allLectures.length;
    const filteredCompleted = allLectures.filter(t => t.completed).length;

    // Global attendance stats (requested to remain stable)
    const globalLectures = tasks.filter(t => t.type === 'lecture' && (!subjects.length || subjects.includes(t.subjectName)));
    const globalAttendance = subjects.reduce((totals, subject) => {
      const lectures = globalLectures.filter(task => task.subjectName === subject);
      const baseSubject = subject.replace(' Class', '').replace(' Lab', '');
      const meta = tasks.find(task => task.type === 'friend_meta' &&
        (task.subjectName === baseSubject || task.subject === baseSubject || task.subjectName === subject || task.subject === subject));
      const attendance = getAttendanceStats(lectures, meta, subject);
      totals.total += attendance.total;
      totals.present += attendance.attended;
      return totals;
    }, { total: 0, present: 0 });
    const globalTotal = globalAttendance.total;
    const globalPresent = globalAttendance.present;

    return {
      total: filteredTotal,
      attendance: globalTotal > 0 ? ((globalPresent / globalTotal) * 100).toFixed(2) : "0.00",
      completion: filteredTotal > 0 ? ((filteredCompleted / filteredTotal) * 100).toFixed(2) : "0.00"
    };
  }, [allLectures, tasks, subjects]);

  const uniqueSubjects = useMemo(() => {
    return ['All', ...subjects.filter(subject => tasks.some(task => task.type === 'lecture' && task.subjectName === subject)).sort()];
  }, [tasks, subjects]);

  return (
    <div className="sections-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))' }}>
          <div style={{ padding: '16px', borderRadius: '16px', background: '#eff6ff', color: '#3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)' }}>
            <Layers size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{stats.total}</h3>
            <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>Total Lectures</p>
          </div>
        </div>

        <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))' }}>
          <div style={{ padding: '16px', borderRadius: '16px', background: '#dcfce7', color: '#15803d', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.1)' }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#15803d', lineHeight: 1 }}>{stats.attendance}%</h3>
            <p style={{ color: '#166534', fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>Attendance Rate</p>
          </div>
        </div>

        <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))' }}>
          <div style={{ padding: '16px', borderRadius: '16px', background: '#e0e7ff', color: '#4338ca', boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.1)' }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#4338ca', lineHeight: 1 }}>{stats.completion}%</h3>
            <p style={{ color: '#3730a3', fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>Completion Rate</p>
          </div>
        </div>
      </div>

      <section className="task-section lecture-section glass" style={{ width: '100%', padding: '24px' }}>
        <div className="section-header" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="section-title-group" style={{ marginBottom: 0 }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Lecture Repository</h3>
              <p className="section-subtitle" style={{ fontSize: '0.95rem' }}>Searching {allLectures.length} entries</p>
            </div>

            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '12px 12px 12px 42px',
                  borderRadius: '16px',
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  color: '#1e293b',
                  width: '100%',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '4px', borderRadius: '50%', transition: 'all 0.2s' }}>
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status Filters */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '8px' }}>Attendance:</span>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                {['All', 'Present', 'Absent'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: filterStatus === status ? 'white' : 'transparent',
                      color: filterStatus === status ? '#3b82f6' : '#64748b',
                      boxShadow: filterStatus === status ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Filters */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '8px' }}>Subjects:</span>
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }} className="no-scrollbar">
                {uniqueSubjects.map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSubject(s)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '100px',
                      border: '1.5px solid',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      borderColor: filterSubject === s ? '#3b82f6' : '#e2e8f0',
                      background: filterSubject === s ? '#eff6ff' : 'white',
                      color: filterSubject === s ? '#1d4ed8' : '#475569',
                      boxShadow: filterSubject === s ? '0 4px 8px rgba(59, 130, 246, 0.15)' : 'none',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="task-list">
          <div className="task-list-header">
            <span className="col-subject" style={{ flex: '0 0 100px', fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>Subject</span>
            <span className="col-number" style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>No.</span>
            <span className="col-name" style={{ flex: 1, fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>Title</span>
            <span className="col-date" style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>Date</span>
            <span className="col-attendance" style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>Attendance</span>
            <span className="col-completion" style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>Status</span>
            <span className="col-actions" style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>Actions</span>
          </div>
          {allLectures.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Search size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>No lectures found</p>
              <p style={{ fontSize: '0.9rem' }}>Try adjusting your search or filter</p>
            </div>
          ) : (
            allLectures.map(task => (
              <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''} ${task.isFree ? 'free-row' : ''}`}>
                <div className="col-subject" style={{ flex: '0 0 100px', opacity: 0.8, fontSize: '0.9em', fontWeight: 700 }}>
                  {task.subjectName}
                </div>
                <div className="col-number">
                  <span className="task-number" style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85em', fontWeight: 700 }}>#{task.number}</span>
                </div>
                <div className="col-name" style={{ flex: 1 }}>
                  <span className={`task-name ${task.important ? 'important' : ''}`} style={{ fontWeight: 600 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {task.notes ? (
                        <a href={task.notes} target="_blank" rel="noreferrer" className="lecture-link" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                          {task.name}
                          <ExternalLink size={14} style={{ opacity: 0.5 }} />
                        </a>
                      ) : (
                        <span className="no-notes">
                          {task.name}
                          {task.isFree && <span className="badge badge-free" style={{ marginLeft: '8px', fontSize: '0.65em', padding: '2px 6px' }}>☕ Free</span>}
                        </span>
                      )}
                      {task.notionUrl && (
                        <a href={task.notionUrl} target="_blank" rel="noreferrer" className="notion-link" title="Open Notion Notes">
                          <NotionLogo size={15} />
                        </a>
                      )}
                    </div>
                  </span>
                  <div className="task-meta-mobile">
                    <span style={{ marginRight: '10px', opacity: 0.7 }}>{task.subjectName}</span>
                    {task.date && (
                      <span className="task-date">
                        <Calendar size={12} /> {formatDate(task.date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-date">
                  {task.date && (
                    <span className="task-date" style={{ fontWeight: 600, color: '#64748b' }}>
                      {formatDate(task.date)}
                    </span>
                  )}
                </div>
                <label className="col-attendance">
                  {task.attendanceRecorded === false ? (
                    <select
                      value={task.present === true ? 'present' : task.present === false ? 'absent' : 'unknown'}
                      onChange={e => onUpdate(task.id, {
                        present: e.target.value === 'unknown' ? null : e.target.value === 'present',
                        attendanceRecorded: e.target.value !== 'unknown'
                      })}
                      title="Record attendance"
                      aria-label={`Attendance for ${task.name} on ${task.date}`}
                      style={{ border: '1px solid #dbe2ea', borderRadius: '8px', padding: '6px 8px', color: task.present == null ? '#64748b' : task.present ? '#15803d' : '#ef4444', background: 'white', fontWeight: 600 }}
                    >
                      <option value="unknown">Unrecorded</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  ) : (
                    <>
                      <input
                        type="checkbox"
                        checked={task.present === true}
                        onChange={e => onUpdate(task.id, { present: e.target.checked, attendanceRecorded: true })}
                        title="Mark Attendance"
                      />
                      <span className="attendance-label" style={{ fontWeight: 600, fontSize: '0.85em', color: task.present === true ? '#15803d' : '#ef4444' }}>
                        {task.present === true ? 'Present' : 'Absent'}
                      </span>
                    </>
                  )}
                </label>
                <label className="col-completion">
                  <input
                    type="checkbox"
                    checked={task.completed === true}
                    onChange={e => onUpdate(task.id, { completed: e.target.checked })}
                    title="Mark Lecture Completed"
                  />
                  <span className="completion-label" style={{ fontWeight: 600, fontSize: '0.85em', color: task.completed ? '#1e40af' : '#64748b' }}>
                    {task.completed ? 'Done' : 'Pending'}
                  </span>
                </label>
                <div className="col-actions">
                  <div className="task-actions">
                    <button
                      className={`star-btn ${task.isFree ? 'active free' : ''}`}
                      onClick={() => onUpdate(task.id, { isFree: !task.isFree })}
                      title="Free Lecture"
                    >
                      <Coffee size={18} fill={task.isFree ? "currentColor" : "none"} />
                    </button>
                    <button
                      className={`star-btn ${task.important ? 'active' : ''}`}
                      onClick={() => onUpdate(task.id, { important: !task.important })}
                      title="Mark Important"
                    >
                      <Star size={18} fill={task.important ? "currentColor" : "none"} />
                    </button>
                    <button className="edit-btn" onClick={() => onEdit(task)} title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function SafeZoneCalculator({ tasks, threshold = 75 }) {
  const regularTasks = tasks.filter(t => t.type === 'lecture');
  const present = regularTasks.filter(t => t.present !== false).length;
  const total = regularTasks.length;
  const percentage = total > 0 ? (present / total) * 100 : 100;
  const tRatio = threshold / 100;
  const needRatio = 1 - tRatio;

  let message = "";
  let status = "safe";

  if (percentage >= threshold) {
    const skip = Math.floor((present / tRatio) - total);
    if (skip > 0) {
      message = `You can skip ${skip} next lecture${skip > 1 ? 's' : ''}`;
      status = "safe";
    } else {
      return null; // Remove the "On the edge" warning as requested
    }
  } else {
    const need = Math.ceil((tRatio * total - present) / needRatio);
    message = `DANGER! Attend next ${need} lecture${need > 1 ? 's' : ''} to reach ${threshold}%`;
    status = "danger";
  }

  return (
    <div className={`safe-zone-widget ${status}`}>
      <Zap size={14} />
      <span>{message}</span>
    </div>
  );
}


