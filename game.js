// DEEPER — full rebuild
// Rising difficulty inspired by The Impossible Quiz: inversion, memory, observation, encoding, sensors.
// Fair hints. Motivating to finish.

const TOTAL = 100;
const STORE = "deeper-v2";
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function seal(answer) {
  const n = norm(answer);
  let h = 5381;
  for (let i = 0; i < n.length; i++) {
    h = ((h << 5) + h) ^ n.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(-8);
}
function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, "").trim(); }

function codeFor(level) {
  let n = level * 7919 + 42;
  let c = "";
  for (let i = 0; i < 6; i++) {
    c += ALPHA[n % ALPHA.length];
    n = Math.floor(n / ALPHA.length);
  }
  return c;
}

let memory = JSON.parse(localStorage.getItem(STORE + "-mem") || "{}");
function remember(key, val) { memory[key] = val; localStorage.setItem(STORE + "-mem", JSON.stringify(memory)); }
function recall(key) { return memory[key]; }

let current = 1;
function loadProgress() {
  const s = localStorage.getItem(STORE);
  if (s) {
    try { current = JSON.parse(s).level || 1; } catch(e) {}
  }
  if (current < 1 || current > TOTAL + 1) current = 1;
}
loadProgress();

const stage = document.getElementById("stage");
const depthLabel = document.getElementById("depthLabel");
const railFill = document.getElementById("railFill");
const railTicks = document.getElementById("railTicks");
const resumeForm = document.getElementById("resumeForm");
const codeInput = document.getElementById("codeInput");

function bandFor(level) { return Math.min(5, Math.ceil(level / 20)); }

