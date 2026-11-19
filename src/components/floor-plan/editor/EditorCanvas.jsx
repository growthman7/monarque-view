import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Circle, Ellipse, Group, Layer, Rect, Shape, Stage, Text, Transformer } from 'react-konva';

const SEAT_COLORS = { standard: '#96919E', premium: '#A855F7', vip: '#E9D5FF' };
const FONT = 'Hanken Grotesk, sans-serif';

function ElementView({ e }) {
  const w = e.width;
  const h = e.height;
  switch (e.type) {
    case 'seat': {
      const c = SEAT_COLORS[e.category] || '#96919E';
      return (
        <>
          <Rect width={w} height={h} cornerRadius={Math.min(7, w / 4)} fill={e.status === 'active' ? '#1b1724' : 'transparent'} stroke={c} strokeWidth={1.5} dash={e.status === 'active' ? undefined : [3, 3]} />
          <Text width={w} height={h} align="center" verticalAlign="middle" text={e.label} fontSize={Math.min(11, w / 3.2)} fontFamily={FONT} fill="#F8F6FA" listening={false} />
        </>
      );
    }
    case 'screen':
      return (
        <>
          <Rect width={w} height={h} cornerRadius={h / 2} fill="#F8F6FA" shadowColor="#A855F7" shadowBlur={18} shadowOpacity={0.8} />
          <Text y={h + 6} width={w} align="center" text="ÉCRAN" fontSize={12} letterSpacing={5} fontFamily={FONT} fill="#96919E" listening={false} />
        </>
      );
    case 'table': {
      const shape = e.properties?.shape || 'square';
      const stroke = e.category === 'vip' ? '#E9D5FF' : e.category === 'private' ? '#F5B84A' : '#F8F6FA';
      return (
        <>
          {shape === 'round'
            ? <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} fill="#1b1724" stroke={stroke} strokeWidth={1.8} dash={e.status === 'active' ? undefined : [5, 4]} />
            : <Rect width={w} height={h} cornerRadius={shape === 'square' ? 8 : 12} fill="#1b1724" stroke={stroke} strokeWidth={1.8} dash={e.status === 'active' ? undefined : [5, 4]} />}
          <Text width={w} height={h} align="center" verticalAlign="middle" text={`${e.label}\n${e.capacity} pl.`} lineHeight={1.2} fontSize={12} fontStyle="bold" fontFamily={FONT} fill="#F8F6FA" listening={false} />
        </>
      );
    }
    case 'zone':
      return (
        <>
          <Rect width={w} height={h} cornerRadius={16} fill={e.properties?.color || '#7628C8'} opacity={0.12} />
          <Rect width={w} height={h} cornerRadius={16} stroke={e.properties?.color || '#7628C8'} strokeWidth={1.5} dash={e.properties?.outdoor ? [8, 6] : undefined} />
          <Text x={14} y={h - 26} text={e.label} fontSize={15} fontFamily="Bodoni Moda, serif" fill={e.properties?.color || '#A855F7'} listening={false} />
        </>
      );
    case 'wall':
      return <Rect width={w} height={h} fill="#4a4356" />;
    case 'door':
      return (
        <>
          <Rect width={w} height={h} fill="#08070B" stroke="#A855F7" strokeWidth={1.5} dash={[4, 3]} />
          <Text y={h + 4} width={w} align="center" text={e.label} fontSize={11} fontFamily={FONT} fill="#A855F7" listening={false} />
        </>
      );
    case 'decor':
      return e.properties?.kind === 'plant'
        ? <><Circle x={w / 2} y={h / 2} radius={w / 2} fill="#1f3a2c" /><Circle x={w / 2} y={h / 2} radius={w / 4} fill="#2f6f5e" /></>
        : <><Rect width={w} height={h} cornerRadius={6} fill="#2a2434" stroke="#3a3446" /><Text width={w} height={h} align="center" verticalAlign="middle" text={(e.label || '').toUpperCase()} fontSize={11} letterSpacing={2} fontFamily={FONT} fill="#96919E" listening={false} /></>;
    case 'label':
      return <Text width={w} height={h} verticalAlign="middle" text={e.label} fontSize={14} fontFamily={FONT} fill="#96919E" />;
    default:
      return <Rect width={w} height={h} stroke="#96919E" />;
  }
}

const LAYER_ORDER = { zone: 0, wall: 1, door: 2, decor: 2, label: 3, screen: 3, table: 4, seat: 4 };

/**
 * Canvas de l'éditeur (Konva). Coordonnées du modèle = coin haut-gauche non pivoté ;
 * la rotation s'applique autour du centre (même convention que l'affichage client).
 */
