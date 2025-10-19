/* ========================================
   Portfolio Reel — FULL script.js (LKG-based)
   Change: unified 300ms motion via CSS var; smoother bezier
======================================== */

/* ---------- Constants ---------- */
const SLIDES_EMBED =
  "https://docs.google.com/presentation/d/15g1qwIg_L9d_c9nFa1tIBOqP5yHU3__oGkUJSyVaSM8/embed?start=false&loop=false";

/* ---------- Videos (order preserved) ---------- */
const videos = [
  { type: "slides", title: "Meta • Realtime / Avatars — (Google Slides embed)", url: SLIDES_EMBED, thumb: "assets/meta_thumb.png" },
  { type: "vimeo",  title: "2022 Animated Reel — (start on this video)", url: "https://vimeo.com/841625715?fl=pl&fe=sh", thumb: "assets/2022_reel.png" },
  { type: "vimeo",  title: "Spies in Disguise", url: "https://vimeo.com/396309161?fl=pl&fe=sh", thumb: "assets/Spies_in_Disguise_logo.webp" },
  { type: "vimeo",  title: "Ferdinand", url: "https://vimeo.com/261414975?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Ice Age 5", url: "https://vimeo.com/197231614?fl=pl&fe=sh" },
  { type: "vimeo",  title: "2016 DreamWorks + VFX Reel", url: "https://vimeo.com/187104927?fl=pl&fe=sh", thumb: "assets/2016_reel.png" },
  { type: "vimeo",  title: "Ted 2", url: "https://vimeo.com/135137438?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Home", url: "https://vimeo.com/135130136?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Turbo", url: "https://vimeo.com/78884991?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Madagascar 3", url: "https://vimeo.com/41671911?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Puss in Boots", url: "https://vimeo.com/29300355?fl=pl&fe=sh" },
  { type: "vimeo",  title: "2010 Animation Reel", url: "https://vimeo.com/13774020?fl=pl&fe=sh", thumb: "assets/2010_reel.png" },
  { type: "vimeo",  title: "Iron Man 2", url: "https://vimeo.com/15692714?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Cats & Dogs 2", url: "https://vimeo.com/15694987?fl=pl&fe=sh" },
  { type: "vimeo",  title: "Bioshock 2", url: "https://vimeo.com/15718152" },
  { type: "vimeo",  title: "Spiderwick Chronicles", url: "https://vimeo.com/4833250?fl=pl&fe=sh", thumb: "assets/spiderwick.png" },
  { type: "vimeo",  title: "Superman Returns", url: "https://vimeo.com/4830488?fl=pl&fe=sh" }
];

/* ---------- DOM ---------- */
const shell    = document.getElementById("video-shell");
const strip    = document.getElementById("filmstrip");
const viewport = document.querySelector(".filmstrip-viewport");
const arrowL   = document.getElementById("arrow-left");
const arrowR   = document.getElementById("arrow-right");

/* ---------- State ---------- */
const state = {
  unit: 0,        // width + gap of a thumbnail
  moving: false,  // prevent double steps during transition
};
const vimeoThumbCache = new Map();

/* ---------- Helpers ---------- */
const cssNum      = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
const toPlayerUrl = u => u.replace("vimeo.com/", "player.vimeo.com/video/");
const isVimeo     = v => v.type === "vimeo";

/* ---------- Vimeo thumbnails (fallback-safe) ---------- */
async function fetchVimeoThumb(url) {
  if (vimeoThumbCache.has(url)) return vimeoThumbCache.get(url);
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { mode: "cors" });
    const data = await r.json();
    const t = (data.thumbnail_url || "").replace(/_640\.jpg$/i, "_960.jpg");
    vimeoThumbCache.set(url, t);
    return t;
  } catch {
    const fallback = "assets/2016_reel.png";
    vimeoThumbCache.set(url, fallback);
    return fallback;
  }
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
    fs.addEventListener("click", () => {
      window.open(item.url.replace("/embed?", "/present?"), "_blank");
    });
    shell.appendChild(fs);
  }
}

/* ---------- Build a thumbnail ---------- */
async function createThumb(realIndex) {
  const v = videos[realIndex];
  const d = document.createElement("div");
  d.className = "thumb";
  d.dataset.realIndex = String(realIndex);

  let bg = v.thumb;
  if (!bg && isVimeo(v)) bg = await fetchVimeoThumb(v.url);
  if (!bg) bg = "assets/2016_reel.png";

  d.style.backgroundImage = `url('${bg}')`;
  d.addEventListener("click", () => snapToReal(realIndex));
  return d;
}

/* ---------- Initial render ---------- */
async function render() {
  strip.innerHTML = "";
  // Build 3 copies for seamless loop (no blank edges)
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < videos.length; i++) {
      strip.appendChild(await createThumb(i));
    }
  }
  calcUnit();

  // Start centered on 2022 reel (index 1) in the middle copy
  const startIndex = videos.length + 1;
  centerOn(startIndex, false);
  activateByReal(1);
  showMedia(videos[1]);

  strip.addEventListener("transitionend", onTransitionEnd);
}

