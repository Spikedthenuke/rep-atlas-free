const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const storeKey = "rep-atlas-workout-data-v1";
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const muscles = ["chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "serratus", "traps", "upperBack", "lats", "lowerBack", "glutes", "quads", "adductors", "hamstrings", "calves"];
const gearOptions = ["bodyweight", "dumbbells", "barbell", "cable", "machine", "band", "kettlebell", "pullupBar", "cardio"];
const gearNames = {bodyweight:"Bodyweight",dumbbells:"Dumbbells",barbell:"Barbell",cable:"Cable",machine:"Machine",band:"Band",kettlebell:"Kettlebell",pullupBar:"Pull-up bar",cardio:"Cardio machine"};
const muscleNames = {lowerBack:"Lower back",upperBack:"Upper back"};
const patternNames = {push:"Push",pull:"Pull",squat:"Squat",hinge:"Hinge",core:"Core",conditioning:"Cardio"};
const specificEquipmentById = {
  "machine-chest-press":"Seated chest-press machine, selectorized or plate-loaded",
  "machine-incline-press":"Incline chest-press machine",
  "pec-deck":"Pec-deck machine with chest-fly arms or pads",
  "machine-row":"Seated row machine with handles",
  "chest-supported-machine-row":"Chest-supported row machine",
  "assisted-pull-up":"Counterweighted assisted pull-up machine with knee or foot pad",
  "leg-press":"Horizontal or 45-degree leg-press machine",
  "hack-squat":"Hack-squat sled with shoulder and back pads",
  "belt-squat":"Belt-squat machine with a hip belt",
  "leg-extension":"Leg-extension machine with a shin pad",
  "seated-calf-raise":"Seated calf-raise machine with a thigh pad",
  "standing-machine-calf-raise":"Standing calf-raise machine with shoulder pads",
  "seated-leg-curl":"Seated leg-curl machine with thigh and ankle pads",
  "lying-leg-curl":"Lying leg-curl machine with an ankle pad",
  "standing-leg-curl":"Standing single-leg curl machine with an ankle pad",
  "back-extension":"45-degree back-extension bench or back-extension machine",
  "reverse-hyperextension":"Reverse-hyperextension machine or reverse-hyper bench",
  "cable-crossover":"Dual-pulley cable station with two D-handles",
  "low-to-high-cable-fly":"Dual-pulley cable station with D-handles set low",
  "high-to-low-cable-fly":"Dual-pulley cable station with D-handles set high",
  "rope-pushdown":"High cable pulley with rope attachment",
  "straight-bar-pushdown":"High cable pulley with straight-bar attachment",
  "overhead-cable-extension":"Adjustable cable station with rope or single handle",
  "lat-pulldown":"Lat-pulldown station with a long bar",
  "close-grip-pulldown":"Lat-pulldown station with a close-grip V-handle",
  "single-arm-pulldown":"High cable pulley with a single D-handle",
  "seated-cable-row":"Low cable row station with a V-handle",
  "wide-grip-cable-row":"Low cable pulley with a long bar",
  "cable-face-pull":"Cable pulley with rope attachment set near face height",
  "cable-rear-delt-fly":"Dual-pulley cable station with two D-handles",
  "cable-pull-through":"Low cable pulley with rope attachment",
  "cable-romanian-deadlift":"Low cable pulley with a straight bar or two handles",
  "cable-wood-chop":"Adjustable cable pulley with a single D-handle",
  "cable-pallof-press":"Cable pulley with a single D-handle set at chest height",
  "kneeling-cable-crunch":"High cable pulley with rope attachment",
  "treadmill-incline-walk":"Treadmill with adjustable incline",
  "stationary-bike":"Stationary exercise bike",
  "elliptical":"Elliptical trainer",
  "stair-climber":"Stair-climber machine",
  "rowing-ergometer":"Indoor rowing ergometer",
  "treadmill-easy-run":"Treadmill",
  "treadmill-run-walk":"Treadmill with speed controls",
  "treadmill-tempo-run":"Treadmill with speed controls",
  "treadmill-long-run":"Treadmill",
  "treadmill-recovery-walk":"Treadmill",
  "bike-easy-ride":"Stationary exercise bike",
  "bike-intervals":"Stationary exercise bike with resistance controls",
  "bike-tempo":"Stationary exercise bike with resistance controls",
  "bike-recovery":"Stationary exercise bike",
  "elliptical-steady":"Elliptical trainer",
  "elliptical-intervals":"Elliptical trainer with resistance controls",
  "rowing-steady":"Indoor rowing ergometer",
  "rowing-intervals":"Indoor rowing ergometer with monitor",
  "stair-climber-steady":"Stair-climber machine",
  "stair-climber-intervals":"Stair-climber machine with pace controls",
  "treadmill-incline":"Treadmill with adjustable incline",
  "rower-easy":"Indoor rowing ergometer"
};
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
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const label = value => muscleNames[value] || gearNames[value] || patternNames[value] || String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
const humanList = values => values.length < 2 ? values[0] || "the body" : `${values.slice(0,-1).join(", ")} and ${values.at(-1)}`;
const uid = () => crypto.randomUUID();
const all = selector => [...document.querySelectorAll(selector)];
const getPlan = id => data.plans.find(plan => plan.id === id);
const persist = () => localStorage.setItem(storeKey, JSON.stringify(data));
const toast = message => { const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 2800); };
const saveAndRender = message => { persist(); render(); if (message) toast(message); };
function equipmentNeeded(exercise) {
  if (typeof exercise.specificEquipment==="string"&&exercise.specificEquipment.trim()) return exercise.specificEquipment.trim();
  if (specificEquipmentById[exercise.id]) return specificEquipmentById[exercise.id];
  const name = String(exercise.name || "").toLowerCase();
  if (exercise.gear === "machine") return `${exercise.name} machine`;
  if (exercise.gear === "cardio") return /treadmill/.test(name) ? "Treadmill" : /bike/.test(name) ? "Stationary exercise bike" : /elliptical/.test(name) ? "Elliptical trainer" : /stair/.test(name) ? "Stair-climber machine" : "Indoor rowing ergometer";
  if (exercise.gear === "cable") return "Adjustable cable station with the handle or attachment for this movement";
  if (exercise.gear === "dumbbells") return /one-arm|single-arm|suitcase|side-bend|russian-twist/.test(name) ? "One dumbbell" : /bench|incline|chest-supported|hip-thrust|step-up/.test(name) ? "One or two dumbbells and a stable bench or step" : "One or two dumbbells, depending on the variation";
  if (exercise.gear === "barbell") return /bench-press|floor-press/.test(name) ? "Barbell, weight plates, and a bench or clear floor space; use a rack and safeties when available" : /squat|overhead-press/.test(name) ? "Barbell, weight plates, and a rack with safeties set for your range" : "Barbell and weight plates; use a rack if the starting position requires one";
  if (exercise.gear === "band") return /pull-apart/.test(name) ? "Light resistance band held in both hands" : "Resistance band; use a secure anchor for pulling or pressing variations";
  if (exercise.gear === "kettlebell") return /farmer-carry/.test(name) ? "One or two kettlebells, with two for a farmer carry" : "One kettlebell sized so you can control every repetition";
  if (exercise.gear === "pullupBar") return "Securely mounted pull-up bar; use a step only to reach the start position";
  if (/swim/.test(name)) return "Swimming pool, swimsuit, and goggles if desired";
  if (/jump-rope/.test(name)) return "Jump rope and clear, level floor space";
  if (/step-up|bulgarian|bench-dip/.test(name)) return "Stable bench, step, or box that will not slide";
  if (/incline-push-up/.test(name)) return "Stable raised surface such as a bench or counter";
  if (/wall/.test(name)) return "Clear wall and a non-slip floor";
  if (/hiking|outdoor|brisk-walk|easy-jog|shadowboxing|dance/.test(name)) return "Comfortable shoes and a clear, safe route or floor space";
  if (/prone|plank|dead-bug|crunch|bird-dog|superman|flutter|mountain-climber/.test(name)) return "Exercise mat or comfortable floor space";
  return "No equipment required";
}

function exerciseDescription(exercise) {
  if (typeof exercise.description==="string"&&exercise.description.trim()) return exercise.description.trim();
  const name = String(exercise.name || "This exercise");
  const lower = name.toLowerCase();
  let movement = ({push:"pressing movement",pull:"pulling movement",squat:"knee-dominant lower-body movement",hinge:"hip-hinge movement",core:"trunk-stability movement",conditioning:"cardio session"})[exercise.pattern] || "strength movement";
  if (/fly|crossover|pec deck/.test(lower)) movement = "controlled arm-fly movement";
  else if (/curl/.test(lower)) movement = "controlled curling movement";
  else if (/row|pulldown|pull-up|chin-up|face pull/.test(lower)) movement = "pulling movement";
  else if (/lunge|split squat/.test(lower)) movement = "single-leg squat movement";
  else if (/deadlift|good morning|romanian|swing/.test(lower)) movement = "hip-hinge movement";
  else if (/hip thrust|glute bridge/.test(lower)) movement = "hip-extension movement";
  else if (/plank|hold/.test(lower)) movement = "timed isometric trunk exercise";
  else if (/raise|shrug/.test(lower)) movement = "controlled raising movement";
  const targets = humanList((exercise.muscles || []).map(muscle => label(muscle).toLowerCase()));
  return `${name} is a ${movement} that trains ${targets}. Its ${label(exercise.pattern).toLowerCase()} pattern and ${label(exercise.gear).toLowerCase()} setup make it a distinct option in your plan.`;
}

