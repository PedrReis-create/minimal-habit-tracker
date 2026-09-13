import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays, ChartNoAxesColumn, Settings2, Download, Upload,
  Plus, X, Pencil, Check, Flame, Trash2, ChevronDown, HelpCircle
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "minimal-habit-tracker:v1";

const starterHabits = [
  { id: "gym", name: "gym", emoji: "💪", color: "#2496e8", target: 4, dates: [] },
  { id: "reading", name: "reading", emoji: "📚", color: "#ffd21f", target: 3, dates: [] },
  { id: "manware", name: "1 manware video", emoji: "🔥", color: "#e75b48", target: 1, dates: [] }
];

function isoDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function daysBetween(a, b) {
  const ms = 86400000;
  return Math.round((new Date(b) - new Date(a)) / ms);
}

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function getYearDays() {
  const today = new Date();
  const end = startOfWeek(today);
  end.setDate(end.getDate() + 6);
  const start = new Date(end);
  start.setDate(start.getDate() - 52 * 7 + 1);
  const days = [];
  for (let i = 0; i < 53 * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function calculateStats(habit) {
  const dates = new Set(habit.dates || []);
  const today = isoDate(new Date());

  let streak = 0;
  let cursor = new Date(today);
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let best = 0;
  let current = 0;
  const sorted = [...dates].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || daysBetween(sorted[i - 1], sorted[i]) === 1) current++;
    else current = 1;
    best = Math.max(best, current);
  }

  const periodDays = 365;
  const completed = [...dates].filter(d => daysBetween(d, today) >= 0 && daysBetween(d, today) < periodDays).length;
  const percent = Math.round((completed / periodDays) * 100);

  return { streak, best, percent, completed };
}

function App() {
  const [habits, setHabits] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved?.habits?.length ? saved.habits : starterHabits;
    } catch {
      return starterHabits;
    }
  });
  const [tab, setTab] = useState("calendar");
  const [fullView, setFullView] = useState(true);
  const [help, setHelp] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits }));
  }, [habits]);

  const yearDays = useMemo(getYearDays, []);

  function toggleDate(habitId, date) {
    const key = isoDate(date);
    if (key > isoDate(new Date())) return;
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const dates = new Set(h.dates || []);
      dates.has(key) ? dates.delete(key) : dates.add(key);
      return { ...h, dates: [...dates].sort() };
    }));
  }

  function saveHabit(data) {
    if (!data.name.trim()) return;
    if (editing) {
      setHabits(prev => prev.map(h => h.id === editing.id ? { ...h, ...data } : h));
    } else {
      setHabits(prev => [...prev, { ...data, id: crypto.randomUUID(), dates: [] }]);
    }
    setEditing(null);
    setModal(null);
  }

  function deleteHabit(id) {
    if (!window.confirm("Delete this habit and all of its history?")) return;
    setHabits(prev => prev.filter(h => h.id !== id));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), habits }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "minimal-habit-tracker.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.habits)) throw new Error();
        setHabits(parsed.habits);
      } catch {
        alert("Invalid habit tracker JSON file.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div className={fullView ? "app full" : "app"}>
      <header className="topbar">
        <button className="ghost-button" onClick={() => setHelp(v => !v)}>
          <HelpCircle size={15} /> {help ? "Hide Help" : "Show Help"}
        </button>

        <nav className="tabs">
          <button className={tab === "calendar" ? "tab active" : "tab"} onClick={() => setTab("calendar")}>
            <CalendarDays size={14} /> Calendar
          </button>
          <button className={tab === "statistics" ? "tab active" : "tab"} onClick={() => setTab("statistics")}>
            <ChartNoAxesColumn size={14} /> Statistics
          </button>
          <button className={tab === "manage" ? "tab active" : "tab"} onClick={() => setTab("manage")}>
            <Settings2 size={14} /> Manage
          </button>
        </nav>

        <div className="actions">
          <button className="pill-button" onClick={exportData}><Download size={14}/> Export</button>
          <label className="pill-button">
            <Upload size={14}/> Import
            <input type="file" accept=".json,application/json" onChange={importData} hidden />
          </label>
          <button className="primary-button" onClick={() => { setEditing(null); setModal("habit"); }}>
            <Plus size={15}/> Add
          </button>
        </div>
      </header>

      {tab === "calendar" && (
        <>
          {help && (
            <section className="help">
              <strong>Minimal Habit Tracker</strong>
              <span>Click any square to mark a habit complete. Your data is saved locally in this browser.</span>
              <button onClick={() => setHelp(false)} aria-label="Close help"><X size={14}/></button>
            </section>
          )}

          <div className="view-row">
            <span>Full View</span>
            <button className={fullView ? "switch on" : "switch"} onClick={() => setFullView(v => !v)} aria-label="Toggle full view">
              <span />
            </button>
          </div>

          <main className="habit-list">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                days={yearDays}
                onToggle={toggleDate}
                onEdit={() => { setEditing(habit); setModal("habit"); }}
                onDelete={() => deleteHabit(habit.id)}
                fullView={fullView}
              />
            ))}

            {!habits.length && (
              <div className="empty">
                <div>No habits yet.</div>
                <button className="primary-button" onClick={() => setModal("habit")}><Plus size={15}/> Add your first habit</button>
              </div>
            )}
          </main>
        </>
      )}

      {tab === "statistics" && <Statistics habits={habits} />}
      {tab === "manage" && (
        <Manage
          habits={habits}
          onAdd={() => { setEditing(null); setModal("habit"); }}
          onEdit={h => { setEditing(h); setModal("habit"); }}
          onDelete={deleteHabit}
        />
      )}

      {modal === "habit" && (
        <HabitModal
          initial={editing}
          onClose={() => { setModal(null); setEditing(null); }}
          onSave={saveHabit}
        />
      )}
    </div>
  );
}

