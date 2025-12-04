/* main.js — clean, final version (with retire calculation added) */

/*
  Final notes:
  - LOAD (when input empty) restores the exact initial state (option A chosen).
  - initialSkillsBackup stores the original skills defined at top.
  - TOTAL SKILL (updateTotals) sums only base values (or max when maxMode active) — it does NOT include heart/morale/gear.
*/

let skills = [
  { name: "Aim", value: 92, max: 94 },
  { name: "Handling", value: 90, max: 91 },
  { name: "Quickness", value: 73, max: 93 },
  { name: "Determination", value: 93, max: 93 },
  { name: "Awareness", value: 60, max: 94 },
  { name: "Teamplay", value: 15, max: 95 },
  { name: "Gamesense", value: 10, max: 95 },
  { name: "Movement", value: 56, max: 94 }
];

// backup of the initial skills to allow LOAD (empty) to fully restore initial state
const initialSkillsBackup = JSON.parse(JSON.stringify(skills));

const skillsList = document.getElementById("skills-list");
const totalCurrent = document.getElementById("total-skill-current");
const totalMax = document.getElementById("total-skill-max");

const heartBtn = document.querySelector(".heart-grey-btn");
const moraleBtn = document.querySelector(".morale-btn");
const maxBtn = document.querySelector(".max-btn");
const loadBtn = document.getElementById("load-button");

const START_DATE = new Date(2025, 3, 28);
const SEASON_LENGTH = 35;

let heartState = 0;
let moraleState = 0;
let maxMode = false;

const heartBoosts = { 0: 0, 1: 1, 2: 3, 3: 5, 4: 8 };
const moraleBoosts = { 0: 0, 1: 1, 2: 2, 3: 3 };

const equipped = { mousepad: null, mouse: null, keyboard: null, headset: null };
let equipmentBoosts = {};

/* ---------------- DATE & CLOCK ---------------- */
function calculateGameDate() {
  const now = new Date();
  const diffMs = now - START_DATE;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0) return { season: 1, day: 1 };
  return {
    season: Math.floor(diffDays / SEASON_LENGTH) + 1,
    day: (diffDays % SEASON_LENGTH) + 1
  };
}
function updateGameDay() {
  const gd = calculateGameDate();
  const el = document.getElementById("game-day");
  if (el) el.textContent = `S${gd.season} - ${gd.day}/${SEASON_LENGTH}`;

  updateRetireDisplayIfNeeded();
  computeMaxCareerHeart();
}

function updateClock() {
  const now = new Date();
  const el = document.getElementById("real-clock");
  if (el) el.textContent = now.toTimeString().slice(0, 8);
}
updateClock(); updateGameDay();
setInterval(updateClock, 1000);
setInterval(updateGameDay, 60000);

/* ---------------- CALCS ---------------- */
function computeSkillValues(s) {
  const equipBoost = equipmentBoosts[s.name] || 0;
  const base = maxMode ? s.max : s.value;
  const pct = (heartBoosts[heartState] + moraleBoosts[moraleState]) / 100;
  const pctBoost = base * pct;
  const afterPercent = base + pctBoost;
  const final = afterPercent + equipBoost;
  return { base, equipBoost, pctBoost, afterPercent, final };
}

/**
 * updateTotals
 * - totalCurrent shows the sum of base values (or max values when maxMode)
 * - intentionally does NOT include heart/morale/gear (per requirement)
 * - totalMax shows sum of all skill maximums
 */
function updateTotals() {
    let totalCurrentValue = 0;
    let totalMaxValue = 0;

    skills.forEach(s => {
        totalCurrentValue += maxMode ? s.max : s.value;
        totalMaxValue += s.max;
    });

    if (totalCurrent) totalCurrent.textContent = totalCurrentValue;
    if (totalMax) totalMax.textContent = "/" + totalMaxValue;
}

/* ---------------- PARSER ---------------- */
function parseCardText(txt) {
  const lines = txt.split("\n").map(l => l.trim()).filter(Boolean);
  const skillNames = ["Aim", "Handling", "Quickness", "Determination", "Awareness", "Teamplay", "Gamesense", "Movement"];
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    if (skillNames.includes(lines[i])) {
      parsed.push({
        name: lines[i],
        value: parseInt(lines[i + 1], 10) || 0,
        max: parseInt(lines[i + 2] ? lines[i + 2].replace("/", "") : "0", 10) || 0
      });
    }
  }
  return {
    playerName: lines[0] || "Unknown",
    playerAge: lines.find(l => /yo/.test(l)) || "",
    skills: parsed
  };
}

