import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Caméra 2D sur un SVG via son viewBox : molette (zoom vers le curseur), glisser (déplacement 1:1),
 * pincement à deux doigts, boutons +/−. Le contenu ne quitte jamais complètement l'écran
 * (bords élastiques), et un glisser court reste un clic.
 */
export function usePanZoom(svgRef, { width, height, minZoom = 1, maxZoom = 4 }) {
  const full = { x: 0, y: 0, w: width, h: height };
  const [view, setView] = useState(full);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const moved = useRef(false);

  // Changement de dimensions du plan (pas au montage : le composant peut imposer son cadre initial).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setView({ x: 0, y: 0, w: width, h: height });
  }, [width, height]);

  const constrain = useCallback((v) => {
    const w = clamp(v.w, width / maxZoom, width / minZoom);
    const h = (w * height) / width;
    const slackX = w * 0.35;
    const slackY = h * 0.35;
    return { w, h, x: clamp(v.x, -slackX, width - w + slackX), y: clamp(v.y, -slackY, height - h + slackY) };
  }, [width, height, minZoom, maxZoom]);

  const toScene = (clientX, clientY, v = viewRef.current) => {
    const r = svgRef.current.getBoundingClientRect();
    // preserveAspectRatio="xMidYMid meet" : on tient compte des bandes
    const scale = Math.min(r.width / v.w, r.height / v.h);
    const offX = (r.width - v.w * scale) / 2;
    const offY = (r.height - v.h * scale) / 2;
    return { x: v.x + (clientX - r.left - offX) / scale, y: v.y + (clientY - r.top - offY) / scale, scale };
  };

  const zoomAt = useCallback((factor, clientX, clientY) => {
    const v = viewRef.current;
    const p = clientX === undefined ? { x: v.x + v.w / 2, y: v.y + v.h / 2 } : toScene(clientX, clientY);
    const w = v.w / factor;
    const h = v.h / factor;
    setView(constrain({ w, h, x: p.x - ((p.x - v.x) * w) / v.w, y: p.y - ((p.y - v.y) * h) / v.h }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constrain]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      // La molette seule fait défiler la page ; Ctrl/⌘ + molette (ou pincement trackpad) zoome.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [svgRef, zoomAt]);

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 1) gesture.current = { type: 'pan', start: { x: e.clientX, y: e.clientY }, view: viewRef.current, captured: false, id: e.pointerId };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: viewRef.current };
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pan') {
      const dx = e.clientX - g.start.x;
      const dy = e.clientY - g.start.y;
      if (!moved.current && Math.hypot(dx, dy) < 6) return; // hystérésis : un petit glissement reste un clic
      if (!g.captured) { svgRef.current.setPointerCapture?.(e.pointerId); g.captured = true; }
      moved.current = true;
      const { scale } = toScene(0, 0, g.view);
      setView(constrain({ ...g.view, x: g.view.x - dx / scale, y: g.view.y - dy / scale }));
    } else if (g.type === 'pinch' && pointers.current.size === 2) {
      moved.current = true;
      const [a, b] = [...pointers.current.values()];
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / g.dist;
      const p = toScene(g.mid.x, g.mid.y, g.view);
      const w = g.view.w / factor;
      const h = g.view.h / factor;
      setView(constrain({ w, h, x: p.x - ((p.x - g.view.x) * w) / g.view.w, y: p.y - ((p.y - g.view.y) * h) / g.view.h }));
    }
  };
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  return {
    view,
    setView: (v) => setView(constrain(v)),
    setViewRaw: setView,
    zoomIn: () => zoomAt(1.35),
    zoomOut: () => zoomAt(1 / 1.35),
    reset: () => setView(full),
    zoom: width / view.w,
    wasDrag: () => moved.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onPointerLeave: onPointerUp },
    viewBox: `${view.x} ${view.y} ${view.w} ${view.h}`,
  };
}
