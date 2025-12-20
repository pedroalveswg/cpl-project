// ===== FORCE VERSION RENDER (ISOLATED) =====

// ===== END FORCE VERSION =====
// Icons para MAX HEART POSSIBLE
const ICON_SMALL_HTML = '<span class="heart-small2">❤️</span>';
const ICON_BIG_HTML   = '❤️';
const ICON_GOLD_HTML  = '💛';
const ICON_PLAT_HTML  = '💙';


let missingPopupOpen = false;


// backup of the initial skills to allow LOAD (empty) to fully restore initial state
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

const initialSkillsBackup = JSON.parse(JSON.stringify(skills));


// backup do último LOAD
let loadedSkillsBackup = JSON.parse(JSON.stringify(skills));
let loadedName = "Legend";
let loadedAge = "19yo (day 5)";

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
let fraggerActive = false;
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

function renderMiniGear() {
  const svg = document.getElementById("gear-minimap");
  if (!svg) return;

  svg.innerHTML = "";

  const CELL = 14;
  const GAP = 2;
  const DOT = 6;

  // desenha grelha 4x4
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * (CELL + GAP);
      const y = row * (CELL + GAP);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", CELL);
      rect.setAttribute("height", CELL);
      rect.setAttribute("fill", "none");
      rect.setAttribute("stroke", "rgba(255,255,255,0.25)");
      rect.setAttribute("stroke-width", "1");

      svg.appendChild(rect);
    }
  }

  const order = ["mousepad", "mouse", "keyboard", "headset"];

  order.forEach((cat, row) => {
    const item = equipped[cat];
    if (!item) return;

    const col = EQUIPMENT[cat].findIndex(e => e.name === item.name);
    if (col === -1) return;

    const cx =
      col * (CELL + GAP) + CELL / 2;
    const cy =
      row * (CELL + GAP) + CELL / 2;

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    dot.setAttribute("x", cx - DOT / 2);
    dot.setAttribute("y", cy - DOT / 2);
    dot.setAttribute("width", DOT);
    dot.setAttribute("height", DOT);
    dot.setAttribute("rx", "1");
    dot.setAttribute("fill", "#ff7a00");

    svg.appendChild(dot);
  });
}