/* ---------------- PLAYER AGE PARSING & RETIRE CALC ---------------- */
function parseAgeString(ageStr) {
  if (!ageStr || typeof ageStr !== "string") return { age: null, birthdayDay: null };
  const ageMatch = ageStr.match(/(\d+)\s*yo/);
  const bdayMatch = ageStr.match(/day\s*(\d+)/i);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : null;
  const birthdayDay = bdayMatch ? parseInt(bdayMatch[1], 10) : null;
  return { age, birthdayDay };
}

function computeRetireSeasonFrom(age, birthdayDay) {
  const gd = calculateGameDate();
  const currentSeason = gd.season;
  const currentDay = gd.day;

  if (age === null) {
    return { remainingSeasons: null, finalSeason: null, reason: "unknown age" };
  }

  if (age >= 40) {
    return { remainingSeasons: 0, finalSeason: currentSeason, reason: "already 40+" };
  }

  let remaining = 40 - age;
  if (birthdayDay !== null && typeof birthdayDay === "number") {
    if (birthdayDay > currentDay) {
      remaining = remaining - 1;
    }
  }

  if (remaining < 0) remaining = 0;
  const finalSeason = currentSeason + remaining;
  return { remainingSeasons: remaining, finalSeason, reason: "ok" };
}

function updateRetireElement(ageStr) {
  const retireEl = document.getElementById("retire-at");
  if (!retireEl) return;

  const { age, birthdayDay } = parseAgeString(ageStr);
  const r = computeRetireSeasonFrom(age, birthdayDay);
  if (r.remainingSeasons === null) {
    retireEl.textContent = "—";
    return;
  }
  retireEl.textContent = `S${r.finalSeason}`;
}

function updateRetireDisplayIfNeeded() {
  const ageEl = document.querySelector(".player-age");
  if (!ageEl) return;
  updateRetireElement(ageEl.textContent || "");
}

/* ---------------- RENDER SKILLS ---------------- */
function renderSkills() {
  if (!skillsList) return;
  skillsList.innerHTML = "";

  skills.forEach(s => {
    const v = computeSkillValues(s);

    const baseVal = v.base;
    const afterPctVal = v.afterPercent;
    const finalVal = v.final;

    const baseW = Math.min(baseVal, 100);
    const pctW = Math.max(0, Math.min(afterPctVal, 100) - baseW);
    const gearW = Math.max(0, Math.min(finalVal, 100) - (baseW + pctW));
    const totalW = baseW + pctW + gearW;

    const row = document.createElement("div");
    row.className = "skill-row";

    const name = document.createElement("div");
    name.className = "skill-name";
    name.textContent = s.name;
    name.style.color = finalVal >= 100 ? "#f7f8c9" : "#ffffff";

    const bar = document.createElement("div");
    bar.className = "skill-bar";

    const limit = document.createElement("div");
    limit.className = "skill-limit";
    limit.style.width = s.max + "%";
    bar.appendChild(limit);

    const baseF = document.createElement("div");
    baseF.className = "skill-fill";
    baseF.style.width = baseW + "%";
    baseF.style.left = "0";
    baseF.style.zIndex = 2;
    baseF.style.backgroundColor = finalVal >= 100 ? "#f7f8c9" : "#ff7a00";
    if (finalVal >= 100) baseF.style.boxShadow = "0 0 10px rgba(238,223,192,0.75)";
    bar.appendChild(baseF);

    let pctF = null;
    if (pctW > 0) {
      pctF = document.createElement("div");
      pctF.className = "skill-fill-boost";
      pctF.style.left = baseW + "%";
      pctF.style.width = pctW + "%";
      pctF.style.zIndex = 3;
      pctF.style.backgroundColor = "#f5be9e";
      pctF.style.borderRadius = "0";
      bar.appendChild(pctF);
    }

    let gearF = null;
    if (gearW > 0) {
      gearF = document.createElement("div");
      gearF.className = "skill-fill-boost";
      gearF.style.left = (baseW + pctW) + "%";
      gearF.style.width = gearW + "%";
      gearF.style.zIndex = 3;
      gearF.style.backgroundColor = "#f5be9e";
      gearF.style.borderRadius = "0";
      bar.appendChild(gearF);
    }

    baseF.style.borderRadius = "999px 0 0 999px";
    if (pctF) pctF.style.borderRadius = "0";
    if (gearF) gearF.style.borderRadius = "0";

    if (Math.abs(totalW - 100) < 1e-6 || totalW > 99.9999) {
      if (gearF) gearF.style.borderRadius = "0 999px 999px 0";
      else if (pctF) pctF.style.borderRadius = "0 999px 999px 0";
      else { baseF.style.borderRadius = "999px"; baseF.style.width = "100%"; }
    }

    const val = document.createElement("div");
    val.className = "skill-value";

    const cur = document.createElement("span");
    cur.className = "skill-current";
    // show the base number visually (same as before)
    cur.textContent = maxMode ? s.max : Math.round(v.base);
    if (v.final >= 100) cur.style.color = "#ee6b0e";

    const mx = document.createElement("span");
    mx.className = "skill-max";
    mx.textContent = "/" + s.max;

    val.appendChild(cur);
    val.appendChild(mx);

    row.appendChild(name);
    row.appendChild(bar);
    row.appendChild(val);

    row.addEventListener("mousemove", e => showTooltipForSkill(s, e));
    row.addEventListener("mouseleave", hideTooltip);

    skillsList.appendChild(row);
  });

  updateTotals();
}

