
const mapShell = document.getElementById('mapShell');
const mapStage = document.getElementById('mapStage');

const zoomOutBtn = document.getElementById('mapZoomOut');
const zoomInBtn = document.getElementById('mapZoomIn');
const zoomResetBtn = document.getElementById('mapZoomReset');

let zoom = 1;
let panX = 0;
let panY = 0;
const minZoom = 1;
const maxZoom = 4;
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

function applyTransform() {
  if (!mapStage) return;
  mapStage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}

function setZoom(nextZoom, anchorX = null, anchorY = null) {
  const clamped = Math.max(minZoom, Math.min(maxZoom, nextZoom));
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

if (mapShell) {
  mapShell.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAtClientPoint(e.clientX, e.clientY, e.deltaY < 0 ? step : -step);
  }, { passive: false });

  mapShell.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    activePointerId = e.pointerId;
    try { mapShell.setPointerCapture(activePointerId); } catch {}
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    mapShell.classList.add('is-dragging');
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
    try { mapShell.releasePointerCapture(e.pointerId); } catch {}
  };

  mapShell.addEventListener('pointerup', stopDragging);
  mapShell.addEventListener('pointercancel', stopDragging);
  mapShell.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      activePointerId = null;
      mapShell.classList.remove('is-dragging');
    }
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
});

markers.forEach((m) => {
  if (!mapStage) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'map-marker';
  btn.style.left = `${m.x}%`;
  btn.style.top = `${m.y}%`;
  btn.setAttribute('aria-label', m.name);
  btn.innerHTML = `<span>${m.name}<small>${m.note}</small></span>`;
  mapStage.appendChild(btn);
});

applyTransform();

const path = location.pathname.split('/').pop();
document.querySelectorAll('.nav a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
});