function exerciseInstructions(exercise) {
  if (Array.isArray(exercise.instructions) && exercise.instructions.length) return exercise.instructions.map(step => String(step).trim()).filter(Boolean);
  const name = String(exercise.name || "this exercise");
  const lower = name.toLowerCase();
  const equipment = equipmentNeeded(exercise);
  if (exercise.pattern === "conditioning") {
    const intervals = /interval/.test(lower);
    const machine = exercise.gear === "cardio";
    return [
      `Set up ${name} using ${equipment}; check the space or route before you begin.`,
      machine ? "Adjust the seat, handles, or step position before increasing speed or resistance." : "Begin at an easy pace until your breathing and movement feel settled.",
      intervals ? "Alternate the harder and easier periods listed for your session; keep the recoveries comfortable." : "Hold a steady, comfortable effort that you can maintain for the planned time.",
      "Keep your posture relaxed and use a smooth, repeatable rhythm rather than chasing speed.",
      "Ease the pace before stopping. Stop if you feel sharp pain, dizziness, or unusual shortness of breath."
    ];
  }
  const setup = `Set up ${name} with ${equipment}. Start with a light load or easy variation and clear the area around you.`;
  if (/push-up/.test(lower)) return [setup,"Place your hands in the position for this variation and make a straight line from head through hips.","Brace gently and lower your chest under control while keeping elbows at a comfortable angle.","Press the floor or raised surface away to return to the start without letting your hips sag.","Use the incline, hand position, or range named in the variation; stop before form breaks down."];
  if (/fly|crossover|pec deck/.test(lower)) return [setup,"Set the handles or pads so your shoulders feel comfortable, then stand or sit tall with a soft bend in your elbows.","Bring your arms through a controlled arc in front of your chest without changing the elbow bend much.","Pause briefly when your hands or pads come together, then open your arms slowly to the comfortable start position.","Keep your shoulders relaxed and avoid stretching farther than feels controlled."];
  if (/pushdown/.test(lower)) return [setup,"Stand tall, hold the attachment, and keep your elbows close to your sides.","Straighten your elbows to move the handle down while your upper arms stay mostly still.","Pause briefly, then let the handle return slowly until your elbows bend comfortably.","Keep your wrists neutral and avoid rocking your torso to move the load."];
  if (/extension/.test(lower) && exercise.pattern === "push") return [setup,"Set your feet and brace lightly; keep your upper arms steady beside or above your head as the variation requires.","Bend your elbows to lower the handle or weight through a comfortable range.","Straighten your elbows smoothly to return, keeping the shoulders quiet.","Use a load that lets you move without arching your back or flaring your ribs."];
  if (/press|dip/.test(lower) && exercise.pattern === "push") return [setup,"Set your feet or body securely and grip the handles or weight with wrists stacked comfortably.","Brace gently and lower the weight or body under control, keeping shoulders and elbows comfortable.","Press smoothly back to the starting position and breathe out through the effort.","Avoid bouncing or forcing your elbows into a hard lockout."];
  if (/pull-up|chin-up|pulldown/.test(lower)) return [setup,"Secure your grip and begin with shoulders relaxed, not shrugged toward your ears.","Pull your elbows down toward your sides to raise your body or bring the bar toward your upper chest.","Pause briefly without swinging, then return slowly to the starting position.","Use the assistance or load that allows a controlled range; avoid kicking to finish repetitions."];
  if (/curl/.test(lower) && exercise.pattern === "pull") return [setup,"Stand or sit tall and hold the weight or handle with wrists neutral.","Keep your upper arms steady and bend your elbows to lift the weight through a comfortable range.","Pause briefly, then lower slowly until your arms are almost straight.","Avoid swinging your torso or letting your wrists fold back."];
  if (/row|face pull|reverse fly/.test(lower)) return [setup,"Set your stance or seat so the cable, machine, or weight starts within reach; brace your torso.","Draw your elbows along the path for this variation, bringing the handle toward your ribs, upper chest, or face.","Pause briefly with shoulders away from your ears, then reach forward slowly without rounding your back.","Keep the torso steady and use a load you can return under control."];
  if (/shrug/.test(lower)) return [setup,"Stand tall with the weights by your sides and arms relaxed.","Lift your shoulders straight up in a small, controlled motion without rolling them.","Pause briefly, then lower your shoulders slowly.","Keep your neck relaxed and avoid using a heavy load that makes you bounce."];
  if (/lunge|split squat|step-up/.test(lower)) return [setup,"Stand close to the step or set your feet in the named split stance; keep your balance before adding load.","Bend your knees and lower under control, keeping the front knee aligned with the toes.","Press through the whole front foot to rise or step back to the start.","Complete the planned repetitions on both sides when the exercise is unilateral."];
  if (/wall sit/.test(lower)) return [setup,"Stand with your back against a clear wall and place your feet far enough forward to balance.","Slide down only as far as you can keep your feet flat and knees comfortable.","Hold the position while breathing steadily and keeping your back against the wall.","Press through your feet to stand, using your hands for support if needed."];
  if (/calf raise/.test(lower)) return [setup,"Stand or sit securely with the balls of your feet supported and heels free to move.","Raise your heels smoothly, keeping pressure through the big-toe side of each foot.","Pause briefly at the top, then lower your heels slowly to a comfortable stretch.","Keep your ankles steady and avoid bouncing at the bottom."];
  if (/leg press|hack squat|belt squat|leg extension/.test(lower)) return [setup,"Adjust the seat, pads, and safety stops so the machine fits you; begin with a light load.","Keep your feet stable and knees tracking in the same direction as your toes as you lower or bend.","Press or extend smoothly through a comfortable range without bouncing or forcing a hard knee lockout.","Return the weight slowly and follow the machine's release and safety instructions."];
  if (/leg curl/.test(lower)) return [setup,"Adjust the seat or pad so it rests comfortably near your ankles and thighs; brace against the support.","Bend your knee to draw your heel toward your body through a comfortable range.","Pause briefly, then straighten your knee slowly without letting the weight stack slam.","Keep your hips still and use the machine's safety and adjustment instructions."];
  if (/deadlift|good morning|romanian|swing/.test(lower)) return [setup,"Place the load close to your body and stand with feet stable; keep a soft bend in your knees.","Push your hips back while keeping your spine long and the load close; lower only as far as you can stay braced.","Drive your hips forward to stand tall, keeping the movement smooth rather than leaning back.",/swing/.test(lower)?"For a kettlebell swing, let the hips create the motion; do not lift the bell overhead with your arms.":"Breathe steadily and stop the set if your back position or balance changes."];
  if (/hip thrust|glute bridge/.test(lower)) return [setup,"Set your feet flat and position your shoulders or upper back as this variation requires.","Brace gently and press through your feet to raise your hips until your torso and thighs align comfortably.","Pause while squeezing your glutes, keeping ribs down and avoiding an exaggerated back arch.","Lower your hips slowly and reset before the next repetition."];
  if (/back extension|reverse hyper/.test(lower)) return [setup,"Adjust the pad so your hips can move freely and secure your feet or ankles as the machine requires.","Brace lightly and move at your hips through a comfortable range while keeping your spine long.","Return to a straight body line without swinging or lifting beyond neutral.","Use a light load until the machine's movement feels familiar."];
  if (/plank|hollow hold|wall sit|suitcase hold/.test(lower)) return [setup,"Set your hands, forearms, or weight in the named position and create a stable base.","Brace gently around your midsection while keeping your ribs and pelvis aligned.","Breathe steadily and hold only while you can maintain the position.","End the hold before your lower back sags or your shoulders lose their position."];
  if (/dead bug|bird dog|superman/.test(lower)) return [setup,"Lie face up or face down as the movement requires and set your spine in a comfortable neutral position.","Brace gently and move the opposite arm and leg, or the named limbs, without twisting your torso.","Pause briefly at the controlled end of the range, then return slowly.","Use a smaller range if your back arches or your balance shifts."];
  if (/crunch|knee raise|leg raise|flutter kick/.test(lower)) return [setup,"Lie down or hang securely as the variation requires, and brace before moving.","Bring your ribs toward your pelvis or lift your legs using your trunk, not momentum.","Lower or extend slowly until you can keep your back position controlled.","Keep your neck relaxed and shorten the range if your back arches."];
  if (/wood chop|twist|windmill|halo|pallof/.test(lower)) return [setup,"Set your feet and hold the handle or weight securely; brace your trunk before moving.","Move through the rotation or anti-rotation path named in the exercise, keeping the motion smooth.","Keep your hips and shoulders controlled and avoid forcing the end range.","Return slowly and complete both sides when the movement is one-sided."];
  if (exercise.pattern === "squat") return [setup,"Set your feet about shoulder-width or in the stance named for this variation, with toes turned out slightly if comfortable.","Brace gently and bend your hips and knees, keeping your knees aligned with your toes.","Lower to a depth you can control while keeping your feet grounded.","Press through the whole foot to stand, keeping your torso steady."];
  if (exercise.pattern === "hinge") return [setup,"Stand with feet stable and knees soft; brace gently before the first repetition.","Push your hips back and let your torso tip forward while keeping your spine long.","Stop at the deepest point you can control, then drive your hips forward to stand.","Keep the load close and avoid rounding or overextending your back."];
  if (exercise.pattern === "core") return [setup,"Set up on a stable floor or support and arrange any weight or handle within reach.","Brace gently around your middle and keep your breathing steady.","Move slowly through the range named in the exercise without using momentum.","Reset between repetitions and use a smaller range if your back or hips shift."];
  return [setup,"Set a stable stance and brace lightly before moving.","Move through the exercise's comfortable range with a smooth, controlled tempo.","Return to the start slowly and keep your joints aligned with the direction of movement.","Breathe steadily and stop if you feel sharp pain or lose control of the movement."];
}

function withExerciseDetails(exercise) {
  const equipment = equipmentNeeded(exercise);
  const description=typeof exercise.description==="string"?exercise.description.trim():"";
  const instructions=Array.isArray(exercise.instructions)?exercise.instructions.map(step=>String(step).trim()).filter(Boolean):[];
  return {...exercise, description:description || exerciseDescription(exercise), specificEquipment:equipment, instructions:instructions.length?instructions:exerciseInstructions({...exercise,specificEquipment:equipment})};
}

