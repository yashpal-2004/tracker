import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getAttendanceStats } from './attendance';
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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Github,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Network,
  Cable,
  Brain,
  Workflow,
  Binary,
  Cpu,
  CircuitBoard,
  NotebookPen,
  Code2,
  BriefcaseBusiness,
  ContactRound,
  LayoutDashboard,
  ChartNoAxesCombined,
  CalendarRange,
  CalendarDays,
  CodeXml
} from 'lucide-react';
export const NotionLogo = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.217-.793c.28 0 .047-.28.047-.326L20.103.872c0-.093-.42-.14-.56-.14l-14.731.98c-1.167.093-1.68.42-2.194 1.166l-1.587 2.145c0 .047-.14.187.093.187.14 0 .374 0 .56-.14l2.775-1.074.047.234v13.61c0 .56-.327.933-1.074 1.353l-1.353.7c-.187.093-.233.28-.047.373l6.994 3.123c.28.14.467.047.467-.186V8.97l6.621 11.236c.233.373.513.56.98.513l4.195-.187c.233 0 .42-.14.42-.42V4.954c0-.56.327-.933 1.073-1.353l1.354-.7c.186-.093.233-.28.046-.373l-6.994-3.123c-.28-.14-.466-.047-.466.186v11.7l-6.621-11.236c-.234-.373-.514-.56-.98-.513l-4.196.187c-.233 0-.42.14-.42.42v15.201l.047-.234-2.775 1.073z" />
  </svg>
);

export const DEFAULT_SUBJECTS = [
  "DM Class", "DM Lab", "DVA Class", "DVA Lab",
  "GenAI Class", "GenAI Lab", "SD Class", "SD Lab"
];

export const SEM5_SUBJECTS = [
  "CN Class", "CN Lab", "DL Class", "DL Lab",
  "AML Class", "AML Lab", "MCA Class", "MCA Lab"
];

const SEM5_SUBJECT_ICONS = {
  'CN Class': Network,
  'CN Lab': Cable,
  'DL Class': BrainCircuit,
  'DL Lab': Workflow,
  'AML Class': Brain,
  'AML Lab': Binary,
  'MCA Class': Cpu,
  'MCA Lab': CircuitBoard
};

export const EXAM_DATES = {
  midSem: "2026-03-15",
  endSem: "2026-05-20"
};

