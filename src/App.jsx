import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'tracker-data-v1';
const DISMISSED_KEY = 'tracker-dismissed-v1';

/* ── helpers ───────────────────────────────────────────────────────── */
const daysBetween = (a, b) => {
  const ms = 86400000;
  const uA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const uB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((uB - uA) / ms);
};
const hoursBetween = (now, t) => Math.floor((t.getTime() - now.getTime()) / 3600000);
const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const plural = (n, w) => `${Math.abs(n)} ${w}${Math.abs(n) === 1 ? '' : 's'}`;
const uid = () => Math.random().toString(36).slice(2, 10);

const MILESTONES = [7, 14, 30, 60, 90, 180, 365];

const ICON_CATS = [
  { label: 'Habits',   icons: ['🔥','💪','🧘','🏃','💧','☕','🚭','💤','🧠','⏰'] },
  { label: 'Goals',    icons: ['🎯','🏆','⭐','🚀','📈','💰','🎓','📖','✍️','🔑'] },
  { label: 'Travel',   icons: ['✈️','🌍','🗺️','🏖️','🏔️','🧳','🚗','🛳️','🏕️','🌅'] },
  { label: 'Events',   icons: ['🎉','🎂','🎊','🎤','🎭','🎪','🎬','🎵','📅','⏳'] },
  { label: 'Holidays', icons: ['🎄','🎃','🦃','🎆','💘','🐣','🕎','🌸','🎑','☘️'] },
  { label: 'Health',   icons: ['❤️','🩺','💊','🏥','🧬','🥗','🥤','🚴','🏋️','🧘‍♀️'] },
  { label: 'Life',     icons: ['🏠','👶','💍','🐶','🐱','🌱','🎒','📦','🔧','🛠️'] },
];

const COLORS = [
  '#F97316','#EF4444','#8B5CF6','#06B6D4',
  '#10B981','#F59E0B','#EC4899','#6366F1',
  '#14B8A6','#F43F5E','#84CC16','#A855F7',
];

/* ── local storage ─────────────────────────────────────────────────── */
function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ── reminders ─────────────────────────────────────────────────────── */
function computeAlerts(trackers, dismissed) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const alerts = [];

  trackers.forEach(t => {
    const target = new Date(t.date + 'T00:00:00');

    if (t.mode === 'down') {
      const d = daysBetween(today, target);
      const h = hoursBetween(now, new Date(t.date + 'T00:00:00'));
      const push = (suffix, msg, urgent) => {
        const k = `${t.id}-${suffix}`;
        if (!dismissed[k]) alerts.push({ key: k, tracker: t, message: msg, urgent });
      };
      if (d === 0)      push('today', 'Today is the day!', true);
      else if (d === 1) push('1d',  `Tomorrow! (~${h} hrs)`, true);
      else if (d === 2) push('2d',  '2 days away', false);
      else if (d === 3) push('3d',  '3 days away', false);
      else if (d < 0)   push('past', `${Math.abs(d)} days past target`, true);
    }

    if (t.mode === 'up') {
      const elapsed = -daysBetween(today, target);
      MILESTONES.forEach(m => {
        const k1 = `${t.id}-ms${m}`;
        const k2 = `${t.id}-ms${m}-pre`;
        if (elapsed === m && !dismissed[k1])
          alerts.push({ key: k1, tracker: t, message: `${m}-day milestone reached!`, urgent: false });
        else if (elapsed === m - 1 && !dismissed[k2])
          alerts.push({ key: k2, tracker: t, message: `1 day until ${m}-day milestone`, urgent: false });
      });
    }
  });
  return alerts;
}

