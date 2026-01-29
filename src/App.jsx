import React, { useState, useEffect, useMemo } from 'react';
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
import './App.css';
import { db, TASKS_COLLECTION } from './firebase';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import {
  BookOpen,
  Trash2,
  Edit2,
  Star,
  Plus,
  Calendar,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
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
  Search
} from 'lucide-react';

const DEFAULT_SUBJECTS = [
  "DM Class", "DM Lab", "DVA Class", "DVA Lab",
  "GenAI Class", "GenAI Lab", "SD Class", "SD Lab"
];

const EXAM_DATES = {
  midSem: "2026-03-15",
  endSem: "2026-05-20"
};

const CONTEST_SCHEDULE = [
  { name: "GenAI Contest 1", date: "2026-01-16" },
  { name: "SD Contest 1", date: "2026-01-23" },
  { name: "DVA Contest 1", date: "2026-01-30" },
  { name: "SD Contest 2", date: "2026-02-13" },
  { name: "DM Contest 1", date: "2026-02-27" },
  { name: "DVA Contest 2", date: "2026-03-20" },
  { name: "DM Contest 2", date: "2026-03-27" },
  { name: "GenAI Contest 2", date: "2026-04-03" },
  { name: "DVA Contest 3", date: "2026-04-10" },
  { name: "SD Contest 3", date: "2026-05-01" },
  { name: "DM Contest 3", date: "2026-05-08" },
];

