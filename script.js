/* ========================================
   Portfolio Reel — Seamless Loop + Speed-Sensitive Swipe (fixed)
   - Infinite loop via DOM recycle with constant center index
   - Easing: ease-out (smoother, less snappy)
   - Arrows: exactly 1 step per click (smooth)
   - Desktop: click thumbnail → smooth to exact video
   - Mobile: speed-sensitive swipe with per-orientation caps
       • Portrait max 3, Landscape max 5
   - Vimeo/custom thumbs: fetch + preload; draw immediately
======================================== */

/* ---------- Constants ---------- */
const SLIDES_EMBED =
  "https://docs.google.com/presentation/d/15g1qwIg_L9d_c9nFa1tIBOqP5yHU3__oGkUJSyVaSM8/embed?start=false&loop=false";
const DEFAULT_THUMB = "assets/2016_reel.png";
const EASE = "ease-out"; // changed from cubic-bezier to ease-out
const MOVE_T = () => (getComputedStyle(document.documentElement).getPropertyValue("--move-t") || "300ms").trim();
const PORTRAIT_MAX = 3;
const LANDSCAPE_MAX = 5;

/* ---------- Videos (order) ---------- */
const videos = [
  { type: "slides", title: "Meta • Realtime / Avatars — (Google Slides embed)", url: SLIDES_EMBED, thumb: "assets/meta_thumb.png" },
  { type: "vimeo",  title: "2022 Animated Reel — (start on this video)", url: "https://vimeo.com/841625715?fl=pl&fe=sh", thumb: "assets/2022_reel.png" },
  { type: "vimeo",  title: "Spies in Disguise",          url: "https://vimeo.com/396309161?fl=pl&fe=sh", thumb: "assets/Spies_in_Disguise_logo.webp" },
  { type: "vimeo",  title: "Ferdinand",                  url: "https://vimeo.com/261414975?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Ice Age 5",                  url: "https://vimeo.com/197231614?fl=pl&fe=sh" },
  { type: "vimeo",  title: "2016 DreamWorks + VFX Reel", url: "https://vimeo.com/187104927?fl=pl&fe=sh", thumb: "assets/2016_reel.png" },
  { type: "vimeo",  title: "Ted 2",                      url: "https://vimeo.com/135137438?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Home",                       url: "https://vimeo.com/135130136?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Turbo",                      url: "https://vimeo.com/78884991?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Madagascar 3",               url: "https://vimeo.com/41671911?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Puss in Boots",              url: "https://vimeo.com/29300355?fl=pl&fe=sh" },
  { type: "vimeo",  title: "2010 Animation Reel",        url: "https://vimeo.com/13774020?fl=pl&fe=sh", thumb: "assets/2010_reel.png" },
  { type: "vimeo",  title: "Iron Man 2",                 url: "https://vimeo.com/15692714?fl=pl&fe=sh",  thumb: "assets/iron_thumb.png" },
  { type: "vimeo",  title: "Cats & Dogs 2",              url: "https://vimeo.com/15694987?fl=pl&fe=sh",  thumb: "assets/ca2_thumb.png" },
  { type: "vimeo",  title: "BioShock 2",                 url: "https://vimeo.com/15718152?fl=pl&fe=sh",  thumb: "assets/bio2_thumb.png" },
  { type: "vimeo",  title: "Spiderwick Chronicles",      url: "https://vimeo.com/4833250?fl=pl&fe=sh",   thumb: "assets/spiderwick.png" },
  { type: "vimeo",  title: "Superman Returns",           url: "https://vimeo.com/4830488?fl=pl&fe=sh",   thumb: "assets/superman_thumb.png" },
  { type: "vimeo",  title: "Keeper (placeholder)",       url: "https://vimeo.com/1128683237",            thumb: "assets/keeper_thumb.png" },
];

/* ---------- DOM ---------- */
const shell    = document.getElementById("video-shell");
const strip    = document.getElementById("filmstrip");
const viewport = document.querySelector(".filmstrip-viewport");
const wrap     = document.getElementById("filmstrip-wrap");
const arrowL   = document.getElementById("arrow-left");
const arrowR   = document.getElementById("arrow-right");

/* ---------- State ---------- */
const state = { unit: 0, moving: false };
const vimeoThumbCache = new Map();
const resolvedThumbs  = new Map();
const BASE_CENTER = () => videos.length + 1; // logical center index in middle copy

/* ---------- Helpers ---------- */
const cssNum      = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
const toPlayerUrl = u => u.replace("vimeo.com/", "player.vimeo.com/video/");
const isVimeo     = v => v.type === "vimeo";
const isTouch     = () => ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
const isLandscape = () => window.innerWidth > window.innerHeight;