export const CONTEST_SCHEDULE = [
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

export const SUBJECT_THEMES = {
  "DM Class": { primary: "#00aaff", glow: "rgba(0, 170, 255, 0.18)" },
  "DM Lab": { primary: "#0088cc", glow: "rgba(0, 136, 204, 0.18)" },
  "DVA Class": { primary: "#ff0084", glow: "rgba(255, 0, 132, 0.18)" },
  "DVA Lab": { primary: "#cc006a", glow: "rgba(204, 0, 106, 0.18)" },
  "GenAI Class": { primary: "#4c00ff", glow: "rgba(76, 0, 255, 0.18)" },
  "GenAI Lab": { primary: "#3d00cc", glow: "rgba(61, 0, 204, 0.18)" },
  "SD Class": { primary: "#00ae74", glow: "rgba(0, 174, 116, 0.18)" },
  "SD Lab": { primary: "#008b5d", glow: "rgba(0, 139, 93, 0.18)" },
  "Analytics": { primary: "#1e293b", glow: "rgba(30, 41, 59, 0.18)" },
  "All Lectures": { primary: "#0f172a", glow: "rgba(15, 23, 42, 0.18)" },
  "Exam Schedule": { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.18)" }
};

export const SEM5_SUBJECT_THEMES = {
  "CN Class": { primary: "#4c00ff", glow: "rgba(76, 0, 255, 0.18)" },
  "CN Lab": { primary: "#3d00cc", glow: "rgba(61, 0, 204, 0.18)" },
  "DL Class": { primary: "#00ae74", glow: "rgba(0, 174, 116, 0.18)" },
  "DL Lab": { primary: "#008b5d", glow: "rgba(0, 139, 93, 0.18)" },
  "AML Class": { primary: "#ff0084", glow: "rgba(255, 0, 132, 0.18)" },
  "AML Lab": { primary: "#cc006a", glow: "rgba(204, 0, 106, 0.18)" },
  "MCA Class": { primary: "#00aaff", glow: "rgba(0, 170, 255, 0.18)" },
  "MCA Lab": { primary: "#0088cc", glow: "rgba(0, 136, 204, 0.18)" },
  "Analytics": { primary: "#1e293b", glow: "rgba(30, 41, 59, 0.18)" },
  "All Lectures": { primary: "#0f172a", glow: "rgba(15, 23, 42, 0.18)" },
  "Exam Schedule": { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.18)" }
};
export function SubjectTabs({ activeTopic, onChange, activeSubject }) {
  const isLab = activeSubject?.includes('Lab');
  const tabs = [
    { id: 'Lectures', icon: BookOpen },
    { id: 'Assignments', icon: FileCheck },
    { id: 'Quizzes', icon: BrainCircuit },
    { id: 'Projects', icon: Layers },
    { id: 'Exams', icon: GraduationCap }
  ].filter(tab => !(isLab && (tab.id === 'Projects' || tab.id === 'Exams')));

  const [indicatorStyle, setIndicatorStyle] = useState({});
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const activeTab = containerRef.current?.querySelector('.tab-btn.active');
    if (activeTab) {
      setIndicatorStyle({
        width: `${activeTab.offsetWidth}px`,
        transform: `translateX(${activeTab.offsetLeft - 4}px)`
      });
    }
  }, [activeTopic]);

  return (
    <div className="subject-tabs-container">
      <div className="subject-tabs" ref={containerRef}>
        <div className="tab-indicator" style={indicatorStyle} />
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTopic === tab.id ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <tab.icon size={18} className="tab-icon" />
            <span>{tab.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ subjects, activeSubject, onSelect, syncStatus, activeSemester, onSemesterChange }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const toggleCollapsed = () => setCollapsed(current => {
    const next = !current;
    localStorage.setItem('sidebar_collapsed', String(next));
    return next;
  });

  return (
    <aside className={`sidebar glass ${collapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
      <div className="sidebar-header">
        <div className="logo-container">
          <Zap size={28} className="logo-icon" fill="var(--primary)" fillOpacity="0.15" />
          <h2 className="logo-text">Track<span>U</span></h2>
        </div>
        <button
          className="sidebar-collapse-toggle"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      {/* Semester Switcher */}
      <div className="semester-switcher" style={{ padding: '0 16px 16px 16px' }}>
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '8px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            onClick={() => onSemesterChange('4')}
            style={{
              flex: 1,
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: activeSemester === '4' ? 700 : 500,
              backgroundColor: activeSemester === '4' ? 'var(--primary)' : 'transparent',
              color: activeSemester === '4' ? 'white' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeSemester === '4' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            {collapsed ? '4' : 'Sem 4'}
          </button>
          <button
            onClick={() => onSemesterChange('5')}
            style={{
              flex: 1,
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: activeSemester === '5' ? 700 : 500,
              backgroundColor: activeSemester === '5' ? 'var(--primary)' : 'transparent',
              color: activeSemester === '5' ? 'white' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeSemester === '5' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            {collapsed ? '5' : 'Sem 5'}
          </button>
        </div>
      </div>

      <nav className="subject-list">
        <button
          className={`subject-btn ${activeSubject === 'Home' ? 'active' : ''}`}
          onClick={() => onSelect('Home')}
          style={{ marginBottom: '8px' }}
          title={collapsed ? 'Home' : undefined}
        >
          <Home size={18} />
          <span>Home</span>
          {activeSubject === 'Home' && <ChevronRight size={14} className="active-arrow" />}
        </button>



        <div className="sidebar-divider">Subjects</div>
        {subjects.map(subject => {
          const SubjectIcon = activeSemester === '5' ? SEM5_SUBJECT_ICONS[subject] || Hash : Hash;
          return (
          <button
            key={subject}
            className={`subject-btn ${activeSubject === subject ? 'active' : ''}`}
            onClick={() => onSelect(subject)}
            title={collapsed ? subject : undefined}
            aria-label={subject}
          >
            <SubjectIcon size={18} />
            <span>{subject}</span>
            {activeSubject === subject && <ChevronRight size={14} className="active-arrow" />}
          </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '20px', display: 'flex', alignItems: 'center' }}>
        <div
          className={`sync-badge ${syncStatus?.toLowerCase().includes('error') ? 'error' : ''} ${syncStatus?.toLowerCase().includes('up to date') ? 'online' : ''}`}
          style={{ border: 'none', background: 'transparent', padding: 0, minWidth: 'auto', boxShadow: 'none' }}
          title={syncStatus}
        >
          {syncStatus?.toLowerCase().includes('connecting') ? <Loader2 size={18} className="spin" /> :
            syncStatus?.toLowerCase().includes('error') ? <AlertCircle size={18} /> :
              syncStatus?.toLowerCase().includes('offline') ? <CloudOff size={18} /> :
                <Cloud size={18} style={{ color: syncStatus?.toLowerCase().includes('up to date') ? '#10b981' : '#64748b' }} />}
        </div>
      </div>
    </aside>
  );
}



export function BookmarkBar({ activeSubject, onSelect, leadData, homeSummary, time, activeSemester, onManagePeople, zoomLevel, zoomControlsOpen, onToggleZoomControls, onZoomUpdate }) {
  return (
    <div className="bookmark-bar glass unified-bar structured-layout">
      {/* Row 1: Internal Application Navigation */}
      <div className="bookmark-row primary-nav-row">
        {/* Group 1: Insights & Core */}
        <div className="nav-group-wrapper">
          <span className="group-label">Core</span>
          <div className="nav-group section-performance">
            <button
              className={`nav-btn ${activeSubject === 'Marks Overview' ? 'active' : ''}`}
              onClick={() => onSelect('Marks Overview')}
              title="Marks overview"
            >
              <LayoutDashboard size={16} />
              <span>Marks</span>
            </button>
            <button
              className={`nav-btn ${activeSubject === 'Detailed Analysis' ? 'active' : ''}`}
              onClick={() => onSelect('Detailed Analysis')}
              title="Detailed Analysis"
            >
              <ChartNoAxesCombined size={16} />
              <span>Analysis</span>
            </button>
            <button
              className={`nav-btn ${activeSubject === 'Activity Tracker' ? 'active' : ''}`}
              onClick={() => onSelect('Activity Tracker')}
              title="Activity tracker"
            >
              <Activity size={16} />
              <span>Activity</span>
            </button>
          </div>
        </div>

        <div className="nav-divider-vertical"></div>

        {/* Group 2: Work & System */}
        <div className="nav-group-wrapper">
          <span className="group-label">Work</span>
          <div className="nav-group section-tasks">

            <button
              className={`nav-btn ${activeSubject === 'All Lectures' ? 'active' : ''}`}
              onClick={() => onSelect('All Lectures')}
              title="Lecture repository"
            >
              <BookOpen size={16} />
              <span>Lectures</span>
            </button>
            <button
              className={`nav-btn ${activeSubject === 'Safe Zone' ? 'active' : ''}`}
              onClick={() => onSelect('Safe Zone')}
              title="Skip Manager"
            >
              <ShieldCheck size={16} />
              <span>Skip Manager</span>
            </button>
            <button
              className={`nav-btn ${activeSubject === 'Timetable' ? 'active' : ''}`}
              onClick={() => onSelect('Timetable')}
              title="Weekly Timetable"
            >
              <CalendarRange size={16} />
              <span>Timetable</span>
            </button>
            <button
              className={`nav-btn ${activeSubject === 'Exam Schedule' ? 'active' : ''}`}
              onClick={() => onSelect('Exam Schedule')}
              title="Exam schedule"
            >
              <CalendarDays size={16} />
              <span>Exams</span>
            </button>
          </div>
        </div>


        <div className="nav-group-wrapper navbar-tools">
          <span className="group-label">Tools</span>
          <div className="nav-group">
            {activeSemester === '5' && (
              <button className="nav-btn" onClick={onManagePeople} title="Manage comparison people">
                <Users size={16} />
                <span>Comparison People</span>
              </button>
            )}
            <div className="zoom-nav-control">
              <button className="nav-btn" onClick={onToggleZoomControls} aria-expanded={zoomControlsOpen} title={zoomControlsOpen ? 'Hide display zoom controls' : 'Show display zoom controls'}>
                <ZoomIn size={16} />
                <span>Display Zoom</span>
                <span className="zoom-nav-value">{zoomLevel}%</span>
                {zoomControlsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {zoomControlsOpen && (
                <div className="zoom-nav-actions">
                  <button className="nav-btn" onClick={() => onZoomUpdate(Math.max(50, zoomLevel - 10))} title="Zoom out"><ZoomOut size={16} /><span>Out</span></button>
                  <button className="nav-btn" onClick={() => onZoomUpdate(100)} title="Reset zoom"><RotateCcw size={16} /><span>Reset</span></button>
                  <button className="nav-btn" onClick={() => onZoomUpdate(Math.min(150, zoomLevel + 10))} title="Zoom in"><ZoomIn size={16} /><span>In</span></button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="navbar-countdown"><ExamCountdown /></div>
      </div>

      {/* Row 2: External Links & Status */}
      <div className="bookmark-row secondary-nav-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
        <div className="nav-group external-links" style={{ width: 'auto', gap: '12px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Access:</span>
          <a
            href="https://my.newtonschool.co/course/fj2b9gt1im6q/details"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="Newton School Portal"
          >
            <div className="link-icon-wrapper"><GraduationCap size={14} /></div>
            <span>Newton</span>
          </a>
          <a
            href="https://nst5.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="5th Sem Notes"
          >
            <div className="link-icon-wrapper"><BookOpen size={14} /></div>
            <span>5th Sem Notes</span>
          </a>
          <a
            href="https://dsayashpal.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="DSA Portal"
          >
            <div className="link-icon-wrapper"><Code2 size={14} /></div>
            <span>DSA Portal</span>
          </a>
          <a
            href="https://leetcode.com/problemset"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="LeetCode Problemset"
          >
            <div className="link-icon-wrapper"><CodeXml size={14} /></div>
            <span>LeetCode</span>
          </a>
          <a
            href="https://placeyashpal.vercel.app/dashboard"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="Placement Tracker"
          >
            <div className="link-icon-wrapper"><BriefcaseBusiness size={14} /></div>
            <span>Placement Tracker</span>
          </a>
          <a
            href="https://portfoliobyjs.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="Portfolio"
          >
            <div className="link-icon-wrapper"><ContactRound size={14} /></div>
            <span>Portfolio</span>
          </a>
          <a
            href="https://github.com/yashpal-2004"
            target="_blank"
            rel="noreferrer"
            className="bookmark-item premium-link"
            title="My Github Profile"
            style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '12px', marginLeft: '4px' }}
          >
            <div className="link-icon-wrapper" style={{ background: '#0f172a', color: 'white' }}><Github size={14} /></div>
            <span></span>
          </a>
        </div>
        {activeSubject === 'Home' && homeSummary && (
          <div className="home-summary-nav" aria-label="Attendance and remaining lectures">
            <div className="home-summary-nav-item">
              <CheckCircle2 size={18} />
              <div>
                <strong>{homeSummary.attendance}%</strong>
                <span>Total Attendance · {homeSummary.attended}/{homeSummary.total}</span>
              </div>
            </div>
          </div>
        )}
        <div className="lead-msg-inline">
          <div className="lead-msg-values">
            <span className="lead-msg-label">w/o asgn:</span>
            <span className={`lead-msg-value ${leadData.typeWithout}`}>{leadData.textWithout}</span>
            <span className="lead-msg-label">w/ asgn:</span>
            <span className={`lead-msg-value ${leadData.type}`}>{leadData.textWith}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


export function ComparisonPeopleManager({ people, onSave, onClose }) {
  const [draft, setDraft] = useState(people.map(person => ({ ...person })));
  const addPerson = () => setDraft(current => [...current, { id: `person_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: '' }]);
  const updateName = (id, name) => setDraft(current => current.map(person => person.id === id ? { ...person, name } : person));
  const removePerson = (id) => setDraft(current => current.filter(person => person.id !== id));

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={event => event.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Users size={22} /><h3 style={{ margin: 0 }}>Semester 5 Comparison People</h3></div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-fields">
          <p style={{ margin: 0, color: '#64748b' }}>Add people whose marks you want to compare with yours. Each person’s assessment marks are saved separately.</p>
          {draft.map(person => (
            <div key={person.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={person.name} onChange={event => updateName(person.id, event.target.value)} placeholder="Person name" aria-label="Comparison person name" />
              <button className="filter-btn" onClick={() => removePerson(person.id)} title={`Remove ${person.name || 'person'}`}><Trash2 size={16} /></button>
            </div>
          ))}
          <div className="modal-buttons" style={{ justifyContent: 'space-between' }}>
            <button className="filter-btn" onClick={addPerson}><Plus size={16} /> Add person</button>
            <button className="save-btn" onClick={() => {
              const cleaned = draft.map(person => ({ ...person, name: person.name.trim() })).filter(person => person.name);
              onSave(cleaned);
              onClose();
            }}><Save size={16} /> Save people</button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

export function ComparisonMarksFields({ people = [], values = {}, onChange, label = 'Marks' }) {
  const additionalPeople = people.filter(person => person.id !== 'dhruv');
  if (!additionalPeople.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
      {additionalPeople.map(person => (
        <div className="input-group" key={person.id} style={{ marginBottom: 0 }}>
          <label>{person.name} {label}</label>
          <input type="number" step="0.01" value={values[person.id] ?? ''} onChange={event => onChange(person.id, event.target.value)} placeholder="0" />
        </div>
      ))}
    </div>
  );
}

export function ExamCountdown({ now: externalNow }) {
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

      // Find absolute next milestone
      const milestones = [
        ...CONTEST_SCHEDULE.map(c => ({
          label: c.name,
          dateObj: getTargetAt9AM(c.date),
          type: 'contest'
        })),
        {
          label: 'Mid Sem',
          dateObj: getTargetAt9AM(EXAM_DATES.midSem),
          type: 'exam'
        },
        {
          label: 'End Sem',
          dateObj: getTargetAt9AM(EXAM_DATES.endSem),
          type: 'exam'
        }
      ].filter(m => m.dateObj > now)
        .sort((a, b) => a.dateObj - b.dateObj);

      if (milestones.length === 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, label: '', type: 'exam', expired: true };
      }

      const { label, dateObj: targetDate, type } = milestones[0];

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
      <div className="countdown-content" style={{ borderRight: '1px solid rgba(0,0,0,0.06)', paddingRight: '16px', marginRight: '16px' }}>
        <div className="countdown-timer">
          {nextEvent.days > 0 && <span className="time-unit"><strong>{nextEvent.days}</strong>d</span>}
          <span className="time-unit"><strong>{String(nextEvent.hours).padStart(2, '0')}</strong>h</span>
          <span className="time-unit"><strong>{String(nextEvent.minutes).padStart(2, '0')}</strong>m</span>
          <span className="time-unit"><strong>{String(nextEvent.seconds).padStart(2, '0')}</strong>s</span>
        </div>
        <span className="count-label">until {nextEvent.label}</span>
      </div>

      <div className="countdown-time-display" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
          {now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {(nextEvent.days === 0 && nextEvent.hours < 12) && <span className="urgent-badge">URGENT</span>}
    </div>
  );
}


export function TaskSection({ title, type, tasks, onAdd, onUpdate, onDelete, onEdit, activeSubject, friendMeta, comparisonPeople = [], onUpdateFriendMeta, threshold, portalNode }) {
  const legacyComparisonName = comparisonPeople.find(person => person.id === 'dhruv')?.name || 'Dhruv';
  const [val, setVal] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [link, setLink] = useState('');
  const [notionLink, setNotionLink] = useState('');
  const [impQs, setImpQs] = useState('');
  const [marks, setMarks] = useState('');
  const [dhruvMarks, setDhruvMarks] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [comparisonMarks, setComparisonMarks] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterMode, setFilterMode] = useState('All');

  const regularTasks = tasks;
  const attendanceStats = getAttendanceStats(regularTasks, friendMeta, activeSubject);
  const presentCount = attendanceStats.attended;
  const completedCount = regularTasks.filter(t => t.completed).length;
  const dhruvCompletedCount = regularTasks.filter(t => t.dhruvCompleted).length;
  const totalCount = attendanceStats.total;
  const attendPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const completePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const dhruvCompletePercent = totalCount > 0 ? Math.round((dhruvCompletedCount / totalCount) * 100) : 0;

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
      setMarks(d.marks || '');
      setDhruvMarks(d.dhruvMarks || '');
      setMaxMarks(d.maxMarks || '');
      if (d.date) setDate(d.date);
      // For assignment/quiz, ensure today's date is the default even if a draft exists
      if (['assignment', 'quiz'].includes(type)) {
        setDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setDate(new Date().toISOString().split('T')[0]);
    }
    setIsLoaded(true);
  }, [activeSubject, type]);

  // Save drafts whenever input values change
  useEffect(() => {
    if (!isLoaded) return; // Don't save drafts until initial load is complete

    const drafts = JSON.parse(localStorage.getItem('inputDrafts') || '{}');
    const key = `${activeSubject}_${type}`;
    drafts[key] = { val, link, notionLink, impQs, date, marks, dhruvMarks, maxMarks };
    localStorage.setItem('inputDrafts', JSON.stringify(drafts));
  }, [val, link, notionLink, impQs, date, marks, dhruvMarks, maxMarks, activeSubject, type, isLoaded]);

  // Update suggestions when val changes (for lectures only)
  useEffect(() => {
    if (type === 'lecture' && val.trim().length >= 2) {
      // Import dynamically to avoid circular dependencies
      import('./timetableMapping').then(module => {
        const matches = module.findMatchingLectures(val);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [val, type]);

  const handleSuggestionClick = (suggestion) => {
    setVal(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;

    const count = tasks.length + 1;
    const data = { name: val, number: count, date: date };
    if (type === 'lecture') {
      data.notes = link;
      data.notionUrl = notionLink;
    }
    if (type === 'assignment' || type === 'quiz' || type === 'project') {
      data.link = link;
      data.marks = Number(marks) || 0;
      data.dhruvMarks = Number(dhruvMarks) || 0;
      data.maxMarks = Number(maxMarks) || 0;
      data.comparisonMarks = comparisonMarks;
      if (data.marks > 0 || data.dhruvMarks > 0) data.completed = true;
    }
    if (type === 'quiz') data.impQs = impQs;

    onAdd(data);
    setVal('');
    setLink('');
    setNotionLink('');
    setImpQs('');
    setMarks('');
    setDhruvMarks('');
    setMaxMarks('');
    setComparisonMarks({});
    setDate(new Date().toISOString().split('T')[0]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const mountNode = portalNode || document.getElementById('section-stats-portal');

  // Calculate the live remote value for Dhruv based on offset logic
  const remoteDhruvCount = useMemo(() => {
    return friendMeta?.attendanceCount ?? presentCount;
  }, [friendMeta, presentCount]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filterMode === 'Pending') list = list.filter(t => !t.completed);
    else if (filterMode === 'Done') list = list.filter(t => t.completed);
    else if (filterMode === 'Important') list = list.filter(t => t.important);
    else if (filterMode === 'Free') list = list.filter(t => t.isFree);
    else if (filterMode === 'Regular') list = list.filter(t => !t.isFree);
    else if (filterMode === 'Doubt') list = list.filter(t => t.hasDoubt);
    return list;
  }, [tasks, filterMode]);

  const [localAttendance, setLocalAttendance] = useState(null);

  // Keep local state in sync with remote calculations
  useEffect(() => {
    setLocalAttendance(remoteDhruvCount);
  }, [remoteDhruvCount]);

  const statsBarContent = (
    <div className="unified-stats-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        className={`header-add-btn ${showForm ? 'active' : ''}`}
        onClick={() => setShowForm(!showForm)}
        title={showForm ? "Close Form" : `Add ${title.slice(0, -1)}`}
      >
        {showForm ? <X size={18} /> : <Plus size={18} />}
        <span>{showForm ? 'Cancel' : `Add ${title.slice(0, -1)}`}</span>
      </button>

      <div className="unified-stats-bar">
        {type === 'lecture' && (
          <>
            <div className="stat-item">
              <div className="stat-info">
                <div className="stat-label">ME</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.05)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <span className={`stat-value ${attendPercent >= 75 ? 'stat-success' : 'stat-danger'}`}>{presentCount}</span>
                  <span className="stat-value" style={{ opacity: 0.3, fontSize: '0.8em' }}>/</span>
                  <span className="stat-value" style={{ fontSize: '0.9rem', opacity: 0.6 }}>{totalCount}</span>
                  <span className={`stat-subtext ${attendPercent >= 75 ? 'stat-success' : 'stat-danger'}`} style={{ marginLeft: '4px' }}>{attendPercent}%</span>
                </div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-info">
                <div className="stat-label">{legacyComparisonName.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    value={localAttendance ?? 0}
                    onChange={e => {
                      const val = e.target.value;
                      const newVal = val === '' ? 0 : parseInt(val);
                      setLocalAttendance(newVal);
                      onUpdateFriendMeta({
                        attendanceOffset: newVal - presentCount,
                        attendanceCount: null
                      });
                    }}
                    className="header-stat-input"
                    style={{ width: '32px', height: '22px', fontSize: '0.9rem', border: '1px solid #fcd34d', background: '#fffbeb' }}
                  />
                  <span className="stat-value" style={{ opacity: 0.3, fontSize: '0.8em' }}>/</span>
                  <span className="stat-value" style={{ fontSize: '0.9rem', opacity: 0.6 }}>{totalCount}</span>
                  <span className={`stat-subtext ${((localAttendance ?? 0) / (totalCount || 1) * 100) >= 75 ? 'stat-warning' : 'stat-danger'}`} style={{ marginLeft: '4px' }}>
                    {totalCount > 0 ? Math.round(((localAttendance ?? 0) / totalCount) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        {type === 'project' && (() => {
          const tMarksArr = tasks.filter(t => t.type === 'project');
          const sumMy = tMarksArr.reduce((acc, t) => acc + (t.marks || 0), 0);
          const sumDhruv = tMarksArr.reduce((acc, t) => acc + (t.dhruvMarks || 0), 0);
          const sumMax = tMarksArr.reduce((acc, t) => acc + (t.maxMarks || 0), 0);

          return (
            <>
              <div className="stat-item">
                <div className="stat-info">
                  <div className="stat-label" style={{ color: '#6366f1' }}>ME</div>
                  <input
                    type="number"
                    value={friendMeta?.myProjectMarks || ''}
                    onChange={e => {
                      const val = e.target.value;
                      onUpdateFriendMeta({
                        myProjectMarks: val === '' ? null : Number(val)
                      });
                    }}
                    placeholder={sumMy > 0 ? sumMy : "—"}
                    className="header-stat-input"
                    style={{ width: '40px', height: '22px', fontSize: '0.85rem', borderColor: '#c7d2fe', background: '#f5f7ff' }}
                  />
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-info">
                  <div className="stat-label" style={{ color: '#f59e0b' }}>{legacyComparisonName.toUpperCase()}</div>
                  <input
                    type="number"
                    value={friendMeta?.dhruvProjectMarks || ''}
                    onChange={e => {
                      const val = e.target.value;
                      onUpdateFriendMeta({
                        dhruvProjectMarks: val === '' ? null : Number(val)
                      });
                    }}
                    placeholder={sumDhruv > 0 ? sumDhruv : "—"}
                    className="header-stat-input"
                    style={{ width: '40px', height: '22px', fontSize: '0.85rem', borderColor: '#fcd34d', background: '#fffbeb' }}
                  />
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-info">
                  <div className="stat-label" style={{ color: '#8b5cf6' }}>MAX</div>
                  <input
                    type="number"
                    value={friendMeta?.maxProjectMarks || ''}
                    onChange={e => {
                      const val = e.target.value;
                      onUpdateFriendMeta({
                        maxProjectMarks: val === '' ? null : Number(val)
                      });
                    }}
                    placeholder={sumMax > 0 ? sumMax : "—"}
                    className="header-stat-input"
                    style={{ width: '40px', height: '22px', fontSize: '0.85rem', borderColor: '#ddd6fe', background: '#f5f3ff' }}
                  />
                </div>
              </div>
            </>
          );
        })()}
        {!['assignment', 'quiz'].includes(type) && (
          <div className="stat-item">
            <div className="stat-info">
              <div className="stat-label">{type === 'lecture' ? 'ME COMP' : 'ME'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="stat-value">{completePercent}%</span>
                <span className="stat-subtext" style={{ opacity: 0.6 }}>{completedCount}/{totalCount}</span>
              </div>
            </div>
          </div>
        )}
        {type === 'project' && (
          <div className="stat-item">
            <div className="stat-info">
              <div className="stat-label">{legacyComparisonName.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="stat-value" style={{ color: '#f59e0b' }}>{dhruvCompletePercent}%</span>
                <span className="stat-subtext" style={{ opacity: 0.6 }}>{dhruvCompletedCount}/{totalCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const statsBar = (mountNode instanceof Element) ? createPortal(statsBarContent, mountNode) : null;
  const statsBarInline = <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)' }}>{statsBarContent}</div>;

  return (
    <section className={`task-section ${type}-section glass`}>
      {!mountNode && statsBarInline}
      {statsBar}
      <div className="section-header-compact" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="section-title-group">
            <p className="section-subtitle" style={{ margin: 0, fontWeight: 800, color: 'var(--primary)' }}>
              {filterMode} {title} ({filteredTasks.length})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(type === 'lecture'
                ? ['All', 'Pending', 'Done', 'Important', 'Free', 'Regular']
                : ['All', 'Pending', 'Done', 'Important', 'Doubt']
              ).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`filter-btn ${filterMode === mode ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: filterMode === mode ? 'var(--primary)' : '#f1f5f9',
                    color: filterMode === mode ? 'white' : '#64748b',
                    border: '1px solid',
                    borderColor: filterMode === mode ? 'var(--primary)' : '#e2e8f0',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && createPortal(
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px var(--primary-glow)'
                }}>
                  <Plus size={24} />
                </div>
                <h3 style={{ margin: 0 }}>Add New {title.slice(0, -1)}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <form className="modal-fields" onSubmit={(e) => { handleSubmit(e); setShowForm(false); }}>
              {/* Lecture Name */}
              <div className="input-group">
                <label>{title.slice(0, -1)} Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder={`${title.slice(0, -1)} name`}
                    value={val}
                    onChange={e => {
                      setVal(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoFocus
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="suggestion-item"
                          onClick={() => {
                            setVal(s);
                            setShowSuggestions(false);
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="input-group">
                <label>Scheduled Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              {/* Links Section */}
              <div className="input-group">
                <label>{type === 'lecture' ? "Resources & Notes" : "Reference Link"}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      placeholder={type === 'lecture' ? "Lecture/Notes Link (optional)" : "Link (optional)"}
                      style={{ width: '100%', paddingLeft: '44px' }}
                      value={link}
                      onChange={e => setLink(e.target.value)}
                    />
                    <BookOpen size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  </div>

                  {type === 'lecture' && (
                    <div style={{ position: 'relative' }}>
                      <input
                        placeholder="Notion Notes URL (optional)"
                        style={{ width: '100%', paddingLeft: '44px' }}
                        value={notionLink}
                        onChange={e => setNotionLink(e.target.value)}
                      />
                      <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                        <NotionLogo size={18} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {type === 'quiz' && (
                <div className="input-group">
                  <label>Important Questions</label>
                  <input
                    placeholder="e.g. Q4, Q7, Topic: BFS..."
                    value={impQs}
                    onChange={e => setImpQs(e.target.value)}
                  />
                </div>
              )}

              {['assignment', 'quiz', 'project'].includes(type) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div className="input-group">
                    <label style={{ color: 'var(--primary)', opacity: 0.8 }}>My Marks</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={marks}
                      onChange={e => setMarks(e.target.value)}
                      style={{ border: '1px solid var(--primary-glow)', background: 'white' }}
                    />
                  </div>
                  <div className="input-group">
                    <label style={{ color: '#f59e0b', opacity: 0.8 }}>{legacyComparisonName} Marks</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={dhruvMarks}
                      onChange={e => setDhruvMarks(e.target.value)}
                      style={{ border: '1px solid rgba(245, 158, 11, 0.2)', background: 'white' }}
                    />
                  </div>
                  <div className="input-group">
                    <label style={{ color: '#64748b' }}>Out of (Max)</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={maxMarks}
                      onChange={e => setMaxMarks(e.target.value)}
                      style={{ background: 'white' }}
                    />
                  </div>
                </div>
              )}

              {['assignment', 'quiz', 'project'].includes(type) && (
                <ComparisonMarksFields
                  people={comparisonPeople}
                  values={comparisonMarks}
                  onChange={(id, value) => setComparisonMarks(current => ({ ...current, [id]: value === '' ? '' : Number(value) }))}
                />
              )}

              {/* Add Button */}
              <div className="modal-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="save-btn">
                  <Plus size={20} />
                  <span>Create {title.slice(0, -1)}</span>
                </button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Timeline Layout for Lectures */}
      {type === 'lecture' ? (
        <div className="timeline-container">
          {filteredTasks.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No matching lectures found</div>
          ) : filteredTasks.map((task, index) => (
            <div key={task.id} className={`timeline-item ${task.completed ? 'completed' : ''} ${task.important ? 'important' : ''} ${task.isFree ? 'free' : ''}`}>
              <div className="timeline-marker">
                <div className="timeline-dot">
                  <span className="dot-number">#{task.number}</span>
                </div>
                {index < filteredTasks.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-card-main">
                  <div className="timeline-card-top">
                    <div className="timeline-card-title-group">
                      <div className="timeline-card-title">
                        <BookOpen size={18} className="title-icon" />
                        {task.notes ? (
                          <a href={task.notes} target="_blank" rel="noreferrer" className="lecture-link">
                            {task.name}
                            <ExternalLink size={14} className="ext-link-icon" />
                          </a>
                        ) : (
                          <span className="lecture-name">{task.name}</span>
                        )}
                      </div>
                      <div className="timeline-card-date">
                        <Calendar size={14} /> {formatDate(task.date)}
                        {task.notionUrl && (
                          <a href={task.notionUrl} target="_blank" rel="noreferrer" className="notion-chip">
                            <NotionLogo size={14} /> <span>Notes</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="timeline-card-status">
                      {task.present !== false ? (
                        <div className="status-pill present" title="Present">P</div>
                      ) : (
                        <div className="status-pill absent" title="Absent">A</div>
                      )}
                    </div>
                  </div>

                  <div className="timeline-card-bottom">
                    <div className="timeline-card-toggles">
                      <label className="toggle-chip">
                        <input
                          type="checkbox"
                          checked={task.present ?? true}
                          onChange={e => onUpdate(task.id, { present: e.target.checked })}
                        />
                        <div className="chip-content">
                          <CheckCircle2 size={16} className="chip-icon" />
                          <span>Attendance</span>
                        </div>
                      </label>
                      <label className="toggle-chip">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={e => onUpdate(task.id, { completed: e.target.checked })}
                        />
                        <div className="chip-content">
                          <CheckCircle size={16} className="chip-icon" />
                          <span>Completed</span>
                        </div>
                      </label>
                      {task.isFree && <span className="meta-badge free">☕ Free Lecture</span>}
                      {task.important && <span className="meta-badge important">⭐ Important</span>}
                      {task.autoCreated && <span className="meta-badge auto">✨ Auto</span>}
                    </div>

                    <div className="timeline-card-actions">
                      <button className={`action-btn ${task.isFree ? 'active' : ''}`} onClick={() => onUpdate(task.id, { isFree: !task.isFree })} title="Free Lecture">
                        <Coffee size={16} />
                      </button>
                      <button className={`action-btn ${task.important ? 'active' : ''}`} onClick={() => onUpdate(task.id, { important: !task.important })} title="Important">
                        <Star size={16} />
                      </button>
                      <button className="action-btn" onClick={() => onEdit(task)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="action-btn delete" onClick={() => onDelete(task.id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Card Gallery Layout for Assignments, Quizzes, Projects & Contests */
        <div className="card-gallery">
          {filteredTasks.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', gridColumn: '1/-1' }}>No matching items found</div>
          ) : filteredTasks.map(task => (
            <div key={task.id} className={`gallery-card exam-card ${task.completed ? 'completed' : ''} ${task.important ? 'important' : ''} ${task.hasDoubt ? 'has-doubt' : ''}`}>
              <div className="card-header">
                <div className="card-number-badge">#{task.number}</div>
                <div className="card-header-actions">
                  <button className={`card-btn-minimal ${task.completed ? 'completed' : ''}`} onClick={() => onUpdate(task.id, { completed: !task.completed })} title={task.completed ? "Mark as Pending" : "Mark as Done"}>
                    <CheckCircle size={14} color={task.completed ? "#10b981" : "currentColor"} />
                  </button>
                  <button className={`card-btn-minimal ${task.hasDoubt ? 'active' : ''}`} onClick={() => onUpdate(task.id, { hasDoubt: !task.hasDoubt })} title="Toggle Doubt">
                    <HelpCircle size={14} color={task.hasDoubt ? "#ef4444" : "currentColor"} />
                  </button>
                  <button className="card-btn-minimal" onClick={() => onUpdate(task.id, { important: !task.important })} title="Mark Important">
                    <Star size={13} fill={task.important ? "#f59e0b" : "none"} color={task.important ? "#f59e0b" : "currentColor"} />
                  </button>
                  <button className="card-btn-minimal" onClick={() => onEdit(task)} title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button className="card-btn-minimal delete" onClick={() => onDelete(task.id)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="card-body">
                <h4 className="card-title">
                  {task.link ? (
                    <a href={task.link} target="_blank" rel="noreferrer">
                      {task.name} <ExternalLink size={14} style={{ opacity: 0.5, marginLeft: '4px' }} />
                    </a>
                  ) : task.name}
                </h4>
                <div className="card-meta">
                  <span className="card-date"><Calendar size={14} /> {formatDate(task.date)}</span>
                  {type === 'quiz' && task.impQs && (
                    <span className="meta-tag impqs-tag" style={{ marginLeft: '8px' }}>⚡ {task.impQs}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {task.completed && (
                    <div style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      DONE
                    </div>
                  )}
                  {task.hasDoubt && (
                    <div style={{ fontSize: '0.65rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      HAS DOUBT
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <span className="meta-tag">You: {Number(task.marks || 0).toFixed(2)}{task.maxMarks ? ` / ${task.maxMarks}` : ''}</span>
                  {comparisonPeople.map(person => {
                    const score = person.id === 'dhruv' ? task.dhruvMarks : task.comparisonMarks?.[person.id];
                    return <span className="meta-tag" key={person.id}>{person.name}: {Number(score || 0).toFixed(2)}{task.maxMarks ? ` / ${task.maxMarks}` : ''}</span>;
                  })}
                </div>
              </div>

              {!['assignment', 'quiz'].includes(type) && (
                <div className="card-marks-panel">
                  <div className="marks-grid">
                    <div className="mark-item user">
                      <div className="mark-header">
                        <User size={12} />
                        <span>YOU</span>
                      </div>
                      <div className="mark-input">
                        {task.marks !== undefined ? Number(task.marks).toFixed(2) : (tasks.length === 1 && friendMeta?.myProjectMarks !== undefined ? (Number(friendMeta.myProjectMarks).toFixed(2) || "0.00") : "0.00")}
                      </div>
                    </div>
                    <div className="mark-item friend">
                      <div className="mark-header">
                        <Users size={12} />
                        <span>{legacyComparisonName.toUpperCase()}</span>
                      </div>
                      <div className="mark-input">
                        {task.dhruvMarks !== undefined ? Number(task.dhruvMarks).toFixed(2) : (tasks.length === 1 && friendMeta?.dhruvProjectMarks !== undefined ? (Number(friendMeta.dhruvProjectMarks).toFixed(2) || "0.00") : "0.00")}
                      </div>
                    </div>
                    <div className="mark-item max">
                      <div className="mark-header">
                        <Target size={12} />
                        <span>MAX</span>
                      </div>
                      <div className="mark-input">
                        {task.maxMarks !== undefined ? Number(task.maxMarks).toFixed(2) : (Number(friendMeta?.maxProjectMarks).toFixed(2) || "100.00")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Helper function to get subject weightages and expected counts
export function getSubjectWeights(subjectName) {
  const name = subjectName.toLowerCase();
  // Semester 5 has a different assessment split from the older subjects.
  // Keep these keyed by the existing subject abbreviations so both Class and
  // Lab views use the same course weightage.
  if (name.includes('aml')) {
    return {
      weights: { attendance: 0, assignment: 0.05, project: 0.20, midSem: 0.25, endSem: 0.40, contest: 0.10 },
      counts: { contest: 1, midSem: 1, endSem: 1, quiz: 1 }
    };
  }
  if (name.includes('cn')) {
    return {
      weights: { attendance: 0, assignment: 0, project: 0.20, midSem: 0.20, endSem: 0.40, contest: 0.20 },
      counts: { contest: 2, midSem: 1, endSem: 1, quiz: 1 }
    };
  }
  if (name.includes('dl')) {
    return {
      weights: { attendance: 0, assignment: 0.05, project: 0.25, midSem: 0.20, endSem: 0.40, contest: 0.10 },
      counts: { contest: 2, midSem: 1, endSem: 1, quiz: 1 }
    };
  }
  if (name.includes('mca')) {
    return {
      weights: { attendance: 0, assignment: 0.10, project: 0.10, midSem: 0.20, endSem: 0.40, contest: 0.20 },
      counts: { contest: 2, midSem: 1, endSem: 1, quiz: 1 }
    };
  }
  const isGenAI = name.includes('genai') || name.includes('os');
  const isDM = name.includes('dm') || name.includes('cn');
  const isDVA = name.includes('dva') || name.includes('DL');
  const isSD = name.includes('sd') || name.includes('daa');

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

export function ContestSection({ activeSubject, tasks, comparisonPeople = [], onAdd, onUpdate, onDelete, onEdit }) {
  const legacyComparisonName = comparisonPeople.find(person => person.id === 'dhruv')?.name || 'Dhruv';
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
  const [showForm, setShowForm] = useState(false);

  // Direct Marks fields
  const [isDirectMode, setIsDirectMode] = useState(false);
  const [directMarks, setDirectMarks] = useState('');
  const [directDhruvMarks, setDirectDhruvMarks] = useState('');
  const [directMax, setDirectMax] = useState('');
  const [comparisonMarks, setComparisonMarks] = useState({});

  const [isLoaded, setIsLoaded] = useState(false);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate total marks for contests
  const totalMarks = tasks.reduce((acc, t) => acc + (t.marks || 0), 0);
  const dhruvTotalMarks = tasks.reduce((acc, t) => acc + (t.dhruvMarks || 0), 0);
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
      setIsDirectMode(d.isDirectMode || false);
      setDirectMarks(d.directMarks || '');
      setDirectDhruvMarks(d.directDhruvMarks || '');
      setDirectMax(d.directMax || '');
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
      hasWritten, writtenCorrect, writtenTotal, writtenWeight,
      isDirectMode, directMarks, directDhruvMarks, directMax
    };
    localStorage.setItem('contestDrafts', JSON.stringify(drafts));
  }, [contestName, hasQuiz, quizCorrect, quizTotal, quizWeight, hasCoding, codingCorrect, codingTotal, codingWeight, hasWritten, writtenCorrect, writtenTotal, writtenWeight, isDirectMode, directMarks, directDhruvMarks, directMax, activeSubject, isLoaded]);

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

    const { marks, maxMarks } = isDirectMode
      ? { marks: parseFloat(directMarks) || 0, maxMarks: parseFloat(directMax) || 0 }
      : calculateMarks(personComponents);

    const { marks: dhruvMarks } = isDirectMode
      ? { marks: parseFloat(directDhruvMarks) || 0 }
      : calculateMarks(dhruvComponents);

    const data = {
      name: contestName,
      number: count,
      date: contestDate,
      isDirectMode,
      marks,
      dhruvMarks,
      maxMarks,
      comparisonMarks,
      completed: marks > 0 || dhruvMarks > 0
    };

    if (!isDirectMode) {
      data.hasQuiz = hasQuiz;
      data.hasCoding = hasCoding;
      data.hasWritten = hasWritten;

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
    setDirectMarks('');
    setDirectDhruvMarks('');
    setDirectMax('');
    setComparisonMarks({});
  };

  const [portalNode, setPortalNode] = useState(null);
  useEffect(() => {
    setPortalNode(document.getElementById('section-stats-portal'));
  }, []);

  const statsBar = portalNode && createPortal(
    <div className="unified-stats-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        className={`header-add-btn ${showForm ? 'active' : ''}`}
        onClick={() => setShowForm(!showForm)}
        title={showForm ? "Close Form" : "Add Contest"}
      >
        {showForm ? <X size={18} /> : <Plus size={18} />}
        <span>{showForm ? 'Cancel' : 'Add Contest'}</span>
      </button>

    </div>,
    portalNode
  );

  return (
    <section className="task-section contest-section glass">
      {statsBar}
      <div className="section-header-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-title-group">
          <p className="section-subtitle">{totalCount} total contests</p>
        </div>
        <div className="section-stats-summary" style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', fontWeight: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', padding: '4px 10px', borderRadius: '8px' }}>
            <Trophy size={12} />
            <span>ME: {totalMarks.toFixed(2)}/{maxMarks.toFixed(2)} <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : "0.00"}%)</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)', padding: '4px 10px', borderRadius: '8px' }}>
            <Trophy size={12} />
            <span>DHRUV: {dhruvTotalMarks.toFixed(2)}/{maxMarks.toFixed(2)} <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({maxMarks > 0 ? ((dhruvTotalMarks / maxMarks) * 100).toFixed(2) : "0.00"}%)</span></span>
          </div>
        </div>
      </div>

      {showForm && createPortal(
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)'
                }}>
                  <Plus size={24} />
                </div>
                <h3 style={{ margin: 0 }}>Add New Contest</h3>
              </div>
              <button className="close-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <form className="modal-fields" onSubmit={(e) => { handleSubmit(e); setShowForm(false); }}>
              {/* Contest Name & Date */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Contest Details</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none', color: isDirectMode ? 'var(--primary)' : 'inherit' }}>
                    <input type="checkbox" checked={isDirectMode} onChange={e => setIsDirectMode(e.target.checked)} />
                    Enter marks directly
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <input
                    placeholder="Contest name"
                    value={contestName}
                    onChange={e => setContestName(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <input
                    type="date"
                    value={contestDate}
                    onChange={e => setContestDate(e.target.value)}
                    style={{ width: '160px' }}
                  />
                </div>
              </div>

              {isDirectMode ? (
                /* Direct Marks Mode */
                <div style={{ display: 'flex', gap: '15px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ color: '#10b981' }}>YOUR MARKS</label>
                    <input type="number" step="0.01" value={directMarks} onChange={e => setDirectMarks(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ color: '#f59e0b' }}>{legacyComparisonName.toUpperCase()} MARKS</label>
                    <input type="number" step="0.01" value={directDhruvMarks} onChange={e => setDirectDhruvMarks(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ color: '#64748b' }}>TOTAL MARKS</label>
                    <input type="number" step="0.01" value={directMax} onChange={e => setDirectMax(e.target.value)} placeholder="10.00" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Components Row */}
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {/* Quiz Component */}
                    <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: hasQuiz ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: hasQuiz ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(0,0,0,0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 800, color: hasQuiz ? '#8b5cf6' : 'inherit' }}>
                        <input type="checkbox" checked={hasQuiz} onChange={e => setHasQuiz(e.target.checked)} />
                        Quiz Component
                      </label>
                      {hasQuiz && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#8b5cf6', fontWeight: 800 }}>YOU</span>
                            <input type="number" placeholder="U" value={quizCorrect} onChange={e => setQuizCorrect(e.target.value)} className="small-input" />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>{legacyComparisonName.toUpperCase()}</span>
                            <input type="number" placeholder="D" value={dhruvQuizCorrect} onChange={e => setDhruvQuizCorrect(e.target.value)} className="small-input" style={{ borderColor: '#fcd34d' }} />
                          </div>
                          <span style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>/</span>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>TOTAL</span>
                            <input type="number" placeholder="T" value={quizTotal} onChange={e => setQuizTotal(e.target.value)} className="small-input" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coding Component */}
                    <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: hasCoding ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: hasCoding ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(0,0,0,0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 800, color: hasCoding ? '#3b82f6' : 'inherit' }}>
                        <input type="checkbox" checked={hasCoding} onChange={e => setHasCoding(e.target.checked)} />
                        Coding Component
                      </label>
                      {hasCoding && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 800 }}>YOU</span>
                            <input type="number" placeholder="U" value={codingCorrect} onChange={e => setCodingCorrect(e.target.value)} className="small-input" />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>{legacyComparisonName.toUpperCase()}</span>
                            <input type="number" placeholder="D" value={dhruvCodingCorrect} onChange={e => setDhruvCodingCorrect(e.target.value)} className="small-input" style={{ borderColor: '#fcd34d' }} />
                          </div>
                          <span style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>/</span>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>TOTAL</span>
                            <input type="number" placeholder="T" value={codingTotal} onChange={e => setCodingTotal(e.target.value)} className="small-input" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Written Component */}
                  <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: hasWritten ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: hasWritten ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(0,0,0,0.05)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 800, color: hasWritten ? '#10b981' : 'inherit' }}>
                      <input type="checkbox" checked={hasWritten} onChange={e => setHasWritten(e.target.checked)} />
                      Written Component
                    </label>
                    {hasWritten && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 800 }}>YOU</span>
                          <input type="number" placeholder="U" value={writtenCorrect} onChange={e => setWrittenCorrect(e.target.value)} className="small-input" />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>{legacyComparisonName.toUpperCase()}</span>
                          <input type="number" placeholder="D" value={dhruvWrittenCorrect} onChange={e => setDhruvWrittenCorrect(e.target.value)} className="small-input" style={{ borderColor: '#fcd34d' }} />
                        </div>
                        <span style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>/</span>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>TOTAL</span>
                          <input type="number" placeholder="T" value={writtenTotal} onChange={e => setWrittenTotal(e.target.value)} className="small-input" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weights Row */}
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
                    {hasQuiz && (
                      <div style={{ flex: 1, minWidth: '100px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#8b5cf6' }}>Quiz Weight</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            placeholder="40"
                            value={quizWeight}
                            onChange={e => setQuizWeight(e.target.value)}
                            className="small-input"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                        </div>
                      </div>
                    )}
                    {hasCoding && (
                      <div style={{ flex: 1, minWidth: '100px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#3b82f6' }}>Coding Weight</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            placeholder="60"
                            value={codingWeight}
                            onChange={e => setCodingWeight(e.target.value)}
                            className="small-input"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                        </div>
                      </div>
                    )}
                    {hasWritten && (
                      <div style={{ flex: 1, minWidth: '100px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#10b981' }}>Written Weight</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            placeholder="30"
                            value={writtenWeight}
                            onChange={e => setWrittenWeight(e.target.value)}
                            className="small-input"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <ComparisonMarksFields people={comparisonPeople} values={comparisonMarks} label="Weighted marks" onChange={(id, value) => setComparisonMarks(current => ({ ...current, [id]: value === '' ? '' : Number(value) }))} />

              {/* Add Button */}
              <div className="modal-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="save-btn" style={{ background: '#f59e0b', boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)' }}>
                  <Plus size={20} />
                  <span>Create Contest</span>
                </button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="card-gallery">
        {tasks.map(task => (
          <div key={task.id} className={`gallery-card exam-card ${task.completed ? 'completed' : ''}`}>
            <div className="card-header">
              <div className="card-number-badge">#{task.number}</div>
              <div className="card-header-actions">

                <button className="card-btn-minimal" onClick={() => onEdit(task)} title="Edit">
                  <Edit2 size={13} />
                </button>
                <button className="card-btn-minimal delete" onClick={() => onDelete(task.id)} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="card-body">
              <h4 className="card-title">{task.name}</h4>
              <div className="card-meta">
                <span className="card-date"><Calendar size={14} /> {formatDate(task.date)}</span>
              </div>

              {task.isDirectMode && (
                <div style={{ fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start', fontWeight: 800, marginTop: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  DIRECT ENTRY
                </div>
              )}

              {/* Contest Components Breakdown */}
              <div className="contest-components-mini" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {task.hasQuiz && (
                  <div style={{ fontSize: '0.75rem', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.05)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Quiz</span>
                    <span>{task.quizCorrect}/{task.quizTotal} <span style={{ opacity: 0.6 }}>({Math.round((task.quizCorrect / task.quizTotal) * 100)}%)</span></span>
                  </div>
                )}
                {task.hasCoding && (
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Coding</span>
                    <span>{task.codingCorrect}/{task.codingTotal} <span style={{ opacity: 0.6 }}>({Math.round((task.codingCorrect / task.codingTotal) * 100)}%)</span></span>
                  </div>
                )}
                {task.hasWritten && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Written</span>
                    <span>{task.writtenCorrect}/{task.writtenTotal} <span style={{ opacity: 0.6 }}>({Math.round((task.writtenCorrect / task.writtenTotal) * 100)}%)</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-marks-panel">
              <div className="marks-grid">
                <div className="mark-item user">
                  <div className="mark-header"><User size={12} /><span>YOU</span></div>
                  <div className="mark-input">{task.marks?.toFixed(2)}</div>
                </div>
                <div className="mark-item friend">
                  <div className="mark-header"><Users size={12} /><span>{legacyComparisonName.toUpperCase()}</span></div>
                  <div className="mark-input">{task.dhruvMarks?.toFixed(2)}</div>
                </div>
                <div className="mark-item max">
                  <div className="mark-header"><Target size={12} /><span>MAX</span></div>
                  <div className="mark-input">{task.maxMarks?.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExamSection({ title, type, activeSubject, tasks, comparisonPeople = [], onAdd, onUpdate, onDelete, onEdit }) {
  const legacyComparisonName = comparisonPeople.find(person => person.id === 'dhruv')?.name || 'Dhruv';
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
  const [showForm, setShowForm] = useState(false);

  // Direct Mode fields
  const [isDirectMode, setIsDirectMode] = useState(false);
  const [directMarks, setDirectMarks] = useState('');
  const [directDhruvMarks, setDirectDhruvMarks] = useState('');
  const [directMax, setDirectMax] = useState('');
  const [comparisonMarks, setComparisonMarks] = useState({});

  const [isLoaded, setIsLoaded] = useState(false);

  const totalCount = tasks.length;

  // Calculate total marks for exams
  const totalMarks = tasks.reduce((acc, t) => acc + (t.marks || 0), 0);
  const dhruvTotalMarks = tasks.reduce((acc, t) => acc + (t.dhruvMarks || 0), 0);
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
      hasWritten, writtenCorrect, writtenTotal, writtenWeight,
      isDirectMode, directMarks, directDhruvMarks, directMax
    };
    localStorage.setItem(`${type}Drafts`, JSON.stringify(drafts));
  }, [examName, hasQuiz, quizCorrect, quizTotal, quizWeight, hasCoding, codingCorrect, codingTotal, codingWeight, hasWritten, writtenCorrect, writtenTotal, writtenWeight, isDirectMode, directMarks, directDhruvMarks, directMax, activeSubject, type, isLoaded]);

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

    const { marks, maxMarks } = isDirectMode
      ? { marks: parseFloat(directMarks) || 0, maxMarks: parseFloat(directMax) || 0 }
      : calculateMarks(personComponents);

    const { marks: dhruvMarks } = isDirectMode
      ? { marks: parseFloat(directDhruvMarks) || 0 }
      : calculateMarks(dhruvComponents);

    const data = {
      name: examName,
      number: count,
      date: examDate,
      isDirectMode,
      marks,
      dhruvMarks,
      maxMarks,
      comparisonMarks,
      completed: marks > 0 || dhruvMarks > 0
    };

    if (!isDirectMode) {
      data.hasQuiz = hasQuiz;
      data.hasCoding = hasCoding;
      data.hasWritten = hasWritten;

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
    setDirectMarks('');
    setDirectDhruvMarks('');
    setDirectMax('');
    setComparisonMarks({});
  };

  const [portalNode, setPortalNode] = useState(null);
  useEffect(() => {
    setPortalNode(document.getElementById('section-stats-portal'));
  }, []);

  const statsBar = portalNode && createPortal(
    <div className="unified-stats-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        className={`header-add-btn ${showForm ? 'active' : ''}`}
        onClick={() => setShowForm(!showForm)}
        title={showForm ? "Close Form" : `Add ${title.slice(0, -1)}`}
      >
        {showForm ? <X size={18} /> : <Plus size={18} />}
        <span>{showForm ? 'Cancel' : title.includes('Mid') ? 'Mid' : 'End'}</span>
      </button>

    </div>,
    portalNode
  );

  return (
    <section className={`task-section ${type}-section glass`}>
      {statsBar}
      <div className="section-header-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-title-group">
          <p className="section-subtitle">{totalCount} total exams</p>
        </div>
        <div className="section-stats-summary" style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', fontWeight: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', padding: '4px 10px', borderRadius: '8px' }}>
            <Trophy size={12} />
            <span>ME: {totalMarks.toFixed(2)}/{maxMarks.toFixed(2)} <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : "0.00"}%)</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)', padding: '4px 10px', borderRadius: '8px' }}>
            <Trophy size={12} />
            <span>DHRUV: {dhruvTotalMarks.toFixed(2)}/{maxMarks.toFixed(2)} <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({maxMarks > 0 ? ((dhruvTotalMarks / maxMarks) * 100).toFixed(2) : "0.00"}%)</span></span>
          </div>
        </div>
      </div>

      {showForm && createPortal(
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px var(--primary-glow)'
                }}>
                  <Plus size={24} />
                </div>
                <h3 style={{ margin: 0 }}>Add New Exam</h3>
              </div>
              <button className="close-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <form className="modal-fields" onSubmit={(e) => { handleSubmit(e); setShowForm(false); }}>
              {/* Exam Name & Date */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>{title} Details</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none', color: isDirectMode ? 'var(--primary)' : 'inherit' }}>
                    <input type="checkbox" checked={isDirectMode} onChange={e => setIsDirectMode(e.target.checked)} />
                    Enter marks directly
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <input
                    placeholder={`${title} name (e.g., ${type === 'midSem' ? 'Mid Term 2024' : 'Finals 2024'})`}
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <input
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    style={{ width: '160px' }}
                  />
                </div>
              </div>

              {isDirectMode ? (
                /* Direct Mode Inputs */
                <div style={{ display: 'flex', gap: '15px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ color: '#10b981' }}>YOUR MARKS</label>
                    <input type="number" step="0.01" value={directMarks} onChange={e => setDirectMarks(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ color: '#f59e0b' }}>{legacyComparisonName.toUpperCase()} MARKS</label>
                    <input type="number" step="0.01" value={directDhruvMarks} onChange={e => setDirectDhruvMarks(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ color: '#64748b' }}>TOTAL MARKS</label>
                    <input type="number" step="0.01" value={directMax} onChange={e => setDirectMax(e.target.value)} placeholder="10.00" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Components Row */}
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {/* Quiz Component */}
                    <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: hasQuiz ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: hasQuiz ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(0,0,0,0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 800, color: hasQuiz ? '#8b5cf6' : 'inherit' }}>
                        <input type="checkbox" checked={hasQuiz} onChange={e => setHasQuiz(e.target.checked)} />
                        Quiz Component
                      </label>
                      {hasQuiz && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#8b5cf6', fontWeight: 800 }}>YOU</span>
                            <input type="number" placeholder="U" value={quizCorrect} onChange={e => setQuizCorrect(e.target.value)} className="small-input" />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>{legacyComparisonName.toUpperCase()}</span>
                            <input type="number" placeholder="D" value={dhruvQuizCorrect} onChange={e => setDhruvQuizCorrect(e.target.value)} className="small-input" style={{ borderColor: '#fcd34d' }} />
                          </div>
                          <span style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>/</span>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>TOTAL</span>
                            <input type="number" placeholder="T" value={quizTotal} onChange={e => setQuizTotal(e.target.value)} className="small-input" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coding Component */}
                    <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: hasCoding ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: hasCoding ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(0,0,0,0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 800, color: hasCoding ? '#3b82f6' : 'inherit' }}>
                        <input type="checkbox" checked={hasCoding} onChange={e => setHasCoding(e.target.checked)} />
                        Coding Component
                      </label>
                      {hasCoding && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 800 }}>YOU</span>
                            <input type="number" placeholder="U" value={codingCorrect} onChange={e => setCodingCorrect(e.target.value)} className="small-input" />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>{legacyComparisonName.toUpperCase()}</span>
                            <input type="number" placeholder="D" value={dhruvCodingCorrect} onChange={e => setDhruvCodingCorrect(e.target.value)} className="small-input" style={{ borderColor: '#fcd34d' }} />
                          </div>
                          <span style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>/</span>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>TOTAL</span>
                            <input type="number" placeholder="T" value={codingTotal} onChange={e => setCodingTotal(e.target.value)} className="small-input" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Written Component */}
                  <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: hasWritten ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: hasWritten ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(0,0,0,0.05)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', fontWeight: 800, color: hasWritten ? '#10b981' : 'inherit' }}>
                      <input type="checkbox" checked={hasWritten} onChange={e => setHasWritten(e.target.checked)} />
                      Written Component
                    </label>
                    {hasWritten && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 800 }}>YOU</span>
                          <input type="number" placeholder="U" value={writtenCorrect} onChange={e => setWrittenCorrect(e.target.value)} className="small-input" />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>{legacyComparisonName.toUpperCase()}</span>
                          <input type="number" placeholder="D" value={dhruvWrittenCorrect} onChange={e => setDhruvWrittenCorrect(e.target.value)} className="small-input" style={{ borderColor: '#fcd34d' }} />
                        </div>
                        <span style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>/</span>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>TOTAL</span>
                          <input type="number" placeholder="T" value={writtenTotal} onChange={e => setWrittenTotal(e.target.value)} className="small-input" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weights Row */}
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
                    {hasQuiz && (
                      <div style={{ flex: 1, minWidth: '100px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#8b5cf6' }}>Quiz Weight</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="number" placeholder="20" value={quizWeight} onChange={e => setQuizWeight(e.target.value)} className="small-input" />
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                        </div>
                      </div>
                    )}
                    {hasCoding && (
                      <div style={{ flex: 1, minWidth: '100px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#3b82f6' }}>Coding Weight</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="number" placeholder="30" value={codingWeight} onChange={e => setCodingWeight(e.target.value)} className="small-input" />
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                        </div>
                      </div>
                    )}
                    {hasWritten && (
                      <div style={{ flex: 1, minWidth: '100px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: '#10b981' }}>Written Weight</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="number" placeholder="50" value={writtenWeight} onChange={e => setWrittenWeight(e.target.value)} className="small-input" />
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <ComparisonMarksFields people={comparisonPeople} values={comparisonMarks} label="Weighted marks" onChange={(id, value) => setComparisonMarks(current => ({ ...current, [id]: value === '' ? '' : Number(value) }))} />

              {/* Add Button */}
              <div className="modal-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="save-btn">
                  <Plus size={20} />
                  <span>Create Exam</span>
                </button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="card-gallery">
        {tasks.map(task => (
          <div key={task.id} className={`gallery-card exam-card ${task.completed ? 'completed' : ''}`}>
            <div className="card-header">
              <div className="card-number-badge">#{task.number}</div>
              <div className="card-header-actions">
                <button className="card-btn-minimal" onClick={() => onEdit(task)} title="Edit">
                  <Edit2 size={13} />
                </button>
                <button className="card-btn-minimal delete" onClick={() => onDelete(task.id)} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="card-body">
              <h4 className="card-title">{task.name}</h4>
              <div className="card-meta">
                <span className="card-date"><Calendar size={14} /> {formatDate(task.date)}</span>
              </div>

              {task.isDirectMode && (
                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '4px 8px', borderRadius: '6px', alignSelf: 'flex-start', fontWeight: 800, marginTop: '8px' }}>
                  DIRECT ENTRY
                </div>
              )}

              {/* Exam Components Breakdown */}
              <div className="contest-components-mini" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {task.hasQuiz && (
                  <div style={{ fontSize: '0.75rem', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.05)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Quiz</span>
                    <span>{task.quizCorrect}/{task.quizTotal} <span style={{ opacity: 0.6 }}>({Math.round((task.quizCorrect / task.quizTotal) * 100)}%)</span></span>
                  </div>
                )}
                {task.hasCoding && (
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Coding</span>
                    <span>{task.codingCorrect}/{task.codingTotal} <span style={{ opacity: 0.6 }}>({Math.round((task.codingCorrect / task.codingTotal) * 100)}%)</span></span>
                  </div>
                )}
                {task.hasWritten && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Written</span>
                    <span>{task.writtenCorrect}/{task.writtenTotal} <span style={{ opacity: 0.6 }}>({Math.round((task.writtenCorrect / task.writtenTotal) * 100)}%)</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-marks-panel">
              <div className="marks-grid">
                <div className="mark-item user">
                  <div className="mark-header"><User size={12} /><span>YOU</span></div>
                  <div className="mark-input">{task.marks?.toFixed(2)}</div>
                </div>
                <div className="mark-item friend">
                  <div className="mark-header"><Users size={12} /><span>{legacyComparisonName.toUpperCase()}</span></div>
                  <div className="mark-input">{task.dhruvMarks?.toFixed(2)}</div>
                </div>
                <div className="mark-item max">
                  <div className="mark-header"><Target size={12} /><span>MAX</span></div>
                  <div className="mark-input">{task.maxMarks?.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EditModal({ task, activeSubject, allTasks, comparisonPeople = [], onClose, onSave }) {
  const legacyComparisonName = comparisonPeople.find(person => person.id === 'dhruv')?.name || 'Dhruv';
  const [name, setName] = useState(task.name);
  const [number, setNumber] = useState(task.number);
  const [date, setDate] = useState(task.date || '');
  const [link, setLink] = useState(task.link || task.notes || '');
  const [notionLink, setNotionLink] = useState(task.notionUrl || '');
  const [impQs, setImpQs] = useState(task.impQs || '');
  const [marks, setMarks] = useState(task.marks || '');
  const [dhruvMarks, setDhruvMarks] = useState(task.dhruvMarks || '');
  const [maxMarks, setMaxMarks] = useState(task.maxMarks || '');
  const [comparisonMarks, setComparisonMarks] = useState(task.comparisonMarks || {});

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

  const [isDirectMode, setIsDirectMode] = useState(task.isDirectMode || false);

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
      impQs,
      marks: Number(marks) || 0,
      dhruvMarks: Number(dhruvMarks) || 0,
      maxMarks: Number(maxMarks) || 0,
      comparisonMarks,
      isDirectMode,
      completed: (Number(marks) > 0 || Number(dhruvMarks) > 0) ? true : name !== task.name ? task.completed : task.completed
    };

    if ((task.type === 'contest' || task.type === 'midSem' || task.type === 'endSem') && !isDirectMode) {
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

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px var(--primary-glow)'
            }}>
              <Edit2 size={24} />
            </div>
            <h3 style={{ margin: 0 }}>Edit {task.type.charAt(0).toUpperCase() + task.type.slice(1)}</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-fields">
          {/* Main Info Section */}
          <div className="input-group">
            <label>Title & Identifier</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                style={{ flex: 3 }}
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                style={{ flex: 1 }}
                type="number"
                placeholder="No."
                value={number}
                onChange={e => setNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Scheduled Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Links Section */}
          {(task.type === 'lecture' || task.type === 'assignment' || task.type === 'quiz') && (
            <div className="input-group">
              <label>Resources & Notes</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder={task.type === 'lecture' ? "Lecture Link / Notes URL" : "Resource Link"}
                    style={{ width: '100%', paddingLeft: '44px' }}
                    value={link}
                    onChange={e => setLink(e.target.value)}
                  />
                  <BookOpen size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>

                {task.type === 'lecture' && (
                  <div style={{ position: 'relative' }}>
                    <input
                      placeholder="Notion Notes URL"
                      style={{ width: '100%', paddingLeft: '44px' }}
                      value={notionLink}
                      onChange={e => setNotionLink(e.target.value)}
                    />
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                      <NotionLogo size={18} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {task.type === 'quiz' && (
            <div className="input-group">
              <label>Important Questions</label>
              <input
                placeholder="e.g. Q4, Q7, Topic: BFS..."
                value={impQs}
                onChange={e => setImpQs(e.target.value)}
              />
            </div>
          )}

          {(['assignment', 'quiz', 'project'].includes(task.type) || (['contest', 'midSem', 'endSem'].includes(task.type) && isDirectMode)) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div className="input-group">
                <label style={{ color: 'var(--primary)', opacity: 0.8 }}>My Marks</label>
                <input
                  type="number"
                  placeholder="0"
                  value={marks}
                  onChange={e => setMarks(e.target.value)}
                  style={{ border: '1px solid var(--primary-glow)', background: 'white' }}
                />
              </div>
              <div className="input-group">
                <label style={{ color: '#f59e0b', opacity: 0.8 }}>{legacyComparisonName} Marks</label>
                <input
                  type="number"
                  placeholder="0"
                  value={dhruvMarks}
                  onChange={e => setDhruvMarks(e.target.value)}
                  style={{ border: '1px solid rgba(245, 158, 11, 0.2)', background: 'white' }}
                />
              </div>
              <div className="input-group">
                <label style={{ color: '#64748b' }}>Out of (Max)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={maxMarks}
                  onChange={e => setMaxMarks(e.target.value)}
                  style={{ background: 'white' }}
                />
              </div>
            </div>
          )}

          {task.type !== 'lecture' && (
            <ComparisonMarksFields
              people={comparisonPeople}
              values={comparisonMarks}
              label="Weighted marks"
              onChange={(id, value) => setComparisonMarks(current => ({ ...current, [id]: value === '' ? '' : Number(value) }))}
            />
          )}

          {/* Performance Data for Contests/Exams */}
          {(task.type === 'contest' || task.type === 'midSem' || task.type === 'endSem') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 850, color: 'var(--primary)', opacity: 0.8 }}>Performance Breakdown</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>
                  <input type="checkbox" checked={isDirectMode} onChange={e => setIsDirectMode(e.target.checked)} />
                  Enter marks directly
                </label>
              </div>

              {!isDirectMode && (
                <>

                  {/* Quiz Component */}
                  <div style={{
                    padding: '16px',
                    background: hasQuiz ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '20px',
                    border: hasQuiz ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(0,0,0,0.05)',
                    transition: 'all 0.3s'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px', fontWeight: 800 }}>
                      <input type="checkbox" checked={hasQuiz} onChange={e => setHasQuiz(e.target.checked)} />
                      <span style={{ color: hasQuiz ? '#8b5cf6' : 'inherit' }}>Quiz Component</span>
                    </label>
                    {hasQuiz && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }} className="input-group">
                            <label style={{ fontSize: '0.65rem' }}>Your Score</label>
                            <input type="number" value={quizCorrect} onChange={e => setQuizCorrect(e.target.value)} placeholder="0" min="0" />
                          </div>
                          <div style={{ flex: 1 }} className="input-group">
                            <label style={{ fontSize: '0.65rem' }}>{legacyComparisonName} Score</label>
                            <input type="number" value={dhruvQuizCorrect} onChange={e => setDhruvQuizCorrect(e.target.value)} placeholder="0" min="0" style={{ borderColor: '#fcd34d' }} />
                          </div>
                          <div style={{ flex: 1 }} className="input-group">
                            <label style={{ fontSize: '0.65rem' }}>Total Marks</label>
                            <input type="number" value={quizTotal} onChange={e => setQuizTotal(e.target.value)} placeholder="1" min="1" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coding Component */}
                  <div style={{
                    padding: '16px',
                    background: hasCoding ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '20px',
                    border: hasCoding ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(0,0,0,0.05)',
                    transition: 'all 0.3s'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px', fontWeight: 800 }}>
                      <input type="checkbox" checked={hasCoding} onChange={e => setHasCoding(e.target.checked)} />
                      <span style={{ color: hasCoding ? '#10b981' : 'inherit' }}>Coding Component</span>
                    </label>
                    {hasCoding && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }} className="input-group">
                          <label style={{ fontSize: '0.65rem' }}>Your Score</label>
                          <input type="number" value={codingCorrect} onChange={e => setCodingCorrect(e.target.value)} placeholder="0" min="0" />
                        </div>
                        <div style={{ flex: 1 }} className="input-group">
                          <label style={{ fontSize: '0.65rem' }}>{legacyComparisonName} Score</label>
                          <input type="number" value={dhruvCodingCorrect} onChange={e => setDhruvCodingCorrect(e.target.value)} placeholder="0" min="0" style={{ borderColor: '#fcd34d' }} />
                        </div>
                        <div style={{ flex: 1 }} className="input-group">
                          <label style={{ fontSize: '0.65rem' }}>Total Marks</label>
                          <input type="number" value={codingTotal} onChange={e => setCodingTotal(e.target.value)} placeholder="1" min="1" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Written Component */}
                  <div style={{
                    padding: '16px',
                    background: hasWritten ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '20px',
                    border: hasWritten ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(0,0,0,0.05)',
                    transition: 'all 0.3s'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px', fontWeight: 800 }}>
                      <input type="checkbox" checked={hasWritten} onChange={e => setHasWritten(e.target.checked)} />
                      <span style={{ color: hasWritten ? '#3b82f6' : 'inherit' }}>Written Component</span>
                    </label>
                    {hasWritten && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }} className="input-group">
                          <label style={{ fontSize: '0.65rem' }}>Your Score</label>
                          <input type="number" value={writtenCorrect} onChange={e => setWrittenCorrect(e.target.value)} placeholder="0" min="0" />
                        </div>
                        <div style={{ flex: 1 }} className="input-group">
                          <label style={{ fontSize: '0.65rem' }}>{legacyComparisonName} Score</label>
                          <input type="number" value={dhruvWrittenCorrect} onChange={e => setDhruvWrittenCorrect(e.target.value)} placeholder="0" min="0" style={{ borderColor: '#fcd34d' }} />
                        </div>
                        <div style={{ flex: 1 }} className="input-group">
                          <label style={{ fontSize: '0.65rem' }}>Total Marks</label>
                          <input type="number" value={writtenTotal} onChange={e => setWrittenTotal(e.target.value)} placeholder="1" min="1" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weights Row (In Edit Modal) */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {hasQuiz && (
                      <div style={{ flex: 1, minWidth: '120px' }} className="input-group">
                        <label style={{ fontSize: '0.65rem', color: '#8b5cf6' }}>Quiz Wt (%)</label>
                        <input type="number" value={quizWeight} onChange={e => setQuizWeight(e.target.value)} />
                      </div>
                    )}
                    {hasCoding && (
                      <div style={{ flex: 1, minWidth: '120px' }} className="input-group">
                        <label style={{ fontSize: '0.65rem', color: '#10b981' }}>Coding Wt (%)</label>
                        <input type="number" value={codingWeight} onChange={e => setCodingWeight(e.target.value)} />
                      </div>
                    )}
                    {hasWritten && (
                      <div style={{ flex: 1, minWidth: '120px' }} className="input-group">
                        <label style={{ fontSize: '0.65rem', color: '#3b82f6' }}>Written Wt (%)</label>
                        <input type="number" value={writtenWeight} onChange={e => setWrittenWeight(e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Summary of Marks */}
                  <div style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
                    borderRadius: '24px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Your Projection</span>
                        <strong style={{ fontSize: '1.4rem', color: '#059669' }}>{calculateContestMarks().marks} / {calculateContestMarks().maxMarks}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Dhruv Projection</span>
                        <strong style={{ fontSize: '1.4rem', color: '#d97706' }}>{calculateContestMarks().dhruvMarks} / {calculateContestMarks().maxMarks}</strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-buttons" style={{ marginTop: '30px' }}>
          <button className="save-btn" onClick={handleSave}>
            <Save size={20} />
            <span>Apply Changes</span>
          </button>
          <button className="cancel-btn" onClick={onClose}>Discard</button>
        </div>
      </div>
    </div>,
    document.body
  );
}




export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
