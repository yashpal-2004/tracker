import React, { useState, useEffect, useMemo } from 'react';
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
  PieChart
} from 'lucide-react';

const DEFAULT_SUBJECTS = [
  "DM Class", "DM Lab", "DVA Class", "DVA Lab",
  "GenAI Class", "GenAI Lab", "SD Class", "SD Lab"
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeSubject, setActiveSubject] = useState(() => {
    const hash = window.location.hash.replace('#', '').replace(/%20/g, ' ');
    if (DEFAULT_SUBJECTS.includes(hash) || hash === 'Summary') return hash;
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
      if (DEFAULT_SUBJECTS.includes(hash) || hash === 'Summary') setActiveSubject(hash);
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
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const updateTask = async (id, updates) => {
    try {
      await updateDoc(doc(db, 'tasks', id), updates);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const deleteTask = async (id) => {
    if (window.confirm('Delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (e) {
        console.error("Error deleting document: ", e);
      }
    }
  };

  const currentTasks = useMemo(() => {
    return tasks.filter(t => t.subjectName === activeSubject);
  }, [tasks, activeSubject]);

  return (
    <div className="app-layout">
      <Sidebar
        subjects={DEFAULT_SUBJECTS}
        activeSubject={activeSubject}
        onSelect={setActiveSubject}
      />
      <main className="main-content">
        <header className="main-header">
          <div className="title-group">
            <h1>{activeSubject === 'Summary' ? 'Attendance Analytics' : activeSubject}</h1>
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

        {activeSubject === 'Summary' ? (
          <SummaryView tasks={tasks} subjects={DEFAULT_SUBJECTS} />
        ) : (
          <div className="sections-container">
            <TaskSection
              title="Lectures"
              type="lecture"
              activeSubject={activeSubject}
              tasks={currentTasks.filter(t => t.type === 'lecture')}
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
          </div>
        )}
      </main>

      {editingTask && (
        <EditModal
          task={editingTask}
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
          className={`subject-btn summary-btn ${activeSubject === 'Summary' ? 'active' : ''}`}
          onClick={() => onSelect('Summary')}
        >
          <BarChart3 size={18} />
          <span>Attendance Summary</span>
          {activeSubject === 'Summary' && <ChevronRight size={14} className="active-arrow" />}
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

function TaskSection({ title, type, tasks, onAdd, onUpdate, onDelete, onEdit, activeSubject }) {
  const [val, setVal] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [link, setLink] = useState('');
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
    drafts[key] = { val, link, impQs, date };
    localStorage.setItem('inputDrafts', JSON.stringify(drafts));
  }, [val, link, impQs, date, activeSubject, type, isLoaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;

    const count = tasks.length + 1;
    const data = { name: val, number: count };
    if (type === 'lecture') {
      data.date = date;
      data.notes = link;
    }
    if (type === 'assignment' || type === 'quiz') data.link = link;
    if (type === 'quiz') data.impQs = impQs;

    onAdd(data);
    setVal('');
    setLink('');
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
            <div className="progress-card attendance-card">
              <div className="card-top-label">ATTENDANCE</div>
              <div className="progress-circle-container">
                <svg className="progress-circle" viewBox="0 0 36 36">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle attendance-path" strokeDasharray={`${attendPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <div className="progress-info">
                <span className="progress-percent">{attendPercent}%</span>
                <span className="progress-count">{presentCount}/{totalCount} Attended</span>
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
          placeholder={type === 'lecture' ? "Notes URL (optional)" : "Link (optional)"}
          value={link}
          onChange={e => setLink(e.target.value)}
        />
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
          <span className="col-completion">{type === 'lecture' ? 'Completed' : 'Status'}</span>
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
                  task.notes ? (
                    <a href={task.notes} target="_blank" rel="noreferrer" className="lecture-link">
                      {task.name}
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="no-notes">
                      {task.name} <em style={{ fontSize: '0.8em', opacity: 0.6 }}>(No Notes)</em>
                    </span>
                  )
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
              <div className="col-attendance">
                <input
                  type="checkbox"
                  checked={task.present ?? true}
                  onChange={e => onUpdate(task.id, { present: e.target.checked })}
                  title="Mark Attendance"
                />
                <span className="attendance-label">
                  {task.present !== false ? 'Present' : 'Absent'}
                </span>
              </div>
            )}
            <div className="col-completion">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={e => onUpdate(task.id, { completed: e.target.checked })}
                title={type === 'lecture' ? "Mark Lecture Completed" : "Mark Status Completed"}
              />
              <span className="completion-label">
                {task.completed ? (type === 'lecture' ? 'Done' : 'Done') : (type === 'lecture' ? 'Pending' : 'Pending')}
              </span>
            </div>
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
                <button className="delete-btn" onClick={() => onDelete(task.id)} title="Delete">
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

function EditModal({ task, onClose, onSave }) {
  const [name, setName] = useState(task.name);
  const [number, setNumber] = useState(task.number);
  const [date, setDate] = useState(task.date || '');
  const [link, setLink] = useState(task.link || task.notes || '');
  const [impQs, setImpQs] = useState(task.impQs || '');

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
              <label>Notes URL</label>
              <input value={link} onChange={e => setLink(e.target.value)} />
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
        </div>
        <div className="modal-buttons">
          <button className="save-btn" onClick={() => onSave({
            name,
            number,
            date,
            [task.type === 'lecture' ? 'notes' : 'link']: link,
            impQs
          })}>
            <Save size={18} />
            <span>Save Changes</span>
          </button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SummaryView({ tasks, subjects }) {
  const subjectGroups = useMemo(() => {
    const groups = {};
    subjects.forEach(s => {
      const baseName = s.replace(' Class', '').replace(' Lab', '');
      if (!groups[baseName]) groups[baseName] = { class: null, lab: null };

      const subjectTasks = tasks.filter(t => t.subjectName === s && t.type === 'lecture');
      const present = subjectTasks.filter(t => t.present !== false).length;
      const total = subjectTasks.length;
      const percent = total > 0 ? (present / total) * 100 : 0;

      if (s.includes('Class')) groups[baseName].class = { percent, total, present };
      else groups[baseName].lab = { percent, total, present };
    });
    return groups;
  }, [tasks, subjects]);

  const summaryData = useMemo(() => {
    let totalWeighted = 0;
    let count = 0;
    let grandTotalLectures = 0;
    let grandTotalPresent = 0;

    const items = Object.entries(subjectGroups).map(([name, data]) => {
      const weighted = (data.class.percent * 0.6) + (data.lab.percent * 0.4);
      totalWeighted += weighted;
      count++;

      grandTotalLectures += (data.class.total + data.lab.total);
      grandTotalPresent += (data.class.present + data.lab.present);

      return { name, weighted, ...data };
    });

    return {
      items,
      overall: count > 0 ? totalWeighted / count : 0,
      grandTotalLectures,
      grandTotalPresent
    };
  }, [subjectGroups]);

  return (
    <div className="summary-container">
      <div className="overall-card glass shadow-lg">
        <div className="overall-info">
          <PieChart size={48} className="text-primary" />
          <div>
            <h2>{Math.round(summaryData.overall)}%</h2>
            <p>Overall Attendance Score</p>
          </div>
        </div>
        <div className="overall-stats-pill">
          <span className="stats-label">Total Lectures tracked</span>
          <span className="stats-value">{summaryData.grandTotalPresent}/{summaryData.grandTotalLectures}</span>
        </div>
        <div className="weight-legend">
          <span><Hash size={12} /> Class: 60%</span>
          <span><Hash size={12} /> Lab: 40%</span>
        </div>
      </div>

      <div className="subject-grid">
        {summaryData.items.map(item => (
          <div key={item.name} className="subject-card glass">
            <div className="subject-card-header">
              <h3>{item.name}</h3>
              <div className="subject-header-right">
                <span className="lecture-count-pill">{item.class.total + item.lab.total} Lectures</span>
                <span className={`status-badge ${item.weighted >= 75 ? 'success' : 'warning'}`}>
                  {Math.round(item.weighted)}% Total
                </span>
              </div>
            </div>
            <div className="subject-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span>Class (60%)</span>
                  <span className="count-small">{item.class.present}/{item.class.total}</span>
                </div>
                <div className="detail-bar-bg">
                  <div className="detail-bar class-bar" style={{ width: `${item.class.percent}%` }}></div>
                </div>
                <span className="detail-value">{Math.round(item.class.percent)}%</span>
              </div>
              <div className="detail-row">
                <div className="detail-label">
                  <span>Lab (40%)</span>
                  <span className="count-small">{item.lab.present}/{item.lab.total}</span>
                </div>
                <div className="detail-bar-bg">
                  <div className="detail-bar lab-bar" style={{ width: `${item.lab.percent}%` }}></div>
                </div>
                <span className="detail-value">{Math.round(item.lab.percent)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default App;
