/* ---------- Constants ---------- */
const SLIDES_EMBED =
  "https://docs.google.com/presentation/d/15g1qwIg_L9d_c9nFa1tIBOqP5yHU3__oGkUJSyVaSM8/embed?start=false&loop=false";

/* ---------- Videos (order preserved) ---------- */
const videos = [
  { type: "slides", title: "Meta • Realtime / Avatars — (Google Slides embed)", url: SLIDES_EMBED, thumb: "assets/meta_thumb.png" },
  { type: "vimeo",  title: "2022 Animated Reel — (start on this video)", url: "https://vimeo.com/841625715?fl=pl&fe=sh", thumb: "assets/2022_reel.png" },
  { type: "vimeo",  title: "Spies in Disguise", url: "https://vimeo.com/396309161?fl=pl&fe=sh", thumb: "assets/Spies_in_Disguise_logo.webp" },
  { type: "vimeo",  title: "Ferdinand", url: "https://vimeo.com/261414975?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Ice Age 5", url: "https://vimeo.com/197231614?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "2016 DreamWorks + VFX Reel", url: "https://vimeo.com/187104927?fl=pl&fe=sh", thumb: "assets/2016_reel.png" },
  { type: "vimeo",  title: "Ted 2", url: "https://vimeo.com/135137438?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Home", url: "https://vimeo.com/135130136?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Turbo", url: "https://vimeo.com/78884991?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Madagascar 3", url: "https://vimeo.com/41671911?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Puss in Boots", url: "https://vimeo.com/29300355?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "2010 Animation Reel", url: "https://vimeo.com/13774020?fl=pl&fe=sh", thumb: "assets/2010_reel.png" },
  { type: "vimeo",  title: "Iron Man 2", url: "https://vimeo.com/15692714?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Cats & Dogs 2", url: "https://vimeo.com/15694987?fl=pl&fe=sh", thumb: null },
  { type: "vimeo",  title: "Bioshock 2", url: "https://vimeo.com/15718152", thumb: null },
  { type: "vimeo",  title: "Spiderwick Chronicles", url: "https://vimeo.com/4833250?fl=pl&fe=sh", thumb: "assets/spiderwick.png" },
  { type: "vimeo",  title: "Superman Returns", url: "https://vimeo.com/4830488?fl=pl&fe=sh", thumb: null }
];

/* ---------- DOM ---------- */
const shell     = document.getElementById("video-shell");
const strip     = document.getElementById("filmstrip");
const viewport  = document.querySelector(".filmstrip-viewport");
const arrowL    = document.getElementById("arrow-left");
const arrowR    = document.getElementById("arrow-right");

/* ---------- State ---------- */
const state = {
  unit: 0,          // width + gap of a card
  moving: false,    // prevents double-steps while animating
  centerSlot: 2     // with 5 visible, the center is index 2 (0..4)
};
const vimeoThumbCache = new Map();

/* ---------- Helpers ---------- */
const cssNum = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
const toPlayerUrl = url => url.replace("vimeo.com/", "player.vimeo.com/video/");
const isVimeo = v => v.type === "vimeo";

/* Vimeo oEmbed thumb when no custom one is provided */
async function fetchVimeoThumb(url) {
  if (vimeoThumbCache.has(url)) return vimeoThumbCache.get(url);
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { mode: "cors" });
    const data = await r.json();
    const thumb = (data.thumbnail_url || "").replace(/_640\.jpg$/i, "_960.jpg");
    vimeoThumbCache.set(url, thumb);
    return thumb;
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
    const fsBtn = document.createElement("div");
    fsBtn.className = "slides-fs-btn";
    fsBtn.title = "Open Slides";
    fsBtn.addEventListener("click", () => {
      window.open(item.url.replace("/embed?", "/present?"), "_blank");
    });
    shell.appendChild(fsBtn);
  }
}

/* ---------- Build a single thumb ---------- */
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
  // Build enough items so 5 are visible + head/tail buffers (3 extra each side)
  // We’ll keep 3*videos.length items and rotate them.
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < videos.length; i++) {
      strip.appendChild(await createThumb(i));
    }
  }
  calcUnit();

  // Start on the 2022 Reel (index 1) in the middle copy, centered
  const startIndex = videos.length + 1; // middle copy’s realIndex=1
  centerOn(startIndex, false);
  activateByReal(1);
  showMedia(videos[1]);

  // Wrap handler for seamless loop after each move
  strip.addEventListener("transitionend", onTransitionEnd);
}

/* ---------- Layout helpers ---------- */
function calcUnit() {
  const el = strip.querySelector(".thumb");
  const w = el ? el.getBoundingClientRect().width : cssNum("--thumb-w");
  const gap = parseFloat(getComputedStyle(strip).gap || cssNum("--gap"));
  state.unit = w + gap;
}
function translateForCentered(indexInStrip) {
  const viewW = viewport.clientWidth;
  const x = (viewW / 2) - ((indexInStrip + 0.5) * state.unit);
  return `translate3d(${x}px,0,0)`;
}