const SUBJECT_THEMES = {
  "DM Class": { primary: "#6366f1", glow: "rgba(99, 102, 241, 0.15)" },
  "DM Lab": { primary: "#4f46e5", glow: "rgba(79, 70, 229, 0.15)" },
  "DVA Class": { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.15)" },
  "DVA Lab": { primary: "#d97706", glow: "rgba(217, 119, 6, 0.15)" },
  "GenAI Class": { primary: "#8b5cf6", glow: "rgba(139, 92, 246, 0.15)" },
  "GenAI Lab": { primary: "#7c3aed", glow: "rgba(124, 58, 237, 0.15)" },
  "SD Class": { primary: "#10b981", glow: "rgba(16, 185, 129, 0.15)" },
  "SD Lab": { primary: "#059669", glow: "rgba(5, 150, 105, 0.15)" },
  "Analytics": { primary: "#1e293b", glow: "rgba(30, 41, 59, 0.15)" },
  "All Lectures": { primary: "#0f172a", glow: "rgba(15, 23, 42, 0.15)" },
  "Exam Schedule": { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.15)" }
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeSubject, setActiveSubject] = useState(() => {
    const hash = window.location.hash.replace('#', '').replace(/%20/g, ' ');
    if (DEFAULT_SUBJECTS.includes(hash) || hash === 'Analytics' || hash === 'All Lectures' || hash === 'Exam Schedule' || hash === 'Activity Tracker') return hash;
    return localStorage.getItem('active_subject') || DEFAULT_SUBJECTS[0];
  });

  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Connecting...');
  const [attendanceThreshold, setAttendanceThreshold] = useState(() => {
    return parseInt(localStorage.getItem('attendance_threshold')) || 75;
  });

  useEffect(() => {
    localStorage.setItem('attendance_threshold', attendanceThreshold);
  }, [attendanceThreshold]);

  // Sync with Firestore
  useEffect(() => {
    const q = query(TASKS_COLLECTION, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const taskList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Normalize for compatibility
        taskList.push({
          id: doc.id,
          ...data,
          subjectName: data.subjectName || data.subject // Support both
        });
      });
      setTasks(taskList);
      setLoading(false);

      if (snapshot.metadata.hasPendingWrites) {
        setSyncStatus('Online (Syncing...)');
      } else if (snapshot.metadata.fromCache) {
        setSyncStatus('Offline (Cached)');
      } else {
        setSyncStatus('Online (Up to date)');
      }
    }, (error) => {
      console.error("Firestore Sync Error:", error);
      setSyncStatus(`Error: ${error.code}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync active subject with URL hash
  useEffect(() => {
    window.location.hash = activeSubject;
    localStorage.setItem('active_subject', activeSubject);
  }, [activeSubject]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').replace(/%20/g, ' ');
      if (DEFAULT_SUBJECTS.includes(hash) || hash === 'Analytics' || hash === 'All Lectures' || hash === 'Exam Schedule' || hash === 'Activity Tracker') setActiveSubject(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Theme Management
  useEffect(() => {
    const theme = SUBJECT_THEMES[activeSubject] || SUBJECT_THEMES["DM Class"];
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--primary-glow', theme.glow);

    // Smooth background subtle shift
    const bodyStyle = document.body.style;
    if (activeSubject === 'Analytics') {
      bodyStyle.backgroundColor = '#f8fafc';
    } else {
      bodyStyle.backgroundColor = '#f3f4f6';
    }
  }, [activeSubject]);

  const addTask = async (subjectName, type, data) => {
    const newTask = {
      subjectName,
      type,
      name: data.name,
      number: data.number,
      completed: type === 'lecture',
      present: type === 'lecture',
      important: type !== 'lecture',
      createdAt: Date.now(),
      ...data
    };
    try {
      await addDoc(TASKS_COLLECTION, newTask);

      // Delta Sync for Dhruv
      if (type === 'lecture' && newTask.present !== false) {
        const fm = tasks.find(t => t.type === 'friend_meta' && t.subjectName === subjectName);
        if (fm && fm.attendanceCount !== undefined) {
          await updateDoc(doc(db, 'tasks', fm.id), { attendanceCount: fm.attendanceCount + 1 });
        }
      }
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const task = tasks.find(t => t.id === id);

      const finalUpdates = { ...updates };
      // Auto-timestamp completion
      if (updates.completed === true && (!task || !task.completed)) {
        finalUpdates.completedAt = Date.now();
      } else if (updates.completed === false) {
        finalUpdates.completedAt = null;
      }

      const res = await updateDoc(doc(db, 'tasks', id), finalUpdates);

      // Delta Sync for Dhruv
      if (task && task.type === 'lecture' && 'present' in updates) {
        if (task.present !== updates.present) {
          const delta = updates.present ? 1 : -1;
          const fm = tasks.find(t => t.type === 'friend_meta' && t.subjectName === task.subjectName);
          if (fm && fm.attendanceCount !== undefined) {
            await updateDoc(doc(db, 'tasks', fm.id), { attendanceCount: (fm.attendanceCount || 0) + delta });
          }
        }
      }
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const deleteTask = async (id) => {
    if (window.confirm('Delete this task?')) {
      try {
        const task = tasks.find(t => t.id === id);
        await deleteDoc(doc(db, 'tasks', id));

        // Delta Sync for Dhruv
        if (task && task.type === 'lecture' && task.present !== false) {
          const fm = tasks.find(t => t.type === 'friend_meta' && t.subjectName === task.subjectName);
          if (fm && fm.attendanceCount !== undefined) {
            await updateDoc(doc(db, 'tasks', fm.id), { attendanceCount: Math.max(0, (fm.attendanceCount || 0) - 1) });
          }
        }
      } catch (e) {
        console.error("Error deleting document: ", e);
      }
    }
  };

  const friendMetaDoc = useMemo(() => {
    return tasks.find(t => t.type === 'friend_meta' && t.subjectName === activeSubject);
  }, [tasks, activeSubject]);

  const updateFriendMeta = async (updates) => {
    if (friendMetaDoc) {
      await updateTask(friendMetaDoc.id, updates);
    } else {
      await addTask(activeSubject, 'friend_meta', updates);
    }
  };

  const currentTasks = useMemo(() => {
    if (activeSubject === 'Analytics' || activeSubject === 'All Lectures') {
      return tasks.filter(t => t.type !== 'friend_meta');
    }
    return tasks.filter(t => t.subjectName === activeSubject && t.type !== 'friend_meta');
  }, [tasks, activeSubject]);

  return (
    <div className="app-layout">
      <Sidebar
        subjects={DEFAULT_SUBJECTS}
        activeSubject={activeSubject}
        onSelect={setActiveSubject}
      />
      <main className="main-content">
        <BookmarkBar />
        <header className="main-header">
          <div className="title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1>{activeSubject === 'Marks Overview' ? 'Global Performance Overview' : activeSubject === 'Detailed Analysis' ? 'Subject-wise Detailed Analysis' : activeSubject === 'Pending Work' ? 'Pending Lectures Queue' : activeSubject === 'All Lectures' ? 'Global Lecture View' : activeSubject === 'Exam Schedule' ? 'Academic Calendar' : activeSubject === 'Activity Tracker' ? 'Personal Activity Tracker' : activeSubject}</h1>
            </div>
            <div className={`sync-badge ${syncStatus.toLowerCase().includes('error') ? 'error' : ''} ${syncStatus.toLowerCase().includes('up to date') ? 'online' : ''}`}>
              {syncStatus.toLowerCase().includes('connecting') ? <Loader2 size={14} className="spin" /> :
                syncStatus.toLowerCase().includes('error') ? <AlertCircle size={14} /> :
                  syncStatus.toLowerCase().includes('offline') ? <CloudOff size={14} /> : <Cloud size={14} />}
              <span>{syncStatus}</span>
            </div>
            {(activeSubject === 'Marks Overview' || activeSubject === 'Detailed Analysis') && (
              <div className="threshold-setting glass">
                <span className="label">Criteria:</span>
                <input
                  type="number"
                  value={attendanceThreshold}
                  onChange={(e) => setAttendanceThreshold(Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="threshold-input"
                />
                <span className="unit">%</span>
              </div>
            )}
          </div>
        </header>

        {activeSubject === 'Marks Overview' ? (
          <SummaryView tasks={tasks} subjects={DEFAULT_SUBJECTS} threshold={attendanceThreshold} mode="overview" onUpdate={updateTask} />
        ) : activeSubject === 'Detailed Analysis' ? (
          <SummaryView tasks={tasks} subjects={DEFAULT_SUBJECTS} threshold={attendanceThreshold} mode="detailed" onUpdate={updateTask} />
        ) : activeSubject === 'Pending Work' ? (
          <SummaryView tasks={tasks} subjects={DEFAULT_SUBJECTS} threshold={attendanceThreshold} mode="pending" onUpdate={updateTask} />
        ) : activeSubject === 'All Lectures' ? (
          <AllLecturesView
            tasks={tasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onEdit={setEditingTask}
          />
        ) : activeSubject === 'Activity Tracker' ? (
          <ActivityView tasks={tasks} subjects={DEFAULT_SUBJECTS} />
        ) : activeSubject === 'Exam Schedule' ? (
          <ScheduleView tasks={tasks} />
        ) : activeSubject === 'Safe Zone' ? (
          <SafeZoneView tasks={tasks} subjects={DEFAULT_SUBJECTS} threshold={attendanceThreshold} setThreshold={setAttendanceThreshold} />
        ) : (
          <div className="sections-container">
            <TaskSection
              title="Lectures"
              type="lecture"
              activeSubject={activeSubject}
              tasks={currentTasks.filter(t => t.type === 'lecture')}
              friendMeta={friendMetaDoc}
              onUpdateFriendMeta={updateFriendMeta}
              onAdd={(data) => addTask(activeSubject, 'lecture', data)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={setEditingTask}
              threshold={attendanceThreshold}
            />
            <TaskSection
              title="Assignments"
              type="assignment"
              activeSubject={activeSubject}
              tasks={currentTasks.filter(t => t.type === 'assignment')}
              onAdd={(data) => addTask(activeSubject, 'assignment', data)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={setEditingTask}
            />
            <TaskSection
              title="Quizzes"
              type="quiz"
              activeSubject={activeSubject}
              tasks={currentTasks.filter(t => t.type === 'quiz')}
              onAdd={(data) => addTask(activeSubject, 'quiz', data)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={setEditingTask}
            />
            {!activeSubject.includes('Lab') && (
              <>
                <TaskSection
                  title="Mini Projects"
                  type="project"
                  activeSubject={activeSubject}
                  tasks={currentTasks.filter(t => t.type === 'project')}
                  onAdd={(data) => addTask(activeSubject, 'project', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                />
                <ContestSection
                  activeSubject={activeSubject}
                  tasks={currentTasks.filter(t => t.type === 'contest')}
                  onAdd={(data) => addTask(activeSubject, 'contest', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                />
                <ExamSection
                  title="Mid Sem Exam"
                  type="midSem"
                  activeSubject={activeSubject}
                  tasks={currentTasks.filter(t => t.type === 'midSem')}
                  onAdd={(data) => addTask(activeSubject, 'midSem', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                />
                <ExamSection
                  title="End Sem Exam"
                  type="endSem"
                  activeSubject={activeSubject}
                  tasks={currentTasks.filter(t => t.type === 'endSem')}
                  onAdd={(data) => addTask(activeSubject, 'endSem', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                />
              </>
            )}
          </div>
        )}
      </main>

      {editingTask && (
        <EditModal
          task={editingTask}
          activeSubject={activeSubject}
          allTasks={tasks.filter(t => t.subjectName === activeSubject && t.type === editingTask.type)}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => {
            updateTask(editingTask.id, updates);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

function Sidebar({ subjects, activeSubject, onSelect }) {
  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <BookOpen size={24} />
        <h2>Subjects</h2>
      </div>
      <nav className="subject-list">
        <div className="sidebar-divider">Performance</div>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Marks Overview' ? 'active' : ''}`}
          onClick={() => onSelect('Marks Overview')}
        >
          <TrendingUp size={18} />
          <span>Global Overview</span>
          {activeSubject === 'Marks Overview' && <ChevronRight size={14} className="active-arrow" />}
        </button>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Detailed Analysis' ? 'active' : ''}`}
          onClick={() => onSelect('Detailed Analysis')}
        >
          <BarChart3 size={18} />
          <span>Detailed Analysis</span>
          {activeSubject === 'Detailed Analysis' && <ChevronRight size={14} className="active-arrow" />}
        </button>

        <div className="sidebar-divider">Monitoring</div>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Activity Tracker' ? 'active' : ''}`}
          onClick={() => onSelect('Activity Tracker')}
        >
          <Activity size={18} />
          <span>Personal Tracker</span>
          {activeSubject === 'Activity Tracker' && <ChevronRight size={14} className="active-arrow" />}
        </button>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Pending Work' ? 'active' : ''}`}
          onClick={() => onSelect('Pending Work')}
        >
          <Clock size={18} />
          <span>Pending Work</span>
          {activeSubject === 'Pending Work' && <ChevronRight size={14} className="active-arrow" />}
        </button>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Safe Zone' ? 'active' : ''}`}
          onClick={() => onSelect('Safe Zone')}
        >
          <ShieldCheck size={18} />
          <span>Skip Manager</span>
          {activeSubject === 'Safe Zone' && <ChevronRight size={14} className="active-arrow" />}
        </button>

        <div className="sidebar-divider">Resources</div>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'All Lectures' ? 'active' : ''}`}
          onClick={() => onSelect('All Lectures')}
        >
          <Archive size={18} />
          <span>Lecture Repo</span>
          {activeSubject === 'All Lectures' && <ChevronRight size={14} className="active-arrow" />}
        </button>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Exam Schedule' ? 'active' : ''}`}
          onClick={() => onSelect('Exam Schedule')}
        >
          <Calendar size={18} />
          <span>Academic Cal</span>
          {activeSubject === 'Exam Schedule' && <ChevronRight size={14} className="active-arrow" />}
        </button>

        <div className="sidebar-divider">Subjects</div>
        {subjects.map(subject => (
          <button
            key={subject}
            className={`subject-btn ${activeSubject === subject ? 'active' : ''}`}
            onClick={() => onSelect(subject)}
          >
            <Hash size={14} />
            <span>{subject}</span>
            {activeSubject === subject && <ChevronRight size={14} className="active-arrow" />}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function BookmarkBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Update more frequently to ensure seconds flip close to real time
    const timer = setInterval(() => setTime(new Date()), 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bookmark-bar glass">
      <div className="bookmark-items">
        <a
          href="https://my.newtonschool.co/course/8adqgomb044s/details"
          target="_blank"
          rel="noreferrer"
          className="bookmark-item"
        >
          <Rocket size={14} />
          <span>Newton Portal</span>
        </a>
        <div className="bookmark-divider"></div>
        <a
          href="https://www.notion.so/Sem-4-2df73a32749f80518d92d53951340894"
          target="_blank"
          rel="noreferrer"
          className="bookmark-item"
        >
          <FileText size={14} />
          <span>Notion Sem 4</span>
        </a>
        <div className="bookmark-divider"></div>
        <a
          href="https://chatgpt.com/g/g-69784d86478081919281e702b0f97dea-academic-pdf-notes-builder"
          target="_blank"
          rel="noreferrer"
          className="bookmark-item"
        >
          <MessageSquare size={14} />
          <span>Notes Builder AI</span>
        </a>
        <div className="bookmark-divider" style={{ margin: '0 16px' }}></div>

        <div className="bookmark-item" style={{ cursor: 'default', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.8)' }}>
          <Clock size={14} style={{ color: '#6366f1' }} />
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', color: '#1e293b' }}>
            {time.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
            <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
            {time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="bookmark-divider" style={{ margin: '0 16px' }}></div>
        <ExamCountdown now={time} />
      </div>
    </div>
  );
}

function TaskSection({ title, type, tasks, onAdd, onUpdate, onDelete, onEdit, activeSubject, friendMeta, onUpdateFriendMeta, threshold }) {
  const [val, setVal] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [link, setLink] = useState('');
  const [notionLink, setNotionLink] = useState('');
  const [impQs, setImpQs] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const presentCount = tasks.filter(t => t.present !== false).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const attendPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const completePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Restore drafts on mount/subject change
  useEffect(() => {
    const drafts = JSON.parse(localStorage.getItem('inputDrafts') || '{}');
    const key = `${activeSubject}_${type}`;
    if (drafts[key]) {
      const d = drafts[key];
      setVal(d.val || '');
      setLink(d.link || '');
      setNotionLink(d.notionLink || '');
      setImpQs(d.impQs || '');
      if (d.date) setDate(d.date);
    }
    setIsLoaded(true);
  }, [activeSubject, type]);

  // Save drafts whenever input values change
  useEffect(() => {
    if (!isLoaded) return; // Don't save drafts until initial load is complete

    const drafts = JSON.parse(localStorage.getItem('inputDrafts') || '{}');
    const key = `${activeSubject}_${type}`;
    drafts[key] = { val, link, notionLink, impQs, date };
    localStorage.setItem('inputDrafts', JSON.stringify(drafts));
  }, [val, link, notionLink, impQs, date, activeSubject, type, isLoaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;

    const count = tasks.length + 1;
    const data = { name: val, number: count, date: date };
    if (type === 'lecture') {
      data.notes = link;
      data.notionUrl = notionLink;
    }
    if (type === 'assignment' || type === 'quiz') data.link = link;
    if (type === 'quiz') data.impQs = impQs;

    onAdd(data);
    setVal('');
    setLink('');
    setNotionLink('');
    setImpQs('');
  };

  return (
    <section className={`task-section ${type}-section glass`}>
      {type === 'lecture' && <SafeZoneCalculator tasks={tasks} threshold={threshold} />}
      <div className="section-header">
        <div className="section-title-group">
          <h3>{title}</h3>
          <p className="section-subtitle">{totalCount} total items</p>
        </div>
        <div className="progress-group">
          {type === 'lecture' && (
            <div className="progress-card attendance-card dhruv-attendance-card" style={{ borderColor: '#f59e0b' }}>
              <div className="card-top-label" style={{ color: '#d97706', background: '#fffbeb' }}>DHRUV ATTENDANCE</div>
              <div className="progress-info" style={{ marginTop: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={friendMeta?.attendanceCount ?? presentCount}
                    onChange={e => onUpdateFriendMeta({ attendanceCount: parseInt(e.target.value) || 0 })}
                    placeholder={presentCount}
                    style={{ width: '50px', padding: '4px', border: '1px solid #fcd34d', borderRadius: '6px', fontWeight: 800, textAlign: 'center', background: '#fffbeb' }}
                  />
                  <span style={{ fontSize: '0.85em', fontWeight: 600 }}>/ {totalCount}</span>
                </div>
                <div className="progress-percent" style={{ color: '#d97706', fontSize: '1.1rem' }}>
                  {totalCount > 0 ? Math.round(((friendMeta?.attendanceCount ?? presentCount) / totalCount) * 100) : 0}%
                </div>
              </div>
            </div>
          )}
          <div className={`progress-card ${type}-card`}>
            <div className="card-top-label">{type === 'lecture' ? 'COMPLETION' : 'STATUS'}</div>
            <div className="progress-circle-container">
              <svg className="progress-circle" viewBox="0 0 36 36">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${completePercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
            </div>
            <div className="progress-info">
              <span className="progress-percent">{completePercent}%</span>
              <span className="progress-count">{completedCount}/{totalCount} {type === 'lecture' ? 'Completed' : (type === 'assignment' ? 'Finished' : 'Done')}</span>
            </div>
          </div>
        </div>
      </div>
      <form className="input-row" onSubmit={handleSubmit}>
        <input
          placeholder={`${title.slice(0, -1)} name`}
          value={val}
          onChange={e => setVal(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <input
          placeholder={type === 'lecture' ? "Lecture/Notes Link (optional)" : "Link (optional)"}
          value={link}
          onChange={e => setLink(e.target.value)}
        />
        {type === 'lecture' && (
          <input
            placeholder="Notion Notes URL (optional)"
            value={notionLink}
            onChange={e => setNotionLink(e.target.value)}
          />
        )}
        {type === 'quiz' && (
          <input
            placeholder="Imp Qs"
            value={impQs}
            onChange={e => setImpQs(e.target.value)}
          />
        )}
        <button type="submit" className="add-btn">
          <Plus size={18} />
          <span>Add</span>
        </button>
      </form>

      <div className="task-list">
        <div className="task-list-header">
          <span className="col-number">No.</span>
          <span className="col-name">Name</span>
          <span className="col-date">Date</span>
          {type === 'lecture' && <span className="col-attendance">Attendance</span>}
          <span className="col-completion">{type === 'lecture' ? 'Completed' : (['assignment', 'quiz'].includes(type) ? 'Status' : 'Status (You)')}</span>
          {type !== 'lecture' && !['assignment', 'quiz'].includes(type) && <span className="col-completion" style={{ color: '#f59e0b' }}>Status (D)</span>}
          <span className="col-actions">Actions</span>
        </div>
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''}`}>
            <div className="col-number">
              <span className="task-number">#{task.number}</span>
            </div>
            <div className="col-name">
              <span className={`task-name ${task.important ? 'important' : ''}`}>
                {type === 'lecture' ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {task.notes ? (
                      <a href={task.notes} target="_blank" rel="noreferrer" className="lecture-link">
                        {task.name}
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="no-notes">
                        {task.name} <em style={{ fontSize: '0.8em', opacity: 0.6 }}>(No Link)</em>
                      </span>
                    )}
                    {task.notionUrl && (
                      <a href={task.notionUrl} target="_blank" rel="noreferrer" className="notion-link" title="Open Notion Notes">
                        <NotionLogo size={15} />
                      </a>
                    )}
                  </div>
                ) : (
                  task.link ? (
                    <a href={task.link} target="_blank" rel="noreferrer">
                      {task.name} <ExternalLink size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                    </a>
                  ) : task.name
                )}
              </span>
              <div className="task-meta-mobile">
                {task.date && (
                  <span className="task-date">
                    <Calendar size={12} /> {formatDate(task.date)}
                  </span>
                )}
              </div>
            </div>
            <div className="col-date">
              <span className="task-date">{formatDate(task.date)}</span>
            </div>
            {type === 'lecture' && (
              <label className="col-attendance">
                <input
                  type="checkbox"
                  checked={task.present ?? true}
                  onChange={e => onUpdate(task.id, { present: e.target.checked })}
                  title="Mark Attendance"
                />
                <span className="attendance-label">
                  {task.present !== false ? 'Present' : 'Absent'}
                </span>
              </label>
            )}
            <div className="col-completion">
              <div
                className={`checkbox-wrapper ${task.completed ? 'checked' : ''}`}
                onClick={() => onUpdate(task.id, { completed: !task.completed })}
                title="Mark Your Status"
              >
                {task.completed && <Check size={14} color="#10b981" />}
              </div>
            </div>
            {type !== 'lecture' && !['assignment', 'quiz'].includes(type) && (
              <div className="col-completion">
                <div
                  className={`checkbox-wrapper ${task.dhruvCompleted ? 'checked' : ''}`}
                  onClick={() => onUpdate(task.id, { dhruvCompleted: !task.dhruvCompleted })}
                  style={{ borderColor: '#fcd34d' }}
                  title="Mark Dhruv's Status"
                >
                  {task.dhruvCompleted && <Check size={14} color="#f59e0b" />}
                </div>
              </div>
            )}
            <div className="col-actions">
              <div className="task-actions">
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
        ))}
      </div>
    </section>
  );
}

// Helper function to get subject weightages and expected counts
function getSubjectWeights(subjectName) {
  const name = subjectName.toLowerCase();
  const isGenAI = name.includes('genai');
  const isDM = name.includes('dm');
  const isDVA = name.includes('dva');
  const isSD = name.includes('sd');

  let weights = {};
  let counts = { contest: 1, midSem: 1, endSem: 1, quiz: 1 };

  if (isGenAI) {
    weights = {
      attendance: 0.05,
      assignment: 0.10,
      project: 0.15,
      midSem: 0.20,
      endSem: 0.40,
      contest: 0.10
    };
    counts.contest = 2; // Default to 2 contests for GenAI
  } else if (isDM || isSD) {
    weights = {
      attendance: 0.05,
      assignment: 0.10,
      project: 0.10,
      contest: 0.15,
      midSem: 0.20,
      endSem: 0.40
    };
    counts.contest = 3;
    counts.midSem = 1;
    counts.endSem = 1;
  } else if (isDVA) {
    weights = {
      attendance: 0.05,
      assignment: 0.05,
      project: 0.20,
      contest: 0.10,
      midSem: 0.20,
      endSem: 0.40
    };
    counts.contest = 2;
    counts.midSem = 1;
    counts.endSem = 1;
  } else {
    weights = {
      attendance: 0.10,
      assignment: 0.20,
      quiz: 0.10,
      project: 0.20,
      midSem: 0.15,
      endSem: 0.25,
      contest: 0
    };
  }

  return { weights, counts };
}

function ContestSection({ activeSubject, tasks, onAdd, onUpdate, onDelete, onEdit }) {
  const [contestName, setContestName] = useState('');

  // Quiz fields
  const [hasQuiz, setHasQuiz] = useState(true);
  const [quizCorrect, setQuizCorrect] = useState('');
  const [quizTotal, setQuizTotal] = useState('');
  const [quizWeight, setQuizWeight] = useState('40');

  // Coding fields
  const [hasCoding, setHasCoding] = useState(true);
  const [codingCorrect, setCodingCorrect] = useState('');
  const [codingTotal, setCodingTotal] = useState('');
  const [codingWeight, setCodingWeight] = useState('60');
  const [contestDate, setContestDate] = useState(new Date().toISOString().split('T')[0]);

  // Written fields
  const [hasWritten, setHasWritten] = useState(false);
  const [writtenCorrect, setWrittenCorrect] = useState('');
  const [dhruvWrittenCorrect, setDhruvWrittenCorrect] = useState('');
  const [writtenTotal, setWrittenTotal] = useState('');
  const [writtenWeight, setWrittenWeight] = useState('30');

  // Dhruv fields
  const [dhruvQuizCorrect, setDhruvQuizCorrect] = useState('');
  const [dhruvCodingCorrect, setDhruvCodingCorrect] = useState('');

  const [isLoaded, setIsLoaded] = useState(false);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate total marks for contests
  const totalMarks = tasks.reduce((acc, t) => acc + (t.marks || 0), 0);
  const maxMarks = tasks.reduce((acc, t) => acc + (t.maxMarks || 0), 0);

  // Auto-adjust weightages when checkboxes change
  useEffect(() => {
    if (!isLoaded) return;

    const activeCount = (hasQuiz ? 1 : 0) + (hasCoding ? 1 : 0) + (hasWritten ? 1 : 0);

    if (activeCount === 2 && hasQuiz && hasCoding && !hasWritten) {
      setQuizWeight('40');
      setCodingWeight('60');
    } else if (activeCount === 3) {
      setQuizWeight('30');
      setCodingWeight('40');
      setWrittenWeight('30');
    } else if (activeCount === 2 && hasQuiz && hasWritten && !hasCoding) {
      setQuizWeight('40');
      setWrittenWeight('60');
    } else if (activeCount === 2 && hasCoding && hasWritten && !hasQuiz) {
      setCodingWeight('40');
      setWrittenWeight('60');
    } else if (activeCount === 1) {
      if (hasQuiz) setQuizWeight('100');
      if (hasCoding) setCodingWeight('100');
      if (hasWritten) setWrittenWeight('100');
    }
  }, [hasQuiz, hasCoding, hasWritten, isLoaded]);

  // Restore drafts on mount/subject change
  useEffect(() => {
    const drafts = JSON.parse(localStorage.getItem('contestDrafts') || '{}');
    const key = activeSubject;
    if (drafts[key]) {
      const d = drafts[key];
      setContestName(d.contestName || '');
      setHasQuiz(d.hasQuiz !== undefined ? d.hasQuiz : true);
      setQuizCorrect(d.quizCorrect || '');
      setQuizTotal(d.quizTotal || '');
      setQuizWeight(d.quizWeight || '40');
      setHasCoding(d.hasCoding !== undefined ? d.hasCoding : true);
      setCodingCorrect(d.codingCorrect || '');
      setCodingTotal(d.codingTotal || '');
      setCodingWeight(d.codingWeight || '60');
      setHasWritten(d.hasWritten || false);
      setWrittenCorrect(d.writtenCorrect || '');
      setWrittenTotal(d.writtenTotal || '');
      setWrittenWeight(d.writtenWeight || '30');
    }
    setIsLoaded(true);
  }, [activeSubject]);

  // Save drafts whenever input values change
  useEffect(() => {
    if (!isLoaded) return;

    const drafts = JSON.parse(localStorage.getItem('contestDrafts') || '{}');
    const key = activeSubject;
    drafts[key] = {
      contestName,
      hasQuiz, quizCorrect, quizTotal, quizWeight,
      hasCoding, codingCorrect, codingTotal, codingWeight,
      hasWritten, writtenCorrect, writtenTotal, writtenWeight
    };
    localStorage.setItem('contestDrafts', JSON.stringify(drafts));
  }, [contestName, hasQuiz, quizCorrect, quizTotal, quizWeight, hasCoding, codingCorrect, codingTotal, codingWeight, hasWritten, writtenCorrect, writtenTotal, writtenWeight, activeSubject, isLoaded]);

  const calculateMarks = (components, personPrefix = '') => {
    let totalScore = 0;
    let totalWeight = 0;

    components.forEach(({ correct, total, weight, enabled }) => {
      if (!enabled) return;
      const c = parseInt(correct) || 0;
      const t = parseInt(total) || 1;
      const w = parseFloat(weight) || 0;
      totalScore += (c / t) * w;
      totalWeight += w;
    });

    // Get subject weightage for contests
    const { weights, counts } = getSubjectWeights(activeSubject);
    const contestTotalWeightage = (weights.contest || 0) * 100;
    const marksPerContest = contestTotalWeightage / (counts.contest || 1);

    // Calculate actual marks based on performance ratio and allocated marks
    const ratio = totalWeight > 0 ? (totalScore / totalWeight) : 0;
    const actualMarks = ratio * marksPerContest;

    return {
      marks: Number(actualMarks.toFixed(2)),
      maxMarks: Number(marksPerContest.toFixed(2))
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contestName.trim()) return;

    // At least one component must be enabled
    if (!hasQuiz && !hasCoding && !hasWritten) {
      alert('Please enable at least one component (Quiz, Coding, or Written)');
      return;
    }

    // Validate enabled components have totals
    if (hasQuiz && !quizTotal) return;
    if (hasCoding && !codingTotal) return;
    if (hasWritten && !writtenTotal) return;

    const count = tasks.length + 1;
    const personComponents = [
      { correct: quizCorrect, total: quizTotal, weight: quizWeight, enabled: hasQuiz },
      { correct: codingCorrect, total: codingTotal, weight: codingWeight, enabled: hasCoding },
      { correct: writtenCorrect, total: writtenTotal, weight: writtenWeight, enabled: hasWritten }
    ];

    const dhruvComponents = [
      { correct: dhruvQuizCorrect, total: quizTotal, weight: quizWeight, enabled: hasQuiz },
      { correct: dhruvCodingCorrect, total: codingTotal, weight: codingWeight, enabled: hasCoding },
      { correct: dhruvWrittenCorrect, total: writtenTotal, weight: writtenWeight, enabled: hasWritten }
    ];

    const { marks, maxMarks } = calculateMarks(personComponents);
    const { marks: dhruvMarks } = calculateMarks(dhruvComponents);

    const data = {
      name: contestName,
      number: count,
      date: contestDate,
      hasQuiz,
      hasCoding,
      hasWritten,
      marks,
      dhruvMarks,
      maxMarks
    };

    if (hasQuiz) {
      data.quizCorrect = parseInt(quizCorrect) || 0;
      data.dhruvQuizCorrect = parseInt(dhruvQuizCorrect) || 0;
      data.quizTotal = parseInt(quizTotal);
      data.quizWeight = parseFloat(quizWeight) || 0;
    }

    if (hasCoding) {
      data.codingCorrect = parseInt(codingCorrect) || 0;
      data.dhruvCodingCorrect = parseInt(dhruvCodingCorrect) || 0;
      data.codingTotal = parseInt(codingTotal);
      data.codingWeight = parseFloat(codingWeight) || 0;
    }

    if (hasWritten) {
      data.writtenCorrect = parseInt(writtenCorrect) || 0;
      data.dhruvWrittenCorrect = parseInt(dhruvWrittenCorrect) || 0;
      data.writtenTotal = parseInt(writtenTotal);
      data.writtenWeight = parseFloat(writtenWeight) || 0;
    }

    onAdd(data);

    // Clear form
    setContestName('');
    setQuizCorrect('');
    setDhruvQuizCorrect('');
    setQuizTotal('');
    setCodingCorrect('');
    setDhruvCodingCorrect('');
    setCodingTotal('');
    setWrittenCorrect('');
    setDhruvWrittenCorrect('');
    setWrittenTotal('');
  };

  return (
    <section className="task-section contest-section glass">
      <div className="section-header">
        <div className="section-title-group">
          <h3>Coding Contests</h3>
          <p className="section-subtitle">{totalCount} total contests</p>
        </div>
        <div className="progress-group">
          <div className="progress-card marks-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' }}>
            <div className="card-top-label">TOTAL MARKS</div>
            <div className="progress-circle-container">
              <Trophy size={32} style={{ color: '#10b981' }} />
            </div>
            <div className="progress-info">
              <span className="progress-percent">{totalMarks}/{maxMarks}</span>
              <span className="progress-count">{maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0}% Score</span>
            </div>
          </div>
        </div>
      </div>

      <form className="contest-input-form" onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        {/* Contest Name */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
          <input
            placeholder="Contest name"
            value={contestName}
            onChange={e => setContestName(e.target.value)}
            style={{ flex: 1, maxWidth: '400px' }}
          />
          <input
            type="date"
            value={contestDate}
            onChange={e => setContestDate(e.target.value)}
            style={{ width: '160px' }}
          />
        </div>

        {/* Components Row */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {/* Quiz Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: hasQuiz ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasQuiz ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 600, color: hasQuiz ? '#a78bfa' : 'inherit' }}>
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={e => setHasQuiz(e.target.checked)}
              />
              Quiz
            </label>
            {hasQuiz && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.65em', color: '#8b5cf6', fontWeight: 800 }}>U</span>
                    <input
                      type="number"
                      placeholder="U"
                      value={quizCorrect}
                      onChange={e => setQuizCorrect(e.target.value)}
                      style={{ width: '55px', padding: '6px' }}
                      min="0"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.65em', color: '#f59e0b', fontWeight: 800 }}>D</span>
                    <input
                      type="number"
                      placeholder="D"
                      value={dhruvQuizCorrect}
                      onChange={e => setDhruvQuizCorrect(e.target.value)}
                      style={{ width: '55px', padding: '6px', borderColor: '#fcd34d' }}
                      min="0"
                    />
                  </div>
                  <span style={{ opacity: 0.5, fontWeight: 500 }}>/</span>
                  <input
                    type="number"
                    placeholder="Total"
                    value={quizTotal}
                    onChange={e => setQuizTotal(e.target.value)}
                    style={{ width: '60px', padding: '6px' }}
                    min="1"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                    <input
                      type="number"
                      placeholder="40"
                      value={quizWeight}
                      onChange={e => setQuizWeight(e.target.value)}
                      style={{ width: '45px', padding: '6px' }}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span style={{ opacity: 0.7, fontSize: '0.7em' }}>%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coding Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: hasCoding ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasCoding ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 600, color: hasCoding ? '#60a5fa' : 'inherit' }}>
              <input
                type="checkbox"
                checked={hasCoding}
                onChange={e => setHasCoding(e.target.checked)}
              />
              Coding
            </label>
            {hasCoding && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.65em', color: '#60a5fa', fontWeight: 800 }}>U</span>
                    <input
                      type="number"
                      placeholder="U"
                      value={codingCorrect}
                      onChange={e => setCodingCorrect(e.target.value)}
                      style={{ width: '55px', padding: '6px' }}
                      min="0"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.65em', color: '#f59e0b', fontWeight: 800 }}>D</span>
                    <input
                      type="number"
                      placeholder="D"
                      value={dhruvCodingCorrect}
                      onChange={e => setDhruvCodingCorrect(e.target.value)}
                      style={{ width: '55px', padding: '6px', borderColor: '#fcd34d' }}
                      min="0"
                    />
                  </div>
                  <span style={{ opacity: 0.5, fontWeight: 500 }}>/</span>
                  <input
                    type="number"
                    placeholder="Total"
                    value={codingTotal}
                    onChange={e => setCodingTotal(e.target.value)}
                    style={{ width: '60px', padding: '6px' }}
                    min="1"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                    <input
                      type="number"
                      placeholder="60"
                      value={codingWeight}
                      onChange={e => setCodingWeight(e.target.value)}
                      style={{ width: '45px', padding: '6px' }}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span style={{ opacity: 0.7, fontSize: '0.7em' }}>%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Written Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: hasWritten ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasWritten ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 600, color: hasWritten ? '#34d399' : 'inherit' }}>
              <input
                type="checkbox"
                checked={hasWritten}
                onChange={e => setHasWritten(e.target.checked)}
              />
              Written
            </label>
            {hasWritten && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.65em', color: '#10b981', fontWeight: 800 }}>U</span>
                    <input
                      type="number"
                      placeholder="U"
                      value={writtenCorrect}
                      onChange={e => setWrittenCorrect(e.target.value)}
                      style={{ width: '55px', padding: '6px' }}
                      min="0"
                    />
                  </div>
                  <span style={{ opacity: 0.5, fontWeight: 500 }}>/</span>
                  <input
                    type="number"
                    placeholder="Total"
                    value={writtenTotal}
                    onChange={e => setWrittenTotal(e.target.value)}
                    style={{ width: '70px', padding: '6px' }}
                    min="1"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                    <input
                      type="number"
                      placeholder="30"
                      value={writtenWeight}
                      onChange={e => setWrittenWeight(e.target.value)}
                      style={{ width: '55px', padding: '6px' }}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Button */}
        <button type="submit" className="add-btn">
          <Plus size={18} />
          <span>Add Contest</span>
        </button>
      </form>

      <div className="task-list" style={{ overflowX: 'auto' }}>
        <div className="task-list-header">
          <span className="col-number">No.</span>
          <span className="col-name">Contest Name</span>
          <span className="col-quiz" style={{ flex: '0 0 100px', textAlign: 'center' }}>Quiz</span>
          <span className="col-coding" style={{ flex: '0 0 100px', textAlign: 'center' }}>Coding</span>
          <span className="col-written" style={{ flex: '0 0 100px', textAlign: 'center' }}>Written</span>
          <span className="col-marks" style={{ flex: '0 0 80px', textAlign: 'center', fontWeight: 700 }}>You</span>
          <span className="col-marks" style={{ flex: '0 0 80px', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>Dhruv</span>
          <span className="col-actions">Actions</span>
        </div>
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''}`}>
            <div className="col-number">
              <span className="task-number">#{task.number}</span>
            </div>
            <div className="col-name">
              <span className={`task-name ${task.important ? 'important' : ''}`}>{task.name}</span>
            </div>
            <div className="col-quiz" style={{ flex: '0 0 100px', textAlign: 'center', fontSize: '0.8em' }}>
              {task.hasQuiz ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ opacity: 0.8 }} title={`Weight: ${task.quizWeight}%`}>
                    U: {task.quizCorrect}/{task.quizTotal}
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}> ({Math.round((task.quizCorrect / task.quizTotal) * 100)}%)</span>
                  </span>
                  <span style={{ opacity: 0.8, color: '#f59e0b' }}>
                    D: {task.dhruvQuizCorrect ?? '-'}/{task.quizTotal}
                    {task.dhruvQuizCorrect !== undefined && <span style={{ fontSize: '0.8em', opacity: 0.6 }}> ({Math.round((task.dhruvQuizCorrect / task.quizTotal) * 100)}%)</span>}
                  </span>
                </div>
              ) : <span style={{ opacity: 0.4 }}>-</span>}
            </div>
            <div className="col-coding" style={{ flex: '0 0 100px', textAlign: 'center', fontSize: '0.8em' }}>
              {task.hasCoding ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ opacity: 0.8 }} title={`Weight: ${task.codingWeight}%`}>
                    U: {task.codingCorrect}/{task.codingTotal}
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}> ({Math.round((task.codingCorrect / task.codingTotal) * 100)}%)</span>
                  </span>
                  <span style={{ opacity: 0.8, color: '#f59e0b' }}>
                    D: {task.dhruvCodingCorrect ?? '-'}/{task.codingTotal}
                    {task.dhruvCodingCorrect !== undefined && <span style={{ fontSize: '0.8em', opacity: 0.6 }}> ({Math.round((task.dhruvCodingCorrect / task.codingTotal) * 100)}%)</span>}
                  </span>
                </div>
              ) : <span style={{ opacity: 0.4 }}>-</span>}
            </div>
            <div className="col-written" style={{ flex: '0 0 100px', textAlign: 'center', fontSize: '0.8em' }}>
              {task.hasWritten ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ opacity: 0.8 }} title={`Weight: ${task.writtenWeight}%`}>
                    U: {task.writtenCorrect}/{task.writtenTotal}
                    <span style={{ fontSize: '0.8em', opacity: 0.6 }}> ({Math.round((task.writtenCorrect / task.writtenTotal) * 100)}%)</span>
                  </span>
                  <span style={{ opacity: 0.8, color: '#f59e0b' }}>
                    D: {task.dhruvWrittenCorrect ?? '-'}/{task.writtenTotal}
                    {task.dhruvWrittenCorrect !== undefined && <span style={{ fontSize: '0.8em', opacity: 0.6 }}> ({Math.round((task.dhruvWrittenCorrect / task.writtenTotal) * 100)}%)</span>}
                  </span>
                </div>
              ) : <span style={{ opacity: 0.4 }}>-</span>}
            </div>
            <div className="col-marks" style={{ flex: '0 0 80px', textAlign: 'center', fontWeight: 700, fontSize: '0.9em' }}>
              <span style={{ color: '#10b981' }}>{task.marks}/{task.maxMarks}</span>
            </div>
            <div className="col-marks" style={{ flex: '0 0 80px', textAlign: 'center', fontWeight: 700, fontSize: '0.9em' }}>
              <span style={{ color: '#f59e0b' }}>{task.dhruvMarks ?? 0}/{task.maxMarks}</span>
            </div>
            <div className="col-actions">
              <div className="task-actions">
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
        ))}
      </div>
    </section>
  );
}