/* ---------- Vimeo thumbnail fetch + preload ---------- */
async function fetchVimeoThumb(url) {
  if (vimeoThumbCache.has(url)) return vimeoThumbCache.get(url);
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    const data = await r.json();
    let t = data.thumbnail_url || "";
    t = t.replace(/_640\.jpg$/i, "_960.jpg");
    await new Promise((res) => {
      const img = new Image();
      img.onload = () => res();
      img.onerror = () => res();
      img.src = t;
    });
    vimeoThumbCache.set(url, t);
    return t;
  } catch {
    return DEFAULT_THUMB;
  }
}

async function resolveThumb(realIndex) {
  if (resolvedThumbs.has(realIndex)) return resolvedThumbs.get(realIndex);
  const v = videos[realIndex];
  let url = v.thumb;
  if (!url && isVimeo(v)) url = await fetchVimeoThumb(v.url);
  if (!url) url = DEFAULT_THUMB;
  resolvedThumbs.set(realIndex, url);
  return url;
}

/* ---------- Player ---------- */
function showMedia(item) {
  shell.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.title = item.title;
  iframe.allowFullscreen = true;
  iframe.allow = "fullscreen; picture-in-picture";
  iframe.style.background = "#000";
  iframe.src = item.type === "slides" ? item.url : toPlayerUrl(item.url);
  iframe.classList.add("active");
  shell.appendChild(iframe);

  if (item.type === "slides") {
    const fs = document.createElement("div");
    fs.className = "slides-fs-btn";
    fs.title = "Open Slides";
    fs.addEventListener("click", () => window.open(item.url.replace("/embed?", "/present?"), "_blank"));
    shell.appendChild(fs);
  }
}

/* ---------- Build thumbnail ---------- */
async function createThumb(realIndex) {
  const d = document.createElement("div");
  d.className = "thumb";
  d.dataset.realIndex = String(realIndex);
  d.style.backgroundImage = `url('${DEFAULT_THUMB}')`; // immediate placeholder
  resolveThumb(realIndex).then(url => { d.style.backgroundImage = `url('${url}')`; });
  d.addEventListener("click", () => snapToReal(realIndex));
  return d;
}

/* ---------- Initial render ---------- */
async function render() {
  strip.innerHTML = "";

  // Warm thumbs (non-blocking)
  videos.forEach((_, i) => resolveThumb(i));

  // Triplicate for seamless loop
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < videos.length; i++) {
      strip.appendChild(await createThumb(i));
    }
  }

  calcUnit();

  // Set logical center to the middle copy; start on video index 1
  strip._centerIdx = BASE_CENTER();
  centerOn(strip._centerIdx, false);
  activateByReal(1);
  showMedia(videos[1]);

  strip.addEventListener("transitionend", onTransitionEnd);
}

/* ---------- Layout / transform helpers ---------- */
function calcUnit() {
  const el = strip.querySelector(".thumb");
  const w = el ? el.getBoundingClientRect().width : cssNum("--thumb-w") || 180;
  const gap = parseFloat(getComputedStyle(strip).gap || cssNum("--gap") || 36);
  state.unit = w + gap;
}
function translateForCentered(childIndex) {
  const viewW = viewport.clientWidth;
  const x = (viewW / 2) - ((childIndex + 0.5) * state.unit);
  return `translate3d(${x}px,0,0)`;
}
function centerOn(childIndex, animate = true) {
  strip.style.transition = animate ? `transform ${MOVE_T()} ${EASE}` : "none";
  strip.style.transform = translateForCentered(childIndex);
  if (!animate) { void strip.offsetWidth; strip.style.transition = ""; }
}

/* ---------- Active highlight ---------- */
function activateByReal(realIndex) {
  Array.from(strip.children).forEach(el =>
    el.classList.toggle("playing", parseInt(el.dataset.realIndex, 10) === realIndex)
  );
}

/* ---------- Infinite loop core with constant center ---------- */
function getCenterIdx() { return strip._centerIdx || (strip._centerIdx = BASE_CENTER()); }

function normalizeAfterSteps(steps) {
  // Move DOM nodes to keep the logical center fixed at BASE_CENTER()
  if (steps > 0) {
    for (let i = 0; i < steps; i++) strip.appendChild(strip.firstElementChild);
  } else if (steps < 0) {
    for (let i = 0; i < -steps; i++) strip.insertBefore(strip.lastElementChild, strip.firstElementChild);
  }
  strip.style.transition = "none";
  centerOn(BASE_CENTER(), false);
}

function onTransitionEnd(e) {
  if (e.target !== strip) return;
  const steps = strip._pendingSteps || 0;
  if (!steps) { state.moving = false; return; }

  // Normalize loop
  normalizeAfterSteps(steps);
  strip._pendingSteps = 0;
  state.moving = false;

  // Update active + media based on middle child
  const centerChild = strip.children[BASE_CENTER()];
  const realIndex = parseInt(centerChild.dataset.realIndex, 10);
  activateByReal(realIndex);
  showMedia(videos[realIndex]);
}

/* ---------- One-step arrows ---------- */
function stepOne(dir) {
  if (state.moving) return;
  state.moving = true;
  strip._pendingSteps = dir; // ±1
  centerOn(BASE_CENTER() + dir, true);
}

