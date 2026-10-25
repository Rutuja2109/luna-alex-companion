// Simulated daily-life engine: a deterministic, time-based state machine.
// Nothing runs in the background. The current activity is *calculated* from
// the configured routine and the clock whenever a screen asks for it, so the
// app never claims the companion did something while it was closed.

export const ACTIVITY_STATES = {
  wake:     { label: 'Waking up', desc: 'Slow start, stretching', room: 'bedroom', scene: 'wake', joinable: false },
  coffee:   { label: 'Morning coffee', desc: 'In the kitchen', room: 'kitchen', scene: 'coffee', joinable: true, activity: 'coffee' },
  exercise: { label: 'Gym time', desc: 'Quick workout', room: 'living', scene: 'exercise', joinable: false },
  study:    { label: 'Studying at {pos} desk', short: 'Studying', desc: 'Focused', room: 'study', scene: 'study', joinable: true, activity: 'study' },
  lunch:    { label: 'Lunch', desc: 'Taking a break', room: 'kitchen', scene: 'coffee', joinable: true, activity: 'coffee' },
  work:     { label: 'Working', desc: 'Deep work on the laptop', room: 'study', scene: 'work', joinable: true, activity: 'work' },
  read:     { label: 'Reading', desc: 'Curled up with a book', room: 'living', scene: 'read', joinable: true, activity: 'read' },
  cook:     { label: 'Cooking', desc: 'Making dinner', room: 'kitchen', scene: 'cook', joinable: true, activity: 'cook' },
  movie:    { label: 'Movie night', desc: 'On the couch', room: 'living', scene: 'movie', joinable: true, activity: 'movie' },
  relax:    { label: 'Relaxing', desc: 'Winding down', room: 'living', scene: 'relax', joinable: true, activity: 'relax' },
  evening:  { label: 'Evening chat time', desc: 'Free to talk', room: 'living', scene: 'evening', joinable: true, activity: 'relax' },
  bed:      { label: 'Good night', desc: 'Getting ready for bed', room: 'bedroom', scene: 'bed', joinable: false },
};

// Default routine (24h clock). Weekends swap work for slower activities.
const WEEKDAY = [
  ['00:00', 'bed'], ['07:30', 'wake'], ['08:15', 'coffee'], ['09:00', 'exercise'], ['11:00', 'study'],
  ['13:00', 'lunch'], ['14:00', 'work'], ['17:30', 'read'], ['19:00', 'cook'], ['20:00', 'evening'],
  ['21:00', 'movie'], ['22:30', 'bed'],
];
const WEEKEND = [
  ['00:00', 'bed'], ['09:00', 'wake'], ['09:45', 'coffee'], ['11:00', 'read'], ['13:00', 'lunch'],
  ['14:30', 'relax'], ['17:00', 'study'], ['19:00', 'cook'], ['20:30', 'movie'], ['23:00', 'bed'],
];

// Clock indirection so QA can preview other times of day (?t=HH:MM, local only).
export const clock = { offset: 0, now() { return Date.now() + this.offset; } };

// Persistent life events (shared activities, study sessions, calls) and past
// day snapshots come from the store. main.js registers the source; tests can
// pass `events` explicitly. Everything here stays a pure calculation.
let source = () => ({ events: [], days: {} });
export function setSource(fn) { source = fn; }

/** A shared session is "live" while its heartbeat is fresh. */
export const HEARTBEAT_MS = 90e3;
export const isLive = (e, now) => e.kind !== 'note' && !e.closed && now - (e.lastSeen || e.ts) < HEARTBEAT_MS;

export const SHARED_STATES = {
  study:   { label: 'Studying with you', short: 'Studying with you', desc: 'Focus session together', room: 'study', scene: 'study' },
  work:    { label: 'Working with you', short: 'Working with you', desc: 'Heads down together', room: 'study', scene: 'work' },
  coffee:  { label: 'Having coffee with you', short: 'Coffee with you', desc: 'Slow sips, small talk', room: 'kitchen', scene: 'coffee' },
  movie:   { label: 'Watching a movie with you', short: 'Movie with you', desc: 'On the couch together', room: 'living', scene: 'movie' },
  cook:    { label: 'Cooking with you', short: 'Cooking with you', desc: 'Making dinner together', room: 'kitchen', scene: 'cook' },
  read:    { label: 'Reading with you', short: 'Reading with you', desc: 'Quiet pages together', room: 'living', scene: 'read' },
  hangout: { label: 'Hanging out with you', short: 'Hanging out', desc: 'No plans, just company', room: 'living', scene: 'hangout' },
  relax:   { label: 'Relaxing with you', short: 'Relaxing with you', desc: 'Winding down together', room: 'living', scene: 'relax' },
  call:    { label: 'On a call with you', short: 'On a call', desc: 'Talking with you', room: 'living', scene: 'relax' },
};

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export const dateKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export function baseRoutine(date, cfg) {
  const day = date.getDay();
  return cfg?.routine || (day === 0 || day === 6 ? WEEKEND : WEEKDAY);
}