/* ---------------- CALCS ---------------- */
function computeSkillValues(s) {
  const equipBoost = equipmentBoosts[s.name] || 0;
  const base = maxMode ? s.max : s.value;
let pctTotal = heartBoosts[heartState] + moraleBoosts[moraleState];



const pct = pctTotal / 100;  const pctBoost = base * pct;
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






    function parseCardText(txt) {
    const lines = txt
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0); // remove vazios

    const skillNames = [
        "Aim", "Handling", "Quickness", "Determination",
        "Awareness", "Teamplay", "Gamesense", "Movement"
    ];

    const parsed = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // -----------------------------------
        // 1) FORMATO INLINE: "Skill 42/?"
        // -----------------------------------
        const inlineMatch = line.match(/^(\w+)\s+(\d+)\s*\/\s*(\d+|\?)$/i);
        if (inlineMatch && skillNames.includes(inlineMatch[1])) {
            const name = inlineMatch[1];
            const value = parseInt(inlineMatch[2], 10);
            const rawMax = inlineMatch[3];
            const max = rawMax === "?" ? null : parseInt(rawMax, 10);

            parsed.push({ name, value, max });
            continue;
        }

        // -----------------------------------
        // 2) FORMATO 3 LINHAS:
        // Skill
        // 42
        // /93   ou   / ?   ou   ?
        // -----------------------------------
        if (skillNames.includes(line)) {
            const name = line;

            const valLine = lines[i + 1] || "";
            const maxLine = lines[i + 2] || "";

            const value = parseInt(valLine, 10) || 0;

            // extrai apenas número ou ?
            let rawMax = maxLine.replace("/", "").trim();
            let max = null;

            if (/^\d+$/.test(rawMax)) {
                max = parseInt(rawMax, 10);
            }

            parsed.push({ name, value, max });
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
    const finalVal = v.final;

    // ------------------------------
    // WIDTHS (apenas 2 segmentos)
    // ------------------------------
    const baseW = Math.min(baseVal, 100);
    const boostW = Math.max(0, Math.min(finalVal, 100) - baseW);

    const row = document.createElement("div");
    row.className = "skill-row";

    const name = document.createElement("div");
    name.className = "skill-name";
    name.textContent = s.name;
    name.style.color = finalVal >= 100 ? "#f7f8c9" : "#ffffff";

    // LIMIT REACHED (value == max, mas não 100)
if (s.value === s.max && s.max < 100 && finalVal < 100) {
    name.style.color = "#ffffffff"; // verde premium
    
}
    // ===============================
// LIMIT REACHED (value === max, mas < 100)
// ===============================
if (s.value === s.max && s.max < 100) {
    name.classList.add("limit-reached");
} else {
    name.classList.remove("limit-reached");
}

    const bar = document.createElement("div");
    bar.className = "skill-bar";

    const limit = document.createElement("div");
    limit.className = "skill-limit";
    limit.style.width = s.max + "%";

    // Se o limite é 100 → arredondado dos dois lados
    if (s.max === 100) {
        limit.style.borderRadius = "999px";
    } else {
        limit.style.borderRadius = "999px 0 0 999px";
}

bar.appendChild(limit); 

    // ----------------------------------
    // BASE (sempre laranja)
    // ----------------------------------
    const baseF = document.createElement("div");
    baseF.className = "skill-fill";
    baseF.style.left = "0";
    baseF.style.width = baseW + "%";
    baseF.style.zIndex = 1;
    baseF.style.backgroundColor = "#ff7a00"; // laranja
    baseF.style.borderRadius = "999px 0 0 999px";
    bar.appendChild(baseF);

    // ----------------------------------
    // BOOST TOTAL (HM + morale + gear)
    // ----------------------------------
let boostF = null;

// BOOST (HM + morale + gear) como único segmento de boost
if (boostW > 0) {
  boostF = document.createElement("div");
  boostF.className = "skill-fill-boost";
  boostF.style.left = baseW + "%";
  boostF.style.width = boostW + "%";
  boostF.style.zIndex = 2;
  
  

  // Se final >= 100 → dourado + brilho + canto redondo
  if (finalVal >= 100) {
    boostF.style.backgroundColor = "#f7e395";
    boostF.style.borderRadius = "0 999px 999px 0";
    boostF.style.boxShadow = "0 0 10px rgba(238,223,192,0.75)";
  } else {
    boostF.style.backgroundColor = "#f5be9e";
    boostF.style.borderRadius = "0";
  }

  bar.appendChild(boostF);
}

// SE NÃO EXISTIR BOOST → base atinge 100 sozinha
if (finalVal >= 100 && boostW === 0) {
  baseF.style.backgroundColor = "#edeec0";
  baseF.style.borderRadius = "999px";
  baseF.style.boxShadow = "0 0 10px rgba(238,223,192,0.80)";
}

if (finalVal >= 100) {
  baseF.style.backgroundColor = "#edeec0";
  baseF.style.boxShadow =
    "0 0 12px rgba(238,223,192,0.25), 0 0 28px rgba(255, 255, 255, 0.15)";

  if (boostF) {
    boostF.style.backgroundColor = "#f5be9e";
    boostF.style.boxShadow = "none";
  }

} else {
  baseF.style.backgroundColor = "#f56e0e";
  baseF.style.boxShadow = "none";

  if (boostF) {
    boostF.style.backgroundColor = "#f5be9e";
    boostF.style.boxShadow = "none";
  }
}



    // ----------------------------------
    // VALORES
    // ----------------------------------
    const val = document.createElement("div");
    val.className = "skill-value";

    const cur = document.createElement("span");
    cur.className = "skill-current";
    cur.textContent = maxMode ? s.max : Math.round(v.base);
    if (finalVal >= 100) cur.style.color = "#ee6b0e";
    // LIMIT REACHED (value == max, mas não 100)
    if (s.value === s.max && s.max < 100 && finalVal < 100) {
        cur.style.color = "#ffffffff";
    }

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
// ===== UPDATE RIGHT COLUMN BUTTONS (ONLY IMAGE BUTTONS) =====
if (globalButtonsContainer) {
    globalButtonsContainer.innerHTML = "";

    skills.forEach((s, index) => {
        const row = document.createElement("div");
        row.className = "edit-row";

        // BOTÃO MENOS
        const minus = document.createElement("img");
        minus.src = "https://i.postimg.cc/qBCQ18DZ/button.png";
        minus.className = "edit-btn-img";
        minus.addEventListener("click", () => applySkillChange(index, -1));

        // BOTÃO MAIS
        const plus = document.createElement("img");
        plus.src = "https://i.postimg.cc/SQzVgW1v/button.png";
        plus.className = "edit-btn-img";
        plus.addEventListener("click", () => applySkillChange(index, +1));

        row.appendChild(minus);
        row.appendChild(plus);
        globalButtonsContainer.appendChild(row);
    });
}



  updateTotals();
}

/* ==========================
   GLOBAL EDIT COLUMN LOGIC
========================== */

let globalMode = "S"; // S = editar value, L = editar max
const globalModeBtn = document.getElementById("mode-btn");
const globalButtonsContainer = document.getElementById("edit-buttons-container");

function updateModeButton() {
    if (globalMode === "S") {
        globalModeBtn.style.backgroundImage =
            "url('https://i.postimg.cc/BQFFWpxs/Sbutton.png')";
    } else {
        globalModeBtn.style.backgroundImage =
            "url('https://i.postimg.cc/vHnnRhWy/Lbutton.png')";
    }
}

globalModeBtn.addEventListener("click", () => {
    globalMode = globalMode === "S" ? "L" : "S";
    updateModeButton();
});

updateModeButton();





function applySkillChange(idx, delta) {
    const s = skills[idx];

    let turnMaxModeOffAfterChange = false;

    /* ================================
       SE MAX MODE ESTIVER ATIVO
       ================================ */
if (maxMode) {
    // guardar valor real original apenas 1 vez
    if (s._backupValue === undefined) s._backupValue = s.value;

    // valor a editar passa a ser o MAX (valor visível em MAX MODE)
    s.value = s.max;

    turnMaxModeOffAfterChange = true;
}

    /* ================================
       REGRAS S
       ================================ */
    if (globalMode === "S") {

        if (delta === 1 && s.value === s.max && s.value < 100) {
            // S+ quando value == max → sobem ambos
            s.value++;
            s.max++;
        }

        else if (delta === -1 && s.value === s.max) {
            // S- quando value == max → desce só o value
            if (s.value > 0) s.value--;
        }

        else if (delta === 1 && s.value < s.max && s.value < 100) {
            // S+ normal
            s.value++;
        }

        else if (delta === -1 && s.value > 0) {
            // S- normal
            s.value--;
        }
    }

    /* ================================
       REGRAS L
       ================================ */
    else {

        if (delta === 1 && s.max === s.value && s.max < 100) {
            // L+ quando max == value → só sobe max
            s.max++;
        }

        else if (delta === -1 && s.max === s.value && s.max > 0) {
            // L- quando max == value → descem ambos
            s.max--;
            s.value--;
        }

        else if (delta === 1 && s.max < 100) {
            // L+ normal
            s.max++;
        }

        else if (delta === -1 && s.max > s.value) {
            // L- normal
            s.max--;
        }
    }

    /* ================================
       LIMITE FINAL (0–100)
       ================================ */
    s.value = Math.max(0, Math.min(100, s.value));
    s.max   = Math.max(0, Math.min(100, s.max));

    /* ================================
       SE FIZ CLICK EM +/– NO MAX MODE
       → DESLIGAR MAX MODE AUTOMATICAMENTE
       ================================ */
    if (turnMaxModeOffAfterChange) {
        maxMode = false;
        maxBtn.classList.remove("max-active");

        // atualizar o backup para o novo valor real
        s._backupValue = s.value;
    }
    updateTotals();
    renderSkills();
    computeMaxCareerHeart();
    renderMiniGear();
}





/* ---------------- TOOLTIP ---------------- */
const tooltip = document.getElementById("skill-tooltip");
function showTooltipForSkill(s, e) {
  const v = computeSkillValues(s);
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
const totalSkillBox = document.querySelector(".total-skill-box");

if (totalSkillBox && tooltip) {

    totalSkillBox.addEventListener("mouseenter", (e) => {
        showTotalSkillTooltip(e);
    });

    totalSkillBox.addEventListener("mousemove", (e) => {
        tooltip.style.left = e.pageX + 15 + "px";
        tooltip.style.top  = e.pageY + 15 + "px";
    });

    totalSkillBox.addEventListener("mouseleave", () => {
        hideTooltip();
    });
}
function showTotalSkillTooltip(e) {

    if (!tooltip) return;

    /* =========================
       TÍTULO
    ========================= */
    document.getElementById("tooltip-skill-name").textContent = "TOTAL SKILL";

    /* =========================
       BASE e LIMIT
    ========================= */
    let baseTotal  = 0;
    let limitTotal = 0;

    skills.forEach(s => {
        baseTotal  += maxMode ? s.max : s.value;
        limitTotal += s.max;
    });

    /* =========================
       BOOSTS
    ========================= */
    let gearBoostTotal = 0;
    let percentBoostTotal = 0;

    skills.forEach(s => {
        const v = computeSkillValues(s);

        // boost absoluto (gear)
        gearBoostTotal += v.equipBoost || 0;

        // boost percentual convertido em valor real
        percentBoostTotal += v.pctBoost || 0;
    });

    const boostTotal = percentBoostTotal + gearBoostTotal;
    const totalFinal = baseTotal + boostTotal;

    /* =========================
       PREENCHER TOOLTIP
    ========================= */
    document.getElementById("tooltip-base").textContent  = baseTotal.toFixed(0);
    document.getElementById("tooltip-boost").textContent = boostTotal.toFixed(2);
    document.getElementById("tooltip-limit").textContent = limitTotal;
    document.getElementById("tooltip-total").textContent = totalFinal.toFixed(2);

    document.getElementById("tooltip-heart").textContent  = `+${heartBoosts[heartState]}%`;
    document.getElementById("tooltip-morale").textContent = `+${moraleBoosts[moraleState]}%`;
    document.getElementById("tooltip-gear").textContent   = `+${gearBoostTotal}`;

    /* =========================
       POSIÇÃO + VISIBILIDADE
    ========================= */
    tooltip.style.left = e.pageX + 15 + "px";
    tooltip.style.top  = e.pageY + 15 + "px";

    tooltip.classList.add("visible");
    tooltip.classList.remove("hidden");
}

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
    missingPopupOpen = false;
    if (loadText.length === 0) {

        // restore name + age defaults (initial view)
        const nameEl = document.querySelector(".player-name");
        const ageEl = document.querySelector(".player-age");
        if (nameEl) nameEl.textContent = "Legend";
        if (ageEl) ageEl.textContent  = "19yo (day 5)";

        // restore skills to the initial backup (deep copy)
        skills = JSON.parse(JSON.stringify(initialSkillsBackup));
loadedSkillsBackup = JSON.parse(JSON.stringify(skills));
loadedName = "Legend";
loadedAge = "19yo (day 5)";
        // recompute and refresh UI
        recomputeEquipmentBoosts();
        renderAllEquipmentUI();
        updateGearButtonState();
        renderSkills();
        computeMaxCareerHeart();
        updateGamesButtonState();
        updateRetireDisplayIfNeeded();
        renderMiniGear();
        return; // done
    }


    // NORMAL LOAD (text present)
    const data = parseCardText(loadText);

    const nameEl = document.querySelector(".player-name");
    const ageEl = document.querySelector(".player-age");

    if (nameEl) nameEl.textContent = data.playerName;
    if (ageEl)  ageEl.textContent  = data.playerAge;

    if (data.skills.length) {
        skills = data.skills;
    } 


    // detectar skills com max = null
const incomplete = skills.filter(s => s.max === null);

if (incomplete.length > 0 && !missingPopupOpen) {
    openMissingSkillPopup(incomplete);
    return;
}

loadedSkillsBackup = JSON.parse(JSON.stringify(skills));
loadedName = data.playerName;
loadedAge = data.playerAge;
    // ensure UI and calculations updated
    recomputeEquipmentBoosts();
    renderAllEquipmentUI();
    updateGearButtonState();
    updateRetireDisplayIfNeeded();
    computeMaxCareerHeart();
    renderSkills();
    renderMiniGear();
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

    skills.forEach(s => {
      if (maxMode) {
        // guardar valor original
        s._backupValue = s.value;

        // value passa a ser igual ao max
        s.value = s.max;
      } else {
        // restaurar o valor original
        if (s._backupValue !== undefined) {
          s.value = s._backupValue;
        }
      }
    });

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
      renderMiniGear();
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
function openMissingSkillPopup(list) {
  if (missingPopupOpen) return; // ⛔ impede abrir de novo
    missingPopupOpen = true;      // 🔒 marca como aberto
    const popup = document.getElementById("missing-skill-popup");
    const container = document.getElementById("missing-skill-fields");

    container.innerHTML = "";

    list.forEach(s => {
        const div = document.createElement("div");
        div.className = "missing-row";

        div.innerHTML = `
            <span>${s.name}</span>
            <input
                type="text"
                class="missing-input"
                inputmode="numeric"
                id="miss-${s.name}"
                placeholder="70–100"
            >
        `;

        container.appendChild(div);
    });

    document.getElementById("modal-overlay").classList.remove("hidden");
    popup.classList.remove("hidden");

    // ===== INPUT AUTO-VALIDATION (70–100) =====
    const inputs = [...document.querySelectorAll('.missing-input')];

    inputs.forEach((input, index) => {

        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '');
            const value = input.value;

            // máximo 3 dígitos
            if (value.length > 3) {
                input.value = '';
                return;
            }

            // standby 10
            if (value === '10') return;

            // 3 dígitos
            if (value.length === 3) {
                if (value === '100') {
                    inputs[index + 1]?.focus();
                    return;
                }
                input.value = '';
                return;
            }

            // 2 dígitos
            if (value.length === 2) {
                const num = Number(value);

                if (num >= 70 && num <= 99) {
                    inputs[index + 1]?.focus();
                    return;
                }

                input.value = '';
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '') {
                inputs[index - 1]?.focus();
            }
        });

    });

    document.getElementById("missing-skill-confirm").onclick = () => {
        let allGood = true;

        list.forEach(s => {
            const field = document.getElementById(`miss-${s.name}`);
            const val = parseInt(field.value, 10);

            if (!(val >= 70 && val <= 100)) {
                allGood = false;
                field.style.border = "1px solid red";
            } else {
                field.style.border = "";
                s.max = val;
                s.max = Number(val); // força número, nunca null
            }
        });

        if (!allGood) return;

        popup.classList.add("hidden");
        document.getElementById("modal-overlay").classList.add("hidden");
missingPopupOpen = false; // 🔓 permite novo popup num próximo LOAD
        loadedSkillsBackup = JSON.parse(JSON.stringify(skills));
        loadedName = document.querySelector(".player-name").textContent;
        loadedAge  = document.querySelector(".player-age").textContent;

        recomputeEquipmentBoosts();
        renderAllEquipmentUI();
        updateGearButtonState();
        renderSkills();
        computeMaxCareerHeart();
        updateGamesButtonState();
        updateRetireDisplayIfNeeded();
        renderMiniGear();
    };
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
    renderMiniGear();
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
missingPopupOpen = false;
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

    updateGamesButtonState();

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

  // RESTAURAR ESTADO BASE DO ÚLTIMO LOAD