/* ---------------- TOOLTIP ---------------- */
const tooltip = document.getElementById("skill-tooltip");
function showTooltipForSkill(s, e) {
  const v = computeSkillValues(s);
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("tooltip-skill-name", s.name);
  set("tooltip-base", Math.round(v.base));
  set("tooltip-limit", s.max);
  set("tooltip-boost", v.pctBoost.toFixed(2));
  set("tooltip-total", v.final.toFixed(2));
  set("tooltip-heart", "+" + heartBoosts[heartState] + "%");
  set("tooltip-morale", "+" + moraleBoosts[moraleState] + "%");
  set("tooltip-gear", "+" + (v.equipBoost || 0));

  if (!tooltip) return;
  tooltip.style.left = e.pageX + 15 + "px";
  tooltip.style.top = e.pageY + 15 + "px";
  tooltip.classList.add("visible");
  tooltip.classList.remove("hidden");
}
function hideTooltip() {
  if (!tooltip) return;
  tooltip.classList.remove("visible");
  tooltip.classList.add("hidden");
}

/* ---------------- LOAD ---------------- */
if (loadBtn) {
  loadBtn.addEventListener("click", () => {

    // FULL RESET — igual ao RUBBER (limpa estado UI e valores temporários)
    heartState = 0;
    moraleState = 0;
    maxMode = false;

    if (heartBtn)  heartBtn.className = "action-btn heart-grey-btn";
    if (moraleBtn) moraleBtn.className = "action-btn morale-btn";
    if (maxBtn)    maxBtn.classList.remove("max-active");

    // RESET GEAR
    Object.keys(equipped).forEach(k => equipped[k] = null);
    recomputeEquipmentBoosts();
    renderAllEquipmentUI();
    updateGearButtonState();

    // RESET POPUPS
    gearLocked = false;
    if (lockBtn) lockBtn.textContent = "🔓";
    if (gearPopup) gearPopup.classList.add("hidden");

    gameLocked = false;
    const gameLockBtn = document.getElementById("game-lock-btn");
    if (gameLockBtn) gameLockBtn.textContent = "🔓";
    if (gamePopup) gamePopup.classList.add("hidden");

    // RESET GAMES
    const gameInput = document.getElementById("game-input");
    const gamesPlayedEl = document.getElementById("games-played");

    if (gameInput) gameInput.value = "";
    if (gamesPlayedEl) gamesPlayedEl.textContent = "0";

    // RESET HEART SEASONS
    const small = document.querySelector(".season-small");
    const big   = document.querySelector(".season-big");
    const gold  = document.querySelector(".season-gold");
    const plat  = document.querySelector(".season-plat");

    if (small) { small.textContent = "S9";  small.style.color = ""; }
    if (big)   { big.textContent   = "S11"; big.style.color   = ""; }
    if (gold)  { gold.textContent  = "S15"; gold.style.color  = ""; }
    if (plat)  { plat.textContent  = "S23"; plat.style.color  = ""; }

    // RESET LOYAL
    const gameImgBtn = document.getElementById("game-img-btn");
    const loyalStatusEl = document.getElementById("loyal-status");

    if (gameImgBtn)   gameImgBtn.classList.remove("active");
    if (loyalStatusEl) loyalStatusEl.textContent = "NO";

    updateGamesButtonState();


    // CHECK IF LOAD INPUT IS EMPTY -> RESTORE INITIAL STATE (option A)
    const loadText = document.getElementById("skill-input").value.trim();
    if (loadText.length === 0) {

        // restore name + age defaults (initial view)
        const nameEl = document.querySelector(".player-name");
        const ageEl = document.querySelector(".player-age");
        if (nameEl) nameEl.textContent = "Legend";
        if (ageEl) ageEl.textContent  = "19yo (day 5)";

        // restore skills to the initial backup (deep copy)
        skills = JSON.parse(JSON.stringify(initialSkillsBackup));

        // recompute and refresh UI
        recomputeEquipmentBoosts();
        renderAllEquipmentUI();
        updateGearButtonState();
        renderSkills();
        computeMaxCareerHeart();
        updateGamesButtonState();
        updateRetireDisplayIfNeeded();
        return; // done
    }


    // NORMAL LOAD (text present)
    const data = parseCardText(loadText);

    const nameEl = document.querySelector(".player-name");
    const ageEl = document.querySelector(".player-age");

    if (nameEl) nameEl.textContent = data.playerName;
    if (ageEl)  ageEl.textContent  = data.playerAge;

    if (data.skills.length) {
      // if parsed skills are present, replace skills
      skills = data.skills;
    }

    // ensure UI and calculations updated
    recomputeEquipmentBoosts();
    renderAllEquipmentUI();
    updateGearButtonState();
    updateRetireDisplayIfNeeded();
    computeMaxCareerHeart();
    renderSkills();
  });
}