/* ---------- Layout / transforms ---------- */
function calcUnit() {
  const el = strip.querySelector(".thumb");
  const w = el ? el.getBoundingClientRect().width : cssNum("--thumb-w");
  const gap = parseFloat(getComputedStyle(strip).gap || cssNum("--gap"));
  state.unit = w + gap;
}
function translateForCentered(childIndex) {
  const viewW = viewport.clientWidth;
  const x = (viewW / 2) - ((childIndex + 0.5) * state.unit);
  return `translate3d(${x}px,0,0)`;
}
function centerOn(childIndex, animate = true) {
  // Uses CSS var --move-t (300ms) for speed to match CSS
  const moveT = getComputedStyle(document.documentElement).getPropertyValue("--move-t").trim() || "300ms";
  strip.style.transition = animate ? `transform ${moveT} cubic-bezier(.22,.61,.36,1)` : "none";
  strip.style.transform = translateForCentered(childIndex);
  if (!animate) { void strip.offsetWidth; strip.style.transition = ""; }
}

/* ---------- Activate / glow ---------- */
function activateByReal(realIndex) {
  Array.from(strip.children).forEach(el =>
    el.classList.toggle("playing", parseInt(el.dataset.realIndex, 10) === realIndex)
  );
}

/* ---------- Infinite loop / direction ---------- */
function getCenterIdx() {
  if (typeof strip._centerIdx !== "number") strip._centerIdx = videos.length + 1;
  return strip._centerIdx;
}
function step(dir) {
  // dir = +1 → NEXT (strip moves LEFT), dir = -1 → PREV (strip moves RIGHT)
  if (state.moving) return;
  state.moving = true;
  const newIdx = getCenterIdx() + dir;
  centerOn(newIdx, true);
  strip._pendingDir = dir;
}
function onTransitionEnd(e) {
  if (e.target !== strip) return;
  const dir = strip._pendingDir || 0;
  if (!dir) { state.moving = false; return; }

  if (dir === 1) strip.appendChild(strip.firstElementChild); // moved left → take first to end
  else if (dir === -1) strip.insertBefore(strip.lastElementChild, strip.firstElementChild); // moved right → take last to start

  strip.style.transition = "none";
  centerOn(getCenterIdx(), false);
  strip._pendingDir = 0;
  state.moving = false;

  const centerChild = strip.children[getCenterIdx()];
  const realIndex = parseInt(centerChild.dataset.realIndex, 10);
  activateByReal(realIndex);
  showMedia(videos[realIndex]);
}

/* ---------- Jump to specific real index (thumbnail click) ---------- */
function snapToReal(realIndex) {
  const kids = Array.from(strip.children);
  const centerIdx = getCenterIdx();

  let bestOffset = 0, bestDist = Infinity;
  for (let o = -videos.length; o <= videos.length; o++) {
    const idx = centerIdx + o;
    const child = kids[(idx % kids.length + kids.length) % kids.length];
    if (parseInt(child.dataset.realIndex, 10) === realIndex) {
      const d = Math.abs(o);
      if (d < bestDist) { bestDist = d; bestOffset = o; }
      if (d === 0) break;
    }
  }
  if (bestOffset === 0) { activateByReal(realIndex); showMedia(videos[realIndex]); return; }

  const dir = bestOffset > 0 ? 1 : -1;
  const steps = Math.abs(bestOffset);
  let i = 0;
  const tick = () => {
    if (i >= steps) return;
    const done = () => { strip.removeEventListener("transitionend", done); i++; if (i < steps) tick(); };
    strip.addEventListener("transitionend", done, { once: true });
    step(dir);
  };
  tick();
}

/* ---------- Controls ---------- */
arrowR.addEventListener("click", () => step(1));   // right → next (strip left)
arrowL.addEventListener("click", () => step(-1));  // left  → prev (strip right)

/* ---------- Touch / Mobile (smooth re-center; no snap-back) ---------- */
let dragging = false, startX = 0;
viewport.addEventListener("touchstart", e => {
  if (state.moving) return;
  dragging = true;
  startX = e.touches[0].clientX;
  strip.style.transition = "none";
}, { passive: true });

viewport.addEventListener("touchmove", e => {
  if (!dragging) return;
  const dx = e.touches[0].clientX - startX;
  const base = translateForCentered(getCenterIdx());
  const m = /translate3d\(([-0-9.]+)px/.exec(base);
  const baseX = m ? parseFloat(m[1]) : 0;
  strip.style.transform = `translate3d(${baseX + dx}px,0,0)`;
}, { passive: true });

viewport.addEventListener("touchend", e => {
  if (!dragging) return;
  dragging = false;
  const dx = e.changedTouches[0].clientX - startX;
  const moveT = getComputedStyle(document.documentElement).getPropertyValue("--move-t").trim() || "300ms";
  const threshold = state.unit * 0.12; // quick responsiveness
  strip.style.transition = `transform ${moveT} cubic-bezier(.22,.61,.36,1)`;
  if (Math.abs(dx) > threshold) step(dx < 0 ? 1 : -1); else centerOn(getCenterIdx(), true);
}, { passive: true });

/* ---------- Resize ---------- */
let rto;
window.addEventListener("resize", () => {
  clearTimeout(rto);
  rto = setTimeout(() => { calcUnit(); centerOn(getCenterIdx(), false); }, 120);
});

/* ---------- Init ---------- */
render();

/* ---------- Copy-to-Clipboard ---------- */
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
    try {
      await navigator.clipboard.writeText(text);
      flash();
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
      flash();
    }
  });
}
