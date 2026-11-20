import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Armchair, Check, Eye, LogOut, X } from 'lucide-react';
import { gsap, prefersReducedMotion } from '../../animations/animationConfig';
import { SEAT_CATEGORIES } from '../../utils/planGenerators';
import { formatPrice } from '../../utils/format';

/* ───────────── Mise à l'échelle : plan (unités) → monde (mètres) ───────────── */
const S = 0.016;          // 1 unité de plan = 1,6 cm (un siège standard ≈ 55 cm)
const RISE = 0.22;        // hauteur de marche entre deux rangées (gradins)
const EYE = 1.62;         // hauteur des yeux debout
const EYE_SEATED = 1.18;  // hauteur des yeux assis
const SPEED = 3.2;        // m/s

const COLORS = {
  standard: new THREE.Color('#4a1f73'),
  premium: new THREE.Color('#7628c8'),
  vip: new THREE.Color('#a8844a'),
  occupied: new THREE.Color('#26252b'),
  locked: new THREE.Color('#6a5220'),
  disabled: new THREE.Color('#121115'),
  selected: new THREE.Color('#e9d5ff'),
  hover: new THREE.Color('#c084fc'),
};

function buildLayout(plan) {
  const seats = plan.elements.filter((e) => e.type === 'seat');
  const byRow = new Map();
  seats.forEach((s) => {
    const r = s.properties?.row ?? '?';
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r).push(s);
  });
  const rows = [...byRow.entries()]
    .map(([row, list]) => ({ row, z: (list.reduce((a, s) => a + s.y + s.height / 2, 0) / list.length) * S }))
    .sort((a, b) => a.z - b.z)
    .map((r, i) => ({ ...r, idx: i, h: i * RISE }));
  const rowOf = Object.fromEntries(rows.map((r) => [r.row, r]));
  const placed = seats.map((s) => {
    const r = rowOf[s.properties?.row ?? '?'];
    return { seat: s, x: (s.x + s.width / 2 - plan.width / 2) * S, z: (s.y + s.height / 2) * S, w: s.width * S * 0.94, h: r.h };
  });
  const screenEl = plan.elements.find((e) => e.type === 'screen');
  const screen = screenEl
    ? { x: (screenEl.x + screenEl.width / 2 - plan.width / 2) * S, z: screenEl.y * S - 3.2, w: screenEl.width * S * 0.95 } // ~4 m entre l'écran et le 1er rang, comme en salle
    : { x: 0, z: -3.2, w: plan.width * S * 0.7 };
  const halfW = (plan.width * S) / 2 + 0.6;
  const zBack = (rows.at(-1)?.z ?? plan.height * S) + 1.6;
  const zFront = screen.z - 0.3;
  const rowDepth = rows.length > 1 ? (rows.at(-1).z - rows[0].z) / (rows.length - 1) : 0.8;
  const topH = rows.at(-1)?.h ?? 0;
  // hauteur du sol à une profondeur donnée (le gradin dont la bande contient z)
  const floorAt = (z) => {
    let h = 0;
    for (const r of rows) if (z >= r.z - rowDepth / 2) h = r.h;
    return h;
  };
  return { placed, rows, screen, halfW, zBack, zFront, rowDepth, topH, height: 6.5 + topH, floorAt };
}

/* ───────────── Écran : texture dessinée (titre du film) ───────────── */
function useScreenTexture(film, poster) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const c = document.createElement('canvas');
      c.width = 1600; c.height = 680;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 1600, 680);
      grad.addColorStop(0, poster?.bg || '#2b0f47');
      grad.addColorStop(1, '#6d3fb0');
      g.fillStyle = grad; g.fillRect(0, 0, 1600, 680);
      g.fillStyle = poster?.accent || '#a855f7';
      g.globalAlpha = 0.85;
      g.beginPath(); g.arc(1220, 300, 210, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = poster?.ink || '#f6f3ee';
      g.font = '500 112px "Bodoni Moda", Didot, serif';
      g.fillText(film?.title || 'MONARQUE', 110, 380);
      g.font = '600 30px "Hanken Grotesk", sans-serif';
      g.globalAlpha = 0.75;
      g.fillText('MONARQUE · SALLE DE DÉMONSTRATION', 114, 460);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTex(t);
    };
    // les polices ne sont chargées qu'à leur première utilisation : on les demande explicitement pour le canevas
    Promise.all([document.fonts?.load('500 112px "Bodoni Moda"'), document.fonts?.load('600 30px "Hanken Grotesk"')]).catch(() => {}).then(draw);
    return () => { cancelled = true; };
  }, [film?.title, poster?.bg, poster?.accent, poster?.ink]);
  return tex;
}

