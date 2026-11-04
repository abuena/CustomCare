/* ============================================================
   Custom Care – Client Dashboard
   ============================================================ */

/* ---------- Sample data ---------- */
const CAL_YEAR = 2020;   // June 1 falls on a Monday, matching the mockup
const SERVICES = {
  "Family caregivers": [
    { key: "kids", label: "Kids" },
    { key: "errands", label: "Errands" },
    { key: "housekeeping", label: "Housekeeping" },
    { key: "cooking", label: "Cooking" }
  ],
  "Elderly Care": [
    { key: "bathing", label: "Bathing" },
    { key: "dressing", label: "Dressing" },
    { key: "medication", label: "Help with medication" }
  ]
};
const ALL_KEYS = Object.values(SERVICES).flat().map(s => s.key);

// days: weekday numbers the caregiver works (0 = Sun ... 6 = Sat)
const caregivers = [
  { id: 1,  name: "Leo Santos",     days: [3,4,5,6,0], skills: ["kids","errands","housekeeping","bathing","dressing"] },
  { id: 2,  name: "Judy Matias",    days: [1,2,3,4,5], skills: ["kids","errands","housekeeping","bathing","dressing","cooking"] },
  { id: 3,  name: "Paolo Santos",   days: [2,3,4,5,6], skills: ["kids","errands","housekeeping","bathing","dressing","medication"] },
  { id: 4,  name: "Joselita Ramos", days: [1],         skills: ["kids","cooking","housekeeping"] },
  { id: 5,  name: "Juby Cruz",      days: [1],         skills: ["errands","cooking","medication"] },
  { id: 6,  name: "Elaine Reyes",   days: [1],         skills: ["bathing","dressing","medication"] },
  { id: 7,  name: "Rose Dizon",     days: [2,5,6,0],   skills: ["kids","errands","cooking"] },
  { id: 8,  name: "Ruby Tan",       days: [2,5,6,0],   skills: ["housekeeping","cooking","bathing"] },
  { id: 9,  name: "Jane Lim",       days: [3,4],       skills: ["kids","dressing","medication"] },
  { id: 10, name: "Ann Garcia",     days: [3,4],       skills: ["errands","bathing","dressing"] },
  { id: 11, name: "Joel Lalus",     days: [1,3,5],     skills: ["errands","housekeeping"] },
  { id: 12, name: "Andre Mata",     days: [2,4],       skills: ["kids","bathing"] },
  { id: 13, name: "Bullet Bada",    days: [1,3,6],     skills: ["errands","dressing"] }
];
const byName = n => caregivers.find(c => c.name === n);

const appointments = {
  scheduled: [
    { date: "June 24, 2019", shift: "AM Only", caregiver: "Joselita Ramos" }
  ],
  previous: [
    { date: "January 16, 2019", shift: "AM Only", caregiver: "Joel Lalus" },
    { date: "February 1, 2019", shift: "AM Only", caregiver: "Andre Mata" },
    { date: "March 6, 2019",    shift: "AM Only", caregiver: "Bullet Bada" }
  ]
};
const postedJobs = [];

/* ---------- Helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tues","Wed","Thurs","Fri","Sat"];

// Availability of a caregiver on a date: 'am' | 'pm' | 'full' | 'busy'
function availability(cg, date) {
  if (!cg.days.includes(date.getDay())) return "busy";
  return ["am", "pm", "full"][(date.getDate() + cg.id) % 3];
}
const shiftLabel = s => ({ am: "AM Only", pm: "PM Only", full: "Full Day" }[s]);
const fmtDate = d => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/* Yes/No switch markup + behaviour */
function toggleHTML(key, on, disabled = false) {
  return `<button type="button" class="toggle ${on ? "on" : "off"}" data-key="${key}" ${disabled ? "disabled" : ""} aria-pressed="${on}">
            <span class="text">${on ? "Yes" : "No"}</span><span class="knob"></span></button>`;
}
function servicesBoxHTML(state, disabled = false) {
  let html = `<div class="services-box">`;
  Object.entries(SERVICES).forEach(([group, items], i) => {
    if (i) html += `<div class="group-gap"></div>`;
    html += `<h4>${group}</h4>`;
    items.forEach(s => {
      html += `<div class="svc-row"><label>${s.label}</label>${toggleHTML(s.key, !!state[s.key], disabled)}</div>`;
    });
  });
  return html + `</div>`;
}
function bindToggles(root, state) {
  $$(".toggle:not([disabled])", root).forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.key;
      state[k] = !state[k];
      btn.classList.toggle("on", state[k]);
      btn.classList.toggle("off", !state[k]);
      btn.setAttribute("aria-pressed", state[k]);
      $(".text", btn).textContent = state[k] ? "Yes" : "No";
    });
  });
}