/* ── styles (shared) ───────────────────────────────────────────────── */
const fonts = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
@keyframes cardIn { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:translateY(0) } }
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
::-webkit-scrollbar{display:none}
input::placeholder{color:#555}
`;

/* ── AlertBanner ───────────────────────────────────────────────────── */
function AlertBanner({ alerts, onDismiss, onDismissAll }) {
  if (!alerts.length) return null;
  return (
    <div style={{ padding: '0 20px', marginBottom: 8 }}>
      <div style={{
        background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 16, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: '#F97316' }}>
            🔔 Reminders ({alerts.length})
          </span>
          {alerts.length > 1 && (
            <button onClick={onDismissAll} style={{
              background: 'none', border: 'none', color: '#777', fontSize: 12,
              fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
            }}>Dismiss all</button>
          )}
        </div>
        {alerts.map(a => (
          <div key={a.key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
            marginBottom: 6,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13,
                color: a.urgent ? '#F97316' : '#CCC',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{a.tracker.icon} {a.tracker.name}</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888', marginTop: 2 }}>{a.message}</div>
            </div>
            <button onClick={() => onDismiss(a.key)} style={{
              background: 'none', border: 'none', color: '#555', fontSize: 16,
              cursor: 'pointer', padding: '0 0 0 10px',
            }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── TrackerCard ────────────────────────────────────────────────────── */
function TrackerCard({ tracker: t, onDelete, onEdit, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const today = new Date();
  const target = new Date(t.date + 'T00:00:00');
  const diff = daysBetween(today, target);
  const isUp = t.mode === 'up';
  const display = isUp ? -diff : diff;
  const isPast = !isUp && diff < 0;
  const isToday = diff === 0;

  const arrowBtn = (dir, fn, disabled) => (
    <button onClick={fn} disabled={disabled} style={{
      background: disabled ? 'transparent' : 'rgba(255,255,255,0.06)',
      border: 'none', borderRadius: 7, color: disabled ? '#333' : '#888',
      padding: '5px 6px', cursor: disabled ? 'default' : 'pointer', fontSize: 12,
    }}>{dir}</button>
  );

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '22px 18px',
      border: `1px solid ${t.color}22`, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        background: `radial-gradient(circle,${t.color}18,transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>{t.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: '#F1F1F1',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{t.name}</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11.5, color: '#888', marginTop: 1 }}>
              {isUp ? 'since' : 'until'} {fmtDate(t.date)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {arrowBtn('▲', onMoveUp, isFirst)}
          {arrowBtn('▼', onMoveDown, isLast)}
          <button onClick={() => onEdit(t)} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7,
            color: '#888', padding: '5px 7px', cursor: 'pointer', fontSize: 13,
          }}>✏️</button>
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7,
              color: '#666', padding: '5px 7px', cursor: 'pointer', fontSize: 13,
            }}>✕</button>
          ) : (
            <button onClick={() => onDelete(t.id)} style={{
              background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 7, color: '#EF4444', padding: '4px 8px', cursor: 'pointer',
              fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
            }}>Delete?</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 48,
          lineHeight: 1, color: t.color, letterSpacing: '-0.03em',
        }}>{isToday ? '0' : display}</span>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: '#777' }}>
          {isToday ? 'today!' : plural(display, 'day')}
        </span>
      </div>

      {isPast && <div style={{
        marginTop: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#F97316', fontWeight: 500,
      }}>{plural(diff, 'day')} past target</div>}

      {isUp && display > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {MILESTONES.map(m => {
            const lbl = m === 7 ? '1w' : m === 14 ? '2w' : m + 'd';
            const hit = display >= m;
            return (
              <span key={m} style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
                padding: '3px 7px', borderRadius: 20,
                background: hit ? `${t.color}30` : 'rgba(255,255,255,0.04)',
                color: hit ? t.color : '#555',
                border: `1px solid ${hit ? t.color + '40' : 'transparent'}`,
              }}>{lbl}</span>
            );
          })}
        </div>
      )}

      {!isUp && !isPast && display <= 3 && display > 0 && (
        <div style={{ marginTop: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888' }}>
          ~{hoursBetween(new Date(), new Date(t.date + 'T00:00:00'))} hours remaining
        </div>
      )}
    </div>
  );
}