export default function EditorCanvas({ plan, selection, setSelection, onCommit, tool, snap, camera, setCamera, onStageReady }) {
  const wrap = useRef(null);
  const stageRef = useRef(null);
  const trRef = useRef(null);
  const nodes = useRef({});
  const dragStart = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [band, setBand] = useState(null);
  const [space, setSpace] = useState(false);
  const pinch = useRef(null);
  const g = plan.gridSize || 10;
  const snapV = (v) => (snap ? Math.round(v / g) * g : Math.round(v));

  useLayoutEffect(() => {
    const measure = () => {
      const r = wrap.current.getBoundingClientRect();
      setSize((s) => (Math.round(s.w) === Math.round(r.width) && Math.round(s.h) === Math.round(r.height) ? s : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (size.w > 0) onStageReady?.({ size, stage: stageRef.current }); }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const down = (e) => { if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); setSpace(true); } };
    const up = (e) => { if (e.code === 'Space') setSpace(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Attache le transformateur aux éléments sélectionnés
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    tr.nodes(selection.map((id) => nodes.current[id]).filter(Boolean));
    tr.getLayer()?.batchDraw();
  }, [selection, plan.elements]);

  const panning = tool === 'pan' || space;

  const onWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const old = camera.scale;
    const p = stage.getPointerPosition();
    const to = { x: (p.x - camera.x) / old, y: (p.y - camera.y) / old };
    const scale = Math.min(4, Math.max(0.15, old * Math.exp(-e.evt.deltaY * 0.0015)));
    setCamera({ scale, x: p.x - to.x * scale, y: p.y - to.y * scale });
  };

  const scenePointer = () => {
    const p = stageRef.current.getPointerPosition();
    return { x: (p.x - camera.x) / camera.scale, y: (p.y - camera.y) / camera.scale };
  };

  const onStageDown = (e) => {
    if (panning) return;
    const empty = e.target === e.target.getStage() || e.target.name() === 'bg';
    if (!empty) return;
    const p = scenePointer();
    setBand({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: e.evt.shiftKey });
  };
  const onStageMove = () => {
    if (!band) return;
    const p = scenePointer();
    setBand((b) => ({ ...b, x1: p.x, y1: p.y }));
  };
  const onStageUp = () => {
    if (!band) return;
    const x = Math.min(band.x0, band.x1); const y = Math.min(band.y0, band.y1);
    const w = Math.abs(band.x1 - band.x0); const h = Math.abs(band.y1 - band.y0);
    if (w < 4 && h < 4) { if (!band.add) setSelection([]); }
    else {
      const hit = plan.elements.filter((el) => el.type !== 'zone' || (el.x >= x && el.y >= y && el.x + el.width <= x + w && el.y + el.height <= y + h))
        .filter((el) => el.x + el.width > x && el.x < x + w && el.y + el.height > y && el.y < y + h).map((el) => el.id);
      setSelection(band.add ? [...new Set([...selection, ...hit])] : hit);
    }
    setBand(null);
  };

  // Pincement à deux doigts sur tablette
  const onTouchMove = (e) => {
    const t = e.evt.touches;
    if (t.length !== 2) return;
    e.evt.preventDefault();
    const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const rect = wrap.current.getBoundingClientRect();
    const mid = { x: (t[0].clientX + t[1].clientX) / 2 - rect.left, y: (t[0].clientY + t[1].clientY) / 2 - rect.top };
    if (!pinch.current) { pinch.current = { d, cam: camera, mid }; return; }
    const { cam } = pinch.current;
    const scale = Math.min(4, Math.max(0.15, cam.scale * (d / pinch.current.d)));
    const to = { x: (pinch.current.mid.x - cam.x) / cam.scale, y: (pinch.current.mid.y - cam.y) / cam.scale };
    setCamera({ scale, x: mid.x - to.x * scale, y: mid.y - to.y * scale });
  };

  const select = (e, id) => {
    e.cancelBubble = true;
    if (panning) return;
    const multi = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    if (multi) setSelection(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);
    else if (!selection.includes(id)) setSelection([id]);
  };

  const onDragStart = (id) => {
    const ids = selection.includes(id) ? selection : [id];
    if (!selection.includes(id)) setSelection([id]);
    dragStart.current = { id, ids, pos: Object.fromEntries(ids.map((x) => [x, { x: nodes.current[x]?.x(), y: nodes.current[x]?.y() }])) };
  };
  const onDragMove = (id) => {
    const ds = dragStart.current;
    if (!ds) return;
    const n = nodes.current[id];
    const el = plan.elements.find((x) => x.id === id);
    // aimantation sur la grille (coin haut-gauche)
    n.x(snapV(n.x() - el.width / 2) + el.width / 2);
    n.y(snapV(n.y() - el.height / 2) + el.height / 2);
    const dx = n.x() - ds.pos[id].x;
    const dy = n.y() - ds.pos[id].y;
    ds.ids.forEach((other) => { if (other !== id && nodes.current[other]) { nodes.current[other].x(ds.pos[other].x + dx); nodes.current[other].y(ds.pos[other].y + dy); } });
  };
  const onDragEnd = () => {
    const ds = dragStart.current;
    dragStart.current = null;
    if (!ds) return;
    onCommit((els) => els.map((el) => {
      if (!ds.ids.includes(el.id)) return el;
      const n = nodes.current[el.id];
      return { ...el, x: Math.round(n.x() - el.width / 2), y: Math.round(n.y() - el.height / 2) };
    }));
  };

  const onTransformEnd = () => {
    onCommit((els) => els.map((el) => {
      if (!selection.includes(el.id)) return el;
      const n = nodes.current[el.id];
      const width = Math.max(6, Math.round(el.width * n.scaleX()));
      const height = Math.max(4, Math.round(el.height * n.scaleY()));
      n.scaleX(1); n.scaleY(1);
      return { ...el, width, height, rotation: Math.round(n.rotation()) % 360, x: Math.round(n.x() - width / 2), y: Math.round(n.y() - height / 2) };
    }));
  };

  const sorted = [...plan.elements].sort((a, b) => (LAYER_ORDER[a.type] ?? 3) - (LAYER_ORDER[b.type] ?? 3));

  return (
    <div ref={wrap} className={`relative h-full w-full overflow-hidden bg-[#0b0a0f] ${panning ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={camera.scale}
        scaleY={camera.scale}
        x={camera.x}
        y={camera.y}
        draggable={panning}
        onDragEnd={(e) => { if (e.target === stageRef.current) setCamera({ ...camera, x: e.target.x(), y: e.target.y() }); }}
        onWheel={onWheel}
        onMouseDown={onStageDown}
        onTouchStart={onStageDown}
        onMouseMove={onStageMove}
        onMouseUp={onStageUp}
        onTouchMove={onTouchMove}
        onTouchEnd={(e) => { pinch.current = null; onStageUp(e); }}
      >
        <Layer>
          <Rect name="bg" x={0} y={0} width={plan.width} height={plan.height} fill="#121019" stroke="#2a2434" strokeWidth={2 / camera.scale} />
          <Shape
            listening={false}
            sceneFunc={(ctx) => {
              ctx.beginPath();
              const step = g * (camera.scale < 0.5 ? 5 : 1);
              for (let x = 0; x <= plan.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, plan.height); }
              for (let y = 0; y <= plan.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(plan.width, y); }
              ctx.strokeStyle = 'rgba(150,145,158,0.09)';
              ctx.lineWidth = 1 / camera.scale;
              ctx.stroke();
            }}
          />
          {sorted.map((e) => (
            <Group
              key={e.id}
              ref={(n) => { if (n) nodes.current[e.id] = n; else delete nodes.current[e.id]; }}
              x={e.x + e.width / 2}
              y={e.y + e.height / 2}
              offsetX={e.width / 2}
              offsetY={e.height / 2}
              rotation={e.rotation || 0}
              // Une zone (grande surface sous les tables) ne se déplace qu'une fois sélectionnée.
              draggable={!panning && (e.type !== 'zone' || selection.includes(e.id))}
              onMouseDown={(ev) => select(ev, e.id)}
              onTap={(ev) => select(ev, e.id)}
              onDragStart={() => onDragStart(e.id)}
              onDragMove={() => onDragMove(e.id)}
              onDragEnd={onDragEnd}
              onTransformEnd={onTransformEnd}
            >
              <ElementView e={e} />
              {selection.includes(e.id) && selection.length > 1 && <Rect width={e.width} height={e.height} stroke="#A855F7" strokeWidth={1 / camera.scale} dash={[4, 3]} listening={false} />}
            </Group>
          ))}
          <Transformer
            ref={trRef}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={6}
            anchorStroke="#A855F7"
            anchorFill="#F8F6FA"
            anchorSize={9}
            borderStroke="#A855F7"
            borderDash={[4, 3]}
            keepRatio={false}
            ignoreStroke
            boundBoxFunc={(oldB, newB) => (newB.width < 6 || newB.height < 4 ? oldB : newB)}
          />
          {band && <Rect x={Math.min(band.x0, band.x1)} y={Math.min(band.y0, band.y1)} width={Math.abs(band.x1 - band.x0)} height={Math.abs(band.y1 - band.y0)} fill="rgba(168,85,247,0.08)" stroke="#A855F7" strokeWidth={1 / camera.scale} dash={[4, 3]} listening={false} />}
        </Layer>
      </Stage>
    </div>
  );
}
