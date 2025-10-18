/* ---------- Constants ---------- */
const SLIDES_EMBED =
  "https://docs.google.com/presentation/d/15g1qwIg_L9d_c9nFa1tIBOqP5yHU3__oGkUJSyVaSM8/embed?start=false&loop=false";

/* ---------- Video List (exact order) ---------- */
/* Per your rule:
   - If `thumb` is provided -> use it (no Vimeo fetch)
   - If `thumb` is null/undefined for a Vimeo item -> fetch via oEmbed
   - Meta/Slides always uses custom thumb
*/
const videos = [
  { type: "slides", title: "Meta • Realtime / Avatars — (Google Slides embed)", url: SLIDES_EMBED, thumb: "assets/meta_thumb.png" },

  { type: "vimeo", title: "2022 Animated Reel — (start on this video)", url: "https://vimeo.com/841625715?fl=pl&fe=sh", thumb: "assets/2022_reel.png" },
  { type: "vimeo", title: "Spies in Disguise", url: "https://vimeo.com/396309161?fl=pl&fe=sh", thumb: "assets/Spies_in_Disguise_logo.webp" },
  { type: "vimeo", title: "Ferdinand", url: "https://vimeo.com/261414975?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Ice Age 5", url: "https://vimeo.com/197231614?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "2016 DreamWorks + VFX Reel", url: "https://vimeo.com/187104927?fl=pl&fe=sh", thumb: "assets/2016_reel.png" },
  { type: "vimeo", title: "Ted 2", url: "https://vimeo.com/135137438?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Home", url: "https://vimeo.com/135130136?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Turbo", url: "https://vimeo.com/78884991?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Madagascar 3", url: "https://vimeo.com/41671911?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Puss in Boots", url: "https://vimeo.com/29300355?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "2010 Animation Reel", url: "https://vimeo.com/13774020?fl=pl&fe=sh", thumb: "assets/2010_reel.png" },
  { type: "vimeo", title: "Iron Man 2", url: "https://vimeo.com/15692714?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Cats & Dogs 2", url: "https://vimeo.com/15694987?fl=pl&fe=sh", thumb: null },
  { type: "vimeo", title: "Bioshock 2", url: "https://vimeo.com/15718152", thumb: null },
  { type: "vimeo", title: "Spiderwick Chronicles", url: "https://vimeo.com/4833250?fl=pl&fe=sh", thumb: "assets/spiderwick.png" },
  { type: "vimeo", title: "Superman Returns", url: "https://vimeo.com/4830488?fl=pl&fe=sh", thumb: null }
];

/* ---------- DOM ---------- */
const shell = document.getElementById("video-shell");
const strip = document.getElementById("filmstrip");
const viewport = document.querySelector(".filmstrip-viewport");
const arrowL = document.getElementById("arrow-left");
const arrowR = document.getElementById("arrow-right");

/* ---------- State ---------- */
const state = { current: 0, unit: 0 };
const vimeoThumbCache = new Map();

/* ---------- Helpers ---------- */
const cssNum = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
const toPlayerUrl = (url) => url.replace("vimeo.com/", "player.vimeo.com/video/");
const isVimeo = v => v.type === "vimeo";

/* Fetch Vimeo thumbnail via oEmbed when no custom thumb exists */
async function fetchVimeoThumb(url) {
  if (vimeoThumbCache.has(url)) return vimeoThumbCache.get(url);
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { mode: "cors" });
    if (!r.ok) throw 0;
    const data = await r.json();
    // Use higher-res if available by swapping common suffix
    const thumb = (data.thumbnail_url || "").replace(/_640\.jpg$/i, "_960.jpg");
    vimeoThumbCache.set(url, thumb);
    return thumb;
  } catch {
    // If oEmbed fails, use a neutral fallback (keeps UI intact)
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
    const fsBtn = document.createElement("div");
    fsBtn.className = "slides-fs-btn";
    fsBtn.title = "Open Slides";
    fsBtn.addEventListener("click", () => {
      window.open(item.url.replace("/embed?", "/present?"), "_blank");
    });
    shell.appendChild(fsBtn);
  }
}