/* ───────────── Salle : sol en gradins, murs, rideaux, appliques, écran ───────────── */
function Room({ L, film, doorRefs }) {
  const tex = useScreenTexture(film, film?.poster);
  const { halfW, zBack, zFront, rows, height, screen, rowDepth, topH } = L;
  const depth = zBack - zFront;
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141017', roughness: 0.95 }), []);
  const panelRef = useRef();
  const curtainRef = useRef();
  const stepRef = useRef();
  const panels = useMemo(() => {
    const out = [];
    for (let z = zFront + 1; z < zBack - 0.5; z += 1.1) for (const side of [-1, 1]) out.push([side * (halfW - 0.06), 2.2 + topH * 0.5, z]);
    return out;
  }, [zFront, zBack, halfW, topH]);
  const curtains = useMemo(() => {
    const out = [];
    for (const side of [-1, 1]) for (let i = 0; i < 9; i += 1) out.push([screen.x + side * (screen.w / 2 + 0.2 + i * 0.16), zFront + 0.15 + (i % 2) * 0.05]);
    return out;
  }, [screen, zFront]);
  const steps = useMemo(() => rows.filter((r) => r.h > 0).flatMap((r) => [-1, 0, 1].map((p) => [p * (halfW - 0.4), r.h + 0.02, r.z - rowDepth / 2 + 0.03])), [rows, halfW, rowDepth]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    panels.forEach((p, i) => panelRef.current.setMatrixAt(i, m.makeTranslation(...p)));
    panelRef.current.instanceMatrix.needsUpdate = true;
    curtains.forEach(([x, z], i) => curtainRef.current.setMatrixAt(i, m.makeTranslation(x, height / 2 - 0.2, z)));
    curtainRef.current.instanceMatrix.needsUpdate = true;
    steps.forEach((p, i) => stepRef.current.setMatrixAt(i, m.makeTranslation(...p)));
    stepRef.current.instanceMatrix.needsUpdate = true;
  }, [panels, curtains, steps, height]);

  const screenH = screen.w * 0.425;
  const doorW = 1.9;
  return (
    <group>
      {/* sol avant + gradins */}
      <mesh position={[0, -0.05, (zFront + zBack) / 2]} receiveShadow={false}>
        <boxGeometry args={[halfW * 2, 0.1, depth]} />
        <meshStandardMaterial color="#1a1420" roughness={1} />
      </mesh>
      {rows.filter((r) => r.h > 0).map((r) => (
        <mesh key={r.row} position={[0, r.h / 2, (r.z - rowDepth / 2 + zBack) / 2]}>
          <boxGeometry args={[halfW * 2, r.h, zBack - (r.z - rowDepth / 2)]} />
          <meshStandardMaterial color="#231a2b" roughness={1} />
        </mesh>
      ))}
      {/* murs latéraux, plafond, mur avant */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * halfW, height / 2, (zFront + zBack) / 2]} material={wallMat}>
          <boxGeometry args={[0.1, height, depth]} />
        </mesh>
      ))}
      <mesh position={[0, height, (zFront + zBack) / 2]} material={wallMat}><boxGeometry args={[halfW * 2, 0.1, depth]} /></mesh>
      <mesh position={[0, height / 2, zFront - 0.05]} material={wallMat}><boxGeometry args={[halfW * 2, height, 0.1]} /></mesh>
      {/* mur du fond avec la porte d'entrée */}
      <mesh position={[-(halfW + doorW / 2) / 2, height / 2 + topH, zBack]} material={wallMat}><boxGeometry args={[halfW - doorW / 2, height, 0.1]} /></mesh>
      <mesh position={[(halfW + doorW / 2) / 2, height / 2 + topH, zBack]} material={wallMat}><boxGeometry args={[halfW - doorW / 2, height, 0.1]} /></mesh>
      <mesh position={[0, topH + 2.6 + (height - 2.6) / 2, zBack]} material={wallMat}><boxGeometry args={[doorW, height - 2.6, 0.1]} /></mesh>
      {[-1, 1].map((s, i) => (
        <mesh key={s} ref={doorRefs[i]} position={[s * doorW / 4, topH + 1.3, zBack]}>
          <boxGeometry args={[doorW / 2, 2.6, 0.06]} />
          <meshStandardMaterial color="#2b0f47" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      {/* panneaux acoustiques */}
      <instancedMesh ref={panelRef} args={[null, null, panels.length]}>
        <boxGeometry args={[0.08, 2.6, 0.9]} />
        <meshStandardMaterial color="#21162d" roughness={0.9} />
      </instancedMesh>
      {/* rideaux de scène */}
      <instancedMesh ref={curtainRef} args={[null, null, curtains.length]}>
        <cylinderGeometry args={[0.1, 0.1, height - 0.4, 10]} />
        <meshStandardMaterial color="#3a0f5c" roughness={0.75} />
      </instancedMesh>
      {/* balisage lumineux des marches */}
      <instancedMesh ref={stepRef} args={[null, null, steps.length]}>
        <boxGeometry args={[0.5, 0.025, 0.04]} />
        <meshBasicMaterial color="#e8c27a" toneMapped={false} />
      </instancedMesh>
      {/* écran */}
      <mesh position={[screen.x, 1.15 + screenH / 2, zFront + 0.02]}>
        <planeGeometry args={[screen.w + 0.3, screenH + 0.3]} />
        <meshBasicMaterial color="#050506" fog={false} />
      </mesh>
      <mesh position={[screen.x, 1.15 + screenH / 2, zFront + 0.04]}>
        <planeGeometry args={[screen.w, screenH]} />
        <meshBasicMaterial color="#cfc4ea" toneMapped={false} fog={false} />
      </mesh>
      {/* image projetée (titre du film) sur un calque séparé : si elle échoue, l'écran reste éclairé */}
      {tex && (
        <mesh position={[screen.x, 1.15 + screenH / 2, zFront + 0.06]}>
          <planeGeometry args={[screen.w * 0.96, screenH * 0.94]} />
          <meshBasicMaterial key={tex.uuid} map={tex} transparent toneMapped={false} fog={false} />
        </mesh>
      )}
      {/* appliques murales */}
      {[0.3, 0.7].flatMap((f) => [-1, 1].map((s) => (
        <group key={`${f}${s}`} position={[s * (halfW - 0.12), 3 + topH * f, zFront + depth * f]}>
          <mesh><boxGeometry args={[0.06, 0.5, 0.18]} /><meshBasicMaterial color="#f3d9a4" toneMapped={false} /></mesh>
          <pointLight color="#ffcf8a" intensity={4} distance={7} decay={2} />
        </group>
      )))}
      <pointLight position={[screen.x, 1.15 + screenH / 2, zFront + 2.5]} color="#c7b6ff" intensity={18} distance={22} decay={1.6} />
    </group>
  );
}

/* ───────────── Sièges : géométrie réelle, instanciée (une mesh par pièce) ───────────── */
function Seats({ L, stateOf, hover, setHover, onPick, dragged }) {
  const n = L.placed.length;
  const cushion = useRef(); const back = useRef(); const armL = useRef(); const armR = useRef(); const base = useRef(); const tag = useRef();
  const geo = useMemo(() => ({
    cushion: new RoundedBoxGeometry(1, 0.13, 0.5, 3, 0.05),
    back: new RoundedBoxGeometry(1, 0.66, 0.13, 3, 0.05),
    arm: new RoundedBoxGeometry(0.07, 0.07, 0.52, 2, 0.025),
    base: new THREE.BoxGeometry(0.34, 0.4, 0.3),
    tag: new THREE.BoxGeometry(0.22, 0.13, 0.015),
  }), []);
  const occupiedIdx = useMemo(() => L.placed.map((p, i) => (stateOf(p.seat) === 'occupied' ? i : -1)).filter((i) => i >= 0), [L, stateOf]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, 0, 0));
    const one = new THREE.Vector3(1, 1, 1);
    L.placed.forEach((p, i) => {
      const { x, z, w, h } = p;
      cushion.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, h + 0.44, z - 0.02), q, new THREE.Vector3(w * 0.86, 1, 1)));
      back.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, h + 0.82, z + 0.25), tilt, new THREE.Vector3(w * 0.86, 1, 1)));
      armL.current.setMatrixAt(i, m.compose(new THREE.Vector3(x - w / 2 + 0.035, h + 0.64, z), q, one));
      armR.current.setMatrixAt(i, m.compose(new THREE.Vector3(x + w / 2 - 0.035, h + 0.64, z), q, one));
      base.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, h + 0.2, z + 0.02), q, new THREE.Vector3(Math.max(1, w / 0.6), 1, 1)));
    });
    [cushion, back, armL, armR, base].forEach((r) => { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); });
  }, [L]);

  // carton « Réservé » posé sur l'assise des sièges occupés (indice visuel en plus de la couleur)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0));
    occupiedIdx.forEach((i, k) => {
      const p = L.placed[i];
      tag.current.setMatrixAt(k, m.compose(new THREE.Vector3(p.x, p.h + 0.56, p.z + 0.05), rot, new THREE.Vector3(1, 1, 1)));
    });
    tag.current.count = occupiedIdx.length;
    tag.current.instanceMatrix.needsUpdate = true;
  }, [L, occupiedIdx]);

  // couleur de chaque siège selon son état réel (jamais modifiée par l'animation)
  useLayoutEffect(() => {
    L.placed.forEach((p, i) => {
      const st = stateOf(p.seat);
      const c = st === 'selected' ? COLORS.selected : i === hover && st === 'available' ? COLORS.hover
        : st === 'available' ? COLORS[p.seat.category] || COLORS.standard : COLORS[st] || COLORS.disabled;
      cushion.current.setColorAt(i, c);
      back.current.setColorAt(i, c);
    });
    cushion.current.instanceColor.needsUpdate = true;
    back.current.instanceColor.needsUpdate = true;
  }, [L, stateOf, hover]);

  const handlers = {
    onPointerMove: (e) => { e.stopPropagation(); if (e.instanceId !== hover) setHover(e.instanceId); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { setHover(null); document.body.style.cursor = ''; },
    onClick: (e) => { e.stopPropagation(); if (!dragged.current) onPick(e.instanceId); },
  };
  const velvet = { roughness: 0.82, metalness: 0.02 };
  return (
    <group>
      <instancedMesh ref={cushion} args={[geo.cushion, null, n]} {...handlers}><meshStandardMaterial {...velvet} /></instancedMesh>
      <instancedMesh ref={back} args={[geo.back, null, n]} {...handlers}><meshStandardMaterial {...velvet} /></instancedMesh>
      <instancedMesh ref={armL} args={[geo.arm, null, n]}><meshStandardMaterial color="#18141c" roughness={0.5} metalness={0.3} /></instancedMesh>
      <instancedMesh ref={armR} args={[geo.arm, null, n]}><meshStandardMaterial color="#18141c" roughness={0.5} metalness={0.3} /></instancedMesh>
      <instancedMesh ref={base} args={[geo.base, null, n]}><meshStandardMaterial color="#0f0d12" roughness={0.6} metalness={0.4} /></instancedMesh>
      <instancedMesh ref={tag} args={[geo.tag, null, Math.max(1, n)]}><meshStandardMaterial color="#d9d4cc" roughness={0.7} /></instancedMesh>
    </group>
  );
}

