import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import './App.css';
import './AppPart2.css';
import './AppPart3.css';
import './CombinedLayouts.css';
import TimetableView from './TimetableView';
import HomeDashboard from './HomeDashboard';
import { getAttendanceStats } from './attendance';
import { SEM5_ABSENT_LECTURES, SEM5_LECTURE_HISTORY } from './sem5LectureHistory';

import { db, TASKS_COLLECTION } from './firebase';
import { getPendingLectures, generateLectureId } from './autoLectureCreator';
import { getSubjectFromLecture } from './timetableMapping';
import {
  addDoc,
  setDoc,
  writeBatch,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
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


import {
  DEFAULT_SUBJECTS, SEM5_SUBJECTS, SUBJECT_THEMES, SEM5_SUBJECT_THEMES,
  getSubjectWeights, SubjectTabs, Sidebar, BookmarkBar, ExamCountdown,
  ComparisonPeopleManager, TaskSection, ContestSection, ExamSection, EditModal
} from './AppComponents';
import {
  SummaryView, SafeZoneView, ActivityView, ScheduleView, AllLecturesView,
  SafeZoneCalculator
} from './AppViews';

const SEM5_ATTENDANCE_BASELINE = {
  AML: { 'AML Class': { attended: 13, total: 20 }, 'AML Lab': { attended: 19, total: 21 } },
  CN: { 'CN Class': { attended: 19, total: 23 }, 'CN Lab': { attended: 20, total: 22 } },
  DL: { 'DL Class': { attended: 21, total: 22 }, 'DL Lab': { attended: 19, total: 24 } },
  MCA: { 'MCA Class': { attended: 22, total: 23 }, 'MCA Lab': { attended: 20, total: 24 } }
};
const SEM5_ATTENDANCE_AS_OF = '2026-11-05T12:00:00+05:30';

function App() {
  const [tasks, setTasks] = useState([]);
  const [comparisonPeople, setComparisonPeople] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('comparison_people') || 'null') || [{ id: 'dhruv', name: 'Dhruv' }];
    } catch {
      return [{ id: 'dhruv', name: 'Dhruv' }];
    }
  });
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [activeSemester, setActiveSemester] = useState(() => {
    return localStorage.getItem('active_semester') || '4';
  });

  const activeSubjects = useMemo(() => {
    return activeSemester === '5' ? SEM5_SUBJECTS : DEFAULT_SUBJECTS;
  }, [activeSemester]);
  const visibleComparisonPeople = activeSemester === '5'
    ? comparisonPeople
    : [{ id: 'dhruv', name: 'Dhruv' }];

  const activeSubjectThemes = useMemo(() => {
    return activeSemester === '5' ? SEM5_SUBJECT_THEMES : SUBJECT_THEMES;
  }, [activeSemester]);

  const [activeSubject, setActiveSubject] = useState(() => {
    const hash = window.location.hash.replace('#', '').replace(/%20/g, ' ');
    if (DEFAULT_SUBJECTS.includes(hash) || SEM5_SUBJECTS.includes(hash) || hash === 'Home' || hash === 'Analytics' || hash === 'All Lectures' || hash === 'Exam Schedule' || hash === 'Activity Tracker' || hash === 'Timetable' || hash === 'Habits' || hash === 'Sleep' || hash === 'Focus') return hash;
    return localStorage.getItem('active_subject') || 'Home';
  });

  const [activeTopic, setActiveTopic] = useState('Lectures');

  const [editingTask, setEditingTask] = useState(null);
  const [portalElement, setPortalElement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Connecting...');
  const [attendanceThreshold, setAttendanceThreshold] = useState(() => {
    return parseInt(localStorage.getItem('attendance_threshold')) || 75;
  });
  const [time, setTime] = useState(new Date());
  const attendanceBaselineSeeded = useRef(false);
  const sem5LectureHistorySeeded = useRef(false);

  const [zoomLevel, setZoomLevel] = useState(() => {
    return parseInt(localStorage.getItem('user_zoom_level')) || 100;
  });
  const [zoomControlsOpen, setZoomControlsOpen] = useState(() => localStorage.getItem('zoom_controls_open') === 'true');

  const toggleZoomControls = () => setZoomControlsOpen(current => {
    const next = !current;
    localStorage.setItem('zoom_controls_open', String(next));
    return next;
  });

  const [autoLecturePaused, setAutoLecturePaused] = useState(() => {
    return localStorage.getItem('auto_lecture_paused') === 'true';
  });

  // Find user preferences task, if any, or use local state
  const userPrefs = useMemo(() => tasks.find(t => t.type === 'user_prefs'), [tasks]);

  useEffect(() => {
    if (Array.isArray(userPrefs?.comparisonPeople)) {
      setComparisonPeople(userPrefs.comparisonPeople);
      localStorage.setItem('comparison_people', JSON.stringify(userPrefs.comparisonPeople));
    }
  }, [userPrefs]);

  const handleComparisonPeopleUpdate = async (people) => {
    setComparisonPeople(people);
    localStorage.setItem('comparison_people', JSON.stringify(people));
    if (userPrefs) {
      await updateTask(userPrefs.id, { comparisonPeople: people });
    } else {
      try {
        await addDoc(TASKS_COLLECTION, { type: 'user_prefs', comparisonPeople: people, createdAt: Date.now() });
      } catch (e) {
        console.error('Error saving comparison people:', e);
      }
    }
  };

  useEffect(() => {
    if (userPrefs) {
      if (userPrefs.zoomLevel && userPrefs.zoomLevel !== zoomLevel) {
        setZoomLevel(userPrefs.zoomLevel);
        localStorage.setItem('user_zoom_level', userPrefs.zoomLevel);
      }
      if (userPrefs.autoLecturePaused !== undefined && userPrefs.autoLecturePaused !== autoLecturePaused) {
        setAutoLecturePaused(userPrefs.autoLecturePaused);
        localStorage.setItem('auto_lecture_paused', userPrefs.autoLecturePaused);
      }
      if (userPrefs.activeSemester && userPrefs.activeSemester !== activeSemester) {
        setActiveSemester(userPrefs.activeSemester);
        localStorage.setItem('active_semester', userPrefs.activeSemester);
      }
    }
  }, [userPrefs]);

  useEffect(() => {
    document.body.style.zoom = `${zoomLevel}%`;
    document.documentElement.style.setProperty('--zoom-level', zoomLevel);
  }, [zoomLevel]);

  const handleZoomUpdate = async (newZoom) => {
    setZoomLevel(newZoom);
    localStorage.setItem('user_zoom_level', newZoom);
    if (userPrefs) {
      await updateTask(userPrefs.id, { zoomLevel: newZoom });
    } else {
      try {
        await addDoc(TASKS_COLLECTION, {
          type: 'user_prefs',
          zoomLevel: newZoom,
          createdAt: Date.now()
        });
      } catch (e) {
        console.error("Error creating user prefs: ", e);
      }
    }
  };

  const handleAutoLecturePauseUpdate = async (paused) => {
    setAutoLecturePaused(paused);
    localStorage.setItem('auto_lecture_paused', paused);
    if (userPrefs) {
      await updateTask(userPrefs.id, { autoLecturePaused: paused });
    } else {
      try {
        await addDoc(TASKS_COLLECTION, {
          type: 'user_prefs',
          autoLecturePaused: paused,
          createdAt: Date.now()
        });
      } catch (e) {
        console.error("Error creating user prefs: ", e);
      }
    }
  };

  const handleSemesterUpdate = async (sem) => {
    setActiveSemester(sem);
    localStorage.setItem('active_semester', sem);
    setActiveSubject('Home');
    if (userPrefs) {
      await updateTask(userPrefs.id, { activeSemester: sem });
    } else {
      try {
        await addDoc(TASKS_COLLECTION, {
          type: 'user_prefs',
          activeSemester: sem,
          createdAt: Date.now()
        });
      } catch (e) {
        console.error("Error creating user prefs: ", e);
      }
    }
  };

  const semesterTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.type === 'user_prefs') return true;
      if (activeSemester === '4') {
        return !t.semester || t.semester === '4' || t.semester === 'sem_4';
      }
      return t.semester === '5' || t.semester === 'sem_5';
    });
  }, [tasks, activeSemester]);

  // Save the screenshot's noon snapshot once, keeping it separate from lecture records
  // so attendance logged after the snapshot can continue to accumulate.
  useEffect(() => {
    if (loading || activeSemester !== '5' || attendanceBaselineSeeded.current) return;
    attendanceBaselineSeeded.current = true;
    (async () => {
      try {
        for (const [baseName, attendance] of Object.entries(SEM5_ATTENDANCE_BASELINE)) {
          const meta = semesterTasks.find(task => task.type === 'friend_meta' &&
            (task.subjectName === baseName || task.subject === baseName));
          const existing = meta?.myAttendanceBySubject || {};
          const merged = { ...attendance, ...existing };
          if (meta) {
            if (JSON.stringify(existing) !== JSON.stringify(merged) || meta.myAttendanceAsOf !== SEM5_ATTENDANCE_AS_OF) {
              await updateDoc(doc(db, 'tasks', meta.id), {
                myAttendanceBySubject: merged,
                myAttendanceAsOf: SEM5_ATTENDANCE_AS_OF,
                myAttendanceSource: 'screenshot-import'
              });
            }
          } else {
            await addDoc(TASKS_COLLECTION, {
              subjectName: baseName,
              type: 'friend_meta',
              myAttendanceBySubject: merged,
              myAttendanceAsOf: SEM5_ATTENDANCE_AS_OF,
              myAttendanceSource: 'screenshot-import',
              createdAt: Date.now(),
              semester: '5'
            });
          }
        }
      } catch (error) {
        attendanceBaselineSeeded.current = false;
        console.error('Error saving Semester 5 attendance baseline:', error);
      }
    })();
  }, [loading, activeSemester, semesterTasks]);

  useEffect(() => {
    if (loading || activeSemester !== '5' || sem5LectureHistorySeeded.current) return;
    sem5LectureHistorySeeded.current = true;
    (async () => {
      try {
        const existing = new Map(semesterTasks
          .filter(task => task.type === 'lecture')
          .map(task => [`${task.subjectName}|${task.name}|${task.date}`, task]));
        const subjectNumbers = {};
        const batch = writeBatch(db);
        for (const lecture of SEM5_LECTURE_HISTORY) {
          const key = `${lecture.subject}|${lecture.name}|${lecture.date}`;
          subjectNumbers[lecture.subject] = (subjectNumbers[lecture.subject] || 0) + 1;
          const existingTask = existing.get(key);
          const isAbsent = SEM5_ABSENT_LECTURES.has(`${lecture.subject}|${lecture.date}`);
          const attendanceFields = { present: !isAbsent, attendanceRecorded: true };
          const migrationFields = {
            number: subjectNumbers[lecture.subject],
            ...attendanceFields,
            historicalImport: true,
            historicalImportVersion: 4
          };

          if (existingTask) {
            if (existingTask.number !== subjectNumbers[lecture.subject] || existingTask.historicalImportVersion !== 4 ||
                existingTask.present !== attendanceFields.present || existingTask.attendanceRecorded !== true) {
              batch.update(doc(db, 'tasks', existingTask.id), migrationFields);
            }
            continue;
          }

          const id = generateLectureId(lecture.subject, lecture.name, lecture.date);
          batch.set(doc(db, 'tasks', id), {
            subjectName: lecture.subject,
            type: 'lecture',
            name: lecture.name,
            ...migrationFields,
            date: lecture.date,
            semester: '5',
            completed: false,
            important: false,
            createdAt: Date.now()
          }, { merge: true });
          existing.set(key, { id, ...lecture });
        }
        await batch.commit();
      } catch (error) {
        sem5LectureHistorySeeded.current = false;
        console.error('Error importing Semester 5 lecture history:', error);
      }
    })();
  }, [loading, activeSemester, semesterTasks]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => time.toLocaleDateString('en-CA'), [time]);

  useEffect(() => {
    localStorage.setItem('attendance_threshold', attendanceThreshold);
  }, [attendanceThreshold]);

  // Auto-create lectures based on timetable
  useEffect(() => {
    if (loading || semesterTasks.length === 0 || autoLecturePaused || activeSemester === '4') return; // Wait for tasks to load, if paused, or if semester 4 is selected (completed)

    const checkAndCreateLectures = async () => {
      const pendingLectures = getPendingLectures(time, semesterTasks, activeSemester);

      if (pendingLectures.length > 0) {
        const attendanceOverrides = JSON.parse(localStorage.getItem('daily_lecture_attendance') || '{}');
        for (const lecture of pendingLectures) {
          // Find the next lecture number for this subject
          const subjectLectures = semesterTasks.filter(
            t => t.type === 'lecture' && t.subjectName === lecture.subject
          );
          const nextNumber = subjectLectures.length + 1;

          // Create the lecture entry
          const newLecture = {
            subjectName: lecture.subject,
            type: 'lecture',
            name: lecture.name,
            number: nextNumber,
            completed: false, // Mark as NOT completed by default (user will complete it later)
            present: attendanceOverrides[`${activeSemester}|${lecture.date}|${lecture.name}`] ?? true,
            attendanceRecorded: true,
            important: false,
            date: lecture.date,
            notes: '',
            notionUrl: '',
            createdAt: Date.now(),
            semester: activeSemester, // Track semester!
            autoCreated: true // Flag to indicate this was auto-created
          };

          try {
            // Use setDoc with a unique ID to prevent duplicates
            // This is atomic and will either create a new doc or overwrite existing one with same ID
            await setDoc(doc(db, 'tasks', lecture.id), newLecture);
          } catch (error) {
            console.error('Error auto-creating lecture:', error);
          }
        }
      }
    };

    checkAndCreateLectures();
  }, [time, semesterTasks, loading, autoLecturePaused, activeSemester]); // Run every minute when time updates


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
      if (DEFAULT_SUBJECTS.includes(hash) || SEM5_SUBJECTS.includes(hash) || hash === 'Home' || hash === 'Analytics' || hash === 'All Lectures' || hash === 'Exam Schedule' || hash === 'Activity Tracker' || hash === 'Timetable' || hash === 'Habits' || hash === 'Sleep' || hash === 'Focus') setActiveSubject(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Theme Management
  useEffect(() => {
    const defaultThemeSubject = activeSemester === '5' ? "CN Class" : "DM Class";
    const theme = activeSubjectThemes[activeSubject] || activeSubjectThemes[defaultThemeSubject];
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--primary-glow', theme.glow);

    // Smooth background subtle shift
    const bodyStyle = document.body.style;
    if (activeSubject === 'Analytics') {
      bodyStyle.backgroundColor = '#f8fafc';
    } else if (activeSubject === 'Home') {
      bodyStyle.backgroundColor = '#ffffff';
    } else {
      bodyStyle.backgroundColor = '#f3f4f6';
    }
  }, [activeSubject, activeSubjectThemes, activeSemester]);

  const addTask = async (subjectName, type, data) => {
    // Auto-detect subject for lectures based on timetable mapping
    let finalSubject = subjectName;

    if (type === 'lecture') {
      // Dynamically import the mapping to check if this lecture should go to a different subject
      try {
        const { getSubjectFromLecture } = await import('./timetableMapping');
        const detectedSubject = getSubjectFromLecture(data.name, activeSemester);
        if (detectedSubject) {
          finalSubject = detectedSubject;
        }
      } catch (err) {
        console.warn('Could not load timetable mapping:', err);
      }
    }

    const newTask = {
      subjectName: finalSubject,
      type,
      name: data.name,
      number: data.number,
      completed: type === 'lecture',
      present: type === 'lecture',
      important: type !== 'lecture',
      createdAt: Date.now(),
      semester: activeSemester, // Track semester!
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
      const task = tasks.find(t => t.id === id);

      const finalUpdates = { ...updates };
      // Auto-timestamp completion
      if (updates.completed === true && (!task || !task.completed)) {
        finalUpdates.completedAt = Date.now();
      } else if (updates.completed === false) {
        finalUpdates.completedAt = null;
      }

      const res = await updateDoc(doc(db, 'tasks', id), finalUpdates);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const setTodayLectureAttendance = async (item, present) => {
    const attendanceOverrides = JSON.parse(localStorage.getItem('daily_lecture_attendance') || '{}');
    const overrideKey = `${activeSemester}|${todayStr}|${item.name}`;
    attendanceOverrides[overrideKey] = present;
    localStorage.setItem('daily_lecture_attendance', JSON.stringify(attendanceOverrides));

    const subjectName = getSubjectFromLecture(item.name, activeSemester);
    if (!subjectName) return;
    const existingLecture = semesterTasks.find(task => task.type === 'lecture' && task.subjectName === subjectName && task.name === item.name && task.date === todayStr);
    if (existingLecture) {
      await updateTask(existingLecture.id, { present, attendanceRecorded: true });
    }
  };

  const deleteTask = async (id) => {
    const confirmed = window.confirm('Delete this task?');

    if (confirmed) {
      try {
        const task = tasks.find(t => t.id === id);

        // If this is an auto-created lecture, mark it as manually deleted
        // so it won't be auto-recreated
        if (task && task.type === 'lecture' && task.autoCreated) {
          const subject = task.subjectName || task.subject || '';
          const name = task.name || '';
          const date = task.date || '';

          if (subject && name && date) {
            const deletedKey = generateLectureId(subject, name, date);
            const deletedLectures = JSON.parse(localStorage.getItem('deleted_lectures') || '{}');
            deletedLectures[deletedKey] = {
              name,
              subject,
              date,
              deletedAt: Date.now()
            };
            localStorage.setItem('deleted_lectures', JSON.stringify(deletedLectures));
          }
        }

        await deleteDoc(doc(db, 'tasks', id));
      } catch (e) {
        console.error("Error deleting document: ", e);
        alert('Failed to delete task. Error: ' + e.message);
      }
    } else {
    }
  };

  const friendMetaDoc = useMemo(() => {
    // Derive base subject name for cross-lookups
    const baseSubject = activeSubject.replace(' Class', '').replace(' Lab', '');
    const metaSubject = baseSubject === 'Home' || baseSubject === 'Analytics' ? activeSubject : baseSubject;

    // Find metadata for either exact subject or base subject
    const candidates = semesterTasks.filter(t => t.type === 'friend_meta' &&
      (t.subjectName === activeSubject || t.subject === activeSubject || t.subjectName === metaSubject || t.subject === metaSubject));

    if (candidates.length === 0) return null;

    // Sort to put docs with data/offsets first, then by most recent
    return candidates.sort((a, b) => {
      // Prioritize docs with more data fields
      const scoreA = (a.attendanceOffset !== undefined ? 1 : 0) + (a.myProjectMarks !== undefined ? 1 : 0) + (a.maxProjectMarks !== undefined ? 1 : 0);
      const scoreB = (b.attendanceOffset !== undefined ? 1 : 0) + (b.myProjectMarks !== undefined ? 1 : 0) + (b.maxProjectMarks !== undefined ? 1 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.createdAt || 0) - (a.createdAt || 0);
    })[0];
  }, [semesterTasks, activeSubject]);

  const updateFriendMeta = async (updates) => {
    // Use base subject name for metadata to share across Class and Lab
    const baseSubject = activeSubject.replace(' Class', '').replace(' Lab', '');
    const metaSubject = baseSubject === 'Home' || baseSubject === 'Analytics' ? activeSubject : baseSubject;

    const duplicates = semesterTasks.filter(t => t.type === 'friend_meta' &&
      (t.subjectName === metaSubject || t.subject === metaSubject || t.subjectName === activeSubject || t.subject === activeSubject));

    if (duplicates.length > 0) {
      await updateTask(duplicates[0].id, updates);
    } else {
      await addTask(metaSubject, 'friend_meta', {
        ...updates,
        createdAt: Date.now()
      });
    }
  };

  // Reset topic if switching to Lab subject and currently on Projects/Exams
  useEffect(() => {
    if (activeSubject?.includes('Lab') && (activeTopic === 'Projects' || activeTopic === 'Exams')) {
      setActiveTopic('Lectures');
    }
  }, [activeSubject, activeTopic]);

  const leadMsg = useMemo(() => {
    // Derive unique base subject names from activeSubjects
    const baseSubjects = [...new Set(activeSubjects.map(s => s.replace(' Class', '').replace(' Lab', '')))];
    let myTotal = 0;
    let dhruvTotal = 0;

    baseSubjects.forEach(baseName => {
      const { weights } = getSubjectWeights(baseName);
      const classSubjectName = `${baseName} Class`;
      const labSubjectName = `${baseName} Lab`;

      const getSubStats = (subjectName) => {
        const subTasks = semesterTasks.filter(t => t.subjectName === subjectName);
        const lects = subTasks.filter(t => t.type === 'lecture');
        const friendMeta = semesterTasks
          .filter(t => t.type === 'friend_meta' && (t.subjectName === baseName || t.subject === baseName || t.subjectName === subjectName || t.subject === subjectName))
          .sort((a, b) => {
            const aHas = a.attendanceOffset !== undefined;
            const bHas = b.attendanceOffset !== undefined;
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
          })[0];
        const attendance = getAttendanceStats(lects, friendMeta, subjectName);
        const attCount = attendance.attended;
        const attPercent = attendance.total > 0 ? attCount / attendance.total : 0;
        const dhruvAttCount = friendMeta?.attendanceOffset !== undefined
          ? attCount + (friendMeta.attendanceOffset || 0)
          : (friendMeta?.attendanceCount ?? attCount);
        const dhruvAttPercent = attendance.total > 0 ? dhruvAttCount / attendance.total : 0;

        const getTypeMarks = (type) => {
          const filtered = subTasks.filter(t => t.type === type);
          return {
            myMarks: filtered.reduce((acc, t) => acc + (Number(t.marks) || 0), 0),
            dhruvMarks: filtered.reduce((acc, t) => acc + (Number(t.dhruvMarks) || 0), 0),
            total: filtered.length,
            done: filtered.filter(t => t.completed).length,
            dhruvDone: filtered.filter(t => t.dhruvCompleted).length,
            maxMarks: filtered.reduce((acc, t) => acc + (Number(t.maxMarks) || 0), 0)
          };
        };

        return { attPercent, dhruvAttPercent, getTypeMarks };
      };

      const cls = getSubStats(classSubjectName);
      const lab = getSubStats(labSubjectName);

      // Attendance
      myTotal += (cls.attPercent * 0.5 + lab.attPercent * 0.5) * (weights.attendance || 0) * 100;
      dhruvTotal += (cls.dhruvAttPercent * 0.5 + lab.dhruvAttPercent * 0.5) * (weights.attendance || 0) * 100;

      // Assignments — fixed 70% for You, 50% for Dhruv
      myTotal += 0.70 * (weights.assignment || 0) * 100;
      dhruvTotal += 0.50 * (weights.assignment || 0) * 100;

      // Contest / MidSem / EndSem — use raw marks from tasks
      ['contest', 'midSem', 'endSem'].forEach(type => {
        const c = cls.getTypeMarks(type);
        const l = lab.getTypeMarks(type);
        myTotal += (c.myMarks + l.myMarks);
        dhruvTotal += (c.dhruvMarks + l.dhruvMarks);
      });

      // Project — based on completion/marks or manual direct marks in friend_meta using the baseName
      const meta = semesterTasks.find(t => t.type === 'friend_meta' && (t.subjectName === baseName || t.subject === baseName));

      if (meta && meta.maxProjectMarks > 0) {
        const myM = meta.myProjectMarks || 0;
        const dhruvM = meta.dhruvProjectMarks ?? myM; // Fallback to My Marks if Dhruv's are not explicitly set
        const maxM = meta.maxProjectMarks;

        myTotal += (myM / maxM) * (weights.project || 0) * 100;
        dhruvTotal += (dhruvM / maxM) * (weights.project || 0) * 100;
      } else {
        const getProjPartialScore = (stats, forDhruv = false) => {
          if (stats.maxMarks > 0) return (forDhruv ? stats.dhruvMarks : stats.myMarks) / stats.maxMarks;
          if (stats.total > 0) return (forDhruv ? (stats.dhruvDone ?? stats.done) : stats.done) / stats.total;
          return 0;
        };
        const cProj = cls.getTypeMarks('project');
        const lProj = lab.getTypeMarks('project');

        const myProjScore = getProjPartialScore(cProj, false) * 0.5 + getProjPartialScore(lProj, false) * 0.5;
        const dhruvProjScore = getProjPartialScore(cProj, true) * 0.5 + getProjPartialScore(lProj, true) * 0.5;

        myTotal += myProjScore * (weights.project || 0) * 100;
        dhruvTotal += dhruvProjScore * (weights.project || 0) * 100;
      }
    });

    // Also compute without-assignment diff (subtract fixed assignment contributions)
    const assignmentBaseSubjects = [...new Set(activeSubjects.map(s => s.replace(' Class', '').replace(' Lab', '')))];
    let myAssignTotal = 0;
    let dhruvAssignTotal = 0;
    assignmentBaseSubjects.forEach(baseName => {
      const { weights } = getSubjectWeights(baseName);
      myAssignTotal += 0.70 * (weights.assignment || 0) * 100;
      dhruvAssignTotal += 0.50 * (weights.assignment || 0) * 100;
    });

    const diffWith = myTotal - dhruvTotal;
    const diffWithout = (myTotal - myAssignTotal) - (dhruvTotal - dhruvAssignTotal);

    const fmt = (d) => d > 0 ? `+${d.toFixed(2)}` : d < 0 ? `${d.toFixed(2)}` : '0';
    const typeOf = (d) => d > 0 ? 'win' : d < 0 ? 'lose' : 'neutral';

    return {
      diffWith,
      diffWithout,
      type: typeOf(diffWith),
      typeWithout: typeOf(diffWithout),
      textWith: fmt(diffWith),
      textWithout: fmt(diffWithout)
    };
  }, [semesterTasks, activeSubjects, activeSemester]);

  const homeSummary = useMemo(() => {
    const regularLectures = semesterTasks.filter(task => task.type === 'lecture');
    const attendanceMeta = semesterTasks.filter(task => task.type === 'friend_meta' && task.myAttendanceBySubject);
    const hasBaseline = attendanceMeta.length > 0;
    const baselineTotal = attendanceMeta.reduce((sum, meta) => sum + Object.values(meta.myAttendanceBySubject || {}).reduce((subjectSum, counts) => subjectSum + Number(counts.total || 0), 0), 0);
    const baselineAttended = attendanceMeta.reduce((sum, meta) => sum + Object.values(meta.myAttendanceBySubject || {}).reduce((subjectSum, counts) => subjectSum + Number(counts.attended || 0), 0), 0);
    const cutoff = (attendanceMeta.find(meta => meta.myAttendanceAsOf)?.myAttendanceAsOf || '').slice(0, 10);
    const laterLectures = hasBaseline ? regularLectures.filter(lecture => lecture.date && lecture.date > cutoff) : regularLectures;
    const total = hasBaseline ? baselineTotal + laterLectures.length : regularLectures.length;
    const attended = hasBaseline
      ? baselineAttended + laterLectures.filter(lecture => lecture.present !== false).length
      : regularLectures.filter(lecture => lecture.present !== false).length;
    const completed = regularLectures.filter(lecture => lecture.completed).length;

    return {
      attendance: total ? ((attended / total) * 100).toFixed(2) : '0.00',
      attended,
      total,
      remaining: Math.max(0, total - completed)
    };
  }, [semesterTasks]);

  const currentTasks = useMemo(() => {
    return semesterTasks.filter(t => t.subjectName === activeSubject && t.type !== 'friend_meta');
  }, [semesterTasks, activeSubject]);

  return (
    <div className="app-layout">
      <Sidebar
        subjects={activeSubjects}
        activeSubject={activeSubject}
        onSelect={setActiveSubject}
        syncStatus={syncStatus}
        activeSemester={activeSemester}
        onSemesterChange={handleSemesterUpdate}
      />
      <main className="main-content">
        <BookmarkBar
          activeSubject={activeSubject}
          onSelect={setActiveSubject}
          leadData={leadMsg}
          homeSummary={homeSummary}
          time={time}
          activeSemester={activeSemester}
          onManagePeople={() => setShowPeopleManager(true)}
          zoomLevel={zoomLevel}
          zoomControlsOpen={zoomControlsOpen}
          onToggleZoomControls={toggleZoomControls}
          onZoomUpdate={handleZoomUpdate}
        />
        {activeSubject !== 'Home' && <header className="main-header unified-subject-header glass">
          <div className="header-left">
            <div className="title-group">
              <h1>{activeSubject === 'Marks Overview' ? 'Global Performance Overview' : activeSubject === 'Detailed Analysis' ? 'Subject-wise Detailed Analysis' : activeSubject === 'Pending Work' ? 'Pending Lectures Queue' : activeSubject === 'All Lectures' ? 'Global Lecture View' : activeSubject === 'Exam Schedule' ? 'Academic Calendar' : activeSubject === 'Activity Tracker' ? 'Personal Activity Tracker' : activeSubject === 'Timetable' ? 'Weekly Class Schedule' : activeSubject === 'Home' ? '' : activeSubject}</h1>
            </div>

            {!['Home', 'Marks Overview', 'Detailed Analysis', 'Pending Work', 'All Lectures', 'Activity Tracker', 'Exam Schedule', 'Timetable', 'Safe Zone'].includes(activeSubject) && (
              <SubjectTabs activeTopic={activeTopic} onChange={setActiveTopic} activeSubject={activeSubject} />
            )}
          </div>

          <div className="header-right">
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
            {!['Home', 'Marks Overview', 'Detailed Analysis', 'Pending Work', 'All Lectures', 'Activity Tracker', 'Exam Schedule', 'Timetable', 'Safe Zone'].includes(activeSubject) && (
              <div id="section-stats-portal" ref={node => { if (node && portalElement !== node) setPortalElement(node); }}></div>
            )}
          </div>
        </header>}

        {activeSubject === 'Home' ? (
          <HomeDashboard
            tasks={semesterTasks}
            todayStr={todayStr}
            activeSemester={activeSemester}
            onAttendanceChange={setTodayLectureAttendance}
          />
        ) : activeSubject === 'Marks Overview' ? (
          <SummaryView tasks={semesterTasks} subjects={activeSubjects} threshold={attendanceThreshold} mode="overview" onUpdate={updateTask} comparisonPeople={visibleComparisonPeople} />
        ) : activeSubject === 'Detailed Analysis' ? (
          <SummaryView tasks={semesterTasks} subjects={activeSubjects} threshold={attendanceThreshold} mode="detailed" onUpdate={updateTask} comparisonPeople={visibleComparisonPeople} />
        ) : activeSubject === 'Pending Work' ? (
          <SummaryView tasks={semesterTasks} subjects={activeSubjects} threshold={attendanceThreshold} mode="pending" onUpdate={updateTask} comparisonPeople={visibleComparisonPeople} />
        ) : activeSubject === 'All Lectures' ? (
          <AllLecturesView
            tasks={semesterTasks}
            subjects={activeSubjects}
            activeSemester={activeSemester}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onEdit={setEditingTask}
            portalNode={portalElement}
          />
        ) : activeSubject === 'Activity Tracker' ? (
          <ActivityView tasks={semesterTasks} subjects={activeSubjects} />
        ) : activeSubject === 'Exam Schedule' ? (
          <ScheduleView tasks={semesterTasks} currentTime={time} activeSemester={activeSemester} />
        ) : activeSubject === 'Timetable' ? (
          <TimetableView activeSemester={activeSemester} />
        ) : activeSubject === 'Safe Zone' ? (
          <SafeZoneView tasks={semesterTasks} subjects={activeSubjects} threshold={attendanceThreshold} setThreshold={setAttendanceThreshold} />
        ) : (
          <div className="sections-container">
            <div className="active-section-wrapper" key={`${activeSubject}-${activeTopic}`}>
              {activeTopic === 'Lectures' && (
                <TaskSection
                  title="Lectures"
                  type="lecture"
                  activeSubject={activeSubject}
                  tasks={currentTasks.filter(t => t.type === 'lecture')}
                  friendMeta={friendMetaDoc}
                  comparisonPeople={visibleComparisonPeople}
                  onUpdateFriendMeta={updateFriendMeta}
                  onAdd={(data) => addTask(activeSubject, 'lecture', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                  threshold={attendanceThreshold}
                  portalNode={portalElement}
                />
              )}

              {activeTopic === 'Assignments' && (
                <TaskSection
                  title="Assignments"
                  type="assignment"
                  activeSubject={activeSubject}
                  comparisonPeople={visibleComparisonPeople}
                  tasks={currentTasks.filter(t => t.type === 'assignment')}
                  onAdd={(data) => addTask(activeSubject, 'assignment', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                  portalNode={portalElement}
                />
              )}

              {activeTopic === 'Quizzes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <TaskSection
                    title="Quizzes"
                    type="quiz"
                    activeSubject={activeSubject}
                    comparisonPeople={visibleComparisonPeople}
                    tasks={currentTasks.filter(t => t.type === 'quiz')}
                    onAdd={(data) => addTask(activeSubject, 'quiz', data)}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onEdit={setEditingTask}
                    portalNode={portalElement}
                  />
                </div>
              )}

              {activeTopic === 'Projects' && (
                <TaskSection
                  title="Mini Projects"
                  type="project"
                  activeSubject={activeSubject}
                  comparisonPeople={visibleComparisonPeople}
                  tasks={currentTasks.filter(t => t.type === 'project')}
                  onAdd={(data) => addTask(activeSubject, 'project', data)}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onEdit={setEditingTask}
                  portalNode={portalElement}
                />
              )}

              {activeTopic === 'Exams' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <ContestSection
                    activeSubject={activeSubject}
                    comparisonPeople={visibleComparisonPeople}
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
                    comparisonPeople={visibleComparisonPeople}
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
                    comparisonPeople={visibleComparisonPeople}
                    tasks={currentTasks.filter(t => t.type === 'endSem')}
                    onAdd={(data) => addTask(activeSubject, 'endSem', data)}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onEdit={setEditingTask}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {editingTask && (
        <EditModal
          task={editingTask}
          activeSubject={activeSubject}
          comparisonPeople={visibleComparisonPeople}
          allTasks={tasks.filter(t => t.subjectName === activeSubject && t.type === editingTask.type)}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => {
            updateTask(editingTask.id, updates);
            setEditingTask(null);
          }}
        />
      )}
      {showPeopleManager && (
        <ComparisonPeopleManager
          people={comparisonPeople}
          onSave={handleComparisonPeopleUpdate}
          onClose={() => setShowPeopleManager(false)}
        />
      )}
    </div>
  );
}


export default App;