/* Find current center index within strip children (always keep it at middle copy) */
function centerOn(childIndex, animate = true) {
  strip.style.transition = animate ? `transform var(--move-t) cubic-bezier(.28,.64,.24,1)` : "none";
  strip.style.transform = translateForCentered(childIndex);
  if (!animate) { void strip.offsetWidth; strip.style.transition = ""; }
}

/* ---------- Activate/highlight helpers ---------- */
function activateByReal(realIndex) {
  const kids = Array.from(strip.children);
  kids.forEach(el => {
    el.classList.toggle("playing", parseInt(el.dataset.realIndex, 10) === realIndex);
  });
}

/* ---------- Movement / Infinite Loop ---------- */
function step(dir) {
  if (state.moving) return;
  state.moving = true;

  // Move left (-1) or right (+1) by one slot
  const kids = Array.from(strip.children);
  // Determine which child is visually centered right now by reading current transform.
  // We keep the middle copy’s center around index = videos.length + state.centerSlot’s offset.
  // Instead of computing from transform each time, we’ll always move the DOM then recenter.
  if (dir > 0) {
    // Move one item from head to tail AFTER animation
    centerOn(getCenteredChildIndex() + 1, true);
    strip._pendingDir = 1;
  } else {
    // Move one item from tail to head AFTER animation
    centerOn(getCenteredChildIndex() - 1, true);
    strip._pendingDir = -1;
  }
}

function getCenteredChildIndex() {
  // We keep the center aligned to the middle copy;
  // at init we centered item at index = videos.length + 1
  // After DOM rotations we maintain the same centered CHILD index.
  // Read it once and cache on strip.
  if (typeof strip._centerChildIndex !== "number") {
    strip._centerChildIndex = videos.length + 1; // initial
  }
  return strip._centerChildIndex;
}

function onTransitionEnd(e) {
  if (e.target !== strip) return;
  const dir = strip._pendingDir || 0;
  if (!dir) { state.moving = false; return; }

  // Recycle one element to keep center child index constant (no pop)
  if (dir === 1) {
    // Move the first child to the end
    strip.appendChild(strip.firstElementChild);
  } else if (dir === -1) {
    // Move the last child to the start
    strip.insertBefore(strip.lastElementChild, strip.firstElementChild);
  }

  // Reset transform instantly to keep the same visual center
  strip.style.transition = "none";
  // Center stays at the same child index value
  centerOn(getCenteredChildIndex(), false);
  strip._pendingDir = 0;
  state.moving = false;

  // Determine the REAL index of the centered element and update player/glow
  const centerChild = strip.children[getCenteredChildIndex()];
  const realIndex = parseInt(centerChild.dataset.realIndex, 10);
  activateByReal(realIndex);
  showMedia(videos[realIndex]);
}

/* Click a thumbnail: rotate DOM until that real index is centered */
function snapToReal(realIndex) {
  // Find nearest child with that real index
  const kids = Array.from(strip.children);
  const centerIdx = getCenteredChildIndex();

  // Search to the left and right for the closest matching child
  let bestOffset = 0, bestDist = Infinity;
  for (let offset = -videos.length; offset <= videos.length; offset++) {
    const idx = centerIdx + offset;
    const child = kids[(idx % kids.length + kids.length) % kids.length];
    if (parseInt(child.dataset.realIndex, 10) === realIndex) {
      const dist = Math.abs(offset);
      if (dist < bestDist) { bestDist = dist; bestOffset = offset; }
      if (dist === 0) break;
    }
  }
  if (bestOffset === 0) {
    // already centered
    activateByReal(realIndex);
    showMedia(videos[realIndex]);
    return;
  }

  // Animate one slot at a time to preserve seamless recycling
  const dir = bestOffset > 0 ? 1 : -1;
  const steps = Math.abs(bestOffset);
  let i = 0;
  const tick = () => {
    if (i >= steps) return;
    const done = () => {
      strip.removeEventListener("transitionend", done);
      i++;
      if (i < steps) tick();
    };
    strip.addEventListener("transitionend", done, { once: true });
    step(dir);
  };
  tick();
}

/* ---------- Controls ---------- */
arrowL.addEventListener("click", () => step(-1));
arrowR.addEventListener("click", () => step(1));

/* ---------- Touch (mobile) ---------- */
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
  const base = translateForCentered(getCenteredChildIndex());
  // parse base translateX
  const match = /translate3d\(([-0-9.]+)px/.exec(base);
  const baseX = match ? parseFloat(match[1]) : 0;
  strip.style.transform = `translate3d(${baseX + dx}px,0,0)`;
}, { passive: true });

viewport.addEventListener("touchend", e => {
  if (!dragging) return;
  dragging = false;
  const dx = e.changedTouches[0].clientX - startX;
  strip.style.transition = "";
  if (Math.abs(dx) > state.unit * 0.25) step(dx < 0 ? 1 : -1);
  else centerOn(getCenteredChildIndex(), true);
}, { passive: true });

/* ---------- Resize ---------- */
let rto;
window.addEventListener("resize", () => {
  clearTimeout(rto);
  rto = setTimeout(() => { calcUnit(); centerOn(getCenteredChildIndex(), false); }, 120);
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
