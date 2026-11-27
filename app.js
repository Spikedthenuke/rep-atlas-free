const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const storeKey = "rep-atlas-workout-data-v1";
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const muscles = ["chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats", "lowerBack", "glutes", "quads", "hamstrings", "calves"];
const gearOptions = ["bodyweight", "dumbbells", "barbell", "cable", "machine", "band", "kettlebell", "pullupBar", "cardio"];
const gearNames = {bodyweight:"Bodyweight",dumbbells:"Dumbbells",barbell:"Barbell",cable:"Cable",machine:"Machine",band:"Band",kettlebell:"Kettlebell",pullupBar:"Pull-up bar",cardio:"Cardio machine"};
const muscleNames = {lowerBack:"Lower back"};
const patternNames = {push:"Push",pull:"Pull",squat:"Squat",hinge:"Hinge",core:"Core",conditioning:"Cardio"};
const splitTemplates = {
  "Full body": i => ["Full body", ["squat", "push", "pull", "hinge", "core"]],
  "Upper / lower": i => i % 2 === 0 ? ["Upper body", ["push", "pull", "push", "pull", "core"]] : ["Lower body", ["squat", "hinge", "squat", "hinge", "core"]],
  "Push / pull / legs": i => [["Push", ["push", "push", "push", "core"]], ["Pull", ["pull", "pull", "pull", "core"]], ["Legs", ["squat", "hinge", "squat", "hinge", "core"]]][i % 3],
  "Cardio": () => ["Cardio", ["conditioning"]]
};
let data;
let tab = "plans";
let openPlanId = null;
let librarySearch = "";
let logDraft = [];

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const label = value => muscleNames[value] || gearNames[value] || patternNames[value] || String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
const uid = () => crypto.randomUUID();
const all = selector => [...document.querySelectorAll(selector)];
const getPlan = id => data.plans.find(plan => plan.id === id);
const persist = () => localStorage.setItem(storeKey, JSON.stringify(data));
const toast = message => { const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 2800); };
const saveAndRender = message => { persist(); render(); if (message) toast(message); };
const defaultWeeklyDays = count => {
  const schedules = {
    1: ["Wednesday"],
    2: ["Monday", "Thursday"],
    3: ["Monday", "Wednesday", "Friday"],
    4: ["Monday", "Tuesday", "Thursday", "Saturday"],
    5: ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"],
    6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    7: weekDays
  };
  return [...(schedules[Math.max(1, Math.min(7, count))] || weekDays.slice(0, count))];
};
const scheduleLabel = days => days.map(day => day.weekday).join(", ");

function normalizePlans() {
  let migrated = false;
  data.plans.forEach(plan => {
    const schedule = defaultWeeklyDays(plan.days.length);
    plan.days.forEach((day, index) => {
      if (!day.weekday) { day.weekday = schedule[index]; migrated = true; }
    });
    if (typeof plan.includeCardio !== "boolean") {
      plan.includeCardio = plan.days.some(day => day.items.some(item => item.exercise.pattern === "conditioning"));
      migrated = true;
    }
  });
  if (migrated) persist();
}