function exerciseSearchText(exercise) {
  const detailed = withExerciseDetails(exercise);
  return [exercise.name,label(exercise.gear),label(exercise.pattern),...(exercise.muscles || []).map(label),detailed.specificEquipment,detailed.description,...detailed.instructions].join(" ");
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

function editDistance(left,right) {
  const previousPrevious = [];
  let previous = Array.from({length:right.length+1},(_,index)=>index);
  for(let row=1;row<=left.length;row++){
    const current=[row];
    for(let column=1;column<=right.length;column++){
      current[column]=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+(left[row-1]===right[column-1]?0:1));
      if(row>1&&column>1&&left[row-1]===right[column-2]&&left[row-2]===right[column-1])current[column]=Math.min(current[column],previousPrevious[column-2]+1);
    }
    previousPrevious.splice(0,previousPrevious.length,...previous);
    previous=current;
  }
  return previous[right.length];
}

function tokenSimilarity(query,candidate) {
  if(query===candidate)return 1;
  if(query.length<3||candidate.length<3)return 0;
  if(candidate.startsWith(query)||query.startsWith(candidate))return 0.82+Math.min(query.length,candidate.length)/100;
  const distance=editDistance(query,candidate);
  const allowance=Math.max(query.length,candidate.length)>=8?2:1;
  return distance<=allowance?1-distance/Math.max(query.length,candidate.length):0;
}

function exerciseSearchScore(exercise,query) {
  const normalized=normalizeSearchText(query);
  if(!normalized)return 1;
  const text=normalizeSearchText(exerciseSearchText(exercise));
  if(text.includes(normalized))return 1.2;
  const compactText=text.replace(/\s/g,"");
  if(compactText.includes(normalized.replace(/\s/g,"")))return 1.12;
  const queryTokens=normalized.split(" ").filter(token=>token.length>1);
  const corpusTokens=[...new Set(text.split(" ").filter(Boolean))];
  if(!queryTokens.length)return 0;
  const scores=queryTokens.map(token=>Math.max(0,...corpusTokens.map(candidate=>tokenSimilarity(token,candidate))));
  const coverage=scores.filter(score=>score>=0.45).length/queryTokens.length;
  if(coverage<0.5)return 0;
  return scores.reduce((sum,score)=>sum+score,0)/scores.length*0.88+coverage*0.12;
}

function searchExercises(query) {
  return data.library.map(exercise=>({exercise,score:exerciseSearchScore(exercise,query)}))
    .filter(result=>!String(query || "").trim()||result.score>=0.45)
    .sort((a,b)=>b.score-a.score||a.exercise.name.localeCompare(b.exercise.name))
    .map(result=>result.exercise);
}

function searchIsApproximate(query,found) {
  const terms=normalizeSearchText(query).split(" ").filter(term=>term.length>1);
  if(!terms.length||!found.length)return false;
  return !found.some(exercise=>{
    const fields=normalizeSearchText(exerciseSearchText(exercise));
    const compact=fields.replace(/\s/g,"");
    if(compact.includes(terms.join("")))return true;
    const tokens=new Set(fields.split(" "));
    return terms.every(term=>[...tokens].some(token=>token===term||token.includes(term)));
  });
}
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
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const parseDateKey = value => { const [year,month,day]=String(value).split("-").map(Number); return new Date(year,month-1,day); };
const addDays = (value,count) => { const date=parseDateKey(value); date.setDate(date.getDate()+count); return dateKey(date); };
const weekdayForDate = value => weekDays[(parseDateKey(value).getDay()+6)%7];
const displayDate = value => parseDateKey(value).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const fullDate = value => parseDateKey(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
const validDateKey = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDateKey(value)) === value;
const dayNumber = value => Date.parse(value + "T00:00:00Z") / 86400000;
const nextScheduleDate = day => {
  if(!day.scheduledDate)return null;
  const today=dateKey(new Date());
  if(day.scheduledDate>=today)return day.scheduledDate;
  const elapsed=dayNumber(today)-dayNumber(day.scheduledDate);
  return addDays(day.scheduledDate,Math.ceil(elapsed/7)*7);
};
const availabilityForWeek = start => {
  if (!validDateKey(start)) return [];
  return Array.from({length:7}, (_, index) => addDays(start, index)).filter(isAvailable);
};

function validAvailabilityRule(rule) {
  if (!rule || !validDateKey(rule.start) || (rule.end !== null && (!validDateKey(rule.end) || rule.end < rule.start))) return false;
  if (rule.type === "weekly") return Array.isArray(rule.weekdays) && rule.weekdays.length > 0 && rule.weekdays.every(day => weekDays.includes(day));
  return rule.type === "rolling" && Array.isArray(rule.pattern) && rule.pattern.length >= 2 && rule.pattern.length <= 60
    && rule.pattern.every(day => typeof day === "boolean") && rule.pattern.includes(true);
}

function ruleIncludes(date, rule = data.availabilityRule) {
  if (!rule || date < rule.start || (rule.end && date > rule.end)) return false;
  if (rule.type === "weekly") return rule.weekdays.includes(weekdayForDate(date));
  return rule.pattern[(dayNumber(date) - dayNumber(rule.start)) % rule.pattern.length];
}

function isAvailable(date) {
  return !data.unavailableDates.includes(date) && (data.availability.includes(date) || ruleIncludes(date));
}

function nextRuleDate(from, rule) {
  if (!rule) return null;
  const start = from > rule.start ? from : rule.start;
  const length = rule.type === "weekly" ? 7 : rule.pattern.length;
  for (let offset = 0; offset < length; offset++) {
    const date = addDays(start, offset);
    if (rule.end && date > rule.end) return null;
    if (ruleIncludes(date, rule)) return date;
  }
  return null;
}

function nextAvailableDate(from) {
  const manual = data.availability.find(date => date >= from && !data.unavailableDates.includes(date));
  let recurring = nextRuleDate(from, data.availabilityRule);
  while (recurring && data.unavailableDates.includes(recurring)) {
    recurring = nextRuleDate(addDays(recurring, 1), data.availabilityRule);
  }
  return manual && (!recurring || manual < recurring) ? manual : recurring;
}

// Count earlier slots without generating every date in a long-running rule.
function availableDateCount(start, before) {
  const rule = data.availabilityRule;
  let count = 0;
  if (rule) {
    const first = Math.max(dayNumber(start), dayNumber(rule.start));
    const end = Math.min(dayNumber(before), rule.end ? dayNumber(rule.end) + 1 : Infinity);
    if (end > first) {
      const length = rule.type === "weekly" ? 7 : rule.pattern.length;
      const date = start > rule.start ? start : rule.start;
      for (let offset = 0; offset < length && first + offset < end; offset++) {
        if (ruleIncludes(addDays(date, offset), rule)) count += Math.ceil((end - first - offset) / length);
      }
    }
  }
  const inWindow = date => date >= start && date < before;
  for (const date of data.availability) {
    if (inWindow(date) && !ruleIncludes(date) && !data.unavailableDates.includes(date)) count++;
  }
  for (const date of data.unavailableDates) {
    if (inWindow(date) && ruleIncludes(date)) count--;
  }
  return count;
}

function nextCalendarSessions(plan) {
  const today = dateKey(new Date());
  const start = plan.calendarStart > today ? plan.calendarStart : today;
  const sessions = Array(plan.days.length).fill(null);
  if (!sessions.length) return sessions;
  const first = ((plan.calendarOffset || 0) + availableDateCount(plan.calendarStart, start)) % sessions.length;
  upcomingAvailableDates(start, sessions.length).forEach((date, index) => {
    sessions[(first + index) % sessions.length] = date;
  });
  return sessions;
}

function upcomingAvailableDates(start, limit) {
  const dates = [];
  let from = start;
  for (let index = 0; index < limit; index++) {
    const date = nextAvailableDate(from);
    if (!date) break;
    dates.push(date);
    from = addDays(date, 1);
  }
  return dates;
}

function setAvailabilityRule(rule) {
  const today = dateKey(new Date());
  for (const plan of data.plans) {
    if (plan.calendarStart && plan.calendarStart < today && plan.days.length) {
      plan.calendarOffset = ((plan.calendarOffset || 0) + availableDateCount(plan.calendarStart, today)) % plan.days.length;
      plan.calendarStart = today;
    }
  }
  data.availabilityRule = rule;
}

function applyTheme() {
  const theme=data?.theme==="dark"?"dark":"light";
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
  const themeColor=document.querySelector('meta[name="theme-color"]');
  if(themeColor)themeColor.content=theme==="dark"?"#171719":"#f7f5f3";
}

