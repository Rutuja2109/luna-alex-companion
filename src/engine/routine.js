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

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export function routineFor(date, cfg) {
  const day = date.getDay();
  const base = cfg?.routine || (day === 0 || day === 6 ? WEEKEND : WEEKDAY);
  return base.map(([t, id], i) => {
    const next = base[i + 1] ? toMin(base[i + 1][0]) : 24 * 60;
    const start = new Date(date); start.setHours(0, toMin(t), 0, 0);
    return { id, start: start.getTime(), duration: next - toMin(t), ...ACTIVITY_STATES[id] };
  });
}

function fill(entry, char) {
  const pos = char.pronoun.pos;
  return {
    ...entry,
    label: entry.label.replace('{pos}', pos),
    img: char.scenes[entry.scene] || char.hero,
    where: entry.room === 'study' ? `At ${pos} desk` : entry.room === 'kitchen' ? 'In the kitchen' : entry.room === 'bedroom' ? 'In the bedroom' : 'In the living room',
  };
}

/** The activity for `now`, plus when it started and ends. */
export function current(char, cfg, now = clock.now()) {
  const d = new Date(now);
  const list = routineFor(d, cfg);
  let idx = 0;
  for (let i = 0; i < list.length; i++) if (list[i].start <= now) idx = i;
  const e = fill(list[idx], char);
  return { ...e, end: e.start + e.duration * 60000, index: idx };
}

/** Today's timeline, each entry tagged past / now / future. */
export function today(char, cfg, now = clock.now()) {
  const list = routineFor(new Date(now), cfg).filter((e, i) => i > 0 || e.id !== 'bed');
  const cur = current(char, cfg, now);
  return list.map((e) => {
    const f = fill(e, char);
    const status = e.start === cur.start ? 'now' : e.start < now ? 'past' : 'future';
    return { ...f, status };
  });
}

/** The last seven days, newest first, each a short summary of the routine. */
export function week(char, cfg, now = clock.now()) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(12, 0, 0, 0);
    const list = routineFor(d, cfg).filter((e) => !['bed', 'wake'].includes(e.id)).map((e) => fill(e, char));
    out.push({ date: d, items: i === 0 ? list.filter((e) => e.start <= now) : list });
  }
  return out;
}