/* Halo autour des sièges sélectionnés ou survolés (quelques objets seulement). */
function Highlights({ L, selected, hover }) {
  const marks = L.placed.map((p, i) => ({ p, i })).filter(({ p, i }) => selected.has(p.seat.id) || i === hover);
  return marks.map(({ p }) => (
    <mesh key={p.seat.id} position={[p.x, p.h + 0.62, p.z + 0.08]}>
      <boxGeometry args={[p.w + 0.08, 1.05, 0.72]} />
      <meshBasicMaterial color={selected.has(p.seat.id) ? '#a855f7' : '#f6f3ee'} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
    </mesh>
  ));
}

/* Place l'infobulle HTML au-dessus du siège survolé (projection 3D → écran à chaque image). */
const _v = new THREE.Vector3();
function TipTracker({ L, hover, tipRef }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const el = tipRef.current;
    if (!el) return;
    const p = hover != null ? L.placed[hover] : null;
    if (!p) { el.style.opacity = '0'; return; }
    _v.set(p.x, p.h + 1.35, p.z).project(camera);
    const behind = _v.z > 1;
    el.style.opacity = behind ? '0' : '1';
    el.style.transform = `translate(-50%, -100%) translate(${((_v.x + 1) / 2) * size.width}px, ${((1 - _v.y) / 2) * size.height}px)`;
  });
  return null;
}