async function start() {
  const response = await fetch("./catalog.json");
  const catalog = await response.json();
  try { data = JSON.parse(localStorage.getItem(storeKey)); } catch { data = null; }
  if (!data || !Array.isArray(data.library)) {
    data = {library: catalog, plans: [], goals: [], history: [], weightUnit: "lb"};
    persist();
  }
  data.plans ||= [];
  data.goals ||= [];
  data.history ||= [];
  normalizePlans();
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function render() {
  all(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  if (tab === "plans") renderPlans();
  if (tab === "library") renderLibrary();
  if (tab === "log") renderHistory();
  if (tab === "goals") renderGoals();
}

function heading(title, subtitle) {
  return `<h1 class="page-title">${escapeHTML(title)}</h1><p class="lede">${escapeHTML(subtitle)}</p>`;
}

function renderPlans() {
  if (openPlanId && getPlan(openPlanId)) return renderPlanDetail(getPlan(openPlanId));
  openPlanId = null;
  app.innerHTML = `${heading("Your training", "Plans, cardio, and a steady way back after a missed day.")}
    <section class="card hero"><span class="eyebrow">Start with your goal</span><h2>Build a plan that fits your week.</h2><p>Choose your focus, split, equipment, and schedule. Adjust every session after.</p><button class="button primary" data-action="new-plan">Build a plan <span aria-hidden="true">→</span></button></section>
    <h2 class="section-title">Saved plans</h2>
    ${data.plans.length ? data.plans.map(plan => `<button class="card plan-card" data-open-plan="${escapeHTML(plan.id)}"><div class="row"><div><strong>${escapeHTML(plan.goal)}</strong><div class="subtle">${escapeHTML(plan.split)} · ${plan.days.length} sessions · ${escapeHTML(scheduleLabel(plan.days))} weekly</div></div><span class="badge">${escapeHTML(plan.target)}</span></div></button>`).join("") : `<div class="card empty"><b>No plan saved yet</b>Your first plan will show up here.</div>`}
    <p class="safe-note">Your workout data stays in this browser on this phone. Use the arrow at the top to save a backup file.</p>`;
}

function targetFor(text) {
  const value = text.toLowerCase();
  if (/strength|strong|powerlift/.test(value)) return "Get stronger";
  if (/cardio|endurance|stamina|conditioning|5k|run|bike|swim|fat loss|lose weight/.test(value)) return "Improve endurance";
  if (/muscle|hypertrophy|bulk|chest|back|shoulder|arm|leg|glute|quad|bicep|tricep/.test(value)) return "Build muscle";
  return "General fitness";
}

function focusFor(text) {
  const value = text.toLowerCase();
  const aliases = {chest:["chest","pec"],shoulders:["shoulder","delt"],biceps:["bicep","arm"],triceps:["tricep","arm"],forearms:["forearm"],abs:["abs","core"],obliques:["oblique","core"],traps:["trap","back"],lats:["lat","back"],lowerBack:["lumbar","back"],glutes:["glute","leg"],quads:["quad","leg"],hamstrings:["hamstring","leg"],calves:["calf","calves","leg"]};
  return muscles.filter(muscle => aliases[muscle].some(word => value.includes(word)));
}

function makePlan({goal, target, split, count, variation, gear, focus, weekdays = defaultWeeklyDays(count), includeCardio = false, startIndex = 0}) {
  const days = [];
  const use = {};
  const wantsCardio = split === "Cardio" || includeCardio || target === "Improve endurance";
  const available = data.library.filter(exercise => gear.includes(exercise.gear) || (wantsCardio && ["bodyweight", "cardio"].includes(exercise.gear)));
  for (let index = 0; index < count; index++) {
    const [name, base] = splitTemplates[split](index + startIndex);
    const patterns = split === "Cardio" ? base : wantsCardio ? [...base, "conditioning"] : base;
    const used = new Set();
    const items = [];
    patterns.forEach((pattern, slot) => {
      const pool = available.filter(exercise => exercise.pattern === pattern && !used.has(exercise.id));
      if (!pool.length) return;
      pool.sort((a, b) => {
        const aScore = a.muscles.filter(muscle => focus.includes(muscle)).length * 3 - (use[a.id] || 0);
        const bScore = b.muscles.filter(muscle => focus.includes(muscle)).length * 3 - (use[b.id] || 0);
        return bScore - aScore || a.name.localeCompare(b.name);
      });
      const picked = pool[(variation * 5 + index * 3 + slot) % pool.length];
      used.add(picked.id);
      use[picked.id] = (use[picked.id] || 0) + 1;
      const timed = pattern === "conditioning" || /plank|hold|wall sit/i.test(picked.name);
      const minutes = /interval/i.test(picked.name) ? 20 : /long/i.test(picked.name) ? 35 : /easy|steady|zone 2|recovery/i.test(picked.name) ? 30 : target === "Improve endurance" ? 25 : 15;
      const reps = pattern === "conditioning" ? minutes : timed ? 30 : target === "Get stronger" ? 5 : target === "Build muscle" ? 10 : 10;
      items.push({id: uid(), exercise: picked, sets: pattern === "conditioning" ? 1 : timed ? 3 : target === "Improve endurance" ? 2 : target === "General fitness" ? 2 : 3, reps});
    });
    days.push({id: uid(), name: `Day ${index + 1} · ${name}`, weekday: weekdays[index] || defaultWeeklyDays(count)[index], items});
  }
  return {id: uid(), goal, target, split, focus, includeCardio: includeCardio || (split !== "Cardio" && target === "Improve endurance"), days};
}

function checkedOptions(options, selected, group) {
  return `<div class="check-grid">${options.map(option => `<label class="check-option"><input type="checkbox" name="${group}" value="${escapeHTML(option)}" ${selected.includes(option) ? "checked" : ""}>${escapeHTML(label(option))}</label>`).join("")}</div>`;
}

function openBuilder() {
  showModal("Build your plan", `<form id="plan-form">
    <div class="field"><label for="goal-text">What do you want to work toward?</label><textarea id="goal-text" name="goal" required placeholder="For example: build strength, improve cardio endurance, or focus on legs"></textarea></div>
    <div class="grid2"><div class="field"><label>Training goal</label><select name="target"><option value="auto">Auto-detect from your goal</option><option>Build muscle</option><option>Get stronger</option><option>Improve endurance</option><option>General fitness</option></select></div>
    <div class="field"><label>Workout split</label><select name="split"><option>Full body</option><option>Upper / lower</option><option>Push / pull / legs</option><option>Cardio</option></select></div></div>
    <div class="field"><span class="field-label">Choose your training days (repeats weekly)</span>${checkedOptions(weekDays,["Monday","Wednesday","Friday"],"weekdays")}<span class="subtle">Workouts follow your plan order on these days every week.</span></div>
    <div class="field"><label>Variation</label><select name="variation">${[1,2,3,4].map((n,i)=>`<option value="${i}">Variation ${n}</option>`).join("")}</select></div>
    <div class="field"><span class="field-label">Equipment you can use</span>${checkedOptions(gearOptions,["bodyweight","dumbbells"],"gear")}</div>
    <div class="field"><label class="check-option"><input type="checkbox" name="includeCardio" value="1"><span>Mix cardio into strength days</span></label><span class="subtle">Adds a cardio block alongside the weights so you can work on both.</span></div>
    <div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary" type="submit">Preview plan</button></div>
  </form>`);
}

function previewPlan(plan) {
  const cardioNote = plan.includeCardio && plan.split !== "Cardio" ? " · cardio included on strength days" : "";
  showModal("Plan preview", `<p class="subtle">${escapeHTML(plan.goal)} · ${escapeHTML(plan.target)} · ${escapeHTML(plan.split)}${cardioNote}</p><p class="subtle">Repeats every week: ${escapeHTML(scheduleLabel(plan.days))}</p>${plan.days.map(day => `<div class="card"><div class="row"><strong>${escapeHTML(day.name)}</strong><span class="badge">${escapeHTML(day.weekday)}</span></div>${day.items.map(item=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(item.exercise.name)}</div><div class="exercise-meta">${item.sets} × ${item.reps} ${item.exercise.pattern === "conditioning" ? "min" : /plank|hold|wall sit/i.test(item.exercise.name) ? "sec" : "reps"}</div></div></div>`).join("")}</div>`).join("")}<div class="modal-actions"><button class="button soft" data-action="edit-preview">Back</button><button class="button primary" data-action="save-preview">Save plan</button></div>`, {plan});
}

function renderPlanDetail(plan) {
  const cardioNote = plan.includeCardio && plan.split !== "Cardio" ? " · cardio mixed into strength sessions" : "";
  app.innerHTML = `<button class="text-button" data-action="back-plans">‹ All plans</button>${heading(plan.goal, `${plan.target} · ${plan.split} · ${plan.days.length} sessions per week${cardioNote}`)}
    <div class="card"><div class="row"><div><span class="eyebrow">Repeats every week</span><p class="subtle" style="margin:6px 0 0">${escapeHTML(scheduleLabel(plan.days))} · sessions follow plan order</p></div><button class="button small soft" data-action="edit-schedule">Edit days</button></div></div>
    <div class="card"><span class="eyebrow">Recovery option</span><h2 class="section-title" style="margin:6px 0">Missed a workout?</h2><p class="subtle">Choose the session you missed and how many sessions you can still fit in. The new schedule skips that session and keeps your original plan.</p><button class="button soft" data-action="missed">Adjust this week</button></div>
    ${plan.days.map(day=>`<section class="card"><div class="row"><div><span class="badge">${escapeHTML(day.weekday || "Unscheduled")}</span><p class="eyebrow" style="margin:8px 0 0">${escapeHTML(day.name)}</p><p class="subtle">${day.items.length} exercises</p></div><button class="button small primary" data-log-day="${escapeHTML(day.id)}">Log session</button></div>
      ${muscleMap(day.items.flatMap(item=>item.exercise.muscles))}
      ${day.items.map(item=>`<div class="day-exercise"><div class="row"><div><div class="exercise-title">${escapeHTML(item.exercise.name)}</div><div class="exercise-meta">${item.sets} × ${item.reps} ${item.exercise.pattern === "conditioning" ? "min" : /plank|hold|wall sit/i.test(item.exercise.name) ? "sec" : "reps"}</div></div><button class="text-button" data-swap="${escapeHTML(item.id)}" data-day="${escapeHTML(day.id)}">Swap</button></div><div class="row" style="justify-content:flex-start;margin-top:8px"><span class="subtle">Sets</span>${stepper(item.sets,`sets:${day.id}:${item.id}`)}<span class="subtle">Reps / min</span>${stepper(item.reps,`reps:${day.id}:${item.id}`)}</div></div>`).join("")}
      <button class="text-button" data-add-exercise="${escapeHTML(day.id)}">＋ Add exercise</button></section>`).join("")}
    <button class="button danger full" data-action="delete-plan">Delete this plan</button>`;
}

function stepper(value, key) { return `<span class="stepper"><button type="button" data-adjust="${escapeHTML(key)}" data-delta="-1" aria-label="Decrease">−</button><output>${value}</output><button type="button" data-adjust="${escapeHTML(key)}" data-delta="1" aria-label="Increase">+</button></span>`; }

function muscleMap(values) {
  const active = new Set(values);
  const shapes = {
    chest:[[64,56,91,52,98,78,67,82],[109,52,136,56,133,82,102,78]], shoulders:[[63,47,80,43,83,58,69,65],[120,43,137,47,131,65,117,58]], biceps:[[62,65,72,63,69,92,59,94],[128,63,138,65,141,94,131,92]], triceps:[[62,65,72,63,69,92,59,94],[128,63,138,65,141,94,131,92]], forearms:[[59,97,68,96,62,122,53,121],[132,96,141,97,147,121,138,122]], abs:[[84,81,99,79,99,118,85,116],[101,79,116,81,115,116,101,118]], obliques:[[69,82,82,81,83,113,73,108],[118,81,131,82,127,108,117,113]], traps:[[83,42,100,48,116,42,111,57,101,64,89,57]], lats:[[80,61,91,63,98,86,86,98,77,88],[109,63,120,61,123,88,114,98,102,86]], lowerBack:[[88,91,99,87,99,119,87,116],[103,87,114,91,115,116,103,119]], glutes:[[82,122,99,120,99,143,82,142],[103,120,120,122,120,142,103,143]], quads:[[80,145,98,145,96,184,78,181],[104,145,122,145,124,181,106,184]], hamstrings:[[80,145,98,145,96,184,78,181],[104,145,122,145,124,181,106,184]], calves:[[79,186,95,187,94,220,80,220],[107,187,123,186,122,220,108,220]]
  };
  const figure = back => {
    const visible = back ? ["shoulders","traps","lats","triceps","forearms","lowerBack","glutes","hamstrings","calves"] : ["shoulders","chest","biceps","forearms","abs","obliques","quads","calves"];
    const silhouette = `<circle class="body-base" cx="100" cy="20" r="13"/><path class="body-base" d="M86 37 Q100 32 114 37 L126 44 139 50 151 89 143 93 130 65 126 108 123 137 126 182 126 224 108 224 101 187 94 224 76 224 77 182 80 137 74 108 70 65 57 93 49 89 61 50 74 44Z"/>`;
    const parts = visible.map(muscle => shapes[muscle].map(points => `<polygon class="muscle ${active.has(muscle) ? "hot" : ""}" points="${points.join(",")}"/>`).join("")).join("");
    return `<div class="figure-card"><svg viewBox="0 0 200 240" role="img" aria-label="${back?"Back":"Front"} muscle map">${silhouette}${parts}</svg><div class="figure-label">${back?"Back":"Front"}</div></div>`;
  };
  const used = [...active].map(label).sort().join(" · ");
  return `<div class="muscle-map">${figure(false)}${figure(true)}</div><div class="muscle-legend">${escapeHTML(used || "No muscle groups listed")}</div>`;
}

function renderLibrary() {
  const query = librarySearch.toLowerCase();
  const found = data.library.filter(exercise => !query || [exercise.name, label(exercise.gear), label(exercise.pattern), ...exercise.muscles.map(label)].join(" ").toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
  app.innerHTML = `${heading("Exercise library", `${data.library.length} exercises. Search by name, equipment, movement, or muscle.`)}
    <input class="searchbox" id="library-search" type="search" placeholder="Search exercises" value="${escapeHTML(librarySearch)}">
    <div class="row" style="margin:12px 0"><span class="subtle">${found.length} results</span><button class="button small primary" data-action="new-exercise">＋ Add exercise</button></div>
    <section class="card" id="exercise-results">${found.length ? found.map(exercise=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(exercise.name)}</div><div class="exercise-meta">${escapeHTML(label(exercise.gear))} · ${escapeHTML(label(exercise.pattern))} · ${escapeHTML(exercise.muscles.map(label).join(", "))}</div></div><button class="text-button" data-edit-exercise="${escapeHTML(exercise.id)}">Edit</button></div>`).join("") : `<div class="empty">No matching exercises.</div>`}</section>`;
}

function drawLibraryResults() {
  const query = librarySearch.toLowerCase();
  const found = data.library.filter(exercise => !query || [exercise.name, label(exercise.gear), label(exercise.pattern), ...exercise.muscles.map(label)].join(" ").toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
  const target = document.querySelector("#exercise-results");
  if (target) target.innerHTML = found.length ? found.map(exercise=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(exercise.name)}</div><div class="exercise-meta">${escapeHTML(label(exercise.gear))} · ${escapeHTML(label(exercise.pattern))} · ${escapeHTML(exercise.muscles.map(label).join(", "))}</div></div><button class="text-button" data-edit-exercise="${escapeHTML(exercise.id)}">Edit</button></div>`).join("") : `<div class="empty">No matching exercises.</div>`;
}

function openExerciseEditor(exercise = {id:"",name:"",pattern:"push",gear:"bodyweight",muscles:[]}) {
  showModal(exercise.id ? "Edit exercise" : "New exercise", `<form id="exercise-form" data-id="${escapeHTML(exercise.id)}"><div class="field"><label>Exercise name</label><input name="name" required value="${escapeHTML(exercise.name)}" placeholder="e.g. Goblet squat"></div>
    <div class="grid2"><div class="field"><label>Movement</label><select name="pattern">${Object.keys(patternNames).map(key=>`<option value="${key}" ${exercise.pattern===key?"selected":""}>${label(key)}</option>`).join("")}</select></div><div class="field"><label>Equipment</label><select name="gear">${gearOptions.map(key=>`<option value="${key}" ${exercise.gear===key?"selected":""}>${label(key)}</option>`).join("")}</select></div></div>
    <div class="field"><span class="field-label">Muscles</span>${checkedOptions(muscles,exercise.muscles,"muscles")}</div><div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Save exercise</button></div></form>`);
}

function renderHistory() {
  const history = [...data.history].sort((a,b)=>new Date(b.date)-new Date(a.date));
  app.innerHTML = `${heading("Workout log", "Keep the sessions you complete in one place.")}<button class="button primary" data-action="new-workout">＋ Log a workout</button><h2 class="section-title">Recent sessions</h2>${history.length ? history.map(workout=>`<section class="card"><div class="row"><div><strong>${escapeHTML(workout.name)}</strong><div class="subtle">${new Date(workout.date).toLocaleDateString()} · ${workout.sets.length} sets</div></div><span class="badge">${escapeHTML(workout.weightUnit)}</span></div>${muscleMap(workout.sets.flatMap(set=>set.exercise.muscles))}${workout.sets.map(set=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(set.exercise.name)}</div><div class="exercise-meta">${set.amount} ${escapeHTML(set.unit)}${set.weight ? ` · ${set.weight} ${escapeHTML(workout.weightUnit)}` : ""}</div></div></div>`).join("")}</section>`).join("") : `<div class="card empty"><b>No workouts yet</b>Log your first session from a plan or here.</div>`}`;
}

function openWorkoutEditor(day = null) {
  logDraft = day ? day.items.flatMap(item=>Array.from({length:item.sets},()=>({exercise:item.exercise,amount:item.reps,weight:0,unit:item.exercise.pattern === "conditioning" ? "min" : /plank|hold|wall sit/i.test(item.exercise.name) ? "sec" : "reps",done:false}))) : [];
  renderWorkoutEditor(day?.name || "Workout");
}

function renderWorkoutEditor(name) {
  const lines = logDraft.map((set, index) => {
    const weightField = set.unit === "reps"
      ? `<input inputmode="decimal" type="number" min="0" step="0.5" data-log-weight="${index}" value="${set.weight || ""}" placeholder="${data.weightUnit}" aria-label="Weight">`
      : `<span></span>`;
    return `<div class="log-set"><label><input type="checkbox" data-log-done="${index}" ${set.done ? "checked" : ""}>${escapeHTML(set.exercise.name)}</label><input inputmode="numeric" type="number" min="1" data-log-amount="${index}" value="${set.amount}" aria-label="${escapeHTML(set.unit)}">${weightField}<button class="text-button" type="button" data-remove-log="${index}" aria-label="Remove">×</button></div>`;
  }).join("");
  showModal("Log workout", `<form id="workout-form"><div class="field"><label>Workout name</label><input name="name" value="${escapeHTML(name)}" required></div><div class="grid2"><div class="field"><label>Weight unit</label><select name="weightUnit"><option ${data.weightUnit === "lb" ? "selected" : ""}>lb</option><option ${data.weightUnit === "kg" ? "selected" : ""}>kg</option></select></div><div class="field"><label>Add an exercise</label><select name="add-exercise"><option value="">Choose exercise</option>${data.library.map(exercise => `<option value="${escapeHTML(exercise.id)}">${escapeHTML(exercise.name)}</option>`).join("")}</select></div></div><div class="row"><span class="field-label">Completed sets</span><button class="button soft small" type="button" data-action="append-set">Add sets</button></div><div>${lines || `<p class="subtle">Choose an exercise, then add its sets.</p>`}</div><div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Save workout</button></div></form>`);
}
function renderGoals() {
  app.innerHTML = `${heading("Goals", "Set a measurable target and update your progress as you go.")}<button class="button primary" data-action="new-goal">＋ Add a goal</button><h2 class="section-title">Your targets</h2>${data.goals.length ? data.goals.map(goal=>{const progress=Math.max(0,Math.min(1,goal.current/goal.target));return `<section class="card"><div class="row"><strong>${escapeHTML(goal.name)}</strong><button class="text-button" data-edit-goal="${escapeHTML(goal.id)}">Update</button></div><div class="progress"><span style="width:${progress*100}%"></span></div><div class="row subtle"><span>${escapeHTML(goal.current)} / ${escapeHTML(goal.target)} ${escapeHTML(goal.unit)}</span><button class="text-button" data-delete-goal="${escapeHTML(goal.id)}">Remove</button></div></section>`}).join("") : `<div class="card empty"><b>No goals set</b>Add a target you can measure.</div>`}`;
}

function openGoalEditor(goal = {id:"",name:"",current:0,target:0,unit:""}) {
  showModal(goal.id ? "Update goal" : "New goal", `<form id="goal-form" data-id="${escapeHTML(goal.id)}"><div class="field"><label>Goal</label><input name="name" required value="${escapeHTML(goal.name)}" placeholder="e.g. Cycle 50 miles this month"></div><div class="grid2"><div class="field"><label>Current progress</label><input name="current" type="number" min="0" step="any" required value="${goal.current}"></div><div class="field"><label>Target</label><input name="target" type="number" min="0.01" step="any" required value="${goal.target}"></div></div><div class="field"><label>Unit</label><input name="unit" value="${escapeHTML(goal.unit)}" placeholder="miles, workouts, lb"></div><div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Save goal</button></div></form>`);
}

function showModal(title, content, options = {}) {
  modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="modal-head"><h2>${escapeHTML(title)}</h2><button class="modal-close" type="button" data-close aria-label="Close">×</button></div><div id="modal-content">${content}</div></section>`;
  modal.hidden = false;
  modal.dataset.mode = options.plan ? "preview" : "";
  modal._previewPlan = options.plan || null;
}

function closeModal() { modal.hidden = true; modal.innerHTML = ""; modal._previewPlan = null; }

function openMissedDay() {
  const plan = getPlan(openPlanId);
  if (!plan) return;
  const count = Math.max(1, plan.days.length - 1);
  showModal("Adjust after a missed day", `<form id="recovery-form" data-plan="${escapeHTML(plan.id)}"><div class="field"><label>Which session did you miss?</label><select name="missed">${plan.days.map(day=>`<option value="${escapeHTML(day.id)}">${escapeHTML(day.weekday || "Unscheduled")} · ${escapeHTML(day.name)}</option>`).join("")}</select></div><div class="field"><label>Sessions you can still do this week</label><select name="remaining">${Array.from({length:Math.max(1,plan.days.length-1)},(_,i)=>`<option value="${i+1}" ${i+1===count?"selected":""}>${i+1}</option>`).join("")}</select></div><p class="subtle">The recovery plan skips the missed session and keeps the remaining sessions in order.</p><div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Create recovery plan</button></div></form>`);
}

function openScheduleEditor() {
  const plan = getPlan(openPlanId);
  if (!plan) return;
  showModal("Set weekly workout days", `<form id="schedule-form" data-plan="${escapeHTML(plan.id)}"><p class="subtle">Choose exactly ${plan.days.length} days. Sessions follow your plan order and repeat every week.</p><div class="field"><span class="field-label">Training days</span>${checkedOptions(weekDays,plan.days.map(day=>day.weekday).filter(Boolean),"weekdays")}</div><div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Save weekly days</button></div></form>`);
}

function openExercisePicker(dayId, swapId = null) {
  showModal(swapId ? "Swap exercise" : "Add exercise", `<div class="field"><label>Search the exercise library</label><input id="picker-search" type="search" placeholder="Type a name, muscle, or equipment"></div><div class="card" id="picker-results">${pickerResults("",dayId,swapId)}</div>`);
  modal.dataset.pickerDay = dayId;
  modal.dataset.pickerSwap = swapId || "";
}
function pickerResults(query,dayId,swapId) {
  const found = data.library.filter(exercise=>!query || [exercise.name,label(exercise.gear),label(exercise.pattern),...exercise.muscles.map(label)].join(" ").toLowerCase().includes(query.toLowerCase())).slice(0,70);
  return found.map(exercise=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(exercise.name)}</div><div class="exercise-meta">${escapeHTML(label(exercise.gear))} · ${escapeHTML(label(exercise.pattern))}</div></div><button class="button small soft" data-pick-exercise="${escapeHTML(exercise.id)}">Choose</button></div>`).join("") || `<div class="empty">No exercises found.</div>`;
}

function exportBackup() {
  const file = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = "rep-atlas-backup.json"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("Backup saved. Keep the JSON file somewhere safe.");
}

function openBackupMenu() {
  showModal("Your workout data", `<p class="subtle">Your plans and logs stay in this app on this phone. Export a backup before changing phones or clearing website data.</p><div class="stack"><button class="button primary" data-action="export-backup">Save backup file</button><button class="button soft" data-action="import-backup">Restore from a backup file</button></div>`);
}

document.addEventListener("click", event => {
  const button = event.target.closest("button,[data-open-plan]");
  if (!button) { if (event.target === modal) closeModal(); return; }
  if (button.matches(".tab")) { tab = button.dataset.tab; openPlanId = null; render(); }
  if (button.id === "backup-button") openBackupMenu();
  if (button.dataset.openPlan) { openPlanId = button.dataset.openPlan; render(); }
  if (button.dataset.action === "new-plan") openBuilder();
  if (button.dataset.action === "back-plans") { openPlanId=null; render(); }
  if (button.dataset.action === "edit-schedule") openScheduleEditor();
  if (button.dataset.action === "missed") openMissedDay();
  if (button.dataset.action === "new-exercise") openExerciseEditor();
  if (button.dataset.action === "new-goal") openGoalEditor();
  if (button.dataset.action === "new-workout") openWorkoutEditor();
  if (button.dataset.action === "export-backup") exportBackup();
  if (button.dataset.action === "import-backup") { closeModal(); document.querySelector("#restore-file").click(); }
  if (button.dataset.action === "save-preview" && modal._previewPlan) { data.plans.unshift(modal._previewPlan); closeModal(); saveAndRender("Plan saved."); }
  if (button.dataset.action === "edit-preview") openBuilder();
  if (button.dataset.action === "delete-plan" && openPlanId) { if (confirm("Delete this plan?")) { data.plans=data.plans.filter(plan=>plan.id!==openPlanId); openPlanId=null; saveAndRender("Plan deleted."); } }
  if (button.dataset.logDay) { const plan=getPlan(openPlanId); const day=plan?.days.find(item=>item.id===button.dataset.logDay); if(day) openWorkoutEditor(day); }
  if (button.dataset.addExercise) openExercisePicker(button.dataset.addExercise);
  if (button.dataset.swap) openExercisePicker(button.dataset.day,button.dataset.swap);
  if (button.dataset.editExercise) openExerciseEditor(data.library.find(item=>item.id===button.dataset.editExercise));
  if (button.dataset.editGoal) openGoalEditor(data.goals.find(item=>item.id===button.dataset.editGoal));
  if (button.dataset.deleteGoal) { data.goals=data.goals.filter(goal=>goal.id!==button.dataset.deleteGoal); saveAndRender("Goal removed."); }
  if (button.dataset.adjust) {
    const [field,dayId,itemId]=button.dataset.adjust.split(":"); const item=getPlan(openPlanId)?.days.find(day=>day.id===dayId)?.items.find(entry=>entry.id===itemId);
    if(item) { item[field]=Math.max(1,Math.min(field==="sets"?10:300,item[field]+Number(button.dataset.delta))); saveAndRender(); }
  }
  if (button.dataset.close !== undefined) closeModal();
  if (button.dataset.removeLog) { logDraft.splice(Number(button.dataset.removeLog),1); const name=document.querySelector('#workout-form [name="name"]')?.value||"Workout";renderWorkoutEditor(name); }
  if (button.dataset.action === "append-set") {
    const selected=document.querySelector('#workout-form [name="add-exercise"]')?.value;
    const name=document.querySelector('#workout-form [name="name"]')?.value||"Workout";
    const exercise=data.library.find(item=>item.id===selected);
    if(!exercise){toast("Choose an exercise first.");return;}
    const unit=exercise.pattern==="conditioning"?"min":/plank|hold|wall sit/i.test(exercise.name)?"sec":"reps";
    logDraft.push({exercise,amount:unit==="min"?20:unit==="sec"?30:10,weight:0,unit,done:false});renderWorkoutEditor(name);
  }
  if (button.dataset.pickExercise) {
    const day=getPlan(openPlanId)?.days.find(item=>item.id===modal.dataset.pickerDay);const exercise=data.library.find(item=>item.id===button.dataset.pickExercise);const swap=modal.dataset.pickerSwap;
    if(day&&exercise){if(swap){const item=day.items.find(entry=>entry.id===swap);if(item){item.exercise=exercise;item.reps=exercise.pattern==="conditioning"?20:item.reps;item.sets=exercise.pattern==="conditioning"?1:item.sets;}}else day.items.push({id:uid(),exercise,sets:exercise.pattern==="conditioning"?1:3,reps:exercise.pattern==="conditioning"?20:10});closeModal();saveAndRender("Workout updated.");}
  }
});

document.addEventListener("input", event => {
  if(event.target.id==="library-search"){librarySearch=event.target.value;drawLibraryResults();}
  if(event.target.id==="picker-search"){const query=event.target.value;const day=modal.dataset.pickerDay;modal.querySelector("#picker-results").innerHTML=pickerResults(query,day,modal.dataset.pickerSwap);}
  if(event.target.dataset.logDone!==undefined) logDraft[Number(event.target.dataset.logDone)].done=event.target.checked;
  if(event.target.dataset.logAmount!==undefined) logDraft[Number(event.target.dataset.logAmount)].amount=Number(event.target.value)||0;
  if(event.target.dataset.logWeight!==undefined) logDraft[Number(event.target.dataset.logWeight)].weight=Number(event.target.value)||0;
});

document.addEventListener("submit", event => {
  event.preventDefault();const form=event.target;const values=new FormData(form);
  if(form.id==="plan-form"){
    const goal=String(values.get("goal")).trim();const target=values.get("target")==="auto"?targetFor(goal):values.get("target");const split=values.get("split");
    const weekdays=values.getAll("weekdays");if(!weekdays.length){toast("Choose at least one training day.");return;}
    const includeCardio=values.has("includeCardio");const gear=values.getAll("gear");if(!gear.length&&split!=="Cardio"){toast("Choose at least one option for the strength exercises.");return;}
    if(split==="Cardio"||includeCardio||target==="Improve endurance")gear.push("bodyweight","cardio");
    const focus=focusFor(goal);const plan=makePlan({goal,target,split,count:weekdays.length,variation:Number(values.get("variation")),gear:[...new Set(gear)],focus,weekdays,includeCardio});
    previewPlan(plan);
  }
  if(form.id==="recovery-form"){
    const plan=getPlan(values.get("plan")||form.dataset.plan);const missedIndex=plan?.days.findIndex(day=>day.id===values.get("missed"));
    if(!plan||missedIndex<0)return;
    const gear=[...new Set(plan.days.flatMap(day=>day.items.map(item=>item.exercise.gear)))];
    const remaining=Number(values.get("remaining"));const orderedDays=[...plan.days.slice(missedIndex+1),...plan.days.slice(0,missedIndex)];const recoveryWeekdays=orderedDays.length>=remaining?orderedDays.slice(0,remaining).map(day=>day.weekday):defaultWeeklyDays(remaining);
    const recovery=makePlan({goal:`Back on track · ${plan.goal}`,target:plan.target,split:plan.split,count:remaining,variation:1,gear:gear.length?gear:["bodyweight"],focus:plan.focus,weekdays:recoveryWeekdays,includeCardio:plan.includeCardio,startIndex:missedIndex+1});
    data.plans.unshift(recovery);closeModal();openPlanId=recovery.id;saveAndRender("Recovery schedule saved.");
  }
  if(form.id==="schedule-form"){
    const plan=getPlan(values.get("plan")||form.dataset.plan);if(!plan)return;
    const selected=new Set(values.getAll("weekdays"));
    if(selected.size!==plan.days.length){toast(`Choose exactly ${plan.days.length} days for this plan.`);return;}
    const ordered=weekDays.filter(day=>selected.has(day));plan.days.forEach((day,index)=>day.weekday=ordered[index]);
    closeModal();saveAndRender("Weekly schedule updated.");
  }
  if(form.id==="exercise-form"){
    const id=form.dataset.id||uid();const existing=data.library.find(item=>item.id===id);const exercise={id,name:String(values.get("name")).trim(),pattern:values.get("pattern"),gear:values.get("gear"),muscles:values.getAll("muscles")};
    if(!exercise.muscles.length){toast("Select at least one muscle group.");return;}
    const index=data.library.findIndex(item=>item.id===id);if(index>=0)data.library[index]=exercise;else data.library.push(exercise);
    data.plans.forEach(plan=>plan.days.forEach(day=>day.items.forEach(item=>{if(item.exercise.id===id)item.exercise=exercise;})));
    closeModal();saveAndRender("Exercise saved.");
  }
  if(form.id==="goal-form"){
    const goal={id:form.dataset.id||uid(),name:String(values.get("name")).trim(),current:Number(values.get("current")),target:Number(values.get("target")),unit:String(values.get("unit")).trim()};
    if(!Number.isFinite(goal.current)||!Number.isFinite(goal.target)||goal.target<=0)return;
    const index=data.goals.findIndex(item=>item.id===goal.id);if(index>=0)data.goals[index]=goal;else data.goals.push(goal);closeModal();saveAndRender("Goal saved.");
  }
  if(form.id==="workout-form"){
    const completed=logDraft.filter(set=>set.done&&set.amount>0&&set.weight>=0).map(({exercise,amount,weight,unit})=>({exercise,amount,weight,unit}));
    if(!completed.length){toast("Check off at least one completed set.");return;}
    data.weightUnit=values.get("weightUnit");data.history.push({id:uid(),name:String(values.get("name")).trim()||"Workout",date:new Date().toISOString(),sets:completed,weightUnit:data.weightUnit});closeModal();saveAndRender("Workout logged.");
  }
});

document.querySelector("#restore-file").addEventListener("change",async event=>{
  const file=event.target.files[0];if(!file)return;
  try{const restored=JSON.parse(await file.text());if(!Array.isArray(restored.library)||!Array.isArray(restored.plans)||!Array.isArray(restored.goals)||!Array.isArray(restored.history))throw new Error();data=restored;normalizePlans();persist();render();toast("Backup restored.");}
  catch{toast("That backup file could not be opened.");}event.target.value="";
});
start().catch(()=>{app.innerHTML=`<div class="card empty"><b>Could not load Rep Atlas</b>Please reopen this page while connected to the internet once.</div>`;});
