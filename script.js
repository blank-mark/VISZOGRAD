const mapShell = document.getElementById('mapShell');
const mapStage = document.getElementById('mapStage');
const mapImage = document.getElementById('mapImage');
const zoomOutBtn = document.getElementById('mapZoomOut');
const zoomInBtn = document.getElementById('mapZoomIn');
const zoomResetBtn = document.getElementById('mapZoomReset');
const zoomLabel = document.getElementById('mapZoomLabel');
const fitBtn = document.getElementById('mapFit');

let zoom = 1;
let panX = 0;
let panY = 0;

const minZoom = 1;
const maxZoom = 5;
const step = 0.25;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let activePointerId = null;

let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateZoomLabel() {
  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }
}

function applyTransform() {
  if (!mapStage) return;
  mapStage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
  updateZoomLabel();
}

function setZoom(nextZoom, anchorX = null, anchorY = null) {
  const clamped = clamp(nextZoom, minZoom, maxZoom);
  if (clamped === zoom) return;

  if (anchorX !== null && anchorY !== null) {
    const prevZoom = zoom;
    const ratio = clamped / prevZoom;
    panX = anchorX - (anchorX - panX) * ratio;
    panY = anchorY - (anchorY - panY) * ratio;
  }

  zoom = clamped;
  applyTransform();
}

function resetView() {
  zoom = 1;
  panX = 0;
  panY = 0;
  applyTransform();
}

function fitToScreen() {
  if (!mapShell || !mapStage || !mapImage) return;

  const shellRect = mapShell.getBoundingClientRect();
  const naturalW = mapImage.naturalWidth || 1;
  const naturalH = mapImage.naturalHeight || 1;

  const scaleX = shellRect.width / naturalW;
  const scaleY = shellRect.height / naturalH;
  const fitted = clamp(Math.min(scaleX, scaleY), 0.6, maxZoom);

  zoom = fitted;
  panX = (shellRect.width - naturalW * fitted) / 2;
  panY = (shellRect.height - naturalH * fitted) / 2;
  applyTransform();
}

function zoomAtClientPoint(clientX, clientY, delta) {
  if (!mapShell) return;
  const rect = mapShell.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  setZoom(zoom + delta, x, y);
}

if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(zoom + step));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(zoom - step));
if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetView);
if (fitBtn) fitBtn.addEventListener('click', fitToScreen);

if (mapShell) {
  mapShell.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAtClientPoint(e.clientX, e.clientY, e.deltaY < 0 ? step : -step);
  }, { passive: false });

  mapShell.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    activePointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    mapShell.classList.add('is-dragging');

    try {
      mapShell.setPointerCapture(activePointerId);
    } catch {}
  });

  mapShell.addEventListener('pointermove', (e) => {
    if (!isDragging || e.pointerId !== activePointerId) return;
    panX = dragOriginX + (e.clientX - dragStartX);
    panY = dragOriginY + (e.clientY - dragStartY);
    applyTransform();
  });

  const stopDragging = (e) => {
    if (e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    mapShell.classList.remove('is-dragging');
    try {
      mapShell.releasePointerCapture(e.pointerId);
    } catch {}
  };

  mapShell.addEventListener('pointerup', stopDragging);
  mapShell.addEventListener('pointercancel', stopDragging);

  mapShell.addEventListener('mouseleave', () => {
    if (!isDragging) return;
    isDragging = false;
    activePointerId = null;
    mapShell.classList.remove('is-dragging');
  });

  mapShell.addEventListener('dblclick', (e) => {
    e.preventDefault();
    zoomAtClientPoint(e.clientX, e.clientY, step * 2);
  });

  mapShell.addEventListener('touchend', (e) => {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    const now = Date.now();
    const dt = now - lastTapTime;
    const dx = Math.abs(touch.clientX - lastTapX);
    const dy = Math.abs(touch.clientY - lastTapY);

    if (dt < 320 && dx < 24 && dy < 24) {
      e.preventDefault();
      zoomAtClientPoint(touch.clientX, touch.clientY, step * 2);
      lastTapTime = 0;
      return;
    }

    lastTapTime = now;
    lastTapX = touch.clientX;
    lastTapY = touch.clientY;
  }, { passive: false });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') resetView();
  if (e.key === '+' || e.key === '=') setZoom(zoom + step);
  if (e.key === '-') setZoom(zoom - step);
  if (e.key.toLowerCase() === '0') resetView();
});

if (mapImage) {
  if (mapImage.complete) {
    fitToScreen();
  } else {
    mapImage.addEventListener('load', fitToScreen, { once: true });
  }
}

window.addEventListener('resize', () => {
  fitToScreen();
});

const path = location.pathname.split('/').pop();
document.querySelectorAll('.nav a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === path || (path === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

applyTransform();