/* ───────────── Déplacement « à la première personne » ───────────── */
function Walker({ L, keys, look, cam, onReady, doorRefs }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.rotation.order = 'YXZ';
    const reduced = prefersReducedMotion();
    const inside = L.zBack - 0.9;
    cam.current = { x: 0, z: reduced ? inside : L.zBack + 3.2, y: L.topH + EYE, yaw: 0, pitch: -0.06, mode: 'walk' };
    if (reduced) { doorRefs.forEach((d, i) => { if (d.current) d.current.position.x = (i ? 1 : -1) * 1.6; }); onReady(); return undefined; }
    // Entrée : les portes s'ouvrent, on franchit le seuil, la salle se dévoile.
    const tl = gsap.timeline({ delay: 0.3, onComplete: onReady });
    doorRefs.forEach((d, i) => d.current && tl.to(d.current.position, { x: (i ? 1 : -1) * 1.6, duration: 1.2, ease: 'power2.inOut' }, 0));
    tl.to(cam.current, { z: inside, duration: 2.4, ease: 'power2.inOut' }, 0.5);
    return () => tl.kill();
  }, [L]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const c = cam.current;
    if (!c) return;
    const k = keys.current;
    const f = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
    const s = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    if ((f || s) && c.mode === 'sit') c.mode = 'walk'; // bouger = se lever
    if (c.mode === 'walk' && (f || s)) {
      const step = Math.min(dt, 0.05) * SPEED;
      c.x += (-Math.sin(c.yaw) * f + Math.cos(c.yaw) * s) * step;
      c.z += (-Math.cos(c.yaw) * f - Math.sin(c.yaw) * s) * step;
      c.x = THREE.MathUtils.clamp(c.x, -L.halfW + 0.4, L.halfW - 0.4);
      c.z = THREE.MathUtils.clamp(c.z, L.zFront + 1.2, L.zBack - 0.4);
    }
    c.yaw += look.current.dyaw; c.pitch = THREE.MathUtils.clamp(c.pitch + look.current.dpitch, -0.75, 0.6);
    look.current.dyaw = 0; look.current.dpitch = 0;
    if (c.mode === 'walk') {
      const target = (c.z > L.zBack ? L.topH : L.floorAt(c.z)) + EYE;
      c.y += (target - c.y) * Math.min(1, dt * 8); // on monte et descend les marches en douceur
    }
    camera.position.set(c.x, c.y, c.z);
    camera.rotation.set(c.pitch, c.yaw, 0);
  });
  return null;
}

