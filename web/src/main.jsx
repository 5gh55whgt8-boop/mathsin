import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './styles/app.css';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 120000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const iconPaths = {
  scan: <><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/><circle cx="12" cy="12" r="3"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  sparkle: <><path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2z"/><path d="m18.5 13 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7zM6 14l.8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8z"/></>,
  history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  save: <><path d="M5 3h12l3 3v15H4V4a1 1 0 0 1 1-1z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5M5 21h14"/></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  chevron: <path d="m9 6 6 6-6 6"/>,
};

function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name] || iconPaths.sparkle}
    </svg>
  );
}

function Logo({ light = false }) {
  return (
    <div className={`brand ${light ? 'brand--light' : ''}`}>
      <img src="/mathlens-mark.png" alt="MathLens AI" />
      <div>
        <strong>MathLens <span>AI</span></strong>
        <small>SCAN • SOLVE • UNDERSTAND</small>
      </div>
    </div>
  );
}

function Button({ children, icon, variant = 'primary', loading, className = '', ...props }) {
  return (
    <button className={`button button--${variant} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

function Badge({ children, tone = 'indigo' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

function AuthView({ email, password, busy, error, setEmail, setPassword, onSubmit }) {
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-story__inner">
          <Logo light />
          <div className="auth-copy">
            <Badge tone="aqua">AI MATH WORKSPACE</Badge>
            <h1>See it.<br />Scan it. <em>Solve it.</em></h1>
            <p>Turn equations, handwritten notes and full documents into structured, editable knowledge.</p>
          </div>
          <div className="formula-card">
            <span>Live recognition</span>
            <strong>∫ x² dx</strong>
            <Icon name="chevron" />
            <strong>x³⁄₃ + C</strong>
          </div>
          <div className="auth-proof">
            <span><Icon name="check" /> Precision OCR</span>
            <span><Icon name="check" /> Step-by-step AI</span>
            <span><Icon name="check" /> PDF & Word</span>
          </div>
        </div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-form__heading">
            <Badge>SECURE SIGN IN</Badge>
            <h2>Welcome back</h2>
            <p>Continue to your private MathLens workspace.</p>
          </div>
          {error ? <div className="notice notice--error">{error}</div> : null}
          <label>
            Email address
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>
          <Button type="submit" icon="chevron" loading={busy}>Sign in securely</Button>
          <p className="privacy-note">Protected account access • Private scan library</p>
        </form>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon, tone }) {
  return (
    <article className="stat-card">
      <div className={`icon-box icon-box--${tone}`}><Icon name={icon} /></div>
      <strong>{Number(value || 0).toLocaleString()}</strong>
      <span>{label}</span>
    </article>
  );
}

function Dashboard({ user, stats, onNewScan }) {
  return (
    <div className="dashboard page-enter">
      <section className="dashboard-hero">
        <div>
          <Badge tone="aqua">MATHLENS WORKSPACE</Badge>
          <h1>Good to see you, {user?.name?.split(' ')[0] || 'there'}.</h1>
          <p>Capture any mathematical source, refine the result, solve it and export a professional document.</p>
          <Button icon="scan" variant="light" onClick={onNewScan}>Start a new scan</Button>
        </div>
        <div className="hero-equation" aria-label="Example equation">
          <small>READY TO SOLVE</small>
          <strong>x² + 5x + 6 = 0</strong>
          <span>x = −2, −3</span>
        </div>
      </section>

      <div className="section-heading">
        <div><h2>Workspace metrics</h2><p>Live totals across your account.</p></div>
        <Badge tone="green">{(stats?.plan || user?.plan || 'free').toUpperCase()} PLAN</Badge>
      </div>
      <section className="stat-grid">
        <StatCard label="Total scans" value={stats?.scans} icon="scan" tone="indigo" />
        <StatCard label="Favorites" value={stats?.favorites} icon="sparkle" tone="amber" />
        <StatCard label="Questions found" value={stats?.questions} icon="file" tone="aqua" />
        <StatCard label="AI actions" value={stats?.usage?.aiActions} icon="grid" tone="indigo" />
      </section>

      <div className="section-heading"><div><h2>One connected workflow</h2><p>From source to polished output.</p></div></div>
      <section className="workflow-grid">
        {[
          ['01', 'Capture', 'Images, handwriting, PDFs and Word files.'],
          ['02', 'Understand', 'Structured OCR for text, equations and questions.'],
          ['03', 'Solve', 'Clear AI reasoning for the complete problem.'],
          ['04', 'Export', 'Professional PDF and editable Word output.'],
        ].map(([step, title, copy]) => (
          <article className="workflow-card" key={step}>
            <span>{step}</span><h3>{title}</h3><p>{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function BillingPanel({ billing, onSubscribe, loading, onTicket }) {
  const trial = billing?.trial;
  const [subject, setSubject] = useState(''); const [message, setMessage] = useState('');
  return <div className="dashboard page-enter">
    <section className="dashboard-hero"><div><Badge tone="aqua">MATHLENS PRO</Badge><h1>Keep scanning without limits.</h1><p>{trial?.expired ? 'Your free trial has ended.' : `${trial?.scansRemaining ?? 3} free scans remaining.`}</p><Button icon="sparkle" loading={loading} onClick={onSubscribe}>Subscribe with Razorpay</Button></div><div className="hero-equation"><small>MONTHLY ACCESS</small><strong>₹{((billing?.price?.amount || 29900) / 100).toFixed(0)}</strong><span>Unlimited scans & AI tools</span></div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Plan status</h2><p>Secure payments are processed by Razorpay.</p></div><Badge tone={billing?.subscription?.status === 'active' ? 'green' : 'amber'}>{billing?.subscription?.status || 'trialing'}</Badge></div><p className="empty-copy">Free trial: {trial?.scansUsed ?? 0} of {trial?.scanLimit ?? 3} scans used. {trial?.expiresAt ? `Valid until ${new Date(trial.expiresAt).toLocaleDateString()}.` : ''}</p></section>
    <section className="panel"><div className="panel-heading"><div><h2>Need help?</h2><p>Send a support ticket to the MathLens team.</p></div></div><form className="support-form" onSubmit={async e => { e.preventDefault(); await onTicket(subject, message); setSubject(''); setMessage(''); }}><input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"/><textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your query"/><Button type="submit">Send ticket</Button></form></section>
  </div>;
}

function AdminPanel({ admin, tickets, onExtend, onTicket }) {
  const [days, setDays] = useState(7);
  if (!admin) return <div className="dashboard"><p>Loading admin dashboard…</p></div>;
  return <div className="dashboard page-enter"><div className="section-heading"><div><Badge tone="aqua">ADMIN PANEL</Badge><h1>Billing & support control</h1><p>Manage trials, subscriptions and customer tickets.</p></div></div><section className="stat-grid"><StatCard label="Total users" value={admin.summary.totalUsers} icon="grid" tone="indigo"/><StatCard label="Active trials" value={admin.summary.trialUsers} icon="scan" tone="aqua"/><StatCard label="Paid users" value={admin.summary.paidUsers} icon="check" tone="amber"/><StatCard label="Open tickets" value={admin.summary.openTickets} icon="file" tone="indigo"/></section><section className="panel admin-table"><div className="panel-heading"><div><h2>Customers</h2><p>Trial, expired and paid account status.</p></div><label>Extend by <select value={days} onChange={e => setDays(Number(e.target.value))}><option value="7">7 days</option><option value="15">15 days</option><option value="30">30 days</option></select></label></div><div className="table-scroll"><table><thead><tr><th>User</th><th>Status</th><th>Usage</th><th>Trial expiry</th><th /></tr></thead><tbody>{admin.users.map(customer => <tr key={customer.id}><td><strong>{customer.name}</strong><small>{customer.email}</small></td><td><Badge tone={customer.subscription?.status === 'active' ? 'green' : customer.trial?.expired ? 'amber' : 'aqua'}>{customer.subscription?.status === 'active' ? 'PAID' : customer.trial?.expired ? 'EXPIRED' : 'TRIAL'}</Badge></td><td>{customer.usage?.scans || 0}/{customer.trial?.scanLimit || 3}</td><td>{customer.trial?.expiresAt ? new Date(customer.trial.expiresAt).toLocaleDateString() : '—'}</td><td><Button variant="secondary" onClick={() => onExtend(customer.id, days)}>Extend trial</Button></td></tr>)}</tbody></table></div></section><section className="panel admin-table"><div className="panel-heading"><div><h2>Support tickets</h2><p>Respond to customer queries.</p></div></div>{tickets?.length ? tickets.map(ticket => <div className="ticket-row" key={ticket._id}><div><strong>{ticket.subject}</strong><small>{ticket.user?.email || 'Customer'} · {ticket.status}</small><p>{ticket.message}</p>{ticket.adminReply ? <p><strong>Reply:</strong> {ticket.adminReply}</p> : null}</div><Button variant="secondary" onClick={() => onTicket(ticket)}>Resolve</Button></div>) : <p className="empty-copy">No support tickets.</p>}</section></div>;
}

function DocumentWorkspace({
  selected,
  activeTab,
  setActiveTab,
  setSelected,
  saving,
  onSave,
  onCopy,
  onExport,
  exporting,
  answer,
  setAnswer,
  onAiAction,
  aiBusy,
  aiOutput,
}) {
  const tabs = [['markdown', 'Reconstructed'], ['latex', 'LaTeX'], ['plainText', 'Plain text']];
  const tools = [
    ['solve', 'Solve step-by-step'],
    ['explain', 'Explain clearly'],
    ['simplify', 'Simplify'],
    ['check', 'Check my answer'],
    ['similar', 'Create practice'],
  ];

  return (
    <div className="document-workspace page-enter">
      <section className="document-summary">
        <div>
          <div className="summary-badges">
            <Badge>{(selected.sourceType || 'scan').toUpperCase()}</Badge>
            <Badge tone="slate">{selected.provider || 'AI'}</Badge>
          </div>
          <h1>{selected.title || 'Scan result'}</h1>
          <p>{selected.model ? `Recognized with ${selected.model}` : 'Recognized and ready to edit.'}</p>
        </div>
        <div className="summary-actions">
          <Button variant="secondary" icon="copy" onClick={() => onCopy(selected[activeTab] || '')}>Copy</Button>
          <Button icon="save" loading={saving} onClick={onSave}>Save changes</Button>
        </div>
      </section>

      {selected.warnings?.length ? <div className="notice notice--warning"><strong>Review suggested:</strong> {selected.warnings.join(' • ')}</div> : null}

      <section className="content-grid">
        <article className="panel editor-panel">
          <div className="panel-heading">
            <div><h2>Recognized content</h2><p>Edit OCR details before solving or exporting.</p></div>
            <Badge tone={saving ? 'slate' : 'green'}>{saving ? 'SAVING' : 'CLOUD SAVED'}</Badge>
          </div>
          <div className="segmented" role="tablist">
            {tabs.map(([key, label]) => (
              <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
            ))}
          </div>
          <textarea
            className={activeTab === 'latex' ? 'monospace' : ''}
            value={selected[activeTab] || ''}
            onChange={event => setSelected({ ...selected, [activeTab]: event.target.value })}
            aria-label={`${activeTab} content`}
          />
        </article>

        <aside className="right-rail">
          <article className="panel">
            <div className="panel-heading compact"><div><h2>Professional export</h2><p>Share-ready files.</p></div></div>
            <div className="export-actions">
              <button onClick={() => onExport('pdf')} disabled={Boolean(exporting)}>
                <span className="file-icon file-icon--pdf"><Icon name="file" /></span>
                <span><strong>PDF document</strong><small>Portable & print-ready</small></span>
                {exporting === 'pdf' ? <span className="spinner spinner--dark" /> : <Icon name="download" />}
              </button>
              <button onClick={() => onExport('docx')} disabled={Boolean(exporting)}>
                <span className="file-icon file-icon--word"><Icon name="file" /></span>
                <span><strong>Word document</strong><small>Editable DOCX format</small></span>
                {exporting === 'docx' ? <span className="spinner spinner--dark" /> : <Icon name="download" />}
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading compact"><div><h2>Detected questions</h2><p>Structured by MathLens AI.</p></div></div>
            {selected.questions?.length ? (
              <div className="question-list">
                {selected.questions.slice(0, 5).map((question, index) => (
                  <div key={`${question.number || index}-${index}`}><span>{question.number || index + 1}</span><p>{question.question || question.latex || 'Question detected'}</p></div>
                ))}
              </div>
            ) : <p className="empty-copy">No structured questions were detected in this scan.</p>}
          </article>
        </aside>
      </section>

      <section className="panel ai-panel">
        <div className="panel-heading">
          <div><h2>AI study tools</h2><p>Solve any recognized problem or turn it into guided practice.</p></div>
          <Badge tone="aqua">POWERED BY AI</Badge>
        </div>
        <label className="answer-input">
          Your answer <span>(needed only for Answer Check)</span>
          <input value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Example: x = 4 or 27.5" />
        </label>
        <div className="tool-row">
          {tools.map(([action, label]) => (
            <button key={action} onClick={() => onAiAction(action)} disabled={Boolean(aiBusy) || (action === 'check' && !answer.trim())}>
              {aiBusy === action ? <span className="spinner spinner--dark" /> : <Icon name={action === 'check' ? 'check' : 'sparkle'} />}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {aiOutput ? (
          <div className="ai-answer">
            <div><span className="icon-box icon-box--aqua"><Icon name="sparkle" /></span><div><strong>MathLens answer</strong><small>AI-generated • Review important work</small></div></div>
            <Button variant="dark" icon="copy" onClick={() => onCopy(aiOutput)}>Copy answer</Button>
            <pre>{aiOutput}</pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('markdown');
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState('');
  const [aiBusy, setAiBusy] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [answer, setAnswer] = useState('');
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState('');
  const [view, setView] = useState('dashboard');
  const [billing, setBilling] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/me')
      .then(response => {
        setUser(response.data.user);
        return loadWorkspace();
      })
      .catch(() => localStorage.removeItem('token'));
  }, []);

  async function loadWorkspace() {
    const [scanResponse, statsResponse] = await Promise.all([
      api.get('/scans'),
      api.get('/workspace/stats').catch(() => ({ data: null })),
    ]);
    setItems(scanResponse.data.items || []);
    setStats(statsResponse.data);
    const billingResponse = await api.get('/billing/status').catch(() => ({ data: null }));
    setBilling(billingResponse.data);
    if (user?.role === 'admin') await loadAdmin();
  }

  async function loadAdmin() {
    const [overview, ticketResponse] = await Promise.all([api.get('/workspace/admin/overview'), api.get('/workspace/tickets')]);
    setAdmin(overview.data); setTickets(ticketResponse.data.tickets || []);
  }

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  async function login(event) {
    event.preventDefault();
    try {
      setBusy(true);
      setAuthError('');
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      const [scanResponse, statsResponse, billingResponse] = await Promise.all([api.get('/scans'), api.get('/workspace/stats').catch(() => ({ data: null })), api.get('/billing/status').catch(() => ({ data: null }))]);
      setItems(scanResponse.data.items || []); setStats(statsResponse.data); setBilling(billingResponse.data);
      if (data.user.role === 'admin') await loadAdmin();
    } catch (error) {
      setAuthError(error.response?.data?.error || error.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setItems([]);
    setStats(null);
    setSelected(null);
    setView('dashboard'); setBilling(null); setAdmin(null); setTickets([]);
  }

  async function subscribe() {
    try {
      setPaymentLoading(true);
      const { data } = await api.post('/billing/orders');
      if (!window.Razorpay) { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; document.body.appendChild(script); await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; }); }
      const checkout = new window.Razorpay({ key: data.keyId, amount: data.order.amount, currency: data.order.currency, name: data.name, description: data.description, order_id: data.order.id, handler: async response => { await api.post('/billing/verify', response); await loadWorkspace(); notify('Payment verified — Pro access is active.'); }, theme: { color: '#4f46e5' } });
      checkout.open();
    } catch (error) { notify(error.response?.data?.error || 'Unable to start checkout.'); } finally { setPaymentLoading(false); }
  }

  async function extendTrial(userId, days) { try { await api.patch(`/workspace/admin/users/${userId}/trial`, { days }); await loadAdmin(); notify('Trial extended.'); } catch (error) { notify(error.response?.data?.error || 'Could not extend trial.'); } }
  async function resolveTicket(ticket) { const adminReply = window.prompt('Reply to customer (optional):', ticket.adminReply || ''); if (adminReply === null) return; try { await api.patch(`/workspace/admin/tickets/${ticket._id}`, { status: 'resolved', adminReply }); await loadAdmin(); notify('Ticket resolved.'); } catch { notify('Could not update ticket.'); } }
  async function createTicket(subject, message) { try { await api.post('/workspace/tickets', { subject, message }); notify('Support ticket sent.'); } catch (error) { notify(error.response?.data?.error || 'Could not send ticket.'); } }

  async function upload() {
    if (!file) return;
    try {
      setBusy(true);
      const formData = new FormData();
      formData.append('file', file);
      const image = file.type.startsWith('image/');
      const { data } = await api.post(image ? '/scans/image' : '/scans/document', formData);
      setSelected(data.scan);
      setFile(null);
      setActiveTab('markdown');
      setAiOutput('');
      await loadWorkspace();
      notify('Scan recognized successfully');
    } catch (error) {
      notify(error.response?.data?.error || 'Scan failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    try {
      setSaving(true);
      const { data } = await api.patch(`/scans/${selected._id}`, { [activeTab]: selected[activeTab] || '' });
      setSelected(current => ({ ...current, ...data.scan }));
      setItems(current => current.map(item => item._id === data.scan._id ? data.scan : item));
      notify('Changes saved to the cloud');
    } catch (error) {
      notify(error.response?.data?.error || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text || '');
    notify('Copied to clipboard');
  }

  async function exportFile(format) {
    if (!selected) return;
    try {
      setExporting(format);
      const response = await api.get(`/exports/${selected._id}/${format}`, { responseType: 'blob' });
      const extension = format === 'docx' ? 'docx' : 'pdf';
      const safeName = String(selected.title || 'scan').replace(/[^a-z0-9._-]+/gi, '_').slice(0, 80);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeName}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`${extension.toUpperCase()} export ready`);
    } catch (error) {
      notify(error.response?.data?.error || 'Export failed.');
    } finally {
      setExporting('');
    }
  }

  async function runAiAction(action) {
    try {
      setAiBusy(action);
      setAiOutput('');
      const { data } = await api.post('/ai/action', {
        action,
        content: selected.markdown || selected.plainText || selected.latex,
        answer: action === 'check' ? answer : undefined,
      });
      setAiOutput(data.text || 'No answer returned.');
    } catch (error) {
      notify(error.response?.data?.error || 'AI action failed.');
    } finally {
      setAiBusy('');
    }
  }

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(item => `${item.title || ''} ${item.plainText || ''}`.toLowerCase().includes(normalized));
  }, [items, query]);

  if (!user) {
    return <AuthView email={email} password={password} busy={busy} error={authError} setEmail={setEmail} setPassword={setPassword} onSubmit={login} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />

        <div className="new-scan">
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/*,.pdf,.docx,.txt"
            onChange={event => setFile(event.target.files?.[0] || null)}
          />
          <Button icon="scan" onClick={() => fileInput.current?.click()}>New scan</Button>
          {file ? (
            <div className="chosen-file">
              <span className="icon-box icon-box--aqua"><Icon name="file" /></span>
              <div><strong title={file.name}>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></div>
              <Button variant="dark" loading={busy} onClick={upload}>Recognize</Button>
            </div>
          ) : null}
        </div>

        <div className="history-heading"><span>Scan history</span><Badge tone="slate">{items.length}</Badge></div>
        <div className="sidebar-actions"><Button variant="secondary" onClick={() => { setSelected(null); setView('billing'); }}>Billing</Button>{user.role === 'admin' ? <Button variant="secondary" onClick={() => { setSelected(null); setView('admin'); loadAdmin(); }}>Admin panel</Button> : null}</div>
        <div className="search-box"><Icon name="search" /><input placeholder="Search scans" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <nav className="history-list" aria-label="Scan history">
          {filteredItems.length ? filteredItems.map(item => (
            <button key={item._id} className={selected?._id === item._id ? 'active' : ''} onClick={() => { setSelected(item); setAiOutput(''); }}>
              <span className="history-icon"><Icon name={item.sourceType === 'image' ? 'scan' : 'file'} /></span>
              <span><strong>{item.title || 'Untitled scan'}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></span>
              <Icon name="chevron" size={16} />
            </button>
          )) : <p className="sidebar-empty">No matching scans yet.</p>}
        </nav>

        <footer className="profile-chip">
          <span>{(user.name || 'ML').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
          <div><strong>{user.name}</strong><small>{user.plan || 'free'} plan</small></div>
          <button onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button>
        </footer>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{selected ? 'SCAN RESULT' : 'WORKSPACE OVERVIEW'}</span>
            <strong>{selected?.title || 'MathLens dashboard'}</strong>
          </div>
          <div className="topbar-status"><span /><small>Cloud sync active</small></div>
        </header>

        {selected ? (
          <DocumentWorkspace
            selected={selected}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setSelected={setSelected}
            saving={saving}
            onSave={saveSelected}
            onCopy={copyText}
            onExport={exportFile}
            exporting={exporting}
            answer={answer}
            setAnswer={setAnswer}
            onAiAction={runAiAction}
            aiBusy={aiBusy}
            aiOutput={aiOutput}
          />
        ) : view === 'billing' ? <BillingPanel billing={billing} onSubscribe={subscribe} loading={paymentLoading} onTicket={createTicket} /> : view === 'admin' && user.role === 'admin' ? <AdminPanel admin={admin} tickets={tickets} onExtend={extendTrial} onTicket={resolveTicket} /> : (
          <Dashboard user={user} stats={stats} onNewScan={() => fileInput.current?.click()} />
        )}
      </main>

      {toast ? <div className="toast"><Icon name="check" />{toast}</div> : null}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