function HabitCard({ habit, days, onToggle, onEdit, onDelete, fullView }) {
  const stats = calculateStats(habit);
  const columns = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  return (
    <section className="habit-card" style={{ "--accent": habit.color }}>
      <div className="habit-header">
        <div className="habit-title">
          <div className="habit-check"><Check size={15}/></div>
          <span className="emoji">{habit.emoji}</span>
          <div>
            <h2>{habit.name}</h2>
            <div className="meta">
              <span className="streak" style={{ color: habit.color, borderColor: habit.color + "55", background: habit.color + "14" }}>
                {stats.streak > 0 ? `${stats.streak}-day streak` : "No streak"}
              </span>
              <span>Best: {stats.best}</span>
              <span>{stats.percent}%</span>
            </div>
          </div>
        </div>

        <div className="card-actions">
          <button onClick={onEdit} title="Edit"><Pencil size={13}/></button>
          <button onClick={onDelete} title="Delete"><X size={13}/></button>
        </div>
      </div>

      <div className="heatmap-wrap">
        <div className="weekday-labels">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x => <span key={x}>{x}</span>)}
        </div>

        <div className="heatmap-area">
          <div className="month-labels">
            {columns.map((week, index) => {
              const first = week[0];
              const previous = index ? columns[index - 1][0] : null;
              const show = !previous || first.getMonth() !== previous.getMonth();
              return <span key={index} style={{ left: `${index * 14.1}px` }}>{show ? formatMonth(first) : ""}</span>;
            })}
          </div>

          <div className="weeks">
            {columns.map((week, wi) => (
              <div className="week" key={wi}>
                {week.map(day => {
                  const key = isoDate(day);
                  const completed = (habit.dates || []).includes(key);
                  const future = key > isoDate(new Date());
                  return (
                    <button
                      key={key}
                      className={`day ${completed ? "done" : ""} ${future ? "future" : ""}`}
                      style={completed ? { background: habit.color, borderColor: habit.color } : {}}
                      onClick={() => onToggle(habit.id, day)}
                      title={`${key}${completed ? " • completed" : ""}`}
                      disabled={future}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="legend">
            <span>Less</span>
            <i></i><i></i><i></i><i></i>
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Statistics({ habits }) {
  return (
    <main className="panel-page">
      <div className="page-title">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Statistics</h1>
        </div>
        <span className="muted">{habits.length} habits</span>
      </div>
      <div className="stats-grid">
        {habits.map(h => {
          const s = calculateStats(h);
          return (
            <article className="stat-card" key={h.id} style={{ "--accent": h.color }}>
              <div className="stat-name"><span>{h.emoji}</span><strong>{h.name}</strong></div>
              <div className="big-number">{s.percent}<small>%</small></div>
              <div className="stat-row"><span>Current streak</span><strong>{s.streak} days</strong></div>
              <div className="stat-row"><span>Best streak</span><strong>{s.best} days</strong></div>
              <div className="stat-row"><span>Completed</span><strong>{s.completed} days</strong></div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function Manage({ habits, onAdd, onEdit, onDelete }) {
  return (
    <main className="panel-page">
      <div className="page-title">
        <div><p className="eyebrow">Configuration</p><h1>Manage habits</h1></div>
        <button className="primary-button" onClick={onAdd}><Plus size={15}/> Add habit</button>
      </div>
      <div className="manage-list">
        {habits.map(h => (
          <div className="manage-item" key={h.id}>
            <div className="manage-left">
              <span className="manage-dot" style={{ background: h.color }}>{h.emoji}</span>
              <div><strong>{h.name}</strong><small>Target: {h.target} / week</small></div>
            </div>
            <div className="manage-actions">
              <button onClick={() => onEdit(h)}><Pencil size={14}/> Edit</button>
              <button className="danger" onClick={() => onDelete(h.id)}><Trash2 size={14}/> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function HabitModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [emoji, setEmoji] = useState(initial?.emoji || "✓");
  const [color, setColor] = useState(initial?.color || "#2496e8");
  const [target, setTarget] = useState(initial?.target || 3);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><p className="eyebrow">{initial ? "Edit habit" : "New habit"}</p><h2>{initial ? "Update habit" : "Add habit"}</h2></div>
          <button onClick={onClose}><X size={17}/></button>
        </div>

        <label>Name<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Read 20 minutes" /></label>
        <div className="form-row">
          <label>Emoji<input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={3}/></label>
          <label>Weekly target
            <div className="select-wrap"><select value={target} onChange={e => setTarget(Number(e.target.value))}>
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} days</option>)}
            </select><ChevronDown size={14}/></div>
          </label>
        </div>
        <label>Color
          <div className="color-row">
            {["#2496e8","#ffd21f","#a36cf5","#43d17b","#ef6b5a","#f18d35","#f07bc5"].map(c =>
              <button key={c} className={color === c ? "color selected" : "color"} style={{ background: c }} onClick={() => setColor(c)} />
            )}
          </div>
        </label>

        <div className="modal-footer">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={() => onSave({ name, emoji, color, target })}><Check size={15}/> Save</button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