/* ---------- Thumbnails ---------- */
async function buildThumb(realIndex) {
  const v = videos[realIndex];

  const d = document.createElement("div");
  d.className = "thumb";
  d.dataset.realIndex = String(realIndex);

  let bg = v.thumb; // use custom if provided
  if (!bg && isVimeo(v)) {
    // fetch Vimeo thumbnail only if no custom thumb provided
    bg = await fetchVimeoThumb(v.url);
  }
  if (!bg) {
    // ultimate fallback (shouldn't be hit often)
    bg = "assets/2016_reel.png";
  }
  d.style.backgroundImage = `url('${bg}')`;

  d.addEventListener("click", () => playReal(realIndex));
  return d;
}

/* ---------- Render ---------- */
async function render() {
  strip.innerHTML = "";
  const repeatCount = 3;
  const frags = [];
  for (let i = 0; i < repeatCount; i++) {
    for (let j = 0; j < videos.length; j++) frags.push(await buildThumb(j));
  }
  frags.forEach(el => strip.appendChild(el));

  calcUnit();
  // Start centered on 2022 reel (index 1)
  state.current = videos.length + 1;
  requestAnimationFrame(() => {
    jumpTo(state.current);
    showMedia(videos[1]);
    highlight(1);
  });
}

/* ---------- Layout / Motion ---------- */
function calcUnit() {
  const el = strip.querySelector(".thumb");
  const w = el ? el.getBoundingClientRect().width : cssNum("--thumb-w");
  const gap = parseFloat(getComputedStyle(strip).gap || cssNum("--gap"));
  state.unit = w + gap;
}

function translateForIndex(i) {
  const itemW = state.unit;
  const viewW = viewport.clientWidth;
  const x = (viewW / 2) - ((i + 0.5) * itemW);
  return `translate3d(${x}px,0,0)`;
}

function applyTransform(i, animate = true) {
  strip.style.transition = animate ? "transform 0.5s ease" : "none";
  strip.style.transform = translateForIndex(i);
  if (!animate) {
    void strip.offsetWidth; // reflow to re-enable transition
    strip.style.transition = "";
  }
}

function jumpTo(i) { applyTransform(i, false); }
function moveTo(i) { applyTransform(i, true); }

/* ---------- Selection / Looping ---------- */
function highlight(realIndex) {
  Array.from(strip.children).forEach(el =>
    el.classList.toggle("playing", parseInt(el.dataset.realIndex, 10) === realIndex)
  );
}

function realFromCurrent(i) {
  const N = videos.length;
  return ((i % N) + N) % N;
}

function playReal(realIndex) {
  const target = videos.length + realIndex; // middle copy for seamless wrap
  state.current = target;
  moveTo(state.current);
  highlight(realIndex);
  showMedia(videos[realIndex]);
}

function step(dir) {
  state.current += dir;
  moveTo(state.current);
  setTimeout(() => {
    const N = videos.length;
    if (state.current < N) state.current += N;
    else if (state.current >= N * 2) state.current -= N;
    jumpTo(state.current);
  }, 490);

  const real = realFromCurrent(state.current);
  highlight(real);
  showMedia(videos[real]);
}

/* ---------- Controls ---------- */
arrowL.addEventListener("click", () => step(-1)); // left = previous
arrowR.addEventListener("click", () => step(1));  // right = next

/* ---------- Touch (mobile) ---------- */
let dragging = false, startX = 0, startIndex = 0;
function beginTouch(x){ dragging = true; startX = x; startIndex = state.current; strip.style.transition = "none"; }
function moveTouch(x){ if(!dragging) return; const dx = x - startX; const idxFloat = startIndex - (dx / state.unit); strip.style.transform = translateForIndex(idxFloat); }
function endTouch(x){
  if(!dragging) return;
  dragging = false;
  const dx = x - startX;
  if (Math.abs(dx) > state.unit * 0.25) step(dx < 0 ? 1 : -1);
  else moveTo(state.current);
}
viewport.addEventListener("touchstart", e => beginTouch(e.touches[0].clientX), {passive:true});
viewport.addEventListener("touchmove",  e => moveTouch(e.touches[0].clientX), {passive:true});
viewport.addEventListener("touchend",   e => endTouch(e.changedTouches[0].clientX), {passive:true});

/* ---------- Resize ---------- */
let rto;
window.addEventListener("resize", () => {
  clearTimeout(rto);
  rto = setTimeout(() => { calcUnit(); jumpTo(state.current); }, 120);
});

/* ---------- Init ---------- */
render();