/* ───────────── Composant principal ───────────── */
export default function CinemaHall3D({ plan, occupied, locked, selected, onToggle, prices, film, interactive = true }) {
  const L = useMemo(() => buildLayout(plan), [plan]);
  const wrap = useRef(null);
  const keys = useRef({});
  const look = useRef({ dyaw: 0, dpitch: 0 });
  const cam = useRef(null);
  const dragged = useRef(false);
  const doorRefs = [useRef(null), useRef(null)];
  const tipRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [focus, setFocus] = useState(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [seated, setSeated] = useState(false);

  const stateOf = useMemo(() => (s) => {
    if (s.status !== 'active') return 'disabled';
    if (selected.has(s.id)) return 'selected';
    if (occupied.has(s.id)) return 'occupied';
    if (locked.has(s.id)) return 'locked';
    return 'available';
  }, [selected, occupied, locked]);

  // Rendu suspendu quand la salle n'est pas à l'écran (économie de batterie et de GPU).
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  // Clavier (AZERTY et QWERTY) actif quand la salle a le focus.
  useEffect(() => {
    const el = wrap.current;
    const map = { KeyW: 'fwd', KeyZ: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', KeyQ: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
    const down = (e) => { const k = map[e.code]; if (k) { e.preventDefault(); keys.current[k] = true; if (seated) setSeated(false); } };
    const up = (e) => { const k = map[e.code]; if (k) keys.current[k] = false; };
    const blur = () => { keys.current = {}; };
    el.addEventListener('keydown', down);
    el.addEventListener('keyup', up);
    el.addEventListener('blur', blur);
    return () => { el.removeEventListener('keydown', down); el.removeEventListener('keyup', up); el.removeEventListener('blur', blur); };
  }, [seated]);

  // Glisser pour regarder autour de soi (souris et doigt).
  const drag = useRef(null);
  const onPointerDown = (e) => { wrap.current.focus({ preventScroll: true }); drag.current = { x: e.clientX, y: e.clientY, moved: 0 }; dragged.current = false; };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || !(e.buttons & 1) && e.pointerType === 'mouse') return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved > 6) dragged.current = true;
    look.current.dyaw -= dx * 0.0042; look.current.dpitch -= dy * 0.0032;
  };
  const onPointerUp = () => { drag.current = null; setTimeout(() => { dragged.current = false; }, 0); };

  const pick = (i) => {
    const p = L.placed[i];
    if (!p) return;
    setFocus(i);
    const st = stateOf(p.seat);
    if (interactive && (st === 'available' || st === 'selected')) onToggle(p.seat);
  };

  const sitIn = (i) => {
    const p = L.placed[i];
    const c = cam.current;
    if (!p || !c) return;
    c.mode = 'sit';
    setSeated(true);
    const eyeY = p.h + EYE_SEATED;
    const screenY = 1.15 + (L.screen.w * 0.425) / 2;
    const pitch = Math.atan2(screenY - eyeY, p.z - L.screen.z) * 0.85;
    const yaw = Math.atan2(-(L.screen.x - p.x), p.z - L.screen.z) * 0.6;
    const d = prefersReducedMotion() ? 0 : 1.4;
    gsap.to(c, { x: p.x, z: p.z + 0.12, y: eyeY, pitch, yaw, duration: d, ease: 'power2.inOut' });
  };
  const standUp = () => { if (cam.current) { cam.current.mode = 'walk'; setSeated(false); } };

  const holdKey = (k) => ({
    onPointerDown: (e) => { e.stopPropagation(); keys.current[k] = true; if (seated) setSeated(false); },
    onPointerUp: () => { keys.current[k] = false; },
    onPointerLeave: () => { keys.current[k] = false; },
    onPointerCancel: () => { keys.current[k] = false; },
  });

  const fp = focus != null ? L.placed[focus] : null;
  const fst = fp ? stateOf(fp.seat) : null;
  const dbtn = 'grid size-11 place-items-center rounded-[4px] border border-line bg-ink-2/85 text-paper backdrop-blur active:bg-violet';

  return (
    <div
      ref={wrap}
      tabIndex={0}
      role="application"
      aria-label="Salle de cinéma en 3D : glissez pour regarder, flèches ou ZQSD pour avancer, cliquez un siège pour le choisir"
      className="relative h-[min(72vh,680px)] min-h-[420px] w-full touch-none select-none overflow-hidden bg-[#07060a] outline-none focus-visible:ring-2 focus-visible:ring-violet-hi"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.05, far: 80, position: [0, 2, L.zBack + 3] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      >
        <color attach="background" args={['#07060a']} />
        <fog attach="fog" args={['#07060a', 16, 48]} />
        <ambientLight intensity={1.1} color="#c9b8e6" />
        <hemisphereLight args={['#9c86c2', '#1a1222', 1.1]} />
        <directionalLight position={[0, 9, 6]} intensity={0.9} color="#f1e6ff" />
        <Room L={L} film={film} doorRefs={doorRefs} />
        <Seats L={L} stateOf={stateOf} hover={hover} setHover={setHover} onPick={pick} dragged={dragged} />
        <Highlights L={L} selected={selected} hover={hover} />
        <TipTracker L={L} hover={hover} tipRef={tipRef} />
        <Walker L={L} keys={keys} look={look} cam={cam} onReady={() => setReady(true)} doorRefs={doorRefs} />
      </Canvas>

      {/* Infobulle du siège survolé (positionnée par TipTracker) */}
      <div ref={tipRef} className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-[3px] border border-line bg-ink-2/95 px-2.5 py-1.5 text-center text-[11px] leading-tight text-paper opacity-0 shadow-xl">
        {hover != null && L.placed[hover] && (() => {
          const p = L.placed[hover];
          const st = stateOf(p.seat);
          return (
            <>
              <p className="font-semibold">Rang {p.seat.properties?.row} · {p.seat.properties?.number}</p>
              <p className="text-mist">{st === 'occupied' ? 'Réservé' : st === 'locked' ? 'En cours de réservation' : st === 'disabled' ? 'Indisponible' : `${SEAT_CATEGORIES[p.seat.category]?.label} · ${formatPrice(prices?.[p.seat.category])}`}</p>
            </>
          );
        })()}
      </div>

      {/* Aide */}
      <div className={`pointer-events-none absolute left-3 top-3 max-w-[16rem] rounded-[4px] border border-line bg-ink-2/80 px-3 py-2 text-[11px] leading-relaxed text-mist backdrop-blur transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        Glissez pour regarder · <span className="text-paper">ZQSD</span> ou flèches pour avancer · cliquez un fauteuil pour le choisir
      </div>

      {/* Croix directionnelle (tactile et souris) */}
      <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <span /><button type="button" aria-label="Avancer" className={dbtn} {...holdKey('fwd')}><ArrowUp className="size-4" /></button><span />
        <button type="button" aria-label="Aller à gauche" className={dbtn} {...holdKey('left')}><ArrowLeft className="size-4" /></button>
        <button type="button" aria-label="Reculer" className={dbtn} {...holdKey('back')}><ArrowDown className="size-4" /></button>
        <button type="button" aria-label="Aller à droite" className={dbtn} {...holdKey('right')}><ArrowRight className="size-4" /></button>
      </div>

      {/* Fiche du fauteuil choisi */}
      {fp && (
        <div className="absolute bottom-3 left-3 w-[min(19rem,calc(100%-11rem))] rounded-[4px] border border-line bg-ink-2/92 p-4 backdrop-blur" onPointerDown={(e) => e.stopPropagation()} aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="display-sm text-xl">Rang {fp.seat.properties?.row} · Siège {fp.seat.properties?.number}</p>
              <p className="mt-0.5 text-xs text-mist">{SEAT_CATEGORIES[fp.seat.category]?.label} · {formatPrice(prices?.[fp.seat.category])}</p>
            </div>
            <button type="button" className="rounded-full p-1 text-mist hover:text-paper" aria-label="Fermer" onClick={() => setFocus(null)}><X className="size-4" /></button>
          </div>
          <p className="mt-2 text-xs">
            {fst === 'selected' && <span className="inline-flex items-center gap-1 text-violet-hi"><Check className="size-3.5" />Dans votre sélection</span>}
            {fst === 'available' && <span className="text-ok">Libre</span>}
            {fst === 'occupied' && <span className="text-mist">Déjà réservé</span>}
            {fst === 'locked' && <span className="text-warn">Un autre client est en train de le réserver</span>}
            {fst === 'disabled' && <span className="text-mist">Indisponible</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {interactive && (fst === 'available' || fst === 'selected') && (
              <button type="button" className={fst === 'selected' ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'} onClick={() => onToggle(fp.seat)}>
                <Armchair className="size-3.5" />{fst === 'selected' ? 'Retirer' : 'Choisir ce siège'}
              </button>
            )}
            {seated
              ? <button type="button" className="btn btn-ghost btn-sm" onClick={standUp}><LogOut className="size-3.5" />Se lever</button>
              : <button type="button" className="btn btn-ghost btn-sm" onClick={() => sitIn(focus)}><Eye className="size-3.5" />Voir depuis ce siège</button>}
          </div>
        </div>
      )}
    </div>
  );
}