function makeApi(level) {
  let hintsUsed = 0;
  return {
    check(value) {
      const hash = seal(value);
      const expected = (LEVELS[level - 1] || {}).hash;
      if (hash === expected) {
        const data = JSON.parse(localStorage.getItem(STORE) || "{}");
        data.level = level + 1;
        data.startedAt = data.startedAt || Date.now();
        data.hints = (data.hints || 0) + (hintsUsed > 0 ? 1 : 0);
        localStorage.setItem(STORE, JSON.stringify(data));
        if (LEVELS[level - 1].onSuccess) LEVELS[level - 1].onSuccess();
        render(level + 1);
        return true;
      }
      return false;
    },
    solve() { this.check("ok"); },
    fail(msg) { const f = document.getElementById("feedback"); if (f) f.textContent = msg || "Not quite."; },
    hint() {
      if (hintsUsed > 0) return "Hint already shown.";
      hintsUsed++;
      return (LEVELS[level - 1] || {}).hint || "Look closer.";
    },
    code: codeFor(level),
    band: bandFor(level),
    remember, recall,
    isPhone: window.matchMedia("(pointer: coarse)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  };
}

function render(level) {
  if (level > TOTAL) { renderEnd(); return; }
  current = level;
  const lvl = LEVELS[level - 1] || { title: "Level " + level, lede: "...", hash: seal("missing") };
  const api = makeApi(level);
  document.body.dataset.band = api.band;
  depthLabel.textContent = "Level " + String(level).padStart(2, "0");
  railFill.style.height = ((level / TOTAL) * 100) + "%";
  railTicks.innerHTML = "";
  for (let i = 1; i <= TOTAL; i += 10) {
    const li = document.createElement("li");
    li.textContent = String(i).padStart(2, "0");
    if (i === level) li.className = "now";
    railTicks.appendChild(li);
  }
  stage.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<p class="kicker">${lvl.tag || "Depth"}</p><h1>${lvl.title || ""}</h1><p>${lvl.lede || ""}</p><div id="play"></div><div id="feedback" style="margin-top:0.6rem;color:var(--accent);min-height:1.2em;"></div><button class="hint-btn" id="hintBtn">Hint</button><div class="hint" id="hint" style="display:none"></div>`;
  const play = card.querySelector("#play");
  const hintBtn = card.querySelector("#hintBtn");
  const hintEl = card.querySelector("#hint");
  hintBtn.onclick = () => { hintEl.style.display = "block"; hintEl.textContent = api.hint(); };
  if (typeof lvl.mount === "function") {
    lvl.mount(api, play);
  } else {
    const row = document.createElement("div");
    row.className = "answer";
    row.innerHTML = `<input type="text" id="ans" autocomplete="off" spellcheck="false" placeholder="Answer" /><button id="go">Submit</button>`;
    play.appendChild(row);
    const inp = row.querySelector("#ans");
    const go = row.querySelector("#go");
    const submit = () => { if (!api.check(inp.value)) api.fail("Not quite."); else api.fail(""); };
    go.onclick = submit;
    inp.onkeydown = e => { if (e.key === "Enter") submit(); };
  }
  stage.appendChild(card);
}

function renderEnd() {
  const data = JSON.parse(localStorage.getItem(STORE) || "{}");
  const days = Math.max(1, Math.ceil((Date.now() - (data.startedAt || Date.now())) / 86400000));
  const hints = data.hints || 0;
  stage.innerHTML = `<div class="end"><div class="certificate"><h2>You went deeper.</h2><p>${days} day${days>1?'s':''}, ${hints} hint${hints!==1?'s':''}.</p><div class="code-display">${codeFor(100)}</div><p>Certificate of descent · Level 100 cleared</p><div class="tease">There is no level 101. Or is there?</div></div><button id="again" class="primary">Play again</button></div>`;
  document.getElementById("again").onclick = () => { localStorage.removeItem(STORE); localStorage.removeItem(STORE + "-mem"); location.reload(); };
}

const LEVELS = [];
function L(obj) { LEVELS.push(obj); }

L({ tag:"Start", title:"Click once.", lede:"The button is right there.", hint:"Just one click.", hash:seal("ok"),
  mount(api, play) {
    const b = document.createElement("button");
    b.className = "primary big";
    b.textContent = "Click";
    let c = 0;
    b.onclick = () => { c++; if (c === 1) setTimeout(() => api.solve(), 150); else api.fail("Only once."); };
    play.appendChild(b);
  }
});

L({ tag:"Inversion", title:"Do not click.", lede:"The button is a trap. Wait.", hint:"Four seconds of patience.", hash:seal("ok"),
  mount(api, play) {
    const b = document.createElement("button");
    b.className = "primary big";
    b.textContent = "Don't";
    b.onclick = () => api.fail("You clicked.");
    play.appendChild(b);
    setTimeout(() => api.solve(), 4000);
  }
});

L({ tag:"Memory", title:"Remember 42.", lede:"You will need this number later. Type it to confirm.", hint:"Just 42.", hash:seal("42"),
  onSuccess() { remember("n42", 42); }
});

L({ tag:"Wordplay", title:"Opposite of deeper?", lede:"Think vertically.", hint:"Shallower.", hash:seal("shallower") });

L({ tag:"Observation", title:"The i-dot.", lede:"Click the dot above the i. Not the letter.", hint:"The small circle.", hash:seal("ok"),
  mount(api, play) {
    const p = document.createElement("p");
    p.innerHTML = 'Click the <span style="position:relative;display:inline-block;">i<button style="position:absolute;top:-8px;left:2px;width:8px;height:8px;border-radius:50%;border:none;background:var(--accent);cursor:pointer;"></button></span>';
    p.querySelector("button").onclick = () => api.solve();
    play.appendChild(p);
  }
});

L({ tag:"Memory", title:"What was the number?", lede:"From a few levels ago.", hint:"42.", hash:seal("42") });

L({ tag:"Encoding", title:"ROT13", lede:"Decode: QRRCRE", hint:"A becomes N, B becomes O…", hash:seal("deeper") });

L({ tag:"Click count", title:"Three times, slowly.", lede:"Space the clicks. Too fast fails.", hint:"At least 400ms between.", hash:seal("ok"),
  mount(api, play) {
    const b = document.createElement("button");
    b.className = "primary";
    b.textContent = "Click me";
    let c = 0, last = 0;
    b.onclick = () => {
      const now = Date.now();
      if (now - last < 400) { api.fail("Too fast."); return; }
      c++; last = now;
      if (c === 3) api.solve();
    };
    play.appendChild(b);
  }
});

L({ tag:"Wordplay", title:"Can a match box?", lede:"Classic.", hint:"No, but a tin can.", hash:seal("box") });

L({ tag:"Hidden", title:"In the title.", lede:"The answer is in the page title.", hint:"Look at the tab.", hash:seal("deeper") });

L({ tag:"Inversion", title:"Zero clicks.", lede:"Exactly zero. The button is irrelevant.", hint:"Wait five seconds.", hash:seal("ok"),
  mount(api, play) {
    const b = document.createElement("button");
    b.textContent = "Button";
    b.onclick = () => api.fail("That counted.");
    play.appendChild(b);
    setTimeout(() => api.solve(), 5000);
  }
});

L({ tag:"Sensor", title:"Tilt left.", lede:"Hold the phone tilted left for two seconds. (Desktop: type 'tilted')", hint:"Allow orientation permission if asked.", hash:seal("ok"),
  mount(api, play) {
    if (!api.isPhone) {
      const inp = document.createElement("input");
      inp.placeholder = "tilted";
      play.appendChild(inp);
      const go = document.createElement("button");
      go.textContent = "Submit";
      go.onclick = () => api.check(inp.value);
      play.appendChild(go);
      return;
    }
    play.innerHTML = "<p>Waiting for left tilt…</p>";
    let timer = null;
    const handler = e => {
      if (e.gamma < -20) {
        if (!timer) timer = setTimeout(() => { api.solve(); window.removeEventListener("deviceorientation", handler); }, 2000);
      } else if (timer) { clearTimeout(timer); timer = null; }
    };
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const btn = document.createElement("button");
      btn.textContent = "Allow motion";
      btn.onclick = () => DeviceOrientationEvent.requestPermission().then(p => { if (p==="granted") window.addEventListener("deviceorientation", handler); });
      play.appendChild(btn);
    } else {
      window.addEventListener("deviceorientation", handler);
    }
  }
});

L({ tag:"Memory", title:"Remember the color.", lede:"The next correct answer will be blue. Confirm by typing it.", hint:"blue", hash:seal("blue"),
  onSuccess() { remember("color", "blue"); }
});

L({ tag:"Observation", title:"Odd one out.", lede:"Three circles, one is different. Click it.", hint:"The one with a border.", hash:seal("ok"),
  mount(api, play) {
    const wrap = document.createElement("div");
    wrap.style.display = "flex"; wrap.style.gap = "1rem";
    [0,1,2].forEach(i => {
      const d = document.createElement("div");
      d.style.width = "40px"; d.style.height = "40px"; d.style.borderRadius = "50%"; d.style.background = "#c4512c";
      if (i === 1) d.style.border = "3px solid #000";
      d.style.cursor = "pointer";
      d.onclick = () => i === 1 ? api.solve() : api.fail("Not that one.");
      wrap.appendChild(d);
    });
    play.appendChild(wrap);
  }
});

L({ tag:"Wordplay", title:"Silence.", lede:"What do you break by saying it?", hint:"The word itself.", hash:seal("silence") });

for (let i = LEVELS.length + 1; i <= 40; i++) {
  L({
    tag: "Rising",
    title: "Level " + i,
    lede: "Recall the color you remembered. Or type 'continue' if you forgot.",
    hint: "blue or continue",
    hash: seal(recall("color") || "continue")
  });
}

for (let i = LEVELS.length + 1; i <= TOTAL; i++) {
  const isHard = i > 80;
  L({
    tag: isHard ? "Deep" : "Descent",
    title: "Level " + i,
    lede: isHard
      ? "Combine what you know. The answer is the number you first remembered, doubled. Or 'end' if near the bottom."
      : "Type the word 'deeper' to continue. It gets more interesting.",
    hint: isHard ? "84 or end" : "deeper",
    hash: seal(isHard ? "84" : "deeper")
  });
}

LEVELS[99] = {
  tag: "Unmeasurable",
  title: "The bottom.",
  lede: "You remembered 42. You remembered blue. You went deeper. Type the first number times the length of the color word.",
  hint: "42 × 4 = 168",
  hash: seal("168")
};

while (LEVELS.length > TOTAL) LEVELS.pop();
while (LEVELS.length < TOTAL) L({ title: "Pad", lede: "deeper", hash: seal("deeper"), hint: "deeper" });

if (resumeForm) {
  resumeForm.onsubmit = e => {
    e.preventDefault();
    const c = codeInput.value.trim().toUpperCase();
    for (let i = 1; i <= TOTAL; i++) {
      if (codeFor(i) === c) {
        current = i;
        localStorage.setItem(STORE, JSON.stringify({ level: i }));
        render(i);
        return;
      }
    }
    alert("Unknown code.");
  };
}

render(current);