skills = JSON.parse(JSON.stringify(loadedSkillsBackup));

const nameEl = document.querySelector(".player-name");
const ageEl  = document.querySelector(".player-age");

if (nameEl) nameEl.textContent = loadedName;
if (ageEl)  ageEl.textContent  = loadedAge;


    // REFRESH UI
    renderSkills();
    renderMiniGear();
    computeMaxCareerHeart();
    updateRetireDisplayIfNeeded();
  });
}
function updateHeartsBasedOnGames(games) {
    const smallSeason = document.querySelector(".season-small");
    const bigSeason   = document.querySelector(".season-big");
    const goldSeason  = document.querySelector(".season-gold");
    const platSeason  = document.querySelector(".season-plat");

    if (!smallSeason || !bigSeason || !goldSeason || !platSeason) return;

    const loyal = document.getElementById("loyal-status").textContent === "YES";

    let smallReq = 100, bigReq = 200, goldReq = 400, platReq = 800;

    if (loyal) {
        smallReq = Math.floor(smallReq * 0.75);
        bigReq   = Math.floor(bigReq * 0.75);
        goldReq  = Math.floor(goldReq * 0.75);
        platReq  = Math.floor(platReq * 0.75);
    }

    const ageText = document.querySelector(".player-age")?.textContent || "";
    const { age, birthdayDay } = parseAgeString(ageText);

    const gd = calculateGameDate();
    const currentSeason = gd.season;

    // calcular season de reforma
    const retireSeason = computeRetireSeasonFrom(age, birthdayDay).finalSeason;

    // calcula season destino consoante jogos restantes
    function targetSeason(req) {
        const missing = Math.max(0, req - games);
        const seasonsNeeded = Math.ceil(missing / 55);
        return currentSeason + seasonsNeeded;
    }

    function label(req) {
        const season = targetSeason(req);

        if (season > retireSeason) return "❌";

        const futureAge = age + (season - currentSeason);

        // SE ainda não atingido → mostra season + idade
        if (games < req) return `S${season} (${futureAge}yo)`;

        // SE já atingido → ✔
        return "✔";
    }

    smallSeason.textContent = label(smallReq);
    bigSeason.textContent   = label(bigReq);
    goldSeason.textContent  = label(goldReq);
    platSeason.textContent  = label(platReq);

    // cores ✔ e ❌
    [smallSeason, bigSeason, goldSeason, platSeason].forEach((el, i) => {
        const req = [smallReq, bigReq, goldReq, platReq][i];

        if (games >= req) {
            el.style.color = "#76ff76"; // verde ✔
        } else if (el.textContent === "❌") {
            el.style.color = ""; // normal
        } else {
            el.style.color = ""; // normal season + idade
        }
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

    let originalGamesBeforeLoyal = null;

gameImgBtn.addEventListener('click', () => {
    const isOn = gameImgBtn.classList.toggle('active');
    const loyalStatusEl = document.getElementById("loyal-status");
    const gamesPlayedEl = document.getElementById("games-played");

    if (loyalStatusEl) loyalStatusEl.textContent = isOn ? 'YES' : 'NO';

    let games = parseInt(gamesPlayedEl.textContent, 10) || 0;

    if (isOn) {
        // guardar valor real antes do desconto
        originalGamesBeforeLoyal = games;

        // aplicar desconto 25%
        const reduced = Math.floor(games * 0.75);
        gamesPlayedEl.textContent = reduced;

        updateHeartsBasedOnGames(reduced);
    } else {
        // restaurar valor original
        if (originalGamesBeforeLoyal !== null) {
            gamesPlayedEl.textContent = originalGamesBeforeLoyal;
            updateHeartsBasedOnGames(originalGamesBeforeLoyal);
        }
    }

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
updateHeartsBasedOnGames(0);
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
    const seasonsNeeded = Math.ceil(missing / 55);
    return currentSeason + seasonsNeeded;
  }

  const smallSeason = seasonGainFor(smallReq);
  const bigSeason   = seasonGainFor(bigReq);
  const goldSeason  = seasonGainFor(goldReq);
  const platSeason  = seasonGainFor(platReq);

  let seasonsLeft = 40 - age;
  if (birthdayDay && birthdayDay > gd.day) seasonsLeft -= 1;
  const retireSeason = currentSeason + Math.max(seasonsLeft, 0);

  let icon = null;
  let finalSeason = null;

  if (platSeason <= retireSeason) {
    icon = ICON_PLAT_HTML;
    finalSeason = "S" + platSeason;

  } else if (goldSeason <= retireSeason) {
    icon = ICON_GOLD_HTML;
    finalSeason = "S" + goldSeason;

  } else if (bigSeason <= retireSeason) {
    icon = ICON_BIG_HTML;
    finalSeason = "S" + bigSeason;

  } else if (smallSeason <= retireSeason) {
    icon = ICON_SMALL_HTML; // ❤️ pequeno com classe especial
    finalSeason = "S" + smallSeason;
  }


  const maxLine = document.querySelector(".max-heart-final");
  if (!maxLine) return;

  // Se NÃO consegue nenhum → mostrar "—"
  if (!icon) {
    maxLine.innerHTML = `MAX HEART POSSIBLE: —`;
    return;
  }

  maxLine.innerHTML = `MAX HEART POSSIBLE: ${icon} (${finalSeason})`;
}
// ===== INFO TOOLTIP (STABLE, NO FLICKER) =====
const infoWrapper = document.getElementById("info-wrapper");
const infoTooltip = document.getElementById("info-tooltip");
const overlay = document.getElementById("modal-overlay");

if (infoWrapper && infoTooltip && overlay) {

  infoWrapper.addEventListener("mouseenter", () => {
    infoTooltip.classList.remove("hidden");
    overlay.classList.remove("hidden");
  });

  infoWrapper.addEventListener("mouseleave", () => {
    infoTooltip.classList.add("hidden");
    overlay.classList.add("hidden");
  });

}



window.addEventListener("load", () => {
  const v = document.getElementById("app-version");
  const u = document.getElementById("app-updates");

  if (!v || !u) {
    console.error("VERSION ELEMENTS NOT FOUND");
    return;
  }

  v.textContent = "v1.3.18 - 23:28 - December.20.2025";

  u.innerHTML = `
    <li>Add Minimap gear</li>
    <li>Add PNG export button</li>
    <li>Fixed Missing Limits flow for players loaded with unknown limits</li>
    <li>Loyal button moved</li>
    <li>Skill bars visual updates</li>
    <li>Tooltip Total Skills correction</li>
    <li>Updates menu</li>
    <li>Add Missing Limites to tryout copy>past</li>
    `;
});



/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderAllEquipmentUI();
  recomputeEquipmentBoosts();
  updateGearButtonState();
  renderSkills();
  updateHeartsBasedOnGames(0);
  computeMaxCareerHeart();
  updateGamesButtonState();
});

document.addEventListener("DOMContentLoaded", () => {
  const exportBtn = document.getElementById("export-card-btn");

  if (!exportBtn) {
    console.error("EXPORT BUTTON NOT FOUND");
    return;
  }

  exportBtn.addEventListener("click", async () => {
    const card = document.querySelector(".card");
    if (!card) return;

    const nameEl = document.querySelector(".player-name");
    let filename = "skillwhat";

    if (nameEl && nameEl.textContent.trim()) {
      filename = nameEl.textContent
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]/g, "");
    }

    try {
      // Clona o card para evitar afetar o DOM
      const clone = card.cloneNode(true);
      clone.style.margin = "0";
      clone.style.boxShadow = "none";

      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.top = "-9999px";
      wrapper.style.left = "-9999px";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const dataUrl = await htmlToImage.toPng(clone, {
        backgroundColor: null,
        width: clone.offsetWidth,
        height: clone.offsetHeight,
        pixelRatio: 2
      });

      document.body.removeChild(wrapper);

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filename}.png`;
      link.click();
    } catch (e) {
      console.error("EXPORT FAILED", e);
    }
  });
});