/* ── TrackerForm ────────────────────────────────────────────────────── */
function TrackerForm({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState(initial?.mode || 'up');
  const [icon, setIcon] = useState(initial?.icon || '🔥');
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [openCat, setOpenCat] = useState(ICON_CATS[0].label);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleSave = () => { if (name.trim()) onSave({ id: initial?.id || uid(), name: name.trim(), date, mode, icon, color }); };

  const inp = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 13, color: '#F1F1F1', fontSize: 15, fontFamily: "'DM Sans',sans-serif", outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, animation: 'fadeIn .25s ease',
    }}>
      <div style={{
        background: '#1A1A1E', borderRadius: '24px 24px 0 0', padding: '24px 22px 34px',
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .3s ease',
      }}>
        <div style={{ width: 36, height: 4, background: '#444', borderRadius: 2, margin: '0 auto 18px' }} />
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 21, color: '#F1F1F1', margin: '0 0 18px' }}>
          {initial ? 'Edit Tracker' : 'New Tracker'}
        </h2>

        <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#888', fontWeight: 500 }}>Name</label>
        <input ref={ref} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          placeholder="e.g. Days sober, Trip to Japan…"
          style={{ ...inp, marginTop: 5, marginBottom: 16 }} />

        <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#888', fontWeight: 500 }}>Mode</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 5, marginBottom: 16 }}>
          {[['up', 'Count Up ↑'], ['down', 'Count Down ↓']].map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
              fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              background: mode === v ? color + '25' : 'rgba(255,255,255,0.06)',
              color: mode === v ? color : '#888',
              outline: mode === v ? `2px solid ${color}60` : 'none',
            }}>{l}</button>
          ))}
        </div>

        <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#888', fontWeight: 500 }}>
          {mode === 'up' ? 'Start Date' : 'Target Date'}
        </label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inp, marginTop: 5, marginBottom: 16, colorScheme: 'dark' }} />

        <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#888', fontWeight: 500 }}>Icon</label>
        <div style={{ display: 'flex', gap: 0, marginTop: 5, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {ICON_CATS.map(c => (
            <button key={c.label} onClick={() => setOpenCat(c.label)} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: openCat === c.label ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: openCat === c.label ? '#F1F1F1' : '#666',
            }}>{c.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6, marginBottom: 16, minHeight: 50 }}>
          {ICON_CATS.find(c => c.label === openCat)?.icons.map(i => (
            <button key={i} onClick={() => setIcon(i)} style={{
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: icon === i ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              fontSize: 19, cursor: 'pointer', outline: icon === i ? `2px solid ${color}` : 'none',
            }}>{i}</button>
          ))}
        </div>

        <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#888', fontWeight: 500 }}>Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 5, marginBottom: 22 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer',
              outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 3,
              transform: color === c ? 'scale(1.15)' : 'none',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '13px 0', borderRadius: 13, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#AAA', fontFamily: "'DM Sans',sans-serif", fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: '13px 0', borderRadius: 13, border: 'none',
            background: name.trim() ? color : '#333', color: name.trim() ? '#fff' : '#666',
            fontFamily: "'DM Sans',sans-serif", fontSize: 14.5, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default',
          }}>{initial ? 'Save Changes' : 'Add Tracker'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [trackers, setTrackers] = useState([]);
  const [dismissed, setDismissed] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setTrackers(load(STORAGE_KEY) || []);
    setDismissed(load(DISMISSED_KEY) || {});
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) save(STORAGE_KEY, trackers); }, [trackers, loaded]);
  useEffect(() => { if (loaded) save(DISMISSED_KEY, dismissed); }, [dismissed, loaded]);

  const addOrUpdate = useCallback(t => {
    setTrackers(prev => {
      const i = prev.findIndex(x => x.id === t.id);
      if (i >= 0) { const n = [...prev]; n[i] = t; return n; }
      return [...prev, t];
    });
    setShowForm(false); setEditTarget(null);
  }, []);

  const remove = useCallback(id => setTrackers(p => p.filter(x => x.id !== id)), []);
  const moveUp = useCallback(i => { if (!i) return; setTrackers(p => { const n=[...p]; [n[i-1],n[i]]=[n[i],n[i-1]]; return n; }); }, []);
  const moveDown = useCallback(i => { setTrackers(p => { if(i>=p.length-1) return p; const n=[...p]; [n[i],n[i+1]]=[n[i+1],n[i]]; return n; }); }, []);

  const alerts = loaded ? computeAlerts(trackers, dismissed) : [];
  const dismissAlert = useCallback(k => setDismissed(p => ({ ...p, [k]: Date.now() })), []);
  const dismissAll = useCallback(() => {
    const cur = computeAlerts(trackers, dismissed);
    setDismissed(p => { const n = { ...p }; cur.forEach(a => { n[a.key] = Date.now(); }); return n; });
  }, [trackers, dismissed]);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#111114', padding: '0 0 100px', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{fonts}</style>

      {/* header */}
      <div style={{ padding: '52px 22px 4px' }}>
        <div style={{
          fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#666',
          fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>{todayStr}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 28, color: '#F1F1F1', margin: 0, letterSpacing: '-0.03em' }}>
            Trackers
          </h1>
          <button onClick={() => setShowInfo(true)} style={{
            background: 'none', border: 'none', color: '#555', fontSize: 19, cursor: 'pointer', padding: 4,
          }}>ⓘ</button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <AlertBanner alerts={alerts} onDismiss={dismissAlert} onDismissAll={dismissAll} />
      </div>

      <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!loaded && <div style={{ textAlign: 'center', color: '#555', padding: '60px 0', fontSize: 14 }}>Loading…</div>}
        {loaded && !trackers.length && (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: '#555' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📊</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 17, color: '#888' }}>No trackers yet</div>
            <div style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
              Tap + to count days since a start date<br />or count down to an upcoming event.
            </div>
          </div>
        )}
        {trackers.map((t, i) => (
          <div key={t.id} style={{ animation: `cardIn .3s ease ${i * .05}s both` }}>
            <TrackerCard tracker={t} onDelete={remove}
              onEdit={tr => { setEditTarget(tr); setShowForm(true); }}
              onMoveUp={() => moveUp(i)} onMoveDown={() => moveDown(i)}
              isFirst={i === 0} isLast={i === trackers.length - 1} />
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => { setEditTarget(null); setShowForm(true); }} style={{
        position: 'fixed', bottom: 28, right: 24, width: 58, height: 58,
        borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg,#F97316,#EF4444)',
        color: '#fff', fontSize: 28, fontWeight: 300, cursor: 'pointer',
        boxShadow: '0 6px 24px rgba(249,115,22,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}>+</button>

      {showForm && <TrackerForm initial={editTarget} onSave={addOrUpdate}
        onCancel={() => { setShowForm(false); setEditTarget(null); }} />}

      {showInfo && (
        <div onClick={() => setShowInfo(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 22, animation: 'fadeIn .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1A1A1E', borderRadius: 20, padding: '26px 22px', maxWidth: 380, width: '100%',
          }}>
            <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 17, color: '#F1F1F1', margin: '0 0 14px' }}>
              How It Works
            </h3>
            <div style={{ color: '#AAA', fontSize: 13.5, lineHeight: 1.7 }}>
              <strong style={{ color: '#F97316' }}>Count Up</strong> — days since a start date. Milestones at 1w, 2w, 30d, 60d, 90d, 180d, 365d.<br /><br />
              <strong style={{ color: '#06B6D4' }}>Count Down</strong> — days until a target. Shows hours when close.<br /><br />
              <strong style={{ color: '#8B5CF6' }}>Reorder</strong> — ▲ ▼ arrows to arrange trackers.<br /><br />
              <strong style={{ color: '#10B981' }}>Reminders</strong> — 🔔 fires at 3d, 2d, 1d, and on the day for countdowns, plus milestone alerts for count-ups.
            </div>
            <div style={{
              marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
              borderRadius: 11, fontSize: 12.5, color: '#666', lineHeight: 1.5,
            }}>All data is stored locally on your device — nothing leaves your phone.</div>
            <button onClick={() => setShowInfo(false)} style={{
              width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 12, border: 'none',
              background: '#F97316', color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
            }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