function normalizePlans() {
  let migrated = false;
  for (const key of ["availability", "unavailableDates"]) {
    const dates = Array.isArray(data[key]) ? data[key] : [];
    const normalized = [...new Set(dates.filter(validDateKey))].sort();
    if (dates !== data[key] || normalized.length !== dates.length || normalized.some((date,index) => date !== dates[index])) {
      data[key] = normalized;
      migrated = true;
    }
  }
  if (data.availabilityRule != null && !validAvailabilityRule(data.availabilityRule)) {
    data.availabilityRule = null;
    migrated = true;
  }
  if(data.theme!=="light"&&data.theme!=="dark"){data.theme="light";migrated=true;}
  data.plans.forEach(plan => {
    if (plan.calendarStart && !validDateKey(plan.calendarStart)) {
      delete plan.calendarStart;
      delete plan.calendarOffset;
      migrated = true;
    }
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
    data = {library: catalog, plans: [], goals: [], history: [], availability: [], unavailableDates: [], theme: "light", weightUnit: "lb"};
  }
  const savedLibrary=data.library;
  const savedById=new Map(savedLibrary.map(exercise=>[exercise.id,exercise]));
  const catalogIds=new Set(catalog.map(exercise=>exercise.id));
  data.library=[...catalog.map(exercise=>withExerciseDetails({...exercise,...(savedById.get(exercise.id)||{})})),...savedLibrary.filter(exercise=>!catalogIds.has(exercise.id)).map(withExerciseDetails)];
  data.plans ||= [];
  data.goals ||= [];
  data.history ||= [];
  persist();
  normalizePlans();
  applyTheme();
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function render() {
  applyTheme();
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
    ${renderAvailabilityCalendar()}
    <h2 class="section-title">Saved plans</h2>
    ${data.plans.length ? data.plans.map(plan => `<button class="card plan-card" data-open-plan="${escapeHTML(plan.id)}"><div class="row"><div><strong>${escapeHTML(plan.goal)}</strong><div class="subtle">${escapeHTML(plan.split)} · ${plan.days.length} sessions · ${plan.calendarStart ? "Follows calendar" : escapeHTML(scheduleLabel(plan.days)) + " weekly"}</div></div><span class="badge">${escapeHTML(plan.target)}</span></div></button>`).join("") : `<div class="card empty"><b>No plan saved yet</b>Your first plan will show up here.</div>`}
    <p class="safe-note">Your workout data stays in this browser on this phone. Use the arrow at the top to save a backup file.</p>`;
}

function renderAvailabilityCalendar() {
  const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
  const first=new Date(year,month,1),offset=(first.getDay()+6)%7,count=new Date(year,month+1,0).getDate();
  const today=dateKey(new Date());
  const cells=Array(offset).fill('<span class="calendar-blank" aria-hidden="true"></span>');
  let availableCount = 0;
  for(let day=1;day<=count;day++){
    const key = dateKey(new Date(year, month, day));
    const past = key < today;
    const selected = !past && isAvailable(key);
    if (selected) availableCount++;
    const longDate=parseDateKey(key).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
    cells.push(`<button type="button" class="calendar-day ${selected?"selected":""}" data-availability-date="${key}" aria-label="${escapeHTML(longDate)}${selected?", available":""}" aria-pressed="${selected}" ${past?"disabled":""}>${day}</button>`);
  }
  while(cells.length<42)cells.push('<span class="calendar-blank" aria-hidden="true"></span>');
  const monthName=calendarMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const currentMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
  const atCurrent=year===currentMonth.getFullYear()&&month===currentMonth.getMonth();
  const rule = data.availabilityRule;
  const hasEdits = [...data.availability, ...data.unavailableDates].some(date => date >= today);
  return `<section class="card availability-card">
    <div class="row calendar-heading"><div><h2 class="section-title">Availability calendar</h2><p class="subtle">Tap a date to change it.</p></div>
      <button type="button" class="button small soft" data-action="edit-availability">${rule ? "Edit repeat" : "Set repeat"}</button>
    </div>
    ${rule ? `<p class="subtle calendar-rule">${escapeHTML(availabilityRuleLabel(rule))}</p>` : ""}
    <div class="calendar-nav"><button type="button" class="button small soft" data-calendar-shift="-1" aria-label="Previous month" ${atCurrent?"disabled":""}>‹</button><strong>${escapeHTML(monthName)}</strong><button type="button" class="button small soft" data-calendar-shift="1" aria-label="Next month">›</button></div>
    <div class="calendar-grid calendar-weekdays">${weekDays.map(day=>`<span>${day.slice(0,3)}</span>`).join("")}</div>
    <div class="calendar-grid">${cells.join("")}</div>
    <div class="row calendar-footer"><span class="subtle">${availableCount} available ${availableCount === 1 ? "day" : "days"} this month</span>
      ${hasEdits ? '<button type="button" class="text-button" data-action="clear-availability">Reset date edits</button>' : ""}
    </div>
  </section>`;
}

function availabilityRuleLabel(rule) {
  const pattern = rule.type === "weekly"
    ? "Weekly on " + weekDays.filter(day => rule.weekdays.includes(day)).map(day => day.slice(0,3)).join(", ")
    : `Rolling every ${rule.pattern.length} days`;
  const dates = rule.end ? ` through ${fullDate(rule.end)}` : " with no end date";
  return `${pattern} from ${fullDate(rule.start)}${dates}`;
}

function openAvailabilityEditor() {
  const rule = data.availabilityRule;
  const pattern = rule?.type === "rolling" ? rule.pattern : [true, false];
  const type = rule?.type || "weekly";
  const monthStart = dateKey(calendarMonth);
  const today = dateKey(new Date());
  const start = rule?.start || (monthStart > today ? monthStart : today);
  showModal("Repeat availability", `<form id="availability-form">
    <div class="field"><label for="availability-type">Repeat pattern</label>
      <select id="availability-type" name="type"><option value="weekly">Same weekdays each week</option><option value="rolling" ${type === "rolling" ? "selected" : ""}>Rolling cycle</option></select>
    </div>
    <div class="field"><label for="availability-start">Starts on</label><input id="availability-start" name="start" type="date" value="${start}" required></div>
    <fieldset class="repeat-options field" id="weekly-availability">
      <legend class="field-label">Days you can train</legend>
      ${checkedOptions(weekDays, rule?.weekdays || [], "weekdays")}
    </fieldset>
    <fieldset class="repeat-options field" id="rolling-availability">
      <legend class="field-label">Rolling cycle</legend>
      <label for="cycle-length">Days in a cycle</label>
      <select id="cycle-length" name="cycleLength">${Array.from({length:59}, (_, index) => index + 2).map(length => `<option ${length === pattern.length ? "selected" : ""}>${length}</option>`).join("")}</select>
      <span class="subtle">Day 1 is your start date. Tap the days you can train.</span>
      <div class="cycle-grid">${Array.from({length:60}, (_, index) => `<label class="cycle-day"><input type="checkbox" name="cycleDay" value="${index}" ${pattern[index] ? "checked" : ""}><span>Day ${index + 1}<small class="cycle-off" aria-hidden="true">Off</small><small class="cycle-on" aria-hidden="true">Train</small></span></label>`).join("")}</div>
    </fieldset>
    <div class="field"><label for="availability-duration">Repeats until</label>
      <select id="availability-duration" name="duration"><option value="forever">No end date</option><option value="date" ${rule?.end ? "selected" : ""}>Specific date</option></select>
    </div>
    <div class="field" id="availability-end-field"><label for="availability-end">Last date (inclusive)</label><input id="availability-end" name="end" type="date" value="${rule?.end || ""}"></div>
    <div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary" type="submit">Save repeat</button></div>
    ${rule ? '<button class="text-button repeat-remove" type="button" data-action="remove-availability-rule">Remove repeating schedule</button>' : ""}
  </form>`);
  updateAvailabilityEditor(document.querySelector("#availability-form"));
}

function updateAvailabilityEditor(form) {
  const rolling = form.elements.type.value === "rolling";
  const end = form.elements.end;
  const limited = form.elements.duration.value === "date";
  for (const [id, active] of [["weekly-availability", !rolling], ["rolling-availability", rolling]]) {
    const field = form.querySelector("#" + id);
    field.hidden = !active;
    field.disabled = !active;
  }
  for (const day of form.querySelectorAll('[name="cycleDay"]')) {
    day.disabled = Number(day.value) >= Number(form.elements.cycleLength.value);
    day.parentElement.hidden = day.disabled;
  }
  form.querySelector("#availability-end-field").hidden = !limited;
  end.required = limited;
  end.disabled = !limited;
  end.min = form.elements.start.value;
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
  const aliases = {
    chest:["chest","pec"], shoulders:["shoulder","delt"], biceps:["bicep","arm"],
    triceps:["tricep","arm"], forearms:["forearm"], abs:["abs","core"],
    obliques:["oblique","core"], serratus:["serratus","rib"], traps:["trap","back"],
    upperBack:["upper back","back","trap"], lats:["lat","back"], lowerBack:["lumbar","lower back","back"],
    glutes:["glute","leg"], quads:["quad","leg"], adductors:["adductor","inner thigh","leg"],
    hamstrings:["hamstring","leg"], calves:["calf","calves","leg"]
  };
  return muscles.filter(muscle => (aliases[muscle] || [label(muscle).toLowerCase()]).some(word => value.includes(word)));
}

function makePlan({goal, target, split, count, variation, gear, focus, weekdays = defaultWeeklyDays(count), scheduledDates = [], includeCardio = false, startIndex = 0}) {
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
    days.push({id: uid(), name: `Day ${index + 1} · ${name}`, weekday: weekdays[index] || defaultWeeklyDays(count)[index], scheduledDate: scheduledDates[index] || null, items});
  }
  return {id: uid(), goal, target, split, focus, includeCardio: includeCardio || (split !== "Cardio" && target === "Improve endurance"), days};
}

function checkedOptions(options, selected, group) {
  return `<div class="check-grid">${options.map(option => `<label class="check-option"><input type="checkbox" name="${group}" value="${escapeHTML(option)}" ${selected.includes(option) ? "checked" : ""}>${escapeHTML(label(option))}</label>`).join("")}</div>`;
}

function openBuilder(draft = {}) {
  const today = dateKey(new Date());
  const startDate = draft.startDate || nextAvailableDate(today) || today;
  const rule = data.availabilityRule;
  const followsCalendar = draft.followsCalendar ?? Boolean(rule && (!rule.end || rule.end >= today));
  showModal("Build your plan", `<form id="plan-form">
    <div class="field"><label for="goal-text">What do you want to work toward?</label><textarea id="goal-text" name="goal" required placeholder="For example: build strength, improve cardio endurance, or focus on legs"></textarea></div>
    <div class="grid2"><div class="field"><label>Training goal</label><select name="target"><option value="auto">Auto-detect from your goal</option><option>Build muscle</option><option>Get stronger</option><option>Improve endurance</option><option>General fitness</option></select></div>
    <div class="field"><label>Workout split</label><select name="split"><option>Full body</option><option>Upper / lower</option><option>Push / pull / legs</option><option>Cardio</option></select></div></div>
    <div class="field"><label for="plan-start-date">Start on or after</label><input id="plan-start-date" name="startDate" type="date" min="${today}" value="${startDate}" required>
      <label class="check-option"><input id="plan-follow-calendar" type="checkbox" name="followsCalendar" ${followsCalendar ? "checked" : ""}><span>Keep this plan synced with my calendar</span></label>
      <div id="schedule-preview" class="schedule-preview"></div>
    </div>
    <div class="field"><label>Variation</label><select name="variation">${[1,2,3,4].map((n,i)=>`<option value="${i}">Variation ${n}</option>`).join("")}</select></div>
    <div class="field"><span class="field-label">Equipment you can use</span>${checkedOptions(gearOptions,["bodyweight","dumbbells"],"gear")}</div>
    <div class="field"><label class="check-option"><input type="checkbox" name="includeCardio" value="1"><span>Mix cardio into strength days</span></label><span class="subtle">Adds a cardio block alongside the weights so you can work on both.</span></div>
    <div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary" type="submit">Preview plan</button></div>
  </form>`);
  const form = document.querySelector("#plan-form");
  if (draft.goal !== undefined) {
    for (const key of ["goal", "target", "split", "variation"]) form.elements[key].value = draft[key];
    for (const option of form.querySelectorAll('[name="gear"]')) option.checked = draft.gear.includes(option.value);
    form.elements.includeCardio.checked = draft.includeCardio;
  }
  updateBuilderSchedule(form);
}

function builderDates(start, followsCalendar) {
  if (!validDateKey(start)) return [];
  if (followsCalendar) {
    const first = nextAvailableDate(start);
    return first ? availabilityForWeek(first) : [];
  }
  const selectedDates = availabilityForWeek(start);
  if (selectedDates.length) return selectedDates;

  // A new user may not have marked calendar availability yet. Give the plan
  // builder a useful weekly schedule instead of producing an empty plan.
  const defaultDays = new Set(defaultWeeklyDays(3));
  return Array.from({length: 7}, (_, index) => addDays(start, index))
    .filter(date => defaultDays.has(weekdayForDate(date)));
}

function updateBuilderSchedule(form) {
  const preview = form.querySelector("#schedule-preview");
  const follows = form.elements.followsCalendar.checked;
  const start = form.elements.startDate.value;
  const markedDates = availabilityForWeek(start);
  const usingDefault = !follows && !markedDates.length;
  const dates = builderDates(start, follows);
  const note = follows
    ? "Your sessions cycle in order on available dates."
    : usingDefault
      ? "No calendar days are marked yet, so this starts with a default Monday / Wednesday / Friday schedule. You can edit the days after previewing."
      : "These weekdays repeat each week.";
  preview.innerHTML=dates.length
    ? `<strong>${dates.length} session${dates.length===1?"":"s"} in the first week</strong><span>${dates.map(value=>escapeHTML(displayDate(value))).join(" · ")}</span><span>${note}</span>`
    : `<strong>No available days from this date</strong><span>Mark training days on the calendar, or turn off calendar syncing to use a weekly schedule.</span>`;
}

function previewPlan(plan, draft) {
  const cardioNote = plan.includeCardio && plan.split !== "Cardio" ? " · cardio included on strength days" : "";
  const schedule = plan.calendarStart ? "Sessions follow your availability calendar in order." : `Repeats weekly on ${scheduleLabel(plan.days)}.`;
  showModal("Plan preview", `<p class="subtle">${escapeHTML(plan.goal)} · ${escapeHTML(plan.target)} · ${escapeHTML(plan.split)}${cardioNote}</p><p class="subtle">${escapeHTML(schedule)}</p>${plan.days.map(day => `<div class="card"><div class="row"><strong>${escapeHTML(day.name)}</strong><span class="badge">${escapeHTML(day.scheduledDate ? displayDate(day.scheduledDate) : day.weekday)}</span></div>${day.items.map(item=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(item.exercise.name)}</div><div class="exercise-meta">${item.sets} × ${item.reps} ${item.exercise.pattern === "conditioning" ? "min" : /plank|hold|wall sit/i.test(item.exercise.name) ? "sec" : "reps"}</div></div></div>`).join("")}</div>`).join("")}<div class="modal-actions"><button class="button soft" data-action="edit-preview">Back</button><button class="button primary" data-action="save-preview">Save plan</button></div>`, {plan});
  modal._builderDraft = draft;
}

function renderPlanDetail(plan) {
  const cardioNote = plan.includeCardio && plan.split !== "Cardio" ? " · cardio mixed into strength sessions" : "";
  const follows = Boolean(plan.calendarStart);
  const dates = follows ? nextCalendarSessions(plan) : plan.days.map(nextScheduleDate);
  const nextDate = dates.filter(Boolean).sort()[0];
  const schedule = follows ? (nextDate ? `Next session ${displayDate(nextDate)}` : "Add available dates to schedule more sessions.") : scheduleLabel(plan.days);
  const sessions = plan.days.length === 1 ? "1 session" : `${plan.days.length} sessions`;
  app.innerHTML = `<button class="text-button" data-action="back-plans">‹ All plans</button>${heading(plan.goal, `${plan.target} · ${plan.split} · ${sessions}${follows ? " in rotation" : " per week"}${cardioNote}`)}
    <div class="card"><div class="row"><div><span class="eyebrow">${follows ? "Follows your calendar" : "Repeats every week"}</span><p class="subtle" style="margin:6px 0 0">${escapeHTML(schedule)}</p></div><button class="button small soft" data-action="edit-schedule">Edit days</button></div></div>
    <div class="card"><span class="eyebrow">Recovery option</span><h2 class="section-title" style="margin:6px 0">Missed a workout?</h2><p class="subtle">Choose the session you missed and how many sessions you can still fit in. The new schedule skips that session and keeps your original plan.</p><button class="button soft" data-action="missed">Adjust this week</button></div>
    ${plan.days.map((day, index)=>`<section class="card"><div class="row"><div><span class="badge">${escapeHTML(dates[index] ? displayDate(dates[index]) : follows ? "Unscheduled" : day.weekday || "Unscheduled")}</span><p class="eyebrow" style="margin:8px 0 0">${escapeHTML(day.name)}</p><p class="subtle">${day.items.length} exercises</p></div><button class="button small primary" data-log-day="${escapeHTML(day.id)}">Log session</button></div>
      ${muscleMap(day.items.map(item=>item.exercise),day)}
      ${day.items.map(item=>`<div class="day-exercise"><div class="row"><div><div class="exercise-title">${escapeHTML(item.exercise.name)}</div><div class="exercise-meta">${item.sets} × ${item.reps} ${item.exercise.pattern === "conditioning" ? "min" : /plank|hold|wall sit/i.test(item.exercise.name) ? "sec" : "reps"}</div></div><button class="text-button" data-swap="${escapeHTML(item.id)}" data-day="${escapeHTML(day.id)}">Swap</button></div><div class="row" style="justify-content:flex-start;margin-top:8px"><span class="subtle">Sets</span>${stepper(item.sets,`sets:${day.id}:${item.id}`)}<span class="subtle">Reps / min</span>${stepper(item.reps,`reps:${day.id}:${item.id}`)}</div></div>`).join("")}
      <button class="text-button" data-add-exercise="${escapeHTML(day.id)}">＋ Add exercise</button></section>`).join("")}
    <button class="button danger full" data-action="delete-plan">Delete this plan</button>`;
}

function stepper(value, key) { return `<span class="stepper"><button type="button" data-adjust="${escapeHTML(key)}" data-delta="-1" aria-label="Decrease">−</button><output>${value}</output><button type="button" data-adjust="${escapeHTML(key)}" data-delta="1" aria-label="Increase">+</button></span>`; }

let muscleMapInstance = 0;

function muscleMap(exercises = [], workout = null) {
  const records = Array.isArray(exercises) ? exercises : [];
  const items = records.length && typeof records[0] === "string" ? [{muscles:records}] : records;
  const roles = new Map();
  const sidesFrom = value => {
    if (value && typeof value === "object" && !Array.isArray(value)) value = value.side || value.laterality;
    if (Array.isArray(value)) {
      const selected = value.flatMap(item => sidesFrom(item));
      return [...new Set(selected.length ? selected : ["left","right"])];
    }
    if (typeof value !== "string" || !value.trim() || /^(both|bilateral|all)$/i.test(value)) return ["left","right"];
    const text = value.toLowerCase();
    const selected = [];
    if (text.includes("left")) selected.push("left");
    if (text.includes("right")) selected.push("right");
    return selected.length ? selected : ["left","right"];
  };
  const add = (muscle,role,sides) => {
    if (!muscle) return;
    if (!roles.has(muscle)) roles.set(muscle,new Map());
    const bySide = roles.get(muscle);
    for (const side of sides) {
      const current = bySide.get(side);
      if (role === "primary" || !current) bySide.set(side,role);
    }
  };
  const addExercise = exercise => {
    if (typeof exercise === "string") { add(exercise,"primary",["left","right"]); return; }
    if (!exercise || typeof exercise !== "object") return;
    for (const muscle of exercisePrimaryMuscles(exercise)) {
      const side = exercise.muscleSides?.[muscle] ?? exercise.muscleLaterality?.[muscle] ?? exercise.sides?.[muscle] ?? exercise.laterality ?? exercise.side;
      add(muscle,"primary",sidesFrom(side));
    }
    for (const muscle of exerciseSecondaryMuscles(exercise)) {
      const side = exercise.muscleSides?.[muscle] ?? exercise.muscleLaterality?.[muscle] ?? exercise.sides?.[muscle] ?? exercise.laterality ?? exercise.side;
      add(muscle,"secondary",sidesFrom(side));
    }
  };
  items.forEach(addExercise);
  const workoutSides = workout?.muscleSides || workout?.muscleLaterality || {};
  for (const muscle of workout?.primaryMuscles || []) add(muscle,"primary",sidesFrom(workoutSides[muscle] ?? workout?.laterality ?? workout?.side));
  for (const muscle of workout?.secondaryMuscles || []) add(muscle,"secondary",sidesFrom(workoutSides[muscle] ?? workout?.laterality ?? workout?.side));

  const primary = [...roles].filter(([,bySide]) => bySide.get("left") === "primary" || bySide.get("right") === "primary").map(([muscle])=>label(muscle)).sort();
  const secondary = [...roles].filter(([,bySide]) => bySide.get("left") === "secondary" || bySide.get("right") === "secondary").map(([muscle])=>label(muscle)).sort();
  const description = primary.length || secondary.length
    ? "Primary muscles: " + (primary.join(", ") || "none") + ". Secondary muscles: " + (secondary.join(", ") || "none") + "."
    : "No muscles selected. Both figures are inactive.";
  const mapId = "muscle-map-" + (++muscleMapInstance);
  const assets = new Set(muscles);
  const layers = [...roles].flatMap(([muscle,bySide]) => [...bySide].map(([side,role])=>({muscle,side,role})))
    .filter(item=>assets.has(item.muscle))
    .sort((a,b)=>(a.role === "primary" ? 1 : 0) - (b.role === "primary" ? 1 : 0));
  const defs = layers.map(item=>{
    const slug = item.muscle.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();
    const maskId = mapId + "-" + slug + "-" + item.side;
    const maskSrc = "./muscle-mask-" + slug + "-" + item.side + ".png";
    return '<mask id="' + maskId + '" x="0" y="0" width="1280" height="1280" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" style="mask-type:alpha"><image href="' + maskSrc + '" x="0" y="0" width="1280" height="1280" preserveAspectRatio="none"/></mask>';
  }).join("");
  const regions = layers.map(item=>{
    const slug = item.muscle.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();
    const maskId = mapId + "-" + slug + "-" + item.side;
    return '<rect class="muscle-region" data-muscle-id="' + item.muscle + '" data-side="' + item.side + '" data-role="' + item.role + '" x="0" y="0" width="1280" height="1280" mask="url(#' + maskId + ')"/>';
  }).join("");
  const alt = "Muscle map. " + description;
  return '<div class="muscle-map"><svg class="anatomy-figure" viewBox="0 0 1280 1280" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + escapeHTML(alt) + '"><title>Front and back muscle map</title><desc>' + escapeHTML(description) + '</desc><defs>' + defs + '</defs><image class="anatomy-raster" href="./muscle-map-neutral.png" x="0" y="0" width="1280" height="1280" preserveAspectRatio="none" aria-hidden="true"/><g class="muscle-regions">' + regions + '</g></svg></div>';
}

function exercisePrimaryMuscles(exercise) {
  if (Array.isArray(exercise?.primaryMuscles)) return exercise.primaryMuscles;
  if (Array.isArray(exercise?.secondaryMuscles)) return (exercise.muscles || []).filter(muscle => !exercise.secondaryMuscles.includes(muscle));
  return exercise?.muscles || [];
}

function exerciseSecondaryMuscles(exercise) {
  return Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : [];
}

function exerciseTargetMuscles(exercise) {
  return [...new Set([...exercisePrimaryMuscles(exercise), ...exerciseSecondaryMuscles(exercise)])];
}

function exerciseSummary(exercise) {
  return `${label(exercise.gear)} · ${label(exercise.pattern)} · ${exerciseTargetMuscles(exercise).map(label).join(", ")}`;
}

function exerciseSearchRow(exercise) {
  return `<button type="button" class="exercise-row exercise-row-button" data-view-exercise="${escapeHTML(exercise.id)}" aria-label="View ${escapeHTML(exercise.name)} profile"><span class="exercise-row-copy"><span class="exercise-title">${escapeHTML(exercise.name)}</span><span class="exercise-meta">${escapeHTML(exerciseSummary(exercise))}</span></span><span class="exercise-row-cue">Details</span></button>`;
}

function closestSearchMessage(query,found) {
  return searchIsApproximate(query,found) ? `Showing closest matches for “${escapeHTML(query)}”` : "";
}

function renderLibrary() {
  const found=searchExercises(librarySearch);
  app.innerHTML = `${heading("Exercise library", `${data.library.length} exercises. Search names, equipment, movements, or muscles. Misspellings and missing hyphens are okay.`)}
    <input class="searchbox" id="library-search" type="search" placeholder="Search exercises" value="${escapeHTML(librarySearch)}">
    <div class="row" style="margin:12px 0"><span class="subtle" id="library-result-count">${found.length} results</span><button class="button small primary" data-action="new-exercise">＋ Add exercise</button></div>
    <p class="search-hint" id="library-search-hint">${closestSearchMessage(librarySearch,found)}</p>
    <section class="card" id="exercise-results">${found.length ? found.map(exerciseSearchRow).join("") : `<div class="empty">No close matches. Try fewer words or a muscle or equipment name.</div>`}</section>`;
}

function drawLibraryResults() {
  const found=searchExercises(librarySearch);
  const target=document.querySelector("#exercise-results");
  const count=document.querySelector("#library-result-count");
  const hint=document.querySelector("#library-search-hint");
  if(count)count.textContent=`${found.length} ${found.length===1?"result":"results"}`;
  if(hint)hint.innerHTML=closestSearchMessage(librarySearch,found);
  if(target)target.innerHTML=found.length?found.map(exerciseSearchRow).join(""):`<div class="empty">No close matches. Try fewer words or a muscle or equipment name.</div>`;
}

function openExerciseProfile(exercise,context=null) {
  if(!exercise)return;
  const selected=data.library.find(item=>item.id===exercise.id)||exercise;
  const details=withExerciseDetails(selected);
  const picker=Boolean(context?.source==="picker");
  const actions=picker
    ? `<button class="button soft" type="button" data-back-exercise-picker>Back to results</button><button class="button primary" type="button" data-use-exercise="${escapeHTML(selected.id)}">${context.swapId?"Replace exercise":"Add to workout"}</button>`
    : `<button class="button soft" type="button" data-close>Close</button><button class="button primary" type="button" data-edit-exercise="${escapeHTML(selected.id)}">Edit exercise</button>`;
  showModal(selected.name, `<div class="exercise-profile">
    <p class="exercise-description">${escapeHTML(details.description)}</p>
    <section class="exercise-profile-card"><span class="eyebrow">Quick info</span><p class="exercise-meta">${escapeHTML(exerciseSummary(selected))}</p></section>
    <section class="exercise-profile-card"><strong>Specific equipment</strong><p>${escapeHTML(details.specificEquipment)}</p></section>
    <section><h3 class="section-title">How to do it</h3><ol class="exercise-instructions">${details.instructions.map(step=>`<li>${escapeHTML(step)}</li>`).join("")}</ol><p class="exercise-safety">Start with a light load or easy pace while learning the movement. Keep each rep controlled and stop if you feel sharp pain or dizziness.</p></section>
    <section><h3 class="section-title">Muscles worked</h3>${muscleMap([selected])}</section>
    <div class="modal-actions">${actions}</div>
  </div>`);
  modal._exerciseContext=context;
}

function openExerciseEditor(exercise = {id:"",name:"",pattern:"push",gear:"bodyweight",muscles:[]},context=null) {
  const existing=exercise.id?withExerciseDetails(exercise):{...exercise,description:"",specificEquipment:"",instructions:[]};
  const primaryMuscles=exercisePrimaryMuscles(exercise);
  const secondaryMuscles=exerciseSecondaryMuscles(exercise);
  showModal(exercise.id ? "Edit exercise" : "New exercise", `<form id="exercise-form" data-id="${escapeHTML(exercise.id)}"><div class="field"><label>Exercise name</label><input name="name" required value="${escapeHTML(exercise.name)}" placeholder="e.g. Goblet squat"></div>
    <div class="grid2"><div class="field"><label>Movement</label><select name="pattern">${Object.keys(patternNames).map(key=>`<option value="${key}" ${exercise.pattern===key?"selected":""}>${label(key)}</option>`).join("")}</select></div><div class="field"><label>Equipment category</label><select name="gear">${gearOptions.map(key=>`<option value="${key}" ${exercise.gear===key?"selected":""}>${label(key)}</option>`).join("")}</select></div></div>
    <div class="field"><span class="field-label">Primary muscles</span>${checkedOptions(muscles,primaryMuscles,"primaryMuscles")}</div>
    <div class="field"><span class="field-label">Secondary muscles</span>${checkedOptions(muscles,secondaryMuscles,"secondaryMuscles")}</div>
    <p class="subtle">Primary muscles use coral; secondary muscles use dusty rose. A primary assignment takes priority if the same muscle is secondary in another exercise.</p>
    <div class="field"><label>Description</label><textarea name="description" rows="3" placeholder="What this exercise trains and how it moves">${escapeHTML(existing.description)}</textarea></div>
    <div class="field"><label>Specific equipment needed</label><textarea name="specificEquipment" rows="2" placeholder="Name the exact machine, attachment, or equipment">${escapeHTML(existing.specificEquipment)}</textarea></div>
    <div class="field"><label>How to do it</label><textarea name="instructions" rows="6" placeholder="One step per line">${escapeHTML(existing.instructions.join("\n"))}</textarea></div>
    <div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Save exercise</button></div></form>`);
  modal._exerciseContext=context;
}

function renderHistory() {
  const history = [...data.history].sort((a,b)=>new Date(b.date)-new Date(a.date));
  app.innerHTML = `${heading("Workout log", "Keep the sessions you complete in one place.")}<button class="button primary" data-action="new-workout">＋ Log a workout</button><h2 class="section-title">Recent sessions</h2>${history.length ? history.map(workout=>`<section class="card"><div class="row"><div><strong>${escapeHTML(workout.name)}</strong><div class="subtle">${new Date(workout.date).toLocaleDateString()} · ${workout.sets.length} sets</div></div><span class="badge">${escapeHTML(workout.weightUnit)}</span></div>${muscleMap(workout.sets.map(set=>set.exercise),workout)}${workout.sets.map(set=>`<div class="exercise-row"><div><div class="exercise-title">${escapeHTML(set.exercise.name)}</div><div class="exercise-meta">${set.amount} ${escapeHTML(set.unit)}${set.weight ? ` · ${set.weight} ${escapeHTML(workout.weightUnit)}` : ""}</div></div></div>`).join("")}</section>`).join("") : `<div class="card empty"><b>No workouts yet</b>Log your first session from a plan or here.</div>`}`;
}

function openWorkoutEditor(day = null) {
  logDraft = day ? day.items.flatMap(item=>Array.from({length:item.sets},()=>({exercise:item.exercise,amount:item.reps,weight:0,unit:item.exercise.pattern === "conditioning" ? "min" : /plank|hold|wall sit/i.test(item.exercise.name) ? "sec" : "reps",done:false}))) : [];
  renderWorkoutEditor(day?.name || "Workout");
}

function renderWorkoutEditor(name) {
  const lines = logDraft.map((set, index) => {
    const weightField = set.unit === "reps"      ? '<div class="set-weight-control"><label class="set-weight-label" data-set-number="'+(index+1)+'" for="log-weight-'+index+'">Weight for set '+(index+1)+' ('+data.weightUnit+')</label><input id="log-weight-slider-'+index+'" type="range" min="0" max="'+(data.weightUnit === "kg" ? 300 : 600)+'" step="0.5" data-log-weight-slider="'+index+'" value="'+(set.weight || 0)+'" aria-label="Weight slider for set '+(index+1)+'"><input id="log-weight-'+index+'" inputmode="decimal" type="number" min="0" step="0.5" data-log-weight="'+index+'" value="'+(set.weight || "")+'" placeholder="0" aria-label="Weight for set '+(index+1)+'"></div>'
      : `<span></span>`;
    return `<div class="log-set"><label><input style="width:18px;min-width:18px;height:18px;min-height:18px;margin:0;padding:0;flex:0 0 18px;appearance:auto;accent-color:var(--red)" type="checkbox" data-log-done="${index}" ${set.done ? "checked" : ""}><span style="text-align:left">${escapeHTML(set.exercise.name)}</span></label><input inputmode="numeric" type="number" min="1" data-log-amount="${index}" value="${set.amount}" aria-label="${escapeHTML(set.unit)}">${weightField}<button class="text-button" type="button" data-remove-log="${index}" aria-label="Remove">×</button></div>`;
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
  delete modal.dataset.pickerDay;
  delete modal.dataset.pickerSwap;
  delete modal.dataset.pickerQuery;
  modal._previewPlan = options.plan || null;
  modal._exerciseContext = null;
}

function closeModal() { modal.hidden = true; modal.innerHTML = ""; modal._previewPlan = null; modal._exerciseContext = null; delete modal.dataset.pickerDay; delete modal.dataset.pickerSwap; delete modal.dataset.pickerQuery; }

function openMissedDay() {
  const plan = getPlan(openPlanId);
  if (!plan) return;
  const count = Math.max(1, plan.days.length - 1);
  showModal("Adjust after a missed day", `<form id="recovery-form" data-plan="${escapeHTML(plan.id)}"><div class="field"><label>Which session did you miss?</label><select name="missed">${plan.days.map(day=>`<option value="${escapeHTML(day.id)}">${plan.calendarStart ? "" : escapeHTML(day.weekday || "Unscheduled") + " · "}${escapeHTML(day.name)}</option>`).join("")}</select></div><div class="field"><label>Sessions you can still do this week</label><select name="remaining">${Array.from({length:Math.max(1,plan.days.length-1)},(_,i)=>`<option value="${i+1}" ${i+1===count?"selected":""}>${i+1}</option>`).join("")}</select></div><p class="subtle">The recovery plan skips the missed session and keeps the remaining sessions in order.</p><div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Create recovery plan</button></div></form>`);
}

function openScheduleEditor() {
  const plan = getPlan(openPlanId);
  if (!plan) return;
  showModal("Edit workout schedule", `<form id="schedule-form" data-plan="${escapeHTML(plan.id)}">
    <div class="field"><label for="plan-schedule-type">Schedule</label><select id="plan-schedule-type" name="type">
      <option value="weekly">Fixed weekdays</option><option value="calendar" ${plan.calendarStart ? "selected" : ""}>Follow availability calendar</option>
    </select></div>
    <p id="calendar-schedule-note" class="subtle">Sessions cycle in order on available dates. Push reminders use fixed weekdays.</p>
    <fieldset id="fixed-workout-days" class="repeat-options field">
      <legend class="field-label">Choose exactly ${plan.days.length} weekdays</legend>
      ${checkedOptions(weekDays,plan.days.map(day=>day.weekday).filter(Boolean),"weekdays")}
    </fieldset>
    <div class="modal-actions"><button class="button soft" type="button" data-close>Cancel</button><button class="button primary">Save schedule</button></div>
  </form>`);
  updateScheduleEditor(document.querySelector("#schedule-form"));
}

function updateScheduleEditor(form) {
  const follows = form.elements.type.value === "calendar";
  const weekdays = form.querySelector("#fixed-workout-days");
  weekdays.hidden = follows;
  weekdays.disabled = follows;
  form.querySelector("#calendar-schedule-note").hidden = !follows;
}

function openExercisePicker(dayId, swapId = null, query = "") {
  showModal(swapId ? "Swap exercise" : "Add exercise", `<div class="field"><label for="picker-search">Search the exercise library</label><input id="picker-search" type="search" placeholder="Type a name, muscle, or equipment" value="${escapeHTML(query)}"></div><div class="card" id="picker-results">${pickerResults(query,dayId,swapId)}</div>`);
  modal.dataset.pickerDay = dayId;
  modal.dataset.pickerSwap = swapId || "";
  modal.dataset.pickerQuery = query;
}
function pickerResults(query,dayId,swapId) {
  const found=searchExercises(query).slice(0,70);
  return `<div class="picker-result-count">${found.length} ${found.length===1?"result":"results"}</div><p class="search-hint">${closestSearchMessage(query,found)}</p>${found.map(exerciseSearchRow).join("") || `<div class="empty">No close matches. Try fewer words or a muscle or equipment name.</div>`}`;
}

function chooseExerciseForPlan(exercise,dayId,swapId) {
  const day=getPlan(openPlanId)?.days.find(item=>item.id===dayId);
  if(!day||!exercise)return;
  if(swapId){
    const item=day.items.find(entry=>entry.id===swapId);
    if(item){item.exercise=exercise;item.reps=exercise.pattern==="conditioning"?20:item.reps;item.sets=exercise.pattern==="conditioning"?1:item.sets;}
  } else day.items.push({id:uid(),exercise,sets:exercise.pattern==="conditioning"?1:3,reps:exercise.pattern==="conditioning"?20:10});
  closeModal();saveAndRender("Workout updated.");
}

function exportBackup() {
  const file = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = "rep-atlas-backup.json"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("Backup saved. Keep the JSON file somewhere safe.");
}

function openBackupMenu() {
  const dark=data.theme==="dark";
  showModal("Settings and backup", `<section class="appearance-setting"><div class="row"><div><strong>Appearance</strong><div class="subtle" id="theme-mode-label">${dark?"Dark":"Light"} mode</div></div><div class="theme-control"><span id="theme-light-label" class="${dark?"":"is-active"}">Light</span><button id="theme-slider" class="theme-switch" type="button" role="switch" aria-label="Dark mode" aria-checked="${dark}" title="Toggle light and dark mode"><span class="theme-switch-thumb" aria-hidden="true"></span></button><span id="theme-dark-label" class="${dark?"is-active":""}">Dark</span></div></div></section><p class="subtle">Your plans and logs stay in this app on this phone. Export a backup before changing phones or clearing website data.</p><div class="stack"><button class="button primary" data-action="export-backup">Save backup file</button><button class="button soft" data-action="import-backup">Restore from a backup file</button></div>`);
}

document.addEventListener("click", event => {
  const button = event.target.closest("button,[data-open-plan]");
  if (!button) { if (event.target === modal) closeModal(); return; }
  if(button.dataset.viewExercise){
    const exercise=data.library.find(item=>item.id===button.dataset.viewExercise);
    const context=modal.dataset.pickerDay?{source:"picker",dayId:modal.dataset.pickerDay,swapId:modal.dataset.pickerSwap||null,query:modal.dataset.pickerQuery||""}:null;
    openExerciseProfile(exercise,context);
    return;
  }
  if(button.dataset.backExercisePicker){
    const context=modal._exerciseContext;
    if(context?.source==="picker")openExercisePicker(context.dayId,context.swapId,context.query);
    return;
  }
  if(button.dataset.useExercise){
    const context=modal._exerciseContext;
    if(context?.source==="picker")chooseExerciseForPlan(data.library.find(item=>item.id===button.dataset.useExercise),context.dayId,context.swapId);
    return;
  }
  if(button.id==="theme-slider"){
    data.theme=data.theme==="dark"?"light":"dark";
    const dark=data.theme==="dark";
    persist();applyTheme();
    const label=document.querySelector("#theme-mode-label");if(label)label.textContent=`${dark?"Dark":"Light"} mode`;
    button.setAttribute("aria-checked",String(dark));
    document.querySelector("#theme-light-label")?.classList.toggle("is-active",!dark);
    document.querySelector("#theme-dark-label")?.classList.toggle("is-active",dark);
    return;
  }
  if(button.dataset.calendarShift){calendarMonth.setMonth(calendarMonth.getMonth()+Number(button.dataset.calendarShift));render();return;}
  if(button.dataset.availabilityDate){
    const date = button.dataset.availabilityDate;
    const available = !isAvailable(date);
    data.availability = data.availability.filter(value => value !== date);
    data.unavailableDates = data.unavailableDates.filter(value => value !== date);
    if (available && !ruleIncludes(date)) data.availability = [...data.availability, date].sort();
    if (!available && ruleIncludes(date)) data.unavailableDates = [...data.unavailableDates, date].sort();
    saveAndRender(available ? "Day marked available." : "Day marked unavailable.");
    document.querySelector(`[data-availability-date="${date}"]`)?.focus({preventScroll:true});
    return;
  }
  if (button.dataset.action === "edit-availability") { openAvailabilityEditor(); return; }
  if (button.dataset.action === "remove-availability-rule") {
    setAvailabilityRule(null);
    closeModal();
    saveAndRender("Repeating schedule removed.");
    return;
  }
  if (button.dataset.action === "clear-availability") {
    const today = dateKey(new Date());
    data.availability = data.availability.filter(date => date < today);
    data.unavailableDates = data.unavailableDates.filter(date => date < today);
    saveAndRender("Individual date edits reset.");
    return;
  }
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
  if (button.dataset.action === "edit-preview") openBuilder(modal._builderDraft);
  if (button.dataset.action === "delete-plan" && openPlanId) { if (confirm("Delete this plan?")) { data.plans=data.plans.filter(plan=>plan.id!==openPlanId); openPlanId=null; saveAndRender("Plan deleted."); } }
  if (button.dataset.logDay) { const plan=getPlan(openPlanId); const day=plan?.days.find(item=>item.id===button.dataset.logDay); if(day) openWorkoutEditor(day); }
  if (button.dataset.addExercise) openExercisePicker(button.dataset.addExercise);
  if (button.dataset.swap) openExercisePicker(button.dataset.day,button.dataset.swap);
  if (button.dataset.editExercise) openExerciseEditor(data.library.find(item=>item.id===button.dataset.editExercise),modal._exerciseContext);
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
    chooseExerciseForPlan(data.library.find(item=>item.id===button.dataset.pickExercise),modal.dataset.pickerDay,modal.dataset.pickerSwap);
  }
});

document.addEventListener("input", event => {
  if(event.target.id==="library-search"){librarySearch=event.target.value;drawLibraryResults();}
  if(event.target.id==="picker-search"){const query=event.target.value;modal.dataset.pickerQuery=query;const day=modal.dataset.pickerDay;modal.querySelector("#picker-results").innerHTML=pickerResults(query,day,modal.dataset.pickerSwap);}
  if (["plan-start-date", "plan-follow-calendar"].includes(event.target.id)) updateBuilderSchedule(event.target.form);
  if (["availability-type", "availability-duration", "availability-start", "cycle-length"].includes(event.target.id)) updateAvailabilityEditor(event.target.form);
  if (event.target.id === "plan-schedule-type") updateScheduleEditor(event.target.form);
  if(event.target.dataset.logDone!==undefined) logDraft[Number(event.target.dataset.logDone)].done=event.target.checked;
  if(event.target.dataset.logAmount!==undefined) logDraft[Number(event.target.dataset.logAmount)].amount=Number(event.target.value)||0;  if(event.target.dataset.logWeight!==undefined||event.target.dataset.logWeightSlider!==undefined){const index=Number(event.target.dataset.logWeight??event.target.dataset.logWeightSlider),weight=Math.max(0,Number(event.target.value)||0),number=document.querySelector('[data-log-weight="'+index+'"]'),slider=document.querySelector('[data-log-weight-slider="'+index+'"]');logDraft[index].weight=weight;if(number&&number!==event.target)number.value=weight?String(weight):"";if(slider&&slider!==event.target){if(weight>Number(slider.max))slider.max=String(Math.ceil(weight/50)*50);slider.value=String(weight)}}
});

document.addEventListener("submit", event => {
  event.preventDefault();const form=event.target;const values=new FormData(form);
  if (form.id === "availability-form") {
    const type = values.get("type");
    const start = values.get("start");
    const end = values.get("duration") === "date" ? values.get("end") : null;
    const rule = {type, start, end};
    if (type === "weekly") {
      rule.weekdays = weekDays.filter(day => values.getAll("weekdays").includes(day));
    } else {
      const trainingDays = new Set(values.getAll("cycleDay"));
      rule.pattern = Array.from({length:Number(values.get("cycleLength"))}, (_, index) => trainingDays.has(String(index)));
    }
    if (!validAvailabilityRule(rule)) { toast("Choose at least one training day and a valid date range."); return; }
    setAvailabilityRule(rule);
    const visibleStart = rule.start > dateKey(new Date()) ? parseDateKey(rule.start) : new Date();
    calendarMonth = new Date(visibleStart.getFullYear(), visibleStart.getMonth(), 1);
    closeModal();
    saveAndRender("Repeating availability saved.");
    return;
  }
  if(form.id==="plan-form"){
    const draft = {
      goal: String(values.get("goal")).trim(), target: values.get("target"), split: values.get("split"),
      variation: Number(values.get("variation")), startDate: values.get("startDate"), gear: values.getAll("gear"),
      includeCardio: values.has("includeCardio"), followsCalendar: values.has("followsCalendar")
    };
    const scheduledDates = builderDates(draft.startDate, draft.followsCalendar);
    if (!scheduledDates.length) { toast("Choose a start date with available training days."); return; }
    const {goal, split, includeCardio, variation} = draft;
    const target = draft.target === "auto" ? targetFor(goal) : draft.target;
    const gear = new Set(draft.gear);
    if (!gear.size && split !== "Cardio") { toast("Choose at least one option for the strength exercises."); return; }
    if (split === "Cardio" || includeCardio || target === "Improve endurance") {
      gear.add("bodyweight");
      gear.add("cardio");
    }
    const weekdays = scheduledDates.map(weekdayForDate);
    const plan = makePlan({goal, target, split, count:weekdays.length, variation, gear:[...gear], focus:focusFor(goal), weekdays, scheduledDates, includeCardio});
    if (draft.followsCalendar) plan.calendarStart = draft.startDate;
    previewPlan(plan, draft);
  }
  if(form.id==="recovery-form"){
    const plan=getPlan(values.get("plan")||form.dataset.plan);const missedIndex=plan?.days.findIndex(day=>day.id===values.get("missed"));
    if(!plan||missedIndex<0)return;
    const gear=[...new Set(plan.days.flatMap(day=>day.items.map(item=>item.exercise.gear)))];
    const remaining=Number(values.get("remaining"));const orderedDays=[...plan.days.slice(missedIndex+1),...plan.days.slice(0,missedIndex)];const recoveryWeekdays=orderedDays.length>=remaining?orderedDays.slice(0,remaining).map(day=>day.weekday):defaultWeeklyDays(remaining);
    const recovery=makePlan({goal:`Back on track · ${plan.goal}`,target:plan.target,split:plan.split,count:remaining,variation:1,gear:gear.length?gear:["bodyweight"],focus:plan.focus,weekdays:recoveryWeekdays,includeCardio:plan.includeCardio,startIndex:missedIndex+1});
    if (plan.calendarStart) {
      const today = dateKey(new Date());
      recovery.calendarStart = plan.calendarStart > today ? plan.calendarStart : today;
    }
    data.plans.unshift(recovery);closeModal();openPlanId=recovery.id;saveAndRender("Recovery schedule saved.");
  }
  if(form.id==="schedule-form"){
    const plan=getPlan(values.get("plan")||form.dataset.plan);if(!plan)return;
    if (values.get("type") === "calendar") {
      plan.calendarStart ||= dateKey(new Date());
      closeModal();
      saveAndRender("Plan now follows your calendar.");
      return;
    }
    const selected=new Set(values.getAll("weekdays"));
    if(selected.size!==plan.days.length){toast(`Choose exactly ${plan.days.length} days for this plan.`);return;}
    const ordered=weekDays.filter(day=>selected.has(day));plan.days.forEach((day,index)=>{day.weekday=ordered[index];day.scheduledDate=null;});
    delete plan.calendarStart;
    delete plan.calendarOffset;
    closeModal();saveAndRender("Weekly schedule updated.");
  }
  if(form.id==="exercise-form"){
    const id=form.dataset.id||uid();const primaryMuscles=values.getAll("primaryMuscles"),secondaryMuscles=values.getAll("secondaryMuscles"),targetMuscles=[...new Set([...primaryMuscles,...secondaryMuscles])];
    const exercise=withExerciseDetails({id,name:String(values.get("name")).trim(),pattern:values.get("pattern"),gear:values.get("gear"),muscles:targetMuscles,primaryMuscles,secondaryMuscles,description:String(values.get("description")||"").trim(),specificEquipment:String(values.get("specificEquipment")||"").trim(),instructions:String(values.get("instructions")||"").split(/\r?\n/).map(step=>step.trim()).filter(Boolean)});
    if(!exercise.muscles.length){toast("Select at least one muscle group.");return;}
    const index=data.library.findIndex(item=>item.id===id);if(index>=0)data.library[index]=exercise;else data.library.push(exercise);
    data.plans.forEach(plan=>plan.days.forEach(day=>day.items.forEach(item=>{if(item.exercise.id===id)item.exercise=exercise;})));
    const context=modal._exerciseContext;
    if(context?.source==="picker"){persist();openExerciseProfile(exercise,context);return;}
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
