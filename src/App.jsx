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

const DEFAULT_SUBJECTS = [
  "DM Class", "DM Lab", "DVA Class", "DVA Lab",
  "GenAI Class", "GenAI Lab", "SD Class", "SD Lab"
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeSubject, setActiveSubject] = useState(() => {
    const hash = window.location.hash.replace('#', '').replace(/%20/g, ' ');
    if (DEFAULT_SUBJECTS.includes(hash)) return hash;
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
      if (DEFAULT_SUBJECTS.includes(hash)) setActiveSubject(hash);
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
            <h1>{activeSubject}</h1>
            <span className={`sync-badge ${syncStatus.toLowerCase().includes('error') ? 'error' : ''}`}>
              {syncStatus}
            </span>
          </div>
          <div className="stats">
            {loading ? 'Loading...' : `${currentTasks.length} total items`}
          </div>
        </header>

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
        <h2>📚 Subjects</h2>
      </div>
      <nav className="subject-list">
        {subjects.map(subject => (
          <button
            key={subject}
            className={`subject-btn ${activeSubject === subject ? 'active' : ''}`}
            onClick={() => onSelect(subject)}
          >
            {subject}
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
      <h3>{title}</h3>
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
        <button type="submit" className="add-btn">Add</button>
      </form>

      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important-row' : ''}`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={e => onUpdate(task.id, { completed: e.target.checked })}
            />
            <div className="task-info">
              <span className="task-number">#{task.number}</span>
              <span className={`task-name ${task.important ? 'important' : ''}`}>
                {task.link ? (
                  <a href={task.link} target="_blank" rel="noreferrer">{task.name}</a>
                ) : task.name}
              </span>
              {task.date && <span className="task-date">{formatDate(task.date)}</span>}
              {task.notes && (
                <span className="task-notes">
                  | <a href={task.notes} target="_blank" rel="noreferrer">View Notes</a>
                </span>
              )}
              {task.impQs && <span className="task-imp"> | Imp: {task.impQs}</span>}
            </div>
            <div className="task-actions">
              <button
                className={`star-btn ${task.important ? 'active' : ''}`}
                onClick={() => onUpdate(task.id, { important: !task.important })}
              >
                ★
              </button>
              <button className="edit-btn" onClick={() => onEdit(task)}>✎</button>
              <button className="delete-btn" onClick={() => onDelete(task.id)}>×</button>
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
    <div className="modal-overlay">
      <div className="modal-content glass">
        <h3>Edit {task.type}</h3>
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
          })}>Save Changes</button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
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
