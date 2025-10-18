// Vimeo / Google Slides playlist
// Infinite seamless filmstrip with true pixel-centering and smoother easing.

const SLIDES_EMBED =
  "https://docs.google.com/presentation/d/15g1qwIg_L9d_c9nFa1tIBOqP5yHU3__oGkUJSyVaSM8/embed?start=false&loop=false";

const videos = [
  { id: "meta", title: "Meta • Realtime / Avatars", thumb: "assets/meta_thumb.png", slides: SLIDES_EMBED },
  { id: "841625715", title: "2022 Animated Reel", thumb: "assets/2022_reel.png" },
  { id: "396309161", title: "Spies in Disguise", thumb: "assets/Spies_in_Disguise_logo.webp" },
  { id: "135137438", title: "Ferdinand" },
  { id: "197231614", title: "Ice Age 5" },
  { id: "187104927", title: "2016 DreamWorks + VFX Reel", thumb: "assets/2016_reel.png" },
  { id: "135130136", title: "Ted 2" },
  { id: "261414975", title: "Home" },
  { id: "15694987", title: "Turbo" },
  { id: "15692714", title: "Madagascar 3" },
  { id: "29300355", title: "Puss in Boots" },
  { id: "13774020", title: "2010 Animation Reel", thumb: "assets/2010_reel.png" },
  { id: "41671911", title: "Iron Man 2" },
  { id: "78884991", title: "Cats & Dogs 2" },
  { id: "15718152", title: "Bioshock 2" },
  { id: "4833250", title: "Spiderwick Chronicles", thumb: "assets/spiderwick.png" },
  { id: "124123873", title: "Superman Returns" }
];

const shell = document.getElementById("video-shell");
const strip = document.getElementById("filmstrip");
const viewport = document.querySelector(".filmstrip-viewport");
const arrowL = document.getElementById("arrow-left");
const arrowR = document.getElementById("arrow-right");

const state = { current: 0, unit: 0 };
const vimeoThumbCache = new Map();

const cssNum = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
const vimeoSrc = id => `https://player.vimeo.com/video/${id}?autoplay=0&title=0&byline=0&portrait=0`;

async function fetchVimeoThumb(id) {
  if (vimeoThumbCache.has(id)) return vimeoThumbCache.get(id);
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`, { mode: "cors" });
    if (!r.ok) throw 0;
    const data = await r.json();
    const url = (data.thumbnail_url || "").replace(/_640\.jpg$/, "_960.jpg");
    vimeoThumbCache.set(id, url);
    return url;
  } catch {
    const fallback = "assets/2010_reel.png";
    vimeoThumbCache.set(id, fallback);
    return fallback;
  }
}

function showMedia(item) {
  shell.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.title = item.title;
  iframe.allowFullscreen = true;
  iframe.allow = "fullscreen; picture-in-picture";
  iframe.style.background = "#000";
  iframe.src = item.slides ? item.slides : vimeoSrc(item.id);
  iframe.classList.add("active");
  shell.appendChild(iframe);

  if (item.slides) {
    const fsBtn = document.createElement("div");
    fsBtn.className = "slides-fs-btn";
    fsBtn.title = "Fullscreen";
    fsBtn.addEventListener("click", () => {
      window.open(item.slides.replace("/embed?", "/present?"), "_blank");
    });
    shell.appendChild(fsBtn);
  }
}

async function buildThumb(realIndex) {
  const v = videos[realIndex];
  const d = document.createElement("div");
  d.className = "thumb";
  d.dataset.realIndex = String(realIndex);

  let bg = v.thumb;
  if (!bg && /^[0-9]+$/.test(v.id)) bg = await fetchVimeoThumb(v.id);
  if (!bg) bg = "assets/2016_reel.png";
  d.style.backgroundImage = `url('${bg}')`;

  d.addEventListener("click", () => playReal(realIndex));
  return d;
}

async function render() {
  strip.innerHTML = "";
  const repeatCount = 3;
  const frags = [];
  for (let i = 0; i < repeatCount; i++) {
    for (let j = 0; j < videos.length; j++) frags.push(await buildThumb(j));
  }
  frags.forEach(el => strip.appendChild(el));
  calcUnit();

  state.current = videos.length + 1;
  requestAnimationFrame(() => {
    jumpTo(state.current);
    showMedia(videos[1]);
    highlight(1);
  });
}

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

function applyTransform(i, animate=true) {
  strip.style.transition = animate ? "transform 0.5s cubic-bezier(.22,.74,.27,1.05)" : "none";
  strip.style.transform = translateForIndex(i);
  if (!animate) { void strip.offsetWidth; strip.style.transition = ""; }
}

function jumpTo(i) { applyTransform(i, false); }
function moveTo(i) { applyTransform(i, true); }

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
  const target = videos.length + realIndex;
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
  }, 500);
  const real = realFromCurrent(state.current);
  highlight(real);
  showMedia(videos[real]);
}

arrowL.addEventListener("click", () => smoothStep(-1));
arrowR.addEventListener("click", () => smoothStep(1));

/* Touch swipe (mobile only) */
let dragging = false, startX = 0, startIndex = 0;
function beginTouch(x){ dragging = true; startX = x; startIndex = state.current; strip.style.transition = "none"; }
function moveTouch(x){ if(!dragging) return; const dx = x - startX; const idxFloat = startIndex - (dx / state.unit); strip.style.transform = translateForIndex(idxFloat); }
function endTouch(x){
  if(!dragging) return;
  dragging = false;
  const dx = x - startX;
  if (Math.abs(dx) > state.unit * 0.25) smoothStep(dx < 0 ? 1 : -1);
  else moveTo(state.current);
}
viewport.addEventListener("touchstart", e => beginTouch(e.touches[0].clientX), {passive:true});
viewport.addEventListener("touchmove", e => moveTouch(e.touches[0].clientX), {passive:true});
viewport.addEventListener("touchend", e => endTouch(e.changedTouches[0].clientX), {passive:true});

let rto;
window.addEventListener("resize", () => {
  clearTimeout(rto);
  rto = setTimeout(() => { calcUnit(); jumpTo(state.current); }, 120);
});

/* --- Smooth Navigation Enhancement --- */
let animFrame;
function smoothStep(dir) {
  cancelAnimationFrame(animFrame);
  const start = performance.now();
  const duration = 480;
  const initial = state.current;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function animate(time) {
    const progress = Math.min(1, (time - start) / duration);
    const eased = easeOut(progress);
    const pos = initial + (dir * eased);
    strip.style.transform = translateForIndex(pos);
    if (progress < 1) animFrame = requestAnimationFrame(animate);
    else step(dir);
  }
  animFrame = requestAnimationFrame(animate);
}

render();
