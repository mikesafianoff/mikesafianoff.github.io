/* ========================================
   Portfolio Reel — Final Momentum + Desktop Smooth + Loop
   - Mobile: true inertia (free-scroll) -> auto-snaps multiple items based on velocity
   - Desktop: smooth click-to-center; arrows move exactly one item
   - Infinite loop preserved (tripled strip with normalization)
   - Vimeo thumbnails restored + preloaded; draw immediately
======================================== */

/* ---------- Constants ---------- */
const SLIDES_EMBED =
  "https://docs.google.com/presentation/d/15g1qwIg_L9d_c9nFa1tIBOqP5yHU3__oGkUJSyVaSM8/embed?start=false&loop=false";
const DEFAULT_THUMB = "assets/2016_reel.png";
const EASE = "cubic-bezier(.22,.61,.36,1)"; // cinematic smooth

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
  d.style.backgroundImage = `url('${DEFAULT_THUMB}')`; // placeholder first
  resolveThumb(realIndex).then(url => { d.style.backgroundImage = `url('${url}')`; });
  d.addEventListener("click", () => snapToReal(realIndex));
  return d;
}

/* ---------- Initial render ---------- */
async function render() {
  strip.innerHTML = "";

  // Warm all thumbs non-blocking
  videos.forEach((_, i) => resolveThumb(i));

  // Triplicate for infinite loop
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < videos.length; i++) {
      strip.appendChild(await createThumb(i));
    }
  }

  calcUnit();

  // Start centered on index 1 (2022) in middle copy
  const startIndex = videos.length + 1;
  strip._centerIdx = startIndex;
  centerOn(startIndex, false);
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
  const moveT = (getComputedStyle(document.documentElement).getPropertyValue("--move-t") || "300ms").trim();
  strip.style.transition = animate ? `transform ${moveT} ${EASE}` : "none";
  strip.style.transform = translateForCentered(childIndex);
  if (!animate) { void strip.offsetWidth; strip.style.transition = ""; }
}

/* ---------- Active highlight ---------- */
function activateByReal(realIndex) {
  Array.from(strip.children).forEach(el =>
    el.classList.toggle("playing", parseInt(el.dataset.realIndex, 10) === realIndex)
  );
}

/* ---------- Infinite loop core ---------- */
function getCenterIdx() {
  if (typeof strip._centerIdx !== "number") strip._centerIdx = videos.length + 1;
  return strip._centerIdx;
}
function normalizeAfterSteps(steps) {
  // Recycle DOM without animation to keep center index consistent
  if (steps > 0) {
    for (let i = 0; i < steps; i++) strip.appendChild(strip.firstElementChild);
  } else if (steps < 0) {
    for (let i = 0; i < -steps; i++) strip.insertBefore(strip.lastElementChild, strip.firstElementChild);
  }
  strip.style.transition = "none";
  centerOn(getCenterIdx(), false);
}
function onTransitionEnd(e) {
  if (e.target !== strip) return;
  const steps = strip._pendingSteps || 0;
  if (!steps) { state.moving = false; return; }
  normalizeAfterSteps(steps);
  strip._pendingSteps = 0;
  state.moving = false;
  const centerChild = strip.children[getCenterIdx()];
  const realIndex = parseInt(centerChild.dataset.realIndex, 10);
  activateByReal(realIndex);
  showMedia(videos[realIndex]);
}

/* ---------- Arrow: exactly one step ---------- */
function stepOne(dir) { // dir = +1 next (left), -1 prev (right)
  if (state.moving) return;
  state.moving = true;
  const targetIdx = getCenterIdx() + dir;
  strip._centerIdx = targetIdx;
  strip._pendingSteps = dir; // normalize by 1 after transition
  centerOn(targetIdx, true);
}

/* ---------- Momentum target compute (mobile) ---------- */
function stepsFromMomentum(totalDx, vPxPerMs) {
  // vPxPerMs is positive or negative; decelerate to zero with a = 0.004 px/ms^2
  const a = 0.004; // deceleration
  const extra = Math.sign(vPxPerMs) * (vPxPerMs * vPxPerMs) / (2 * a); // s = v^2 / 2a
  const intended = totalDx + extra; // px
  let steps = Math.round(intended / state.unit);
  if (steps === 0 && Math.abs(intended) > state.unit * 0.25) steps = Math.sign(intended); // ensure at least one if meaningful
  const cap = 6; // don't jump too far
  if (steps > cap) steps = cap;
  if (steps < -cap) steps = -cap;
  return steps;
}

/* ---------- Click: jump to nearest copy smoothly ---------- */
function findClosestChildIndexForReal(realIndex) {
  const kids = strip.children;
  const center = getCenterIdx();
  let best = -1, bestDist = Infinity;
  for (let i = 0; i < kids.length; i++) {
    if (parseInt(kids[i].dataset.realIndex, 10) === realIndex) {
      const d = Math.abs(i - center);
      if (d < bestDist) { bestDist = d; best = i; if (d === 0) break; }
    }
  }
  return best;
}
function snapToReal(realIndex) {
  if (state.moving) return;
  const targetIdx = findClosestChildIndexForReal(realIndex);
  if (targetIdx === -1) return;
  state.moving = true;
  strip._centerIdx = targetIdx;
  strip._pendingSteps = targetIdx - getCenterIdx();
  centerOn(targetIdx, true);
  // After the transition normalizes, onTransitionEnd updates media/active
}

/* ---------- Build controls ---------- */
arrowR.addEventListener("click", () => stepOne(1));
arrowL.addEventListener("click", () => stepOne(-1));

/* ---------- Touch with inertia (mobile only) ---------- */
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

  const base = translateForCentered(getCenterIdx());
  const m = /translate3d\(([-0-9.]+)px/.exec(base);
  const baseX = m ? parseFloat(m[1]) : 0;
  const totalDx = t.clientX - startX;
  strip.style.transform = `translate3d(${baseX + totalDx}px,0,0)`;
}, { passive: true });

wrap.addEventListener("touchend", e => {
  if (!dragging) return;
  dragging = false;
  const totalDx = lastX - startX; // px
  // Orientation-aware assist: smaller threshold in landscape
  const orientBoost = isLandscape() ? 1.0 : 1.0; // using momentum calc instead
  const steps = stepsFromMomentum(totalDx * orientBoost, v);
  if (steps === 0) {
    centerOn(getCenterIdx(), true);
    return;
  }
  if (state.moving) return;
  state.moving = true;
  const targetIdx = getCenterIdx() + steps;
  strip._centerIdx = targetIdx;
  strip._pendingSteps = steps;
  centerOn(targetIdx, true);
}, { passive: true });

/* ---------- Resize + Orientation ---------- */
function recalcAndCenter() { calcUnit(); centerOn(getCenterIdx(), false); }
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