/* ---------- Tabs ---------- */
function showView(name) {
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  $$(".view").forEach(v => v.hidden = v.id !== `view-${name}`);
  ({ scheduled: renderScheduled, search: renderSearch, hire: renderHire, previous: renderPrevious })[name]();
}
$$(".tab").forEach(t => t.addEventListener("click", () => {
  if (t.dataset.view === "search" && search.stage === "profile") search.stage = "criteria";
  showView(t.dataset.view);
}));

/* ---------- Appointments (scheduled / previous) ---------- */
function apptCards(list, emptyMsg) {
  if (!list.length) return `<p class="empty">${emptyMsg}</p>`;
  return list.map(a => `
    <div class="appt-card">
      <strong>Date:</strong> ${esc(a.date)}<br>
      <strong>Shift:</strong> ${esc(a.shift)}<br>
      <strong>Caregiver:</strong> <button class="link" data-cg="${esc(a.caregiver)}">${esc(a.caregiver)}</button>
    </div>`).join("");
}
function bindCaregiverLinks(root) {
  $$("[data-cg]", root).forEach(b => b.addEventListener("click", () => {
    const cg = byName(b.dataset.cg);
    if (cg) openProfile(cg.id, "scheduled");
  }));
}
function renderScheduled() {
  const el = $("#view-scheduled");
  el.innerHTML = `<h2>My Scheduled Appointments</h2>` + apptCards(appointments.scheduled, "No upcoming appointments.");
  bindCaregiverLinks(el);
}
function renderPrevious() {
  const el = $("#view-previous");
  el.innerHTML = `<h2>Previous Appointments</h2>` + apptCards(appointments.previous, "No previous appointments.");
  bindCaregiverLinks(el);
}

/* ---------- Search Temp Caregiver ---------- */
const search = {
  mode: "service",         // 'service' | 'shift'
  stage: "criteria",       // 'criteria' | 'results' | 'profile'
  criteria: Object.fromEntries(ALL_KEYS.map(k => [k, !["cooking","medication"].includes(k)])),
  weekOffset: 0,
  profileId: null,
  profileTab: "shifts",
  profileOrigin: "search",
  calMonth: 5,             // June (0-based)
  selected: null
};

function renderSearch() {
  const el = $("#view-search");
  if (search.stage === "profile") return renderProfile(el);

  let html = `<div class="subnav">
      <button class="${search.mode === "service" ? "active" : ""}" data-mode="service">By Service</button>
      <button class="${search.mode === "shift" ? "active" : ""}" data-mode="shift">By Shift</button>
    </div>`;

  if (search.mode === "shift") html += shiftCalendarHTML();
  else if (search.stage === "results") html += resultsHTML();
  else html += servicesBoxHTML(search.criteria) + `<div class="btn-row"><button class="btn primary" id="do-search">Search caregivers</button></div>`;

  el.innerHTML = html;

  $$(".subnav button", el).forEach(b => b.addEventListener("click", () => {
    search.mode = b.dataset.mode;
    search.stage = "criteria";
    renderSearch();
  }));

  if (search.mode === "shift") bindShiftCalendar(el);
  else if (search.stage === "results") {
    $$("[data-id]", el).forEach(b => b.addEventListener("click", () => openProfile(+b.dataset.id, "results")));
    $("#back-criteria").addEventListener("click", () => { search.stage = "criteria"; renderSearch(); });
  } else {
    bindToggles(el, search.criteria);
    $("#do-search").addEventListener("click", () => { search.stage = "results"; renderSearch(); });
  }
}