export function routineFor(date, cfg, days = source().days || {}) {
  // A day that was already seen keeps the schedule it had (snapshot), so a
  // later routine change can't rewrite history.
  const base = days[`${cfg?.id || ''}:${dateKey(date)}`] || baseRoutine(date, cfg);
  return base.map(([t, id], i) => {
    const next = base[i + 1] ? toMin(base[i + 1][0]) : 24 * 60;
    const start = new Date(date); start.setHours(0, toMin(t), 0, 0);
    return { id, start: start.getTime(), duration: next - toMin(t), ...ACTIVITY_STATES[id] };
  });
}

function fill(entry, char) {
  return {
    ...entry,
    label: entry.label.replace('{pos}', char.pronoun.pos),
    img: char.scenes[entry.scene] || char.hero,
    where: whereFor(entry.room, char),
  };
}

function companionEvents(char, events) {
  return (events || source().events || []).filter((e) => e.companionId === char.id);
}

/** The activity for `now`, plus when it started and ends. A live shared
 *  session with the user overrides the routine. */
export function current(char, cfg, now = clock.now(), events) {
  const live = companionEvents(char, events).filter((e) => isLive(e, now)).pop();
  if (live && SHARED_STATES[live.activity]) {
    const st = SHARED_STATES[live.activity];
    return { id: `shared-${live.activity}`, activity: live.activity, joinable: false, withUser: true, eventId: live.id,
      ...st, img: char.scenes[st.scene] || char.hero, where: whereFor(st.room, char), start: live.ts, end: now + 30 * 60e3, duration: 30, index: -1 };
  }
  const d = new Date(now);
  const list = routineFor(d, cfg);
  let idx = 0;
  for (let i = 0; i < list.length; i++) if (list[i].start <= now) idx = i;
  const e = fill(list[idx], char);
  return { ...e, end: e.start + e.duration * 60000, index: idx };
}

function whereFor(room, char) {
  const pos = char.pronoun.pos;
  return room === 'study' ? `At ${pos} desk` : room === 'kitchen' ? 'In the kitchen' : room === 'bedroom' ? 'In the bedroom' : 'In the living room';
}

/** Shared moments (closed or live) on the day of `now`, as timeline entries. */
export function sharedOn(char, now = clock.now(), events) {
  const key = dateKey(now);
  return companionEvents(char, events).filter((e) => e.kind !== 'note' && dateKey(e.ts) === key).map((e) => {
    const st = SHARED_STATES[e.activity] || SHARED_STATES.hangout;
    const live = isLive(e, now);
    const mins = Math.max(1, Math.round(((live ? now : (e.end || e.lastSeen || e.ts)) - e.ts) / 60000));
    return { id: `shared-${e.activity}`, eventId: e.id, shared: true, start: e.ts, label: e.label || st.label, short: e.label || st.label,
      desc: `${mins} min together`, room: st.room, scene: st.scene, img: char.scenes[st.scene] || char.hero, where: whereFor(st.room, char), status: live ? 'now' : 'past', minutes: mins };
  });
}

/** Today's timeline: routine entries plus shared moments, each tagged
 *  past / now / future. While a shared session is live it is the "now". */
export function today(char, cfg, now = clock.now(), events) {
  const list = routineFor(new Date(now), cfg).filter((e, i) => i > 0 || e.id !== 'bed');
  const cur = current(char, cfg, now, events);
  const routineNow = cur.withUser ? null : cur.start;
  const routine = list.map((e) => {
    const f = fill(e, char);
    const status = e.start === routineNow ? 'now' : e.start <= now ? 'past' : 'future';
    return { ...f, status };
  });
  return [...routine, ...sharedOn(char, now, events)].sort((a, b) => a.start - b.start);
}

/** The last seven days, newest first, each a short summary of the routine. */
export function week(char, cfg, now = clock.now()) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(12, 0, 0, 0);
    const list = routineFor(d, cfg).filter((e) => !['bed', 'wake'].includes(e.id)).map((e) => fill(e, char));
    const shared = sharedOn(char, d.getTime(), undefined).map((e) => ({ ...e, status: 'past' }));
    const items = [...(i === 0 ? list.filter((e) => e.start <= now) : list), ...shared.filter((e) => e.start <= now)].sort((a, b) => a.start - b.start);
    out.push({ date: d, items, sharedCount: shared.length });
  }
  return out;
}