/* ---------------- HEART / MORALE / MAX ---------------- */
if (heartBtn) {
  heartBtn.addEventListener("click", () => {
    heartState = (heartState + 1) % 5;
    heartBtn.className = "action-btn heart-grey-btn";
    if (heartState > 0) heartBtn.classList.add(`heart-active-${heartState}`);
    renderSkills();
  });
}
if (moraleBtn) {
  moraleBtn.addEventListener("click", () => {
    moraleState = (moraleState + 1) % 4;
    moraleBtn.className = "action-btn morale-btn";
    if (moraleState > 0) moraleBtn.classList.add(`morale-active-${moraleState}`);
    renderSkills();
  });
}
if (maxBtn) {
  maxBtn.addEventListener("click", () => {
    maxMode = !maxMode;
    maxBtn.classList.toggle("max-active");
    renderSkills();
  });
}
/* ---------------- EQUIPMENT ICONS ---------------- */
const GEAR_ICONS = {
  mousepad: "https://i.postimg.cc/W4SQ1NJV/mp1.png",
  mouse: "https://i.postimg.cc/pdPwvhyr/m1.png",
  keyboard: "https://i.postimg.cc/BvJr3Ltt/k1.png",
  headset: "https://i.postimg.cc/5tfhJYj6/h1.png"
};

/* ---------------- EQUIPMENT DATA & UI ---------------- */
const EQUIPMENT = {
  mousepad: [
    { name: "AJ Pad", boosts: { Handling: 2, Quickness: 1 }, tokens: "H2 Q1" },
    { name: "Noctron", boosts: { Aim: 1, Quickness: 2 }, tokens: "A1 Q2" },
    { name: "Citus", boosts: { Aim: 1, Handling: 1, Quickness: 1 }, tokens: "A1 H1 Q1" },
    { name: "Armageddon", boosts: { Aim: 1, Handling: 2 }, tokens: "A1 H2" }
  ],
  mouse: [
    { name: "Aquila Fly", boosts: { Aim: 2, Handling: 1 }, tokens: "A2 H1" },
    { name: "Aurora 3330", boosts: { Aim: 1, Quickness: 2 }, tokens: "A1 Q2" },
    { name: "Hero", boosts: { Aim: 1, Handling: 1, Quickness: 1 }, tokens: "A1 H1 Q1" },
    { name: "Cyborg", boosts: { Handling: 1, Quickness: 2 }, tokens: "H1 Q2" }
  ],
  keyboard: [
    { name: "Mintaka", boosts: { Determination: 1, Movement: 2 }, tokens: "D1 M2" },
    { name: "Quasar RGB", boosts: { Determination: 3 }, tokens: "D3" },
    { name: "Alnitak", boosts: { Determination: 3, Movement: 1 }, tokens: "D3 M1" },
    { name: "Pulsar", boosts: { Movement: 3 }, tokens: "M3" }
  ],
  headset: [
    { name: "Pentagon", boosts: { Teamplay: 1, Gamesense: 2 }, tokens: "T1 G2" },
    { name: "Enigma", boosts: { Awareness: 2, Teamplay: 1 }, tokens: "Aw2 T1" },
    { name: "Gemini", boosts: { Awareness: 2, Gamesense: 1 }, tokens: "Aw2 G1" },
    { name: "Singularity", boosts: { Awareness: 1, Teamplay: 1, Gamesense: 1 }, tokens: "Aw1 T1 G1" }
  ]
};

