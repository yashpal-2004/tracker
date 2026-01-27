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
  Link2
} from 'lucide-react';

const DEFAULT_SUBJECTS = [
  "DM Class", "DM Lab", "DVA Class", "DVA Lab",
  "GenAI Class", "GenAI Lab", "SD Class", "SD Lab"
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeSubject, setActiveSubject] = useState(() => {
    const hash = window.location.hash.replace('#', '').replace(/%20/g, ' ');
    if (DEFAULT_SUBJECTS.includes(hash) || hash === 'Analytics' || hash === 'All Lectures') return hash;
    return localStorage.getItem('active_subject') || DEFAULT_SUBJECTS[0];
  });

  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Connecting...');

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
      if (DEFAULT_SUBJECTS.includes(hash) || hash === 'Analytics' || hash === 'All Lectures') setActiveSubject(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
      const res = await updateDoc(doc(db, 'tasks', id), updates);

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
            <h1>{activeSubject === 'Analytics' ? 'Overall Analytics' : activeSubject === 'All Lectures' ? 'Global Lecture View' : activeSubject}</h1>
            <div className={`sync-badge ${syncStatus.toLowerCase().includes('error') ? 'error' : ''} ${syncStatus.toLowerCase().includes('up to date') ? 'online' : ''}`}>
              {syncStatus.toLowerCase().includes('connecting') ? <Loader2 size={14} className="spin" /> :
                syncStatus.toLowerCase().includes('error') ? <AlertCircle size={14} /> :
                  syncStatus.toLowerCase().includes('offline') ? <CloudOff size={14} /> : <Cloud size={14} />}
              <span>{syncStatus}</span>
            </div>
          </div>
          <div className="stats">
            {loading ? <Loader2 size={16} className="spin" /> : (
              <>
                <CheckCircle2 size={16} />
                <span>{currentTasks.length} items</span>
              </>
            )}
          </div>
        </header>

        {activeSubject === 'Analytics' ? (
          <SummaryView tasks={tasks} subjects={DEFAULT_SUBJECTS} />
        ) : activeSubject === 'All Lectures' ? (
          <AllLecturesView
            tasks={tasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onEdit={setEditingTask}
          />
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
        <button
          className={`subject-btn summary-btn ${activeSubject === 'Analytics' ? 'active' : ''}`}
          onClick={() => onSelect('Analytics')}
        >
          <BarChart3 size={18} />
          <span>Analytics Dashboard</span>
          {activeSubject === 'Analytics' && <ChevronRight size={14} className="active-arrow" />}
        </button>
        <button
          className={`subject-btn summary-btn ${activeSubject === 'All Lectures' ? 'active' : ''}`}
          onClick={() => onSelect('All Lectures')}
        >
          <Layers size={18} />
          <span>All Lectures</span>
          {activeSubject === 'All Lectures' && <ChevronRight size={14} className="active-arrow" />}
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
      </div>
    </div>
  );
}

function TaskSection({ title, type, tasks, onAdd, onUpdate, onDelete, onEdit, activeSubject, friendMeta, onUpdateFriendMeta }) {
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
    const data = { name: val, number: count };
    if (type === 'lecture') {
      data.date = date;
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
        {type === 'lecture' && (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        )}
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
          {type === 'lecture' && <span className="col-date">Date</span>}
          {type === 'lecture' && <span className="col-attendance">Attendance</span>}
          <span className="col-completion">{type === 'lecture' ? 'Completed' : 'Status (You)'}</span>
          {type !== 'lecture' && <span className="col-completion" style={{ color: '#f59e0b' }}>Status (D)</span>}
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
            {type === 'lecture' && (
              <div className="col-date">
                {task.date && (
                  <span className="task-date">
                    <Calendar size={12} /> {formatDate(task.date)}
                  </span>
                )}
              </div>
            )}
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
            {type !== 'lecture' && (
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
        <div style={{ marginBottom: '15px' }}>
          <input
            placeholder="Contest name"
            value={contestName}
            onChange={e => setContestName(e.target.value)}
            style={{ width: '100%', maxWidth: '400px' }}
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
        <div style={{ marginBottom: '15px' }}>
          <input
            placeholder={`${title} name (e.g., ${type === 'midSem' ? 'Mid Term 2024' : 'Finals 2024'})`}
            value={examName}
            onChange={e => setExamName(e.target.value)}
            style={{ width: '100%', maxWidth: '400px' }}
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
          {task.type === 'lecture' && (
            <>
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
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



function SummaryView({ tasks, subjects }) {
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
      totalProjectedScore,
      totalDhruvScore,
      maxPossibleScore
    };
  }, [subjectGroups]);

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
              borderRadius: '100px',
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
                  <div className="gap-indicator warning">
                    <AlertCircle size={12} />
                    <span>{item.studyGap} Gap ({item.classGap}C/{item.labGap}L)</span>
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
    </div>
  );
}

function AllLecturesView({ tasks, onUpdate, onDelete, onEdit }) {
  const [filterSubject, setFilterSubject] = useState('All');

  const allLectures = useMemo(() => {
    let filtered = tasks.filter(t => t.type === 'lecture');
    if (filterSubject !== 'All') {
      filtered = filtered.filter(t => t.subjectName === filterSubject);
    }
    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [tasks, filterSubject]);

  const uniqueSubjects = useMemo(() => {
    const subs = new Set(tasks.map(t => t.subjectName));
    return ['All', ...Array.from(subs).filter(Boolean).sort()];
  }, [tasks]);

  return (
    <div className="sections-container">
      <section className="task-section lecture-section glass" style={{ width: '100%' }}>
        <div className="section-header">
          <div className="section-title-group">
            <h3>All Lectures Repository</h3>
            <p className="section-subtitle">{allLectures.length} total lectures</p>
          </div>
          <div className="filter-group" style={{ marginLeft: 'auto' }}>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="task-list">
          <div className="task-list-header">
            <span className="col-subject" style={{ flex: '0 0 100px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontSize: '0.85em' }}>Subject</span>
            <span className="col-number">No.</span>
            <span className="col-name" style={{ flex: 1 }}>Name</span>
            <span className="col-date">Date</span>
            <span className="col-attendance">Attendance</span>
            <span className="col-completion">Completed</span>
            <span className="col-actions">Actions</span>
          </div>
          {allLectures.map(task => (
            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''}`}>
              <div className="col-subject" style={{ flex: '0 0 100px', opacity: 0.8, fontSize: '0.9em', fontWeight: 500 }}>
                {task.subjectName}
              </div>
              <div className="col-number">
                <span className="task-number">#{task.number}</span>
              </div>
              <div className="col-name" style={{ flex: 1 }}>
                <span className={`task-name ${task.important ? 'important' : ''}`}>
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
                  <span className="task-date">
                    <Calendar size={12} /> {formatDate(task.date)}
                  </span>
                )}
              </div>
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
              <label className="col-completion">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={e => onUpdate(task.id, { completed: e.target.checked })}
                  title="Mark Lecture Completed"
                />
                <span className="completion-label">
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
          ))}
        </div>
      </section>
    </div>
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default App;