/* ---------- Desktop click: smooth to exact video (nearest copy) ---------- */
function findClosestChildIndexForReal(realIndex) {
  const kids = strip.children;
  let best = -1, bestDist = Infinity;
  for (let i = 0; i < kids.length; i++) {
    if (parseInt(kids[i].dataset.realIndex, 10) === realIndex) {
      const d = Math.abs(i - BASE_CENTER());
      if (d < bestDist) { bestDist = d; best = i; if (d === 0) break; }
    }
  }
  return best;
}
function snapToReal(realIndex) {
  if (state.moving) return;
  const targetIdx = findClosestChildIndexForReal(realIndex);
  if (targetIdx === -1) return;
  const steps = targetIdx - BASE_CENTER();
  if (steps === 0) {
    activateByReal(realIndex);
    showMedia(videos[realIndex]);
    return;
  }
  state.moving = true;
  strip._pendingSteps = steps;
  centerOn(BASE_CENTER() + steps, true);
}

/* ---------- Swipe: speed-sensitive with orientation caps (FIXED) ---------- */
function maxStepsByOrientation() {
  return isLandscape() ? LANDSCAPE_MAX : PORTRAIT_MAX;
}
function stepsFromGesture(totalDx, vPxPerMs) {
  // totalDx: drag distance (px), right positive
  // vPxPerMs: last sampled velocity (px/ms), right positive
  const unit = state.unit || 1;

  // Score from distance & velocity
  const distScore  = Math.abs(totalDx) / (unit * 0.65); // more weight to distance
  const speedScore = Math.abs(vPxPerMs) * 10;           // tempered velocity
  let steps = Math.floor(Math.max(distScore, speedScore));

  // Minimum 1 if meaningful gesture
  if (steps === 0 && Math.abs(totalDx) > unit * 0.25) steps = 1;

  // Direction: left swipe (negative dx) => next (+steps), right => prev (-steps)
  steps = totalDx < 0 ? +steps : -steps;

  // Cap by orientation
  const cap = maxStepsByOrientation();
  if (steps > cap) steps = cap;
  if (steps < -cap) steps = -cap;

  return steps;
}

let dragging = false, startX = 0, lastX = 0, lastT = 0, v = 0;
wrap.addEventListener("touchstart", e => {
  if (!isTouch() || state.moving) return;
  dragging = true;
  const t = e.touches[0];
  startX = lastX = t.clientX;
  lastT = performance.now();
  v = 0;
  strip.style.transition = "none";
}, { passive: true });

wrap.addEventListener("touchmove", e => {
  if (!dragging) return;
  const t = e.touches[0];
  const now = performance.now();
  const dx = t.clientX - lastX;
  const dt = Math.max(1, now - lastT);
  v = dx / dt; // px/ms
  lastX = t.clientX;
  lastT = now;

  const baseXMatch = /translate3d\(([-0-9.]+)px/.exec(translateForCentered(BASE_CENTER()));
  const baseX = baseXMatch ? parseFloat(baseXMatch[1]) : 0;
  const totalDx = t.clientX - startX;
  strip.style.transform = `translate3d(${baseX + totalDx}px,0,0)`;
}, { passive: true });

wrap.addEventListener("touchend", () => {
  if (!dragging) return;
  dragging = false;
  const totalDx = lastX - startX;
  const steps = stepsFromGesture(totalDx, v);

  if (steps === 0) { centerOn(BASE_CENTER(), true); return; }
  if (state.moving) return;
  state.moving = true;
  strip._pendingSteps = steps;
  centerOn(BASE_CENTER() + steps, true);
}, { passive: true });

/* ---------- Controls ---------- */
arrowR.addEventListener("click", () => stepOne(1));
arrowL.addEventListener("click", () => stepOne(-1));

/* ---------- Resize + Orientation ---------- */
function recalcAndCenter() {
  calcUnit();
  strip.style.transition = "none";
  centerOn(BASE_CENTER(), false);
}
let rto;
window.addEventListener("resize", () => { clearTimeout(rto); rto = setTimeout(recalcAndCenter, 120); });
window.addEventListener("orientationchange", () => { setTimeout(recalcAndCenter, 120); });

/* ---------- Init ---------- */
render();

/* ---------- Copy-to-Clipboard (email) ---------- */
const emailLink = document.getElementById("email-link");
const copyIcon  = document.getElementById("copy-icon");
const copyText  = document.getElementById("copy-text");
if (copyIcon && emailLink && copyText) {
  const flash = () => {
    copyText.classList.add("visible");
    clearTimeout(copyText._h);
    copyText._h = setTimeout(() => copyText.classList.remove("visible"), 1500);
  };
  copyIcon.addEventListener("click", async () => {
    const text = (emailLink.textContent || "").trim();
    try { await navigator.clipboard.writeText(text); flash(); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta); flash();
    }
  });
}