function renderCategory(id, items) {
  const cont = document.getElementById(id);
  if (!cont) return;

  cont.innerHTML = "";
  cont.classList.add("gear-row");

  const cat = id.replace("gear-", "");

  const img = document.createElement("img");
  img.src = GEAR_ICONS[cat];
  img.className = "gear-row-icon";

  const grid = document.createElement("div");
  grid.className = "gear-grid";

  items.forEach(it => {
    const b = document.createElement("div");
    b.className = "gear-item";

    if (equipped[cat] && equipped[cat].name === it.name) {
      b.classList.add("equipped");
    }

    b.innerHTML = `
      <div class="gear-name">${it.name}</div>
      <div class="gear-booststr">${it.tokens}</div>
    `;

    b.addEventListener("click", () => {
      equipped[cat] =
        equipped[cat] && equipped[cat].name === it.name ? null : it;

      recomputeEquipmentBoosts();
      updateGearButtonState();
      renderAllEquipmentUI();
      renderSkills();
    });

    grid.appendChild(b);
  });

// highlight icon when any item is equipped
if (equipped[cat]) {
    img.classList.add("icon-equipped");
} else {
    img.classList.remove("icon-equipped");
}
 

cont.appendChild(img);
cont.appendChild(grid);
}



function renderAllEquipmentUI() {
  renderCategory("gear-mousepad", EQUIPMENT.mousepad);
  renderCategory("gear-mouse", EQUIPMENT.mouse);
  renderCategory("gear-keyboard", EQUIPMENT.keyboard);
  renderCategory("gear-headset", EQUIPMENT.headset);
}

function recomputeEquipmentBoosts() {
  equipmentBoosts = {};
  Object.values(equipped).forEach(it => {
    if (!it) return;
    Object.entries(it.boosts).forEach(([skill, val]) => {
      equipmentBoosts[skill] = (equipmentBoosts[skill] || 0) + val;
    });
  });
}

/* Updates gear button visual (brightness) if at least one item is equipped */
function updateGearButtonState() {
  const gearBtn = document.querySelector(".gear-btn");
  const hasGear = Object.values(equipped).some(v => v !== null);
  if (!gearBtn) return;
  if (hasGear) gearBtn.classList.add("gear-active");
  else gearBtn.classList.remove("gear-active");
}

/* ---------------- GAMES BUTTON ACTIVE STATE ---------------- */
function updateGamesButtonState() {
  const gamesBtn = document.querySelector(".games-btn");
  if (!gamesBtn) return;
  const gamesPlayedEl = document.getElementById("games-played");
  const gamesPlayed = gamesPlayedEl ? parseInt(gamesPlayedEl.textContent, 10) || 0 : 0;
  const loyalEl = document.getElementById("loyal-status");
  const loyal = loyalEl && loyalEl.textContent === "YES";

  if (gamesPlayed > 0 || loyal) {
    gamesBtn.classList.add("games-active");
  } else {
    gamesBtn.classList.remove("games-active");
  }
}

/* ---------------- POPUP (open / apply / drag / lock / outside click) ---------------- */
const gearPopup = document.getElementById("gear-popup");
const gearBtn = document.querySelector(".gear-btn");
const gearApplyBtn = document.getElementById("gear-apply-btn");
const lockBtn = document.getElementById("gear-lock-btn");

