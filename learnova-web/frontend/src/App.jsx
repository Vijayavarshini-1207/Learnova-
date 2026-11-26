import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, Bell, BookOpen, BookMarked, Brain, CalendarDays,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, FileText, GraduationCap,
  Home, Lightbulb, LogOut, Menu, MessageCircle, MoreHorizontal, Send, Settings,
  ShieldCheck, Sparkles, Target, Trophy, Upload, UserRound, X, Eye, EyeOff,
  PanelLeftClose, PanelLeftOpen, Bot, ClipboardList, WandSparkles
} from 'lucide-react';
import { api } from './api';

const navigation = [
  { name: 'Dashboard', icon: Home },
  { name: 'Summarize Notes', icon: FileText },
  { name: 'Generate Quiz', icon: Brain },
  { name: 'Explain Concept', icon: Lightbulb },
  { name: 'Study Planner', icon: CalendarDays },
  { name: 'AI Chat', icon: MessageCircle },
];
const secondaryNavigation = [
  { name: 'Reports', icon: BarChart3 },
  { name: 'Settings', icon: Settings },
];

function App() {
  const [page, setPage] = useState('Dashboard');
  const [signedIn, setSignedIn] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ activities: 0, quizzes: 0, average_score: 0, recent: [] });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hi! I’m Learnova AI. Ask me about a topic, a tricky question, or your study plan.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [summaryMode, setSummaryMode] = useState('short');
  const [summary, setSummary] = useState('');
  const [quizSource, setQuizSource] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [graded, setGraded] = useState(false);
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  const [explanation, setExplanation] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hours, setHours] = useState(2);
  const [days, setDays] = useState(7);
  const [examDate, setExamDate] = useState('');
  const [studyPlan, setStudyPlan] = useState('');
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Physics revision', time: 'Today · 7:00 PM', done: false },
    { id: 2, title: 'Maths practice quiz', time: 'Tomorrow · 10:00 AM', done: false },
    { id: 3, title: 'Review study plan', time: 'Saturday · 6:00 PM', done: true },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => { refreshDashboard(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatOpen]);

  async function refreshDashboard() {
    try { setStats(await api.dashboard()); } catch { /* API may not be started yet. */ }
  }
  async function runAction(action, onSuccess) {
    setBusy(true); setError('');
    try { const result = await action(); onSuccess(result); await refreshDashboard(); }
    catch (err) { setError(err.message || 'Unable to complete that request.'); }
    finally { setBusy(false); }
  }
  function handleLogin(event) {
    event.preventDefault();
    if (!loginName.trim() || !loginPassword.trim()) { setLoginError('Please enter your username and password.'); return; }
    setLoginError(''); setSignedIn(true);
  }
  function signOut() { setSignedIn(false); setLoginPassword(''); setPage('Dashboard'); setChatOpen(false); }
  async function createSummary() {
    if (file) return runAction(() => api.fileSummary(file, summaryMode), r => setSummary(r.summary));
    return runAction(() => api.summary(notes, summaryMode), r => setSummary(r.summary));
  }
  async function createQuiz() {
    return runAction(() => api.quiz(quizSource, difficulty, Number(questionCount)), r => { setQuiz(r); setAnswers({}); setGraded(false); });
  }
  async function submitQuiz() {
    const score = quiz.questions.filter((q, index) => answers[index] === q.answer).length;
    setGraded(true);
    try { await api.save(quiz.topic || 'Practice quiz', score, quiz.questions.length); await refreshDashboard(); }
    catch (err) { setError(err.message); }
  }
  async function sendChat(event, source = 'page') {
    event?.preventDefault();
    const question = chatInput.trim();
    if (!question || busy) return;
    setChatMessages(current => [...current, { role: 'user', text: question }]);
    setChatInput(''); setBusy(true); setError('');
    try {
      const result = await api.chat(question);
      setChatMessages(current => [...current, { role: 'assistant', text: result.reply }]);
      await refreshDashboard();
    } catch (err) {
      setChatMessages(current => [...current, { role: 'assistant', text: `I couldn’t reach the study service. ${err.message}` }]);
    } finally { setBusy(false); }
  }

  if (!signedIn) return <LoginPage
    loginName={loginName} setLoginName={setLoginName} loginPassword={loginPassword}
    setLoginPassword={setLoginPassword} showPassword={showPassword} setShowPassword={setShowPassword}
    loginError={loginError} onSubmit={handleLogin}
  />;

  const firstName = loginName.trim().split(/\s+/)[0] || 'Student';
  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><GraduationCap size={24} strokeWidth={2.2} /></div>
          <div><div className="brand-name">Learnova</div><div className="brand-tagline">LEARN · PRACTICE · GROW</div></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18}/></button>
        </div>
        <div className="nav-caption">YOUR WORKSPACE</div>
        <nav className="nav-list">
          {navigation.map(item => <NavButton key={item.name} item={item} active={page === item.name} onClick={() => { setPage(item.name); setError(''); setSidebarOpen(false); }} />)}
        </nav>
        <div className="nav-divider" />
        <div className="nav-list">
          {secondaryNavigation.map(item => <NavButton key={item.name} item={item} active={page === item.name} onClick={() => { setPage(item.name); setError(''); setSidebarOpen(false); }} />)}
          <button className="nav-item" onClick={signOut}><LogOut size={18}/><span>Log out</span></button>
        </div>
        <div className="sidebar-bottom-card">
          <div className="sidebar-bottom-icon"><BookOpen size={22}/></div>
          <strong>Small steps add up.</strong>
          <span>A little learning every day makes a big difference.</span>
        </div>
        <div className="sidebar-user">
          <div className="avatar avatar-small">{firstName.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-copy"><strong>{loginName || 'Student'}</strong><span>Learning account</span></div>
          <MoreHorizontal size={19}/>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={21}/></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{page}</strong></div>
          </div>
          <div className="topbar-right">
            <div className="search-box"><span className="search-shortcut">⌕</span><input placeholder="Search your workspace" aria-label="Search" onKeyDown={e => { if (e.key === 'Enter') setError('Search is not connected yet.'); }}/><kbd>⌘ K</kbd></div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setError('You’re all caught up!')}><Bell size={19}/><i /></button>
            <div className="top-user"><div className="avatar">{firstName.charAt(0).toUpperCase()}</div><span>{firstName}</span><ChevronDown size={15}/></div>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="alert alert-error"><CircleHelp size={17}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
          {page === 'Dashboard' && <DashboardPage firstName={firstName} stats={stats} tasks={tasks} setTasks={setTasks} setPage={setPage} />}
          {page === 'Summarize Notes' && <>
            <PageHeading eyebrow="STUDY TOOLS" title="Summarize your notes" subtitle="Turn your class notes into something easier to revise." />
            <div className="tool-grid summary-grid">
              <section className="panel input-panel"><PanelTitle icon={FileText} title="Your study material" detail="Paste your notes or upload a file." />
                <textarea className="large-textarea" value={notes} onChange={e => { setNotes(e.target.value); setFile(null); }} placeholder="Paste your notes here..." />
                <div className="form-toolbar"><label className="upload-button"><Upload size={17}/>{file ? file.name : 'Upload PDF or TXT'}<input type="file" accept=".pdf,.txt" onChange={e => { setFile(e.target.files?.[0] || null); setNotes(''); }} hidden /></label><select value={summaryMode} onChange={e => setSummaryMode(e.target.value)}><option value="short">Short summary</option><option value="detailed">Detailed summary</option></select><button className="primary-button" disabled={busy || (!notes.trim() && !file)} onClick={createSummary}>{busy ? 'Working…' : 'Create summary'}<ArrowRight size={16}/></button></div>
              </section>
              <section className="panel output-panel"><PanelTitle icon={BookMarked} title="Your summary" detail="Your result will appear here." />
                {summary ? <div className="formatted-output">{summary.split('\n').map((line, i) => <p key={i}>{line || '\u00a0'}</p>)}</div> : <EmptyState icon={FileText} title="Nothing here yet" text="Add your notes and create a summary to get started." />}
              </section>
            </div>
          </>}
          {page === 'Generate Quiz' && <>
            <PageHeading eyebrow="PRACTICE & REVISE" title="Build a quick quiz" subtitle="Create practice questions from your notes or a topic you’re studying." />
            <section className="panel form-panel"><PanelTitle icon={Brain} title="Quiz settings" detail="Choose the topic, difficulty and number of questions."/><label className="field-label">Notes or topic<textarea className="large-textarea quiz-source" value={quizSource} onChange={e => setQuizSource(e.target.value)} placeholder="For example: Database normalization, operating systems, photosynthesis..."/></label><div className="field-row"><label className="field-label">Difficulty<select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label className="field-label">Number of questions<select value={questionCount} onChange={e => setQuestionCount(e.target.value)}><option value="3">3 questions</option><option value="5">5 questions</option><option value="10">10 questions</option></select></label></div><button className="primary-button" disabled={busy || !quizSource.trim()} onClick={createQuiz}>{busy ? 'Creating quiz…' : 'Generate quiz'}<WandSparkles size={17}/></button></section>
            {quiz && <section className="panel quiz-panel"><div className="quiz-heading"><div><span className="eyebrow">YOUR PRACTICE SET</span><h2>{quiz.topic || 'Practice quiz'}</h2></div><span className="question-count">{quiz.questions.length} questions</span></div>{quiz.questions.map((q, index) => <div className="question-block" key={index}><strong>{index + 1}. {q.question}</strong><div className="answer-options">{q.options.map((option, optionIndex) => { const letter = 'ABCD'[optionIndex]; const isCorrect = graded && letter === q.answer; const isWrong = graded && answers[index] === letter && letter !== q.answer; return <label key={letter} className={`answer-option ${answers[index] === letter ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}><input type="radio" disabled={graded} checked={answers[index] === letter} onChange={() => setAnswers(current => ({ ...current, [index]: letter }))}/><span className="option-letter">{letter}</span>{option}{isCorrect && <Check size={16}/>}</label>; })}</div>{graded && <p className="answer-explanation">{q.explanation || `Correct answer: ${q.answer}`}</p>}</div>)}{!graded ? <button className="primary-button" disabled={Object.keys(answers).length !== quiz.questions.length} onClick={submitQuiz}>Check my answers<ArrowRight size={16}/></button> : <div className="score-result"><Trophy size={22}/><strong>You scored {quiz.questions.filter((q, i) => answers[i] === q.answer).length} out of {quiz.questions.length}</strong><button className="text-button" onClick={() => { setQuiz(null); setAnswers({}); setGraded(false); }}>Try another quiz</button></div>}</section>}
          </>}
          {page === 'Explain Concept' && <>
            <PageHeading eyebrow="MAKE IT MAKE SENSE" title="Understand a concept" subtitle="Get a clear explanation at the level that works for you." />
            <section className="panel form-panel narrow-panel"><PanelTitle icon={Lightbulb} title="What are you learning today?" detail="Enter a topic and choose how detailed the explanation should be."/><label className="field-label">Topic or question<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Object-oriented programming" /></label><label className="field-label">Explanation level<select value={level} onChange={e => setLevel(e.target.value)}><option value="beginner">Beginner — start with the basics</option><option value="intermediate">Intermediate — I know a little</option><option value="advanced">Advanced — go deeper</option></select></label><button className="primary-button" disabled={busy || !topic.trim()} onClick={() => runAction(() => api.explain(topic, level), r => setExplanation(r.explanation))}>{busy ? 'Preparing explanation…' : 'Explain this concept'}<ArrowRight size={16}/></button></section>
            {explanation && <section className="panel output-panel"><PanelTitle icon={BookOpen} title="Let’s break it down" detail="A student-friendly explanation."/><div className="formatted-output">{explanation.split('\n').map((line, i) => <p key={i}>{line || '\u00a0'}</p>)}</div></section>}
          </>}
          {page === 'Study Planner' && <>
            <PageHeading eyebrow="MAKE A PLAN" title="Your study planner" subtitle="Build a realistic study routine around your time and subjects." />
            <section className="panel form-panel"><PanelTitle icon={CalendarDays} title="Plan your study time" detail="A few details will help create a useful schedule."/><label className="field-label">Subjects and topics<textarea className="large-textarea planner-textarea" value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Example: DBMS – SQL and normalization; DSA – trees and graphs"/></label><div className="field-row three-fields"><label className="field-label">Hours per day<input type="number" min="0.5" max="16" step="0.5" value={hours} onChange={e => setHours(e.target.value)}/></label><label className="field-label">Plan duration<select value={days} onChange={e => setDays(e.target.value)}><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label><label className="field-label">Exam date<input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}/></label></div><button className="primary-button" disabled={busy || !subjects.trim()} onClick={() => runAction(() => api.plan({ subjects, hours_per_day: Number(hours), days: Number(days), exam_date: examDate || null }), r => setStudyPlan(r.plan))}>{busy ? 'Building your plan…' : 'Create my study plan'}<ArrowRight size={16}/></button></section>
            {studyPlan && <section className="panel output-panel"><PanelTitle icon={ClipboardList} title="Your study plan" detail="Use this as a starting point and adjust it as needed."/><div className="formatted-output">{studyPlan.split('\n').map((line, i) => <p key={i}>{line || '\u00a0'}</p>)}</div></section>}
          </>}
          {page === 'AI Chat' && <>
            <PageHeading eyebrow="YOUR STUDY COMPANION" title="Chat with Learnova AI" subtitle="Ask questions, work through a problem or get a topic explained." />
            <ChatPanel messages={chatMessages} setMessages={setChatMessages} input={chatInput} setInput={setChatInput} busy={busy} onSend={sendChat} />
          </>}
          {page === 'Reports' && <ReportsPage stats={stats} />}
          {page === 'Settings' && <SettingsPage loginName={loginName} />}
        </div>
        <footer className="page-footer"><span>© 2026 Learnova</span><span>Made for curious minds.</span></footer>
      </main>

      <div className="floating-assistant-wrap">
        {chatOpen && <div className="floating-chat-panel"><div className="floating-chat-header"><div className="assistant-avatar"><Bot size={20}/></div><div><strong>Learnova AI</strong><span><i/> Here to help with your doubts</span></div><button className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={18}/></button></div><div className="floating-chat-body"><div className="chat-welcome-note">Ask me anything about your studies. I’ll help you work through it.</div>{chatMessages.slice(-12).map((message, index) => <ChatBubble key={index} message={message}/>)}{busy && <div className="typing-indicator"><span/><span/><span/></div>}<div ref={chatEndRef}/></div><form className="floating-chat-form" onSubmit={sendChat}><input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type your doubt…"/><button type="submit" disabled={busy || !chatInput.trim()} aria-label="Send message"><Send size={17}/></button></form><div className="chat-suggestions"><button onClick={() => setChatInput('Explain this topic in simple words: ')}>Explain a topic</button><button onClick={() => setChatInput('Give me 5 practice questions about ')}>Practice questions</button></div></div>}
        <button className={`floating-assistant ${chatOpen ? 'assistant-active' : ''}`} onClick={() => setChatOpen(value => !value)} aria-label={chatOpen ? 'Close Learnova AI' : 'Open Learnova AI'}><span className="assistant-pulse"/><Bot size={25}/>{!chatOpen && <span className="assistant-tooltip">Ask Learnova AI</span>}</button>
      </div>
    </div>
  );
}

function LoginPage({ loginName, setLoginName, loginPassword, setLoginPassword, showPassword, setShowPassword, loginError, onSubmit }) {
  return <div className="login-screen"><section className="login-story"><div className="login-brand"><div className="brand-mark"><GraduationCap size={25}/></div><span>Learnova</span></div><div className="login-story-content"><span className="story-label"><Sparkles size={14}/> YOUR PERSONAL LEARNING SPACE</span><h1>Make room for<br/><em>better learning.</em></h1><p>Bring your notes, practice and study plans together in one simple place.</p><div className="story-points"><span><CheckCircle2 size={17}/> Learn at your own pace</span><span><CheckCircle2 size={17}/> Keep your study routine on track</span><span><CheckCircle2 size={17}/> Get help when you need it</span></div></div><div className="login-story-bottom"><span>LEARN A LITTLE. GROW A LOT.</span><BookOpen size={30}/></div><div className="story-shape shape-one"/><div className="story-shape shape-two"/></section><section className="login-form-side"><form className="login-card" onSubmit={onSubmit}><div className="login-mobile-brand"><div className="brand-mark"><GraduationCap size={22}/></div><strong>Learnova</strong></div><span className="form-eyebrow">WELCOME BACK</span><h2>Good to see you.</h2><p className="login-intro">Sign in to pick up where you left off.</p><label className="field-label">Username or email<input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Enter your username" autoComplete="username"/></label><label className="field-label">Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password"/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>{loginError && <div className="login-error">{loginError}</div>}<div className="login-options"><label><input type="checkbox" defaultChecked/> Remember me</label><span><ShieldCheck size={14}/> Private study space</span></div><button className="login-submit" type="submit">Sign in <ArrowRight size={17}/></button><div className="login-divider"><span/>A fresh start, every day<span/></div><p className="login-disclaimer">Demo sign-in for this starter project. Add a real authentication provider before publishing publicly.</p></form></section></div>;
}

function NavButton({ item, active, onClick }) { const Icon = item.icon; return <button className={`nav-item ${active ? 'nav-active' : ''}`} onClick={onClick}><Icon size={18}/><span>{item.name}</span>{active && <span className="nav-active-dot"/>}</button>; }
function PageHeading({ eyebrow, title, subtitle }) { return <div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>; }
function PanelTitle({ icon: Icon, title, detail }) { return <div className="panel-title"><div className="panel-icon"><Icon size={19}/></div><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div></div>; }
function EmptyState({ icon: Icon, title, text }) { return <div className="empty-state"><div className="empty-icon"><Icon size={24}/></div><strong>{title}</strong><p>{text}</p></div>; }
function StatCard({ icon: Icon, label, value, note, tone }) { return <div className={`stat-card ${tone}`}><div className="stat-icon"><Icon size={20}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>; }

function DashboardPage({ firstName, stats, tasks, setTasks, setPage }) {
  const progress = Math.min(100, Math.max(0, Number(stats.average_score) || 0));
  return <>
    <section className="welcome-banner"><div className="welcome-copy"><span className="eyebrow">YOUR LEARNING SPACE</span><h1>Good afternoon, {firstName}.</h1><p>Ready to make a little progress today?</p><button className="banner-button" onClick={() => setPage('Summarize Notes')}>Explore your study tools <ArrowRight size={16}/></button></div><div className="welcome-art"><div className="art-circle circle-a"/><div className="art-circle circle-b"/><div className="book-stack"><div className="book book-top"/><div className="book book-mid"/><div className="book book-bottom"/></div><div className="pencil-cup"><span/><span/><span/></div><div className="plant-pot"><i/><i/><i/><b/></div><span className="art-note">One step at a time.</span></div></section>
    <div className="stats-grid"><StatCard icon={Activity} label="Learning activities" value={stats.activities ?? 0} note="Your learning sessions" tone="stat-coral"/><StatCard icon={Brain} label="Quizzes completed" value={stats.quizzes ?? 0} note="Practice makes progress" tone="stat-peach"/><StatCard icon={Trophy} label="Average quiz score" value={`${stats.average_score ?? 0}%`} note="Keep it going" tone="stat-blue"/><StatCard icon={Clock3} label="Study time" value="—" note="Track your focused hours" tone="stat-lilac"/></div>
    <div className="dashboard-grid"><section className="panel quick-panel"><div className="section-heading"><div><span className="eyebrow">GET STARTED</span><h2>Quick actions</h2></div><button className="text-button" onClick={() => setPage('Summarize Notes')}>All tools <ArrowRight size={15}/></button></div><div className="quick-actions"><QuickAction icon={FileText} title="Summarize notes" desc="Make revision easier" tone="quick-coral" onClick={() => setPage('Summarize Notes')}/><QuickAction icon={Brain} title="Generate a quiz" desc="Test what you know" tone="quick-peach" onClick={() => setPage('Generate Quiz')}/><QuickAction icon={Lightbulb} title="Explain a concept" desc="Understand it step by step" tone="quick-yellow" onClick={() => setPage('Explain Concept')}/><QuickAction icon={CalendarDays} title="Plan your study" desc="Make time for each subject" tone="quick-blue" onClick={() => setPage('Study Planner')}/></div><div className="quick-panel-foot"><span>Have a question?</span><button onClick={() => setPage('AI Chat')}>Chat with Learnova AI <ArrowRight size={14}/></button></div></section>
      <section className="panel progress-panel"><div className="section-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Learning progress</h2></div><button className="period-select" onClick={() => setPage('Reports')}>View report <ArrowRight size={14}/></button></div><div className="progress-content"><div className="progress-ring" style={{ '--progress': `${progress}%` }}><div><strong>{progress}%</strong><span>Average score</span></div></div><div className="progress-legend"><div><i className="legend-dot coral-dot"/><span>Quizzes</span><strong>{stats.quizzes ?? 0}</strong></div><div><i className="legend-dot peach-dot"/><span>Activities</span><strong>{stats.activities ?? 0}</strong></div><div><i className="legend-dot blue-dot"/><span>Recent sessions</span><strong>{(stats.recent || []).length}</strong></div></div></div><div className="progress-foot"><span>Every session counts.</span><span className="progress-foot-mark"><Sparkles size={14}/> Keep learning</span></div></section>
      <section className="panel schedule-panel"><div className="section-heading"><div><span className="eyebrow">STAY ON TRACK</span><h2>Upcoming schedule</h2></div><CalendarDays size={19} className="heading-coral"/></div><div className="schedule-list">{tasks.map(task => <label className={`schedule-item ${task.done ? 'task-done' : ''}`} key={task.id}><input type="checkbox" checked={task.done} onChange={() => setTasks(current => current.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}/><span className="schedule-check"><Check size={13}/></span><span className="schedule-copy"><strong>{task.title}</strong><small>{task.time}</small></span><MoreHorizontal size={17}/></label>)}</div><button className="schedule-add" onClick={() => setPage('Study Planner')}>Open study planner <ArrowRight size={14}/></button></section>
    </div>
    <section className="tip-strip"><div className="tip-icon"><Lightbulb size={20}/></div><div><strong>A small reminder</strong><span>Take a short break between study sessions. Your brain needs time to reset, too.</span></div><span className="tip-decoration">✦</span></section>
  </>;
}
function QuickAction({ icon: Icon, title, desc, tone, onClick }) { return <button className="quick-action" onClick={onClick}><span className={`quick-action-icon ${tone}`}><Icon size={19}/></span><span className="quick-action-copy"><strong>{title}</strong><small>{desc}</small></span><ArrowRight size={16} className="quick-arrow"/></button>; }

function ChatBubble({ message }) { return <div className={`chat-bubble ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`}><span>{message.role === 'user' ? 'You' : 'Learnova AI'}</span><p>{message.text}</p></div>; }
function ChatPanel({ messages, input, setInput, busy, onSend }) { return <section className="panel full-chat-panel"><div className="full-chat-top"><div className="assistant-avatar"><Bot size={20}/></div><div><strong>Learnova AI</strong><span>Ask a question whenever you get stuck.</span></div><span className="chat-status"><i/> Ready to help</span></div><div className="full-chat-messages">{messages.map((message, index) => <ChatBubble key={index} message={message}/>)}{busy && <div className="typing-indicator"><span/><span/><span/></div>}</div><form className="full-chat-form" onSubmit={onSend}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your question here…"/><button type="submit" disabled={busy || !input.trim()}><Send size={17}/> Send</button></form></section>; }
function ReportsPage({ stats }) { return <><PageHeading eyebrow="YOUR PROGRESS" title="Learning reports" subtitle="A simple overview of your activity in Learnova."/><div className="stats-grid report-stats"><StatCard icon={Activity} label="Activities" value={stats.activities ?? 0} note="Recorded sessions" tone="stat-coral"/><StatCard icon={Brain} label="Quizzes" value={stats.quizzes ?? 0} note="Completed quizzes" tone="stat-peach"/><StatCard icon={Trophy} label="Average score" value={`${stats.average_score ?? 0}%`} note="Across saved quizzes" tone="stat-blue"/></div><section className="panel report-panel"><PanelTitle icon={BarChart3} title="Recent activity" detail="Your latest saved learning activity."/>{stats.recent?.length ? stats.recent.map((item, index) => <div className="recent-row" key={index}><div className="recent-row-icon"><BookOpen size={17}/></div><div><strong>{item.title}</strong><span>{item.kind}</span></div><time>{item.created_at}</time></div>) : <EmptyState icon={ClipboardList} title="No activity recorded yet" text="Complete a quiz or use a study tool. Your activity will show up here."/>}</section></>; }
function SettingsPage({ loginName }) { const [compact, setCompact] = useState(false); const [tips, setTips] = useState(true); return <><PageHeading eyebrow="PREFERENCES" title="Settings" subtitle="A few options to make your learning space comfortable."/><section className="panel settings-panel"><PanelTitle icon={UserRound} title="Your profile" detail="Your current session details."/><div className="profile-row"><div className="avatar profile-avatar">{(loginName || 'S').charAt(0).toUpperCase()}</div><div><strong>{loginName || 'Student'}</strong><span>Learnova student account</span></div></div><div className="settings-divider"/><PanelTitle icon={Settings} title="Workspace preferences" detail="These preferences are stored for this session only."/><label className="setting-option"><span><strong>Compact layout</strong><small>Use a little less spacing between sections.</small></span><input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)}/></label><label className="setting-option"><span><strong>Study reminders</strong><small>Show helpful learning reminders on the dashboard.</small></span><input type="checkbox" checked={tips} onChange={e => setTips(e.target.checked)}/></label><p className="settings-note">Account sign-in and Google authentication are demo placeholders in this starter project. Configure a real authentication service before public deployment.</p></section></>; }

export default App;