function ExamSection({ title, type, activeSubject, tasks, onAdd, onUpdate, onDelete, onEdit }) {
  const [examName, setExamName] = useState('');

  // Quiz fields
  const [hasQuiz, setHasQuiz] = useState(true);
  const [quizCorrect, setQuizCorrect] = useState('');
  const [dhruvQuizCorrect, setDhruvQuizCorrect] = useState('');
  const [quizTotal, setQuizTotal] = useState('');
  const [quizWeight, setQuizWeight] = useState('40');

  // Coding fields
  const [hasCoding, setHasCoding] = useState(true);
  const [codingCorrect, setCodingCorrect] = useState('');
  const [dhruvCodingCorrect, setDhruvCodingCorrect] = useState('');
  const [codingTotal, setCodingTotal] = useState('');
  const [codingWeight, setCodingWeight] = useState('60');

  // Written fields
  const [hasWritten, setHasWritten] = useState(false);
  const [writtenCorrect, setWrittenCorrect] = useState('');
  const [dhruvWrittenCorrect, setDhruvWrittenCorrect] = useState('');
  const [writtenTotal, setWrittenTotal] = useState('');
  const [writtenWeight, setWrittenWeight] = useState('30');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);

  const [isLoaded, setIsLoaded] = useState(false);

  const totalCount = tasks.length;

  // Calculate total marks for exams
  const totalMarks = tasks.reduce((acc, t) => acc + (t.marks || 0), 0);
  const maxMarks = tasks.reduce((acc, t) => acc + (t.maxMarks || 0), 0);

  // Auto-adjust weightages when checkboxes change
  useEffect(() => {
    if (!isLoaded) return;

    const activeCount = (hasQuiz ? 1 : 0) + (hasCoding ? 1 : 0) + (hasWritten ? 1 : 0);

    if (activeCount === 2 && hasQuiz && hasCoding && !hasWritten) {
      setQuizWeight('40');
      setCodingWeight('60');
    } else if (activeCount === 3) {
      setQuizWeight('30');
      setCodingWeight('40');
      setWrittenWeight('30');
    } else if (activeCount === 2 && hasQuiz && hasWritten && !hasCoding) {
      setQuizWeight('40');
      setWrittenWeight('60');
    } else if (activeCount === 2 && hasCoding && hasWritten && !hasQuiz) {
      setCodingWeight('40');
      setWrittenWeight('60');
    } else if (activeCount === 1) {
      if (hasQuiz) setQuizWeight('100');
      if (hasCoding) setCodingWeight('100');
      if (hasWritten) setWrittenWeight('100');
    }
  }, [hasQuiz, hasCoding, hasWritten, isLoaded]);

  // Restore drafts on mount/subject change
  useEffect(() => {
    const drafts = JSON.parse(localStorage.getItem(`${type}Drafts`) || '{}');
    const key = activeSubject;
    if (drafts[key]) {
      const d = drafts[key];
      setExamName(d.examName || '');
      setHasQuiz(d.hasQuiz !== undefined ? d.hasQuiz : true);
      setQuizCorrect(d.quizCorrect || '');
      setQuizTotal(d.quizTotal || '');
      setQuizWeight(d.quizWeight || '40');
      setHasCoding(d.hasCoding !== undefined ? d.hasCoding : true);
      setCodingCorrect(d.codingCorrect || '');
      setCodingTotal(d.codingTotal || '');
      setCodingWeight(d.codingWeight || '60');
      setHasWritten(d.hasWritten || false);
      setWrittenCorrect(d.writtenCorrect || '');
      setWrittenTotal(d.writtenTotal || '');
      setWrittenWeight(d.writtenWeight || '30');
    }
    setIsLoaded(true);
  }, [activeSubject, type]);

  // Save drafts whenever input values change
  useEffect(() => {
    if (!isLoaded) return;

    const drafts = JSON.parse(localStorage.getItem(`${type}Drafts`) || '{}');
    const key = activeSubject;
    drafts[key] = {
      examName,
      hasQuiz, quizCorrect, quizTotal, quizWeight,
      hasCoding, codingCorrect, codingTotal, codingWeight,
      hasWritten, writtenCorrect, writtenTotal, writtenWeight
    };
    localStorage.setItem(`${type}Drafts`, JSON.stringify(drafts));
  }, [examName, hasQuiz, quizCorrect, quizTotal, quizWeight, hasCoding, codingCorrect, codingTotal, codingWeight, hasWritten, writtenCorrect, writtenTotal, writtenWeight, activeSubject, type, isLoaded]);

  const calculateMarks = (components) => {
    let totalScore = 0;
    let totalWeight = 0;

    components.forEach(({ correct, total, weight, enabled }) => {
      if (!enabled) return;
      const c = parseInt(correct) || 0;
      const t = parseInt(total) || 1;
      const w = parseFloat(weight) || 0;
      totalScore += (c / t) * w;
      totalWeight += w;
    });

    // Get subject weightage for this exam type
    const { weights, counts } = getSubjectWeights(activeSubject);
    const examTotalWeightage = (weights[type] || 0) * 100;
    const marksPerExam = examTotalWeightage / (counts[type] || 1);

    // Calculate actual marks based on performance ratio and allocated marks
    const ratio = totalWeight > 0 ? (totalScore / totalWeight) : 0;
    const actualMarks = ratio * marksPerExam;

    return {
      marks: Number(actualMarks.toFixed(2)),
      maxMarks: Number(marksPerExam.toFixed(2))
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!examName.trim()) return;

    // At least one component must be enabled
    if (!hasQuiz && !hasCoding && !hasWritten) {
      alert('Please enable at least one component (Quiz, Coding, or Written)');
      return;
    }

    // Validate enabled components have totals
    if (hasQuiz && !quizTotal) return;
    if (hasCoding && !codingTotal) return;
    if (hasWritten && !writtenTotal) return;

    const count = tasks.length + 1;
    const personComponents = [
      { correct: quizCorrect, total: quizTotal, weight: quizWeight, enabled: hasQuiz },
      { correct: codingCorrect, total: codingTotal, weight: codingWeight, enabled: hasCoding },
      { correct: writtenCorrect, total: writtenTotal, weight: writtenWeight, enabled: hasWritten }
    ];

    const dhruvComponents = [
      { correct: dhruvQuizCorrect, total: quizTotal, weight: quizWeight, enabled: hasQuiz },
      { correct: dhruvCodingCorrect, total: codingTotal, weight: codingWeight, enabled: hasCoding },
      { correct: dhruvWrittenCorrect, total: writtenTotal, weight: writtenWeight, enabled: hasWritten }
    ];

    const { marks, maxMarks } = calculateMarks(personComponents);
    const { marks: dhruvMarks } = calculateMarks(dhruvComponents);

    const data = {
      name: examName,
      number: count,
      date: examDate,
      hasQuiz,
      hasCoding,
      hasWritten,
      marks,
      dhruvMarks,
      maxMarks
    };

    if (hasQuiz) {
      data.quizCorrect = parseInt(quizCorrect) || 0;
      data.dhruvQuizCorrect = parseInt(dhruvQuizCorrect) || 0;
      data.quizTotal = parseInt(quizTotal);
      data.quizWeight = parseFloat(quizWeight) || 0;
    }

    if (hasCoding) {
      data.codingCorrect = parseInt(codingCorrect) || 0;
      data.dhruvCodingCorrect = parseInt(dhruvCodingCorrect) || 0;
      data.codingTotal = parseInt(codingTotal);
      data.codingWeight = parseFloat(codingWeight) || 0;
    }

    if (hasWritten) {
      data.writtenCorrect = parseInt(writtenCorrect) || 0;
      data.dhruvWrittenCorrect = parseInt(dhruvWrittenCorrect) || 0;
      data.writtenTotal = parseInt(writtenTotal);
      data.writtenWeight = parseFloat(writtenWeight) || 0;
    }

    onAdd(data);

    // Clear form
    setExamName('');
    setQuizCorrect('');
    setDhruvQuizCorrect('');
    setQuizTotal('');
    setCodingCorrect('');
    setDhruvCodingCorrect('');
    setCodingTotal('');
    setWrittenCorrect('');
    setDhruvWrittenCorrect('');
    setWrittenTotal('');
  };

  return (
    <section className={`task-section ${type}-section glass`}>
      <div className="section-header">
        <div className="section-title-group">
          <h3>{title}</h3>
          <p className="section-subtitle">{totalCount} total exams</p>
        </div>
        <div className="progress-group">
          <div className="progress-card marks-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' }}>
            <div className="card-top-label">TOTAL MARKS</div>
            <div className="progress-circle-container">
              <Trophy size={32} style={{ color: '#10b981' }} />
            </div>
            <div className="progress-info">
              <span className="progress-percent">{totalMarks}/{maxMarks}</span>
              <span className="progress-count">{maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0}% Score</span>
            </div>
          </div>
        </div>
      </div>

      <form className="contest-input-form" onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        {/* Exam Name */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
          <input
            placeholder={`${title} name (e.g., ${type === 'midSem' ? 'Mid Term 2024' : 'Finals 2024'})`}
            value={examName}
            onChange={e => setExamName(e.target.value)}
            style={{ flex: 1, maxWidth: '400px' }}
          />
          <input
            type="date"
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            style={{ width: '160px' }}
          />
        </div>

        {/* Components Row */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {/* Quiz Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: hasQuiz ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasQuiz ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 600, color: hasQuiz ? '#a78bfa' : 'inherit' }}>
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={e => setHasQuiz(e.target.checked)}
              />
              Quiz
            </label>
            {hasQuiz && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Correct"
                  value={quizCorrect}
                  onChange={e => setQuizCorrect(e.target.value)}
                  style={{ width: '70px', padding: '6px' }}
                  min="0"
                />
                <span style={{ opacity: 0.5, fontWeight: 500 }}>/</span>
                <input
                  type="number"
                  placeholder="Total"
                  value={quizTotal}
                  onChange={e => setQuizTotal(e.target.value)}
                  style={{ width: '70px', padding: '6px' }}
                  min="1"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                  <input
                    type="number"
                    placeholder="40"
                    value={quizWeight}
                    onChange={e => setQuizWeight(e.target.value)}
                    style={{ width: '55px', padding: '6px' }}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                </div>
              </div>
            )}
          </div>

          {/* Coding Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: hasCoding ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasCoding ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 600, color: hasCoding ? '#60a5fa' : 'inherit' }}>
              <input
                type="checkbox"
                checked={hasCoding}
                onChange={e => setHasCoding(e.target.checked)}
              />
              Coding
            </label>
            {hasCoding && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Correct"
                  value={codingCorrect}
                  onChange={e => setCodingCorrect(e.target.value)}
                  style={{ width: '70px', padding: '6px' }}
                  min="0"
                />
                <span style={{ opacity: 0.5, fontWeight: 500 }}>/</span>
                <input
                  type="number"
                  placeholder="Total"
                  value={codingTotal}
                  onChange={e => setCodingTotal(e.target.value)}
                  style={{ width: '70px', padding: '6px' }}
                  min="1"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                  <input
                    type="number"
                    placeholder="60"
                    value={codingWeight}
                    onChange={e => setCodingWeight(e.target.value)}
                    style={{ width: '55px', padding: '6px' }}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                </div>
              </div>
            )}
          </div>

          {/* Written Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: hasWritten ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasWritten ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)', minWidth: '200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 600, color: hasWritten ? '#34d399' : 'inherit' }}>
              <input
                type="checkbox"
                checked={hasWritten}
                onChange={e => setHasWritten(e.target.checked)}
              />
              Written
            </label>
            {hasWritten && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Correct"
                  value={writtenCorrect}
                  onChange={e => setWrittenCorrect(e.target.value)}
                  style={{ width: '70px', padding: '6px' }}
                  min="0"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65em', color: '#f59e0b', fontWeight: 800 }}>D</span>
                  <input
                    type="number"
                    placeholder="D"
                    value={dhruvWrittenCorrect}
                    onChange={e => setDhruvWrittenCorrect(e.target.value)}
                    style={{ width: '55px', padding: '6px', borderColor: '#fcd34d' }}
                    min="0"
                  />
                </div>
                <span style={{ opacity: 0.5, fontWeight: 500 }}>/</span>
                <input
                  type="number"
                  placeholder="Total"
                  value={writtenTotal}
                  onChange={e => setWrittenTotal(e.target.value)}
                  style={{ width: '60px', padding: '6px' }}
                  min="1"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                  <input
                    type="number"
                    placeholder="30"
                    value={writtenWeight}
                    onChange={e => setWrittenWeight(e.target.value)}
                    style={{ width: '55px', padding: '6px' }}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Button */}
        <button type="submit" className="add-btn">
          <Plus size={18} />
          <span>Add Exam</span>
        </button>
      </form>

      <div className="task-list" style={{ overflowX: 'auto' }}>
        <div className="task-list-header">
          <span className="col-number">No.</span>
          <span className="col-name">Exam Name</span>
          <span className="col-quiz" style={{ flex: '0 0 100px', textAlign: 'center' }}>Quiz</span>
          <span className="col-coding" style={{ flex: '0 0 100px', textAlign: 'center' }}>Coding</span>
          <span className="col-written" style={{ flex: '0 0 100px', textAlign: 'center' }}>Written</span>
          <span className="col-marks" style={{ flex: '0 0 100px', textAlign: 'center', fontWeight: 700 }}>Marks</span>
          <span className="col-actions">Actions</span>
        </div>
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''}`}>
            <div className="col-number">
              <span className="task-number">#{task.number}</span>
            </div>
            <div className="col-name">
              <span className={`task-name ${task.important ? 'important' : ''}`}>{task.name}</span>
            </div>
            <div className="col-quiz" style={{ flex: '0 0 100px', textAlign: 'center', fontSize: '0.9em' }}>
              {task.hasQuiz ? (
                <span style={{ opacity: 0.8 }} title={`Weight: ${task.quizWeight}%`}>
                  {task.quizCorrect}/{task.quizTotal}
                  <span style={{ fontSize: '0.75em', opacity: 0.6 }}> ({Math.round((task.quizCorrect / task.quizTotal) * 100)}%)</span>
                </span>
              ) : <span style={{ opacity: 0.4 }}>-</span>}
            </div>
            <div className="col-coding" style={{ flex: '0 0 100px', textAlign: 'center', fontSize: '0.9em' }}>
              {task.hasCoding ? (
                <span style={{ opacity: 0.8 }} title={`Weight: ${task.codingWeight}%`}>
                  {task.codingCorrect}/{task.codingTotal}
                  <span style={{ fontSize: '0.75em', opacity: 0.6 }}> ({Math.round((task.codingCorrect / task.codingTotal) * 100)}%)</span>
                </span>
              ) : <span style={{ opacity: 0.4 }}>-</span>}
            </div>
            <div className="col-written" style={{ flex: '0 0 100px', textAlign: 'center', fontSize: '0.9em' }}>
              {task.hasWritten ? (
                <span style={{ opacity: 0.8 }} title={`Weight: ${task.writtenWeight}%`}>
                  {task.writtenCorrect}/{task.writtenTotal}
                  <span style={{ fontSize: '0.75em', opacity: 0.6 }}> ({Math.round((task.writtenCorrect / task.writtenTotal) * 100)}%)</span>
                </span>
              ) : <span style={{ opacity: 0.4 }}>-</span>}
            </div>
            <div className="col-marks" style={{ flex: '0 0 80px', textAlign: 'center', fontWeight: 700, fontSize: '0.9em' }}>
              <span style={{ color: '#10b981' }}>{task.marks}/{task.maxMarks}</span>
            </div>
            <div className="col-marks" style={{ flex: '0 0 80px', textAlign: 'center', fontWeight: 700, fontSize: '0.9em' }}>
              <span style={{ color: '#f59e0b' }}>{task.dhruvMarks ?? 0}/{task.maxMarks}</span>
            </div>
            <div className="col-actions">
              <div className="task-actions">
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
        ))}
      </div>
    </section>
  );
}

function EditModal({ task, activeSubject, allTasks, onClose, onSave }) {
  const [name, setName] = useState(task.name);
  const [number, setNumber] = useState(task.number);
  const [date, setDate] = useState(task.date || '');
  const [link, setLink] = useState(task.link || task.notes || '');
  const [notionLink, setNotionLink] = useState(task.notionUrl || '');
  const [impQs, setImpQs] = useState(task.impQs || '');

  // Contest/Exam fields
  const [hasQuiz, setHasQuiz] = useState(task.hasQuiz !== undefined ? task.hasQuiz : true);
  const [quizCorrect, setQuizCorrect] = useState(task.quizCorrect || 0);
  const [dhruvQuizCorrect, setDhruvQuizCorrect] = useState(task.dhruvQuizCorrect || 0);
  const [quizTotal, setQuizTotal] = useState(task.quizTotal || 0);
  const [quizWeight, setQuizWeight] = useState(task.quizWeight || 40);

  const [hasCoding, setHasCoding] = useState(task.hasCoding !== undefined ? task.hasCoding : true);
  const [codingCorrect, setCodingCorrect] = useState(task.codingCorrect || 0);
  const [dhruvCodingCorrect, setDhruvCodingCorrect] = useState(task.dhruvCodingCorrect || 0);
  const [codingTotal, setCodingTotal] = useState(task.codingTotal || 0);
  const [codingWeight, setCodingWeight] = useState(task.codingWeight || 60);

  const [hasWritten, setHasWritten] = useState(task.hasWritten || false);
  const [writtenCorrect, setWrittenCorrect] = useState(task.writtenCorrect || 0);
  const [dhruvWrittenCorrect, setDhruvWrittenCorrect] = useState(task.dhruvWrittenCorrect || 0);
  const [writtenTotal, setWrittenTotal] = useState(task.writtenTotal || 0);
  const [writtenWeight, setWrittenWeight] = useState(task.writtenWeight || 30);

  const calculateContestMarks = () => {
    let totalScore = 0;
    let dhruvTotalScore = 0;
    let totalWeight = 0;

    if (hasQuiz && quizTotal > 0) {
      const qC = parseInt(quizCorrect) || 0;
      const dqC = parseInt(dhruvQuizCorrect) || 0;
      const qT = parseInt(quizTotal) || 1;
      const qW = parseFloat(quizWeight) || 0;
      totalScore += (qC / qT) * qW;
      dhruvTotalScore += (dqC / qT) * qW;
      totalWeight += qW;
    }

    if (hasCoding && codingTotal > 0) {
      const cC = parseInt(codingCorrect) || 0;
      const dcC = parseInt(dhruvCodingCorrect) || 0;
      const cT = parseInt(codingTotal) || 1;
      const cW = parseFloat(codingWeight) || 0;
      totalScore += (cC / cT) * cW;
      dhruvTotalScore += (dcC / cT) * cW;
      totalWeight += cW;
    }

    if (hasWritten && writtenTotal > 0) {
      const wC = parseInt(writtenCorrect) || 0;
      const dwC = parseInt(dhruvWrittenCorrect) || 0;
      const wT = parseInt(writtenTotal) || 1;
      const wW = parseFloat(writtenWeight) || 0;
      totalScore += (wC / wT) * wW;
      dhruvTotalScore += (dwC / wT) * wW;
      totalWeight += wW;
    }

    // Get subject weightage
    const { weights, counts } = getSubjectWeights(activeSubject);
    let maxMarksForEntry = 0;

    if (task.type === 'contest') {
      const contestWeightage = (weights.contest || 0) * 100;
      maxMarksForEntry = contestWeightage / (counts.contest || 1);
    } else if (task.type === 'midSem' || task.type === 'endSem') {
      const examWeightage = (weights[task.type] || 0) * 100;
      maxMarksForEntry = examWeightage / (counts[task.type] || 1);
    }

    // Calculate actual marks based on performance ratio and allocated marks
    const ratio = totalWeight > 0 ? (totalScore / totalWeight) : 0;
    const dhruvRatio = totalWeight > 0 ? (dhruvTotalScore / totalWeight) : 0;
    const actualMarks = ratio * maxMarksForEntry;
    const actualDhruvMarks = dhruvRatio * maxMarksForEntry;

    return {
      marks: Number(actualMarks.toFixed(2)),
      dhruvMarks: Number(actualDhruvMarks.toFixed(2)),
      maxMarks: Number(maxMarksForEntry.toFixed(2))
    };
  };

  const handleSave = () => {
    const updates = {
      name,
      number,
      date,
      [task.type === 'lecture' ? 'notes' : 'link']: link,
      notionUrl: notionLink,
      impQs
    };

    if (task.type === 'contest' || task.type === 'midSem' || task.type === 'endSem') {
      const result = calculateContestMarks();

      updates.hasQuiz = hasQuiz;
      updates.hasCoding = hasCoding;
      updates.hasWritten = hasWritten;
      updates.marks = result.marks;
      updates.dhruvMarks = result.dhruvMarks;
      updates.maxMarks = result.maxMarks;

      if (hasQuiz) {
        updates.quizCorrect = parseInt(quizCorrect) || 0;
        updates.dhruvQuizCorrect = parseInt(dhruvQuizCorrect) || 0;
        updates.quizTotal = parseInt(quizTotal) || 1;
        updates.quizWeight = parseFloat(quizWeight) || 0;
      }

      if (hasCoding) {
        updates.codingCorrect = parseInt(codingCorrect) || 0;
        updates.dhruvCodingCorrect = parseInt(dhruvCodingCorrect) || 0;
        updates.codingTotal = parseInt(codingTotal) || 1;
        updates.codingWeight = parseFloat(codingWeight) || 0;
      }

      if (hasWritten) {
        updates.writtenCorrect = parseInt(writtenCorrect) || 0;
        updates.dhruvWrittenCorrect = parseInt(dhruvWrittenCorrect) || 0;
        updates.writtenTotal = parseInt(writtenTotal) || 1;
        updates.writtenWeight = parseFloat(writtenWeight) || 0;
      }
    }

    onSave(updates);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit {task.type}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-fields">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
          <label>Number</label>
          <input type="number" value={number} onChange={e => setNumber(e.target.value)} />
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          {task.type === 'lecture' && (
            <>
              <label>Lecture Link / Notes URL</label>
              <input value={link} onChange={e => setLink(e.target.value)} />
              <label>Notion Notes URL</label>
              <input value={notionLink} onChange={e => setNotionLink(e.target.value)} />
            </>
          )}
          {(task.type === 'assignment' || task.type === 'quiz') && (
            <>
              <label>Link</label>
              <input value={link} onChange={e => setLink(e.target.value)} />
            </>
          )}
          {task.type === 'quiz' && (
            <>
              <label>Imp Qs</label>
              <input value={impQs} onChange={e => setImpQs(e.target.value)} />
            </>
          )}
          {(task.type === 'contest' || task.type === 'midSem' || task.type === 'endSem') && (
            <>
              {/* Quiz Component */}
              <div style={{ marginBottom: '15px', padding: '12px', background: hasQuiz ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasQuiz ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasQuiz}
                    onChange={e => setHasQuiz(e.target.checked)}
                  />
                  <span>Quiz Component</span>
                </label>
                {hasQuiz && (
                  <>
                    <label style={{ fontSize: '0.9em', opacity: 0.8 }}>Questions (Correct / Total)</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', color: '#8b5cf6', fontWeight: 800 }}>YOU</span>
                        <input
                          type="number"
                          value={quizCorrect}
                          onChange={e => setQuizCorrect(e.target.value)}
                          placeholder="U"
                          min="0"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', color: '#f59e0b', fontWeight: 800 }}>DHRUV</span>
                        <input
                          type="number"
                          value={dhruvQuizCorrect}
                          onChange={e => setDhruvQuizCorrect(e.target.value)}
                          placeholder="D"
                          min="0"
                          style={{ width: '100%', borderColor: '#fcd34d' }}
                        />
                      </div>
                      <span style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}>/</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', opacity: 0.5, fontWeight: 800 }}>TOTAL</span>
                        <input
                          type="number"
                          value={quizTotal}
                          onChange={e => setQuizTotal(e.target.value)}
                          placeholder="T"
                          min="1"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <label style={{ fontSize: '0.9em', opacity: 0.8 }}>Weight (%)</label>
                    <input
                      type="number"
                      value={quizWeight}
                      onChange={e => setQuizWeight(e.target.value)}
                      placeholder="Weight %"
                      min="0"
                      max="100"
                      style={{ width: '100%' }}
                    />
                  </>
                )}
              </div>

              {/* Coding Component */}
              <div style={{ marginBottom: '15px', padding: '12px', background: hasCoding ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasCoding ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasCoding}
                    onChange={e => setHasCoding(e.target.checked)}
                  />
                  <span>Coding Component</span>
                </label>
                {hasCoding && (
                  <>
                    <label style={{ fontSize: '0.9em', opacity: 0.8 }}>Questions (Correct / Total)</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', color: '#10b981', fontWeight: 800 }}>YOU</span>
                        <input
                          type="number"
                          value={codingCorrect}
                          onChange={e => setCodingCorrect(e.target.value)}
                          placeholder="U"
                          min="0"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', color: '#f59e0b', fontWeight: 800 }}>DHRUV</span>
                        <input
                          type="number"
                          value={dhruvCodingCorrect}
                          onChange={e => setDhruvCodingCorrect(e.target.value)}
                          placeholder="D"
                          min="0"
                          style={{ width: '100%', borderColor: '#fcd34d' }}
                        />
                      </div>
                      <span style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}>/</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', opacity: 0.5, fontWeight: 800 }}>TOTAL</span>
                        <input
                          type="number"
                          value={codingTotal}
                          onChange={e => setCodingTotal(e.target.value)}
                          placeholder="T"
                          min="1"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <label style={{ fontSize: '0.9em', opacity: 0.8 }}>Weight (%)</label>
                    <input
                      type="number"
                      value={codingWeight}
                      onChange={e => setCodingWeight(e.target.value)}
                      placeholder="Weight %"
                      min="0"
                      max="100"
                      style={{ width: '100%' }}
                    />
                  </>
                )}
              </div>

              {/* Written Component */}
              <div style={{ marginBottom: '15px', padding: '12px', background: hasWritten ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: hasWritten ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasWritten}
                    onChange={e => setHasWritten(e.target.checked)}
                  />
                  <span>Written Component</span>
                </label>
                {hasWritten && (
                  <>
                    <label style={{ fontSize: '0.9em', opacity: 0.8 }}>Questions (Correct / Total)</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', color: '#ef4444', fontWeight: 800 }}>YOU</span>
                        <input
                          type="number"
                          value={writtenCorrect}
                          onChange={e => setWrittenCorrect(e.target.value)}
                          placeholder="U"
                          min="0"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', color: '#f59e0b', fontWeight: 800 }}>DHRUV</span>
                        <input
                          type="number"
                          value={dhruvWrittenCorrect}
                          onChange={e => setDhruvWrittenCorrect(e.target.value)}
                          placeholder="D"
                          min="0"
                          style={{ width: '100%', borderColor: '#fcd34d' }}
                        />
                      </div>
                      <span style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}>/</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65em', opacity: 0.5, fontWeight: 800 }}>TOTAL</span>
                        <input
                          type="number"
                          value={writtenTotal}
                          onChange={e => setWrittenTotal(e.target.value)}
                          placeholder="T"
                          min="1"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <label style={{ fontSize: '0.9em', opacity: 0.8 }}>Weight (%)</label>
                    <input
                      type="number"
                      value={writtenWeight}
                      onChange={e => setWrittenWeight(e.target.value)}
                      placeholder="Weight %"
                      min="0"
                      max="100"
                      style={{ width: '100%' }}
                    />
                  </>
                )}
              </div>
            </>
          )}

          {(task.type === 'contest' || task.type === 'midSem' || task.type === 'endSem') && (
            <div style={{
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <strong style={{ color: '#10b981' }}>
                  Your Marks: {calculateContestMarks().marks}/{calculateContestMarks().maxMarks}
                </strong>
                <strong style={{ color: '#f59e0b' }}>
                  Dhruv: {calculateContestMarks().dhruvMarks}/{calculateContestMarks().maxMarks}
                </strong>
              </div>
              <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '5px' }}>
                {hasQuiz && `Quiz: ${quizWeight}%`}
                {hasQuiz && hasCoding && ' | '}
                {hasCoding && `Coding: ${codingWeight}%`}
                {(hasQuiz || hasCoding) && hasWritten && ' | '}
                {hasWritten && `Written: ${writtenWeight}%`}
              </div>
            </div>
          )}
        </div>
        <div className="modal-buttons">
          <button className="save-btn" onClick={handleSave}>
            <Save size={18} />
            <span>Save Changes</span>
          </button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div >
    </div >
  );
}



const NotionLogo = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.217-.793c.28 0 .047-.28.047-.326L20.103.872c0-.093-.42-.14-.56-.14l-14.731.98c-1.167.093-1.68.42-2.194 1.166l-1.587 2.145c0 .047-.14.187.093.187.14 0 .374 0 .56-.14l2.775-1.074.047.234v13.61c0 .56-.327.933-1.074 1.353l-1.353.7c-.187.093-.233.28-.047.373l6.994 3.123c.28.14.467.047.467-.186V8.97l6.621 11.236c.233.373.513.56.98.513l4.195-.187c.233 0 .42-.14.42-.42V4.954c0-.56.327-.933 1.073-1.353l1.354-.7c.186-.093.233-.28.046-.373l-6.994-3.123c-.28-.14-.466-.047-.466.186v11.7l-6.621-11.236c-.234-.373-.514-.56-.98-.513l-4.196.187c-.233 0-.42.14-.42.42v15.201l.047-.234-2.775 1.073z" />
  </svg>
);

function ContestScheduleTable() {
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

function ActivityHeatmap({ tasks }) {
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
              transition: 'all 0.2s',
              cursor: 'pointer',
              position: 'relative'
            }}
            title={`${date}: ${count} activities`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
              e.currentTarget.style.zIndex = '10';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.zIndex = '1';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryView({ tasks, subjects, threshold, mode = 'overview', onUpdate }) {
  const [confirmTask, setConfirmTask] = useState(null);
  const getSubjectScore = (data, name, isDhruv = false) => {
    const { weights } = getSubjectWeights(name);

    // Attendance component
    const currentAtt = isDhruv
      ? (((data.class.dhruvAttendancePercent || 0) * 0.6) + ((data.lab.dhruvAttendancePercent || 0) * 0.4))
      : (((data.class.attendancePercent || 0) * 0.6) + ((data.lab.attendancePercent || 0) * 0.4));

    const attScore = (currentAtt / 100) * (weights.attendance || 0) * 100;

    const getCompScore = (key) => {
      const classData = data.class[key] || { percent: 0, totalMarks: 0, dhruvTotalMarks: 0 };
      const labData = data.lab[key] || { percent: 0, totalMarks: 0, dhruvTotalMarks: 0 };

      if (['contest', 'midSem', 'endSem'].includes(key)) {
        return isDhruv
          ? ((classData.dhruvTotalMarks || 0) + (labData.dhruvTotalMarks || 0))
          : ((classData.totalMarks || 0) + (labData.totalMarks || 0));
      }

      const avgPercent = ((classData.percent || 0) * 0.5 + (labData.percent || 0) * 0.5);
      // For now assignments are shared completion, but we could add dhruvPercent if needed
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

    return {
      finalScore: Number(finalScore.toFixed(2)),
      breakdown,
      weights
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

        let percent = 0;
        if (maxMarks > 0) percent = (totalMarks / maxMarks) * 100;
        else if (total > 0) percent = (done / total) * 100;

        return { total, done, percent, totalMarks, dhruvTotalMarks, maxMarks };
      };

      const lects = subjectTasks.filter(t => t.type === 'lecture');
      const attCount = lects.filter(t => t.present !== false).length;
      const friendMeta = tasks.find(t => t.type === 'friend_meta' && t.subjectName === s);
      const dhruvAttCount = friendMeta?.attendanceCount ?? attCount;

      const stats = {
        total: lects.length,
        attendanceCount: attCount,
        attendancePercent: lects.length > 0 ? (attCount / lects.length) * 100 : 0,
        dhruvAttendanceCount: dhruvAttCount,
        dhruvAttendancePercent: lects.length > 0 ? (dhruvAttCount / lects.length) * 100 : 0,
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
  }, [tasks, subjects]);

  const summaryData = useMemo(() => {
    let totalAttendanceWeighted = 0;
    let totalCompletionWeighted = 0;
    let count = 0;
    let grandTotalLectures = 0;
    let grandTotalAttended = 0;
    let grandTotalCompleted = 0;

    const items = Object.entries(subjectGroups).map(([name, data]) => {
      const attWeighted = ((data.class.attendancePercent || 0) * 0.6) + ((data.lab.attendancePercent || 0) * 0.4);
      const dhruvAttWeighted = ((data.class.dhruvAttendancePercent || 0) * 0.6) + ((data.lab.dhruvAttendancePercent || 0) * 0.4);
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
        breakdown: scoreData.breakdown,
        dhruvBreakdown: dhruvScoreData.breakdown,
        weights: scoreData.weights
      };
    });

    const totalProjectedScore = items.reduce((acc, curr) => acc + curr.score, 0);
    const totalDhruvScore = items.reduce((acc, curr) => acc + curr.dhruvScore, 0);
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
      maxPossibleScore
    };
  }, [subjectGroups]);

  const getCombinedSafeZone = (item, target = 75) => {
    const pC = item.class.attendanceCount;
    const tC = item.class.total;
    const pL = item.lab.attendanceCount;
    const tL = item.lab.total;
    const targetW = target / 100;
    const currentW = (item.class.attendancePercent * 0.6) + (item.lab.attendancePercent * 0.4);

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
      const targetC = (targetW - 0.4 * (pL / tL)) / 0.6;
      const targetL = (targetW - 0.6 * (pC / tC)) / 0.4;
      const needRatioC = 1 - targetC;
      const needRatioL = 1 - targetL;

      let msg = "";
      if (targetC > 1 && targetL > 1) {
        msg = "DANGER! Must attend BOTH Class & Lab";
      } else if (targetC > 1) {
        const needL = Math.ceil((targetL * tL - pL) / needRatioL);
        msg = `DANGER! Attend next ${needL} Labs (Cls alone not enough)`;
      } else if (targetL > 1) {
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
      Dhruv: Number(item.dhruvScore.toFixed(2)),
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
    <div className="summary-container unified-summary">
      {(mode === 'overview' || mode === 'detailed') && (
        <div className="overall-grid">
          <div className="overall-card attendance-card glass shadow-lg">
            <div className="overall-info">
              <PieChart size={40} className="text-primary" />
              <div>
                <h2>{format2(summaryData.overallAttendance)}%</h2>
                <p>Overall Attendance</p>
              </div>
            </div>
            <div className="overall-stats-pill">
              <span className="stats-label">Lectures Attended</span>
              <span className="stats-value">{summaryData.grandTotalAttended}/{summaryData.grandTotalLectures}</span>
            </div>
          </div>

          <div className="overall-card completion-card glass shadow-lg">
            <div className="overall-info">
              <CheckCircle2 size={40} className="text-success" />
              <div>
                <h2>{format2(summaryData.overallCompletion)}%</h2>
                <p>Overall Completion</p>
              </div>
            </div>
            <div className="overall-stats-pill">
              <span className="stats-label">Lectures Done</span>
              <span className="stats-value">{summaryData.grandTotalCompleted}/{summaryData.grandTotalLectures}</span>
            </div>
          </div>

          <div className="overall-card glass shadow-lg" style={{ borderLeft: '4px solid #f43f5e' }}>
            <div className="overall-info">
              <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '12px' }}>
                <Clock size={32} style={{ color: '#f43f5e' }} />
              </div>
              <div>
                <h2 style={{ color: '#f43f5e', fontSize: '2.2rem' }}>{summaryData.grandTotalPending}</h2>
                <p style={{ fontWeight: 700, color: '#9f1239' }}>Left Lectures</p>
              </div>
            </div>
            <div className="overall-stats-pill" style={{ background: 'rgba(244, 63, 94, 0.05)' }}>
              <span className="stats-label" style={{ color: '#be123c' }}>Total Pending Tasks</span>
              <span className="stats-value" style={{ color: '#f43f5e' }}>{summaryData.grandTotalPending} across all subjects</span>
            </div>
          </div>

          <div className="overall-card score-card glass shadow-lg">
            <div className="overall-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={40} className="text-warning" />
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '2.2rem' }}>{format2(summaryData.totalProjectedScore)}</h2>
                    <p>Your Marks</p>
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(245, 158, 11, 0.2)', paddingLeft: '24px' }}>
                    <h2 style={{ fontSize: '2.2rem', color: '#f59e0b' }}>{format2(summaryData.totalDhruvScore)}</h2>
                    <p>Dhruv's Marks</p>
                  </div>
                </div>
              </div>

              <div className="leader-pill" style={{
                background: summaryData.totalProjectedScore >= summaryData.totalDhruvScore ? '#ecfdf5' : '#fffbeb',
                color: summaryData.totalProjectedScore >= summaryData.totalDhruvScore ? '#059669' : '#d97706',
                padding: '8px 16px',
                borderRadius: '1000px',
                fontSize: '0.85rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'stretch',
                justifyContent: 'center',
                border: `1px solid ${summaryData.totalProjectedScore >= summaryData.totalDhruvScore ? '#d1fae5' : '#fef3c7'}`
              }}>
                <Trophy size={16} />
                <span>
                  {Math.abs(summaryData.totalProjectedScore - summaryData.totalDhruvScore) < 0.01
                    ? "It's a Tie!"
                    : summaryData.totalProjectedScore > summaryData.totalDhruvScore
                      ? `You are ahead by ${format2(summaryData.totalProjectedScore - summaryData.totalDhruvScore)}`
                      : `Dhruv is ahead by ${format2(summaryData.totalDhruvScore - summaryData.totalProjectedScore)}`
                  }
                </span>
              </div>
            </div>
            <div className="overall-stats-pill">
              <span className="stats-label">Max Possible: {summaryData.maxPossibleScore}</span>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                <span className="stats-value" style={{ fontSize: '1rem' }}>{summaryData.maxPossibleScore > 0 ? format2((summaryData.totalProjectedScore / summaryData.maxPossibleScore) * 100) : 0}%</span>
                <span style={{ opacity: 0.3 }}>|</span>
                <span className="stats-value" style={{ fontSize: '1rem', color: '#f59e0b' }}>{summaryData.maxPossibleScore > 0 ? format2((summaryData.totalDhruvScore / summaryData.maxPossibleScore) * 100) : 0}%</span>
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
                  <ReBar dataKey="Dhruv" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
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
                              {diff >= 0 ? 'You Lead by: ' : 'Dhruv Leads by: '}
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
        <div className="subject-grid">
          {summaryData.items.map(item => (
            <div key={item.name} className="subject-card glass">
              <div className="subject-card-header">
                <div className="subj-title-group">
                  <h3>{item.name}</h3>
                  <span className="lecture-count-pill">{item.class.total + item.lab.total} Total Lectures</span>
                </div>
                <div className="header-badges">
                  <div className={`leader-badge ${item.score >= item.dhruvScore ? 'me' : 'dhruv'}`} style={{
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: item.score >= item.dhruvScore ? '#f0fdf4' : '#fffbeb',
                    color: item.score >= item.dhruvScore ? '#166534' : '#92400e',
                    border: `1px solid ${item.score >= item.dhruvScore ? '#bbf7d0' : '#fde68a'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Star size={12} fill="currentColor" />
                    <span>{Math.abs(item.score - item.dhruvScore) < 0.01 ? "Tie" : item.score > item.dhruvScore ? "You Lead" : "Dhruv Leads"}</span>
                  </div>
                  {item.studyGap > 0 && (
                    <div className="gap-indicator danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{item.studyGap} Left ({item.classGap} Cls | {item.labGap} Lab)</span>
                    </div>
                  )}
                  <div className="score-badge" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
                    <Award size={14} />
                    <span style={{ color: '#92400e' }}>You: <strong>{format2(item.score)}</strong> | Dhruv: <strong style={{ color: '#d97706' }}>{format2(item.dhruvScore)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="dual-progress-section">
                <div className="metric-column">
                  <span className="metric-hdr">Attendance (60/40)</span>
                  <div className="detail-row">
                    <div className="detail-label">
                      <span>Class</span>
                      <span className="count-small">{item.class.attendanceCount}/{item.class.total} (U) | {item.class.dhruvAttendanceCount}/{item.class.total} (D)</span>
                    </div>
                    <div className="detail-bar-bg">
                      <div className="detail-bar class-bar" style={{ width: `${item.class.attendancePercent}%`, opacity: 0.6 }}></div>
                      <div className="detail-bar class-bar" style={{ width: `${item.class.dhruvAttendancePercent}%`, position: 'absolute', top: 0, height: '4px', background: '#f59e0b' }}></div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">
                      <span>Lab</span>
                      <span className="count-small">{item.lab.attendanceCount}/{item.lab.total} (U) | {item.lab.dhruvAttendanceCount}/{item.lab.total} (D)</span>
                    </div>
                    <div className="detail-bar-bg">
                      <div className="detail-bar lab-bar" style={{ width: `${item.lab.attendancePercent}%`, opacity: 0.6 }}></div>
                      <div className="detail-bar lab-bar" style={{ width: `${item.lab.dhruvAttendancePercent}%`, position: 'absolute', top: 0, height: '4px', background: '#f59e0b' }}></div>
                    </div>
                  </div>
                  <div className="total-badge att" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>You: {format2(item.attWeighted)}%</span>
                    <span>Dhruv: {format2(item.dhruvAttWeighted)}%</span>
                  </div>
                  {getCombinedSafeZone(item, threshold) && (
                    <div className={`safe-zone-mini ${getCombinedSafeZone(item, threshold).status}`} style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: getCombinedSafeZone(item, threshold).status === 'safe' ? '#f0fdf4' : getCombinedSafeZone(item, threshold).status === 'warning' ? '#fffbeb' : '#fef2f2',
                      color: getCombinedSafeZone(item, threshold).status === 'safe' ? '#166534' : getCombinedSafeZone(item, threshold).status === 'warning' ? '#92400e' : '#991b1b',
                      border: `1px solid ${getCombinedSafeZone(item, threshold).status === 'safe' ? '#bbf7d0' : getCombinedSafeZone(item, threshold).status === 'warning' ? '#fde68a' : '#fecaca'}`
                    }}>
                      <Zap size={14} />
                      <span>{getCombinedSafeZone(item, threshold).msg}</span>
                    </div>
                  )}
                </div>

                <div className="vertical-divider"></div>

                <div className="metric-column">
                  <span className="metric-hdr">Completion (50/50)</span>
                  <div className="detail-row">
                    <div className="detail-label">
                      <span>Class</span>
                      <span className="count-small">{item.class.completionCount}/{item.class.total}</span>
                    </div>
                    <div className="detail-bar-bg"><div className="detail-bar completion-bar" style={{ width: `${item.class.completionPercent}%` }}></div></div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">
                      <span>Lab</span>
                      <span className="count-small">{item.lab.completionCount}/{item.lab.total}</span>
                    </div>
                    <div className="detail-bar-bg"><div className="detail-bar completion-bar" style={{ width: `${item.lab.completionPercent}%` }}></div></div>
                  </div>
                  <div className="total-badge comp">Completed: {format2(item.compWeighted)}%</div>
                </div>
              </div>

              <div className="score-breakdown-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Attendance', key: 'attendance', color: '#8b5cf6', weightKey: 'attendance' },
                  { label: 'Assignments', key: 'assignment', color: '#6366f1', weightKey: 'assignment' },
                  { label: 'Projects', key: 'project', color: '#8b5cf6', weightKey: 'project' },
                  { label: 'Contests', key: 'contest', color: '#10b981', weightKey: 'contest' },
                  { label: 'Mid Sem', key: 'midSem', color: '#f59e0b', weightKey: 'midSem' },
                  { label: 'End Sem', key: 'endSem', color: '#3b82f6', weightKey: 'endSem' }
                ].map(comp => (
                  (item.weights[comp.weightKey] > 0 || comp.key === 'attendance') && (
                    <div key={comp.key} className="score-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="s-label">{comp.label}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>/{format2(item.weights[comp.weightKey] * 100)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                          <span style={{ color: comp.color }}>{format2(item.breakdown[comp.key])}</span>
                          <span style={{ color: '#f59e0b' }}>{format2(item.dhruvBreakdown[comp.key])}</span>
                        </div>
                        <div className="mini-score-bar" style={{ height: '8px', background: '#f1f5f9', position: 'relative' }}>
                          <div className="fill" style={{
                            width: `${(item.breakdown[comp.key] / (item.weights[comp.weightKey] * 100)) * 100}%`,
                            backgroundColor: comp.color,
                            height: '100%',
                            opacity: 0.7
                          }}></div>
                          <div className="fill" style={{
                            width: `${(item.dhruvBreakdown[comp.key] / (item.weights[comp.weightKey] * 100)) * 100}%`,
                            backgroundColor: '#f59e0b',
                            height: '3px',
                            position: 'absolute',
                            bottom: 0,
                            left: 0
                          }}></div>
                        </div>
                      </div>
                    </div>
                  )
                ))}
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
                {tasks.filter(t => t.type === 'lecture' && !t.completed).length} Total Pending
              </div>
            </div>
          </div>

          <div style={{ columns: '1', columnGap: '24px', maxWidth: '100%' }}>
            {/* Use a simple grid for responsiveness if columns doesn't work well or use media query logic in CSS, but inline style columns is decent for masonry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
              {subjects.map(subjectName => {
                const pendingTasks = tasks
                  .filter(t => t.subjectName === subjectName && t.type === 'lecture' && !t.completed)
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
                        // Lecture specific styling
                        const Icon = BookOpen;
                        const colorClass = '#3b82f6';
                        const bgClass = '#eff6ff';

                        return (
                          <div key={task.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.6)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.8)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                              e.currentTarget.style.background = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
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
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colorClass, textTransform: 'capitalize' }}>
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

function SafeZoneView({ tasks, subjects, threshold, setThreshold }) {
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
      const attCount = lects.filter(t => t.present !== false).length;

      const stats = {
        total: lects.length,
        attendanceCount: attCount,
        attendancePercent: lects.length > 0 ? (attCount / lects.length) * 100 : 0,
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

    if (req > 1) return { status: 'danger', msg: 'Unreachable', sub: 'Maximize Other' };
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
          <strong style={{ color: '#334155' }}> 60% Class / 40% Lab</strong> weighted split.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {Object.entries(subjectGroups).map(([name, item]) => {
          const weighted = (item.class.attendancePercent * 0.6 + item.lab.attendancePercent * 0.4).toFixed(1);
          const isSafe = parseFloat(weighted) >= target;

          // Analyze Components
          const classZone = calculateZone(item.class, 0.6, item.lab, 0.4, target);
          const labZone = calculateZone(item.lab, 0.4, item.class, 0.6, target);

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
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Class (60%)</span>
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Lab (40%)</span>
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

function ActivityView({ tasks, subjects }) {
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

function ScheduleView({ tasks }) {
  const now = new Date();

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
            const eventDate = new Date(event.date);
            const isPast = eventDate < now;
            const isNext = !isPast && (index === 0 || new Date(CONTEST_SCHEDULE[index - 1].date) < now);
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
                {isNext && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '0.6rem', padding: '4px 10px', fontWeight: 900, borderRadius: '0 0 0 12px' }}>NEXT UP</div>}
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

function AllLecturesView({ tasks, onUpdate, onDelete, onEdit }) {
  const [filterSubject, setFilterSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const allLectures = useMemo(() => {
    let filtered = tasks.filter(t => t.type === 'lecture');

    // Subject Filter
    if (filterSubject !== 'All') {
      filtered = filtered.filter(t => t.subjectName === filterSubject);
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
  }, [tasks, filterSubject, searchQuery]);

  const stats = useMemo(() => {
    const total = allLectures.length;
    if (total === 0) return { total: 0, attendance: 0, completion: 0 };

    const present = allLectures.filter(t => t.present !== false).length;
    const completed = allLectures.filter(t => t.completed).length;

    return {
      total,
      attendance: Math.round((present / total) * 100),
      completion: Math.round((completed / total) * 100)
    };
  }, [allLectures]);

  const uniqueSubjects = useMemo(() => {
    const subs = new Set(tasks.map(t => t.subjectName));
    return ['All', ...Array.from(subs).filter(Boolean).sort()];
  }, [tasks]);

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
        <div className="section-header" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div className="section-title-group" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Repository</h3>
            <p className="section-subtitle" style={{ fontSize: '0.9rem' }}>Searching {allLectures.length} files</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '10px 10px 10px 36px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#1e293b',
                  width: '240px',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                minWidth: '140px'
              }}
            >
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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
              <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''}`}>
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
                  <input
                    type="checkbox"
                    checked={task.present !== false}
                    onChange={e => onUpdate(task.id, { present: e.target.checked })}
                    title="Mark Attendance"
                  />
                  <span className="attendance-label" style={{ fontWeight: 600, fontSize: '0.85em', color: task.present !== false ? '#15803d' : '#ef4444' }}>
                    {task.present !== false ? 'Present' : 'Absent'}
                  </span>
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

function ExamCountdown({ now: externalNow }) {
  const [internalTime, setInternalTime] = useState(new Date());
  // Use external time if provided (for sync), otherwise internal time
  const now = externalNow || internalTime;

  const [nextEvent, setNextEvent] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, label: '', type: 'exam', expired: false });

  // Internal timer only runs if no external time is provided
  useEffect(() => {
    if (externalNow) return;
    const timer = setInterval(() => setInternalTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [externalNow]);

  useEffect(() => {
    const calculateTime = () => {
      // Use the unified 'now'
      // Helper to create date at 9 AM local time
      const getTargetAt9AM = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 9, 0, 0);
      };

      // Get next contest
      const upcomingContest = CONTEST_SCHEDULE
        .map(c => ({ ...c, dateObj: getTargetAt9AM(c.date) }))
        .filter(c => c.dateObj > now)
        .sort((a, b) => a.dateObj - b.dateObj)[0];

      const midDate = getTargetAt9AM(EXAM_DATES.midSem);
      const endDate = getTargetAt9AM(EXAM_DATES.endSem);

      let targetDate;
      let label;
      let type = 'exam';

      // Determine what's next
      if (upcomingContest && upcomingContest.dateObj < midDate) {
        targetDate = upcomingContest.dateObj;
        label = upcomingContest.name;
        type = 'contest';
      } else if (now < midDate) {
        targetDate = midDate;
        label = 'Mid Sem';
      } else {
        targetDate = endDate;
        label = 'End Sem';
      }

      const diff = targetDate - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, label, type, expired: true };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return { days, hours, minutes, seconds, label, type, expired: false };
    };

    setNextEvent(calculateTime());
  }, [now]); // Recalculate whenever 'now' changes

  if (nextEvent.expired) return null;

  return (
    <div className={`exam-countdown glass ${nextEvent.type}`}>
      <div className="countdown-icon-wrapper">
        {nextEvent.type === 'contest' ? <Zap size={16} className="text-warning pulse-icon" /> : <Clock size={16} className="text-secondary" />}
      </div>
      <div className="countdown-content">
        <div className="countdown-timer">
          {nextEvent.days > 0 && <span className="time-unit"><strong>{nextEvent.days}</strong>d</span>}
          <span className="time-unit"><strong>{String(nextEvent.hours).padStart(2, '0')}</strong>h</span>
          <span className="time-unit"><strong>{String(nextEvent.minutes).padStart(2, '0')}</strong>m</span>
          <span className="time-unit"><strong>{String(nextEvent.seconds).padStart(2, '0')}</strong>s</span>
        </div>
        <span className="count-label">until {nextEvent.label}</span>
      </div>
      {(nextEvent.days === 0 && nextEvent.hours < 12) && <span className="urgent-badge">URGENT</span>}
    </div>
  );
}

function SafeZoneCalculator({ tasks, threshold = 75 }) {
  const present = tasks.filter(t => t.present !== false).length;
  const total = tasks.length;
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
      message = "On the edge! Attend the next lecture.";
      status = "warning";
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default App;