/* --- GEAR BUTTON TOGGLE (respeita lock) --- */
if (gearBtn) {
  gearBtn.addEventListener("click", () => {
    if (!gearLocked) {
      if (gearPopup.classList.contains("hidden")) gearPopup.classList.remove("hidden");
      else gearPopup.classList.add("hidden");
      return;
    }
    if (gearLocked) gearPopup.classList.remove("hidden");
  });
}

if (gearApplyBtn) {
  gearApplyBtn.addEventListener("click", () => {
    if (!gearPopup) return;
    gearPopup.classList.add("hidden");
    recomputeEquipmentBoosts();
    updateGearButtonState();
    renderSkills();
  });
}

/* GAME POPUP */
const gamePopup = document.getElementById("game-popup");
const gamesBtn = document.querySelector(".games-btn");
const gameLockBtn = document.getElementById("game-lock-btn");
const gameDrag = document.getElementById("game-drag");

let gameLocked = false;
if (gameLockBtn) gameLockBtn.textContent = "🔓";

if (gamesBtn) {
  gamesBtn.addEventListener("click", () => {
    if (!gameLocked) {
      if (gamePopup.classList.contains("hidden")) gamePopup.classList.remove("hidden");
      else gamePopup.classList.add("hidden");
      return;
    }
    gamePopup.classList.remove("hidden");
  });
}

if (gameLockBtn) {
  gameLockBtn.addEventListener("click", () => {
    gameLocked = !gameLocked;
    gameLockBtn.textContent = gameLocked ? "🔒" : "🔓";
  });
}

document.addEventListener("mousedown", (e) => {
  if (!gamePopup || gamePopup.classList.contains("hidden")) return;
  if (gameLocked) return;
  const inner = gamePopup.querySelector(".game-popup-inner");
  const isBtn = e.target.closest(".games-btn");
  const inside = inner && inner.contains(e.target);
  if (!inside && !isBtn) gamePopup.classList.add("hidden");
});

/* DRAG for game popup */
(function () {
  if (!gamePopup || !gameDrag) return;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  function getEvent(e) { return e.touches ? e.touches[0] : e; }
  function onDown(e) { const ev = getEvent(e); dragging = true; const rect = gamePopup.getBoundingClientRect(); offsetX = ev.clientX - rect.left; offsetY = ev.clientY - rect.top; document.body.style.userSelect = "none"; if (e.cancelable) e.preventDefault(); }
  function onUp() { dragging = false; document.body.style.userSelect = "auto"; }
  function onMove(e) { if (!dragging) return; const ev = getEvent(e); gamePopup.style.left = (ev.clientX - offsetX) + "px"; gamePopup.style.top = (ev.clientY - offsetY) + "px"; if (e.cancelable) e.preventDefault(); }
  gameDrag.addEventListener("mousedown", onDown);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
  gameDrag.addEventListener("touchstart", onDown, { passive: false });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onUp);
})();

/* DRAG for gear popup */
(function () {
  const popup = document.getElementById("gear-popup");
  const dragArea = document.getElementById("gear-drag");
  if (!popup || !dragArea) return;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  function getClientEvent(e) { return e.touches ? e.touches[0] : e; }
  function onDown(e) { const ev = getClientEvent(e); dragging = true; const rect = popup.getBoundingClientRect(); offsetX = ev.clientX - rect.left; offsetY = ev.clientY - rect.top; document.body.style.userSelect = "none"; dragArea.style.cursor = "grabbing"; if (e.cancelable) e.preventDefault(); }
  function onUp() { dragging = false; document.body.style.userSelect = "auto"; dragArea.style.cursor = "grab"; }
  function onMove(e) { if (!dragging) return; const ev = getClientEvent(e); let newLeft = ev.clientX - offsetX; let newTop = ev.clientY - offsetY; const pad = 8; const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0); const rect = popup.getBoundingClientRect(); const w = rect.width; if (newLeft < pad) newLeft = pad; if (newTop < pad) newTop = pad; if (newLeft + w > vw - pad) newLeft = vw - w - pad; popup.style.left = newLeft + "px"; popup.style.top = newTop + "px"; if (e.cancelable) e.preventDefault(); }
  dragArea.addEventListener("mousedown", onDown);
  document.addEventListener("mouseup", onUp);
  document.addEventListener("mousemove", onMove);
  dragArea.addEventListener("touchstart", onDown, { passive: false });
  document.addEventListener("touchend", onUp);
  document.addEventListener("touchmove", onMove, { passive: false });
})();