/* By Service → results */
function matchScore(cg) {
  const wanted = ALL_KEYS.filter(k => search.criteria[k]);
  if (!wanted.length) return 100;
  return Math.round(wanted.filter(k => cg.skills.includes(k)).length / wanted.length * 100);
}
function resultsHTML() {
  const rows = caregivers
    .map(cg => ({ cg, score: matchScore(cg) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.cg.name.localeCompare(b.cg.name))
    .slice(0, 8);
  return `<div class="results-title">Search Results</div>` +
    (rows.length ? rows.map(r => `
      <div class="result-row">
        <button class="link" data-id="${r.cg.id}">${esc(r.cg.name)}</button>
        <div class="match-bar" title="${r.score}%"><span style="width:${r.score}%"></span></div>
        <span>${r.score}% match</span>
      </div>`).join("") : `<p class="empty">No caregivers match your criteria.</p>`) +
    `<div class="btn-row"><button class="btn back" id="back-criteria">← Change criteria</button></div>`;
}

/* By Shift → two-week calendar */
function weekStart() {
  const d = new Date(CAL_YEAR, 5, 1);               // Mon June 1
  d.setDate(d.getDate() + search.weekOffset * 14);
  return d;
}
function shiftCalendarHTML() {
  const start = weekStart();
  let cells = "";
  for (let i = 0; i < 14; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const avail = caregivers.filter(c => availability(c, d) !== "busy");
    const first = avail.slice(0, 3).map(c => `<li>${esc(c.name.split(" ")[0])}</li>`).join("");
    cells += `<div class="shift-cell">
        <div class="date">${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${DOW[d.getDay()]}</div>
        <ul>${first}</ul>
        ${avail.length > 3 ? `<button class="more" data-date="${d.toISOString()}">See more</button>` : ""}
      </div>`;
  }
  return `<div class="shift-wrap">
      <button class="arrow-btn prev" id="wk-prev" ${search.weekOffset === 0 ? "disabled" : ""} aria-label="Previous"></button>
      <div class="shift-grid">${cells}</div>
      <button class="arrow-btn" id="wk-next" aria-label="Next"></button>
    </div>`;
}
function bindShiftCalendar(el) {
  $("#wk-prev").addEventListener("click", () => { search.weekOffset = Math.max(0, search.weekOffset - 1); renderSearch(); });
  $("#wk-next").addEventListener("click", () => { search.weekOffset++; renderSearch(); });
  $$(".more", el).forEach(b => b.addEventListener("click", () => showDayDialog(new Date(b.dataset.date))));
}
function showDayDialog(d) {
  $("#day-dialog-title").textContent = `Available on ${DOW[d.getDay()]}, ${fmtDate(d)}`;
  $("#day-dialog-list").innerHTML = caregivers
    .filter(c => availability(c, d) !== "busy")
    .map(c => `<li><button class="link" data-id="${c.id}">${esc(c.name)}</button> – ${shiftLabel(availability(c, d))}</li>`).join("");
  $$("#day-dialog-list [data-id]").forEach(b => b.addEventListener("click", () => {
    $("#day-dialog").close();
    openProfile(+b.dataset.id, "search");
  }));
  $("#day-dialog").showModal();
}
$("#day-dialog-close").addEventListener("click", () => $("#day-dialog").close());

/* ---------- Caregiver profile ---------- */
function openProfile(id, origin) {
  search.profileId = id;
  search.profileOrigin = origin;
  search.profileTab = "shifts";
  search.selected = null;
  search.stage = "profile";
  showView("search");
}

function monthHTML(year, month, cg) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  let cells = DOW.map(d => `<div class="dow">${d[0]}</div>`).join("");
  cells += `<div></div>`.repeat(first.getDay());
  for (let n = 1; n <= days; n++) {
    const date = new Date(year, month, n);
    const st = availability(cg, date);
    cells += `<button class="day ${st}" data-date="${date.toISOString()}" ${st === "busy" ? "disabled" : ""}
                title="${st === "busy" ? "Booked or busy" : shiftLabel(st)}">${n}</button>`;
  }
  return `<div class="month"><div class="month-name">${MONTHS[month]}</div><div class="cal">${cells}</div></div>`;
}

function renderProfile(el) {
  const cg = caregivers.find(c => c.id === search.profileId);
  const state = Object.fromEntries(ALL_KEYS.map(k => [k, cg.skills.includes(k)]));
  const initials = cg.name.split(" ").map(w => w[0]).join("");
  const m = search.calMonth;

  const shiftsHTML = `
    <h3>Available shifts</h3>
    <div class="cal-wrap">
      <button class="arrow-btn prev" id="cal-prev" ${m <= 5 ? "disabled" : ""} aria-label="Earlier months"></button>
      <div class="months">${monthHTML(CAL_YEAR, m, cg)}${monthHTML(CAL_YEAR, m + 1, cg)}</div>
      <button class="arrow-btn" id="cal-next" ${m >= 10 ? "disabled" : ""} aria-label="Later months"></button>
    </div>
    <div class="legend">
      <div><i style="background:var(--am)"></i>AM Free</div>
      <div><i style="background:var(--pm)"></i>PM Free</div>
      <div><i style="background:var(--full)"></i>Whole day Free</div>
      <div><i style="background:#1b2733"></i>Booked or Busy</div>
    </div>
    <p class="empty">Click an available day to book ${esc(cg.name.split(" ")[0])}.</p>`;

  el.innerHTML = `
    <button class="btn back" id="back-btn">← Back</button>
    <div class="profile">
      <div class="profile-side">
        <h2>${esc(cg.name)}</h2>
        <div class="avatar" aria-hidden="true">${esc(initials)}</div>
      </div>
      <div class="profile-main">
        <div class="profile-tabs">
          <button data-ptab="shifts" class="${search.profileTab === "shifts" ? "active" : ""}">Available shifts</button>
          <button data-ptab="services" class="${search.profileTab === "services" ? "active" : ""}">Services</button>
        </div>
        ${search.profileTab === "services" ? `<h3>Services</h3>${servicesBoxHTML(state, true)}` : shiftsHTML}
      </div>
    </div>`;

  $("#back-btn").addEventListener("click", () => {
    if (search.profileOrigin === "scheduled") { showView("scheduled"); return; }
    search.stage = search.profileOrigin === "results" ? "results" : "criteria";
    renderSearch();
  });
  $$("[data-ptab]", el).forEach(b => b.addEventListener("click", () => { search.profileTab = b.dataset.ptab; renderSearch(); }));

  if (search.profileTab === "shifts") {
    $("#cal-prev").addEventListener("click", () => { search.calMonth = Math.max(5, m - 1); renderSearch(); });
    $("#cal-next").addEventListener("click", () => { search.calMonth = Math.min(10, m + 1); renderSearch(); });
    $$(".day:not([disabled])", el).forEach(b => b.addEventListener("click", () => {
      const date = new Date(b.dataset.date);
      const st = availability(cg, date);
      if (confirm(`Book ${cg.name} on ${fmtDate(date)} (${shiftLabel(st)})?`)) {
        appointments.scheduled.push({ date: fmtDate(date), shift: shiftLabel(st), caregiver: cg.name });
        search.stage = "criteria";
        showView("scheduled");
      }
    }));
  }
}

/* ---------- Hire Care giver (Post a Job) ---------- */
const jobServices = Object.fromEntries(ALL_KEYS.map(k => [k, !["cooking","medication"].includes(k)]));

function renderHire() {
  const el = $("#view-hire");
  const jobsList = postedJobs.length
    ? `<div class="posted-jobs"><strong>Your posted jobs</strong><ul>${postedJobs.map(j =>
        `<li>${esc(j.title)} – ${esc(j.city)} ${esc(j.postal)}</li>`).join("")}</ul></div>` : "";

  el.innerHTML = `
    <h2>Post a Job</h2>
    <form class="job-form" id="job-form" novalidate>
      <div class="field"><label for="j-title">Job Title</label><input id="j-title" required></div>
      <div class="field"><label for="j-city">City</label><input id="j-city" required></div>
      <div class="field"><label for="j-postal">Postal Code</label>
        <input id="j-postal" required pattern="[A-Za-z]\\d[A-Za-z] ?\\d[A-Za-z]\\d" placeholder="A1A 1A1"></div>
      <div class="field"><label for="j-desc">Description</label><textarea id="j-desc"></textarea></div>
      <div class="svc-label"><strong>Services</strong></div>
      ${servicesBoxHTML(jobServices)}
      <div id="job-msg"></div>
      <div class="btn-row"><button class="btn primary" type="submit">Post job ▶</button></div>
    </form>
    ${jobsList}`;

  bindToggles(el, jobServices);

  $("#job-form").addEventListener("submit", e => {
    e.preventDefault();
    const title = $("#j-title").value.trim();
    const city = $("#j-city").value.trim();
    const postal = $("#j-postal").value.trim().toUpperCase();
    const msg = $("#job-msg");
    if (!title || !city || !postal || !$("#j-postal").checkValidity()) {
      msg.innerHTML = `<div class="notice" style="background:#fde9e7;border-color:#b42318;color:#7a1810">Please enter a job title, city and a valid postal code (e.g. M5V 2T6).</div>`;
      return;
    }
    postedJobs.push({ title, city, postal, desc: $("#j-desc").value.trim(), services: { ...jobServices } });
    renderHire();
    $("#job-msg").innerHTML = `<div class="notice">Your job “${esc(title)}” has been posted.</div>`;
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => showView("scheduled"));