/* LOCK button toggles whether outside clicks close the popup */
let gearLocked = false;
if (lockBtn) {
  lockBtn.textContent = "🔓";
  lockBtn.addEventListener("click", () => {
    gearLocked = !gearLocked;
    lockBtn.textContent = gearLocked ? "🔒" : "🔓";
    lockBtn.classList.toggle("locked", gearLocked);
  });
}

document.addEventListener("mousedown", (e) => {
  if (!gearPopup || gearPopup.classList.contains("hidden")) return;
  if (gearLocked) return;
  const inner = gearPopup.querySelector(".gear-popup-inner");
  if (!inner) return;
  const inside = inner.contains(e.target);
  const isGearBtn = e.target.closest(".gear-btn");
  if (!inside && !isGearBtn) {
    gearPopup.classList.add("hidden");
    updateGearButtonState();
  }
});

/* ---------------- RUBBER RESET ---------------- */
const rubber = document.querySelector(".rubber-btn");
if (rubber) {
  rubber.addEventListener("click", () => {

    // RESET HEART / MORALE / MAX
    heartState = 0;
    moraleState = 0;
    maxMode = false;

    if (heartBtn)  heartBtn.className = "action-btn heart-grey-btn";
    if (moraleBtn) moraleBtn.className = "action-btn morale-btn";
    if (maxBtn)    maxBtn.classList.remove("max-active");

    // RESET GEAR
    Object.keys(equipped).forEach(k => equipped[k] = null);
    recomputeEquipmentBoosts();
    renderAllEquipmentUI();
    updateGearButtonState();

    // RESET GEAR POPUP
    gearLocked = false;
    if (lockBtn) lockBtn.textContent = "🔓";
    if (gearPopup) gearPopup.classList.add("hidden");

    // RESET GAME POPUP
    gameLocked = false;
    const gameLockBtn = document.getElementById("game-lock-btn");
    if (gameLockBtn) gameLockBtn.textContent = "🔓";
    if (gamePopup) gamePopup.classList.add("hidden");

    // RESET GAMES
    const gameInput = document.getElementById("game-input");
    const gamesPlayedEl = document.getElementById("games-played");

    if (gameInput) gameInput.value = "";
    if (gamesPlayedEl) gamesPlayedEl.textContent = "0";

    // RESET HEART SEASONS
    const small = document.querySelector(".season-small");
    const big   = document.querySelector(".season-big");
    const gold  = document.querySelector(".season-gold");
    const plat  = document.querySelector(".season-plat");

    if (small) { small.textContent = "S9";  small.style.color = ""; }
    if (big)   { big.textContent   = "S11"; big.style.color   = ""; }
    if (gold)  { gold.textContent  = "S15"; gold.style.color  = ""; }
    if (plat)  { plat.textContent  = "S23"; plat.style.color  = ""; }

    // RESET LOYAL
    const gameImgBtn = document.getElementById("game-img-btn");
    const loyalStatusEl = document.getElementById("loyal-status");

    if (gameImgBtn)   gameImgBtn.classList.remove("active");
    if (loyalStatusEl) loyalStatusEl.textContent = "NO";

    // RESET BUTTON BRIGHTNESS
    updateGamesButtonState();

    // REFRESH UI
    renderSkills();
    computeMaxCareerHeart();
  });
}

/* --- DOM READY: setup loyal + games input listeners --- */
document.addEventListener('DOMContentLoaded', () => {
  const gameImgBtn = document.getElementById('game-img-btn');
  const loyalStatusEl = document.getElementById('loyal-status');

  if (!gameImgBtn) console.warn('game-img-btn not found in DOM');
  else {
    gameImgBtn.classList.remove('active');
    if (loyalStatusEl) loyalStatusEl.textContent = 'NO';

    gameImgBtn.addEventListener('click', () => {
      const isOn = gameImgBtn.classList.toggle('active');
      if (loyalStatusEl) loyalStatusEl.textContent = isOn ? 'YES' : 'NO';
      computeMaxCareerHeart();
      updateGamesButtonState();
    });
  }

  const gameInput = document.getElementById("game-input");
  const gameOkBtn = document.getElementById("game-ok");
  const gamesPlayedEl = document.getElementById("games-played");
  const smallSeason = document.querySelector(".season-small");
  const bigSeason   = document.querySelector(".season-big");
  const goldSeason  = document.querySelector(".season-gold");
  const platSeason  = document.querySelector(".season-plat");

  function updateHeartsBasedOnGames(games) {
    if (!smallSeason || !bigSeason || !goldSeason || !platSeason) return;

    const loyal = document.getElementById("loyal-status").textContent === "YES";
    let smallReq = 100, bigReq = 200, goldReq = 400, platReq = 800;
    if (loyal) {
      smallReq = Math.floor(smallReq * 0.75);
      bigReq = Math.floor(bigReq * 0.75);
      goldReq = Math.floor(goldReq * 0.75);
      platReq = Math.floor(platReq * 0.75);
    }

    function setSeason(span, req, seasonCode) {
      if (games >= req) { span.textContent = "✔"; span.style.color = "#76ff76"; }
      else { span.textContent = seasonCode; span.style.color = ""; }
    }

    function calcSeason(req) {
      const missing = Math.max(0, req - games);
      const seasonsNeeded = Math.ceil(missing / 50);
      const gd = calculateGameDate();
      return "S" + (gd.season + seasonsNeeded);
    }

    setSeason(smallSeason, smallReq, calcSeason(smallReq));
    setSeason(bigSeason,   bigReq,   calcSeason(bigReq));
    setSeason(goldSeason,  goldReq,  calcSeason(goldReq));
    setSeason(platSeason,  platReq,  calcSeason(platReq));
  }

  if (gameOkBtn) {
    gameOkBtn.addEventListener("click", () => {
      const value = parseInt(gameInput.value, 10);
      if (isNaN(value) || value < 0) return;
      if (gamesPlayedEl) gamesPlayedEl.textContent = value;
      updateHeartsBasedOnGames(value);
      computeMaxCareerHeart();
      updateGamesButtonState();
    });
  }

  updateRetireDisplayIfNeeded();
  updateGamesButtonState();
});

/* ---------------- MAX HEART CALC ---------------- */
function computeMaxCareerHeart() {
  const ageEl = document.querySelector(".player-age");
  const gamesPlayedEl = document.getElementById("games-played");
  if (!ageEl || !gamesPlayedEl) return;

  const { age, birthdayDay } = parseAgeString(ageEl.textContent);
  const gamesPlayed = parseInt(gamesPlayedEl.textContent, 10) || 0;

  const gd = calculateGameDate();
  const currentSeason = gd.season;
  const loyal = document.getElementById("loyal-status").textContent === "YES";

  let smallReq = 100, bigReq = 200, goldReq = 400, platReq = 800;
  if (loyal) {
    smallReq = Math.floor(smallReq * 0.75);
    bigReq = Math.floor(bigReq * 0.75);
    goldReq = Math.floor(goldReq * 0.75);
    platReq = Math.floor(platReq * 0.75);
  }

  function seasonGainFor(req) {
    const missing = Math.max(0, req - gamesPlayed);
    const seasonsNeeded = Math.ceil(missing / 50);
    return currentSeason + seasonsNeeded;
  }

  const smallSeason = seasonGainFor(smallReq);
  const bigSeason   = seasonGainFor(bigReq);
  const goldSeason  = seasonGainFor(goldReq);
  const platSeason  = seasonGainFor(platReq);

  let seasonsLeft = 40 - age;
  if (birthdayDay && birthdayDay > gd.day) seasonsLeft -= 1;
  const retireSeason = currentSeason + Math.max(seasonsLeft, 0);

  let icon = "❌";
  let finalSeason = "—";

  if (platSeason <= retireSeason) { icon = "💙"; finalSeason = "S" + platSeason; }
  else if (goldSeason <= retireSeason) { icon = "💛"; finalSeason = "S" + goldSeason; }
  else if (bigSeason <= retireSeason) { icon = "❤️"; finalSeason = "S" + bigSeason; }
  else if (smallSeason <= retireSeason) { icon = "❤️"; finalSeason = "S" + smallSeason; }

  const maxLine = document.querySelector(".max-heart-final");
  if (maxLine) maxLine.innerHTML = `MAX HEART POSSIBLE: <span class="blue-heart">${icon}</span> (${finalSeason})`;
}

/* ---------------- INIT ---------------- */
renderAllEquipmentUI();
recomputeEquipmentBoosts();
updateGearButtonState();
renderSkills();
computeMaxCareerHeart();
updateGamesButtonState();
