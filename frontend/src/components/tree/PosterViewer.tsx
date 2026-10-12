import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TreeSnapshot } from '../../shared/index.js';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { TreePoster } from './TreePoster.js';
import { computeTreeLayout } from '../../lib/layout.js';

const MIN_SCALE = 0.04;
const MAX_SCALE = 2.2;
const clamp = (v: number) => Math.min(Math.max(v, MIN_SCALE), MAX_SCALE);

interface PosterViewerProps {
  snapshot: TreeSnapshot;
  posterRef: React.RefObject<HTMLDivElement>;
}

/** Affiche l'arbre avec zoom (boutons, Ctrl+molette, pincement) et déplacement (glisser). */
export const PosterViewer: React.FC<PosterViewerProps> = ({ snapshot, posterRef }) => {
  const containerRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startPan: { x: number; y: number }; startPoint: { x: number; y: number }; startDistance: number; startScale: number } | null>(null);
  const userMoved = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1200 : window.innerWidth);
  const responsiveLayout = useMemo(() => computeTreeLayout(snapshot, viewportWidth < 640 ? 720 : 1040, 780, undefined, viewportWidth), [snapshot, viewportWidth]);

  const fit = useCallback(() => {
    const container = containerRef.current;
    const poster = posterRef.current;
    if (!container || !poster) return;
    const width = poster.offsetWidth || responsiveLayout.width;
    const height = poster.offsetHeight || responsiveLayout.height;
    const next = clamp(Math.min((container.clientWidth - 32) / width, (container.clientHeight - 32) / height, 1.2));
    setScale(next);
    setPan({ x: 0, y: 0 });
    userMoved.current = false;
  }, [posterRef, responsiveLayout.height, responsiveLayout.width]);


  // Recentrer l'arbre complet au chargement et lorsque le cadre change de taille.
  useEffect(() => {
    const timer = setTimeout(fit, 80);
    const onResize = () => {
      userMoved.current = false;
      setViewportWidth(window.innerWidth);
    };
    const container = containerRef.current;
    const resizeObserver = container ? new ResizeObserver(() => {
      if (!userMoved.current) fit();
    }) : null;
    if (container) resizeObserver?.observe(container);
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [fit, snapshot, viewportWidth]);

  const zoomBy = (delta: number) => {
    userMoved.current = true;
    setScale((s) => clamp(s + delta));
  };

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-viewer-controls]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = {
      startPan: pan,
      startPoint: { x: e.clientX, y: e.clientY },
      startDistance: distance(),
      startScale: scale,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    userMoved.current = true;
    if (pointers.current.size >= 2 && gesture.current.startDistance > 0) {
      setScale(clamp(gesture.current.startScale * (distance() / gesture.current.startDistance)));
    } else {
      setPan({
        x: gesture.current.startPan.x + e.clientX - gesture.current.startPoint.x,
        y: gesture.current.startPan.y + e.clientY - gesture.current.startPoint.y,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    gesture.current = pointers.current.size
      ? { startPan: pan, startPoint: [...pointers.current.values()][0]!, startDistance: distance(), startScale: scale }
      : null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      userMoved.current = true;
      setScale((s) => clamp(s - e.deltaY * 0.002));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') zoomBy(0.15);
    else if (e.key === '-') zoomBy(-0.15);
    else if (e.key === '0') fit();
    else if (e.key.startsWith('Arrow')) {
      userMoved.current = true;
      const step = 40;
      setPan((p) => ({
        x: p.x + (e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0),
        y: p.y + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0),
      }));
    } else return;
    e.preventDefault();
  };

  return (
    <main
      ref={containerRef}
      tabIndex={0}
      aria-label={`Arbre généalogique ${snapshot.family.name}. Glissez pour déplacer, flèches du clavier pour naviguer, plus et moins pour zoomer.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      className="relative flex-1 w-full overflow-hidden cursor-grab active:cursor-grabbing select-none bg-[#F4F4F4] touch-none"
    >

      <div
        data-viewer-controls
        className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-hairline rounded-pill px-2 py-1 shadow-card h-[42px] sm:h-[46px]"
      >
        <button type="button" onClick={() => zoomBy(-0.15)} title="Zoom arrière" aria-label="Zoom arrière" className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-black/5">
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            userMoved.current = true;
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          title="Taille réelle (100 %)"
          aria-label={`Zoom ${Math.round(scale * 100)} %, revenir à la taille réelle`}
          className="px-2 text-[12px] sm:text-[13px] font-medium text-ink hover:bg-black/5 rounded-full h-8"
        >
          {Math.round(scale * 100)} %
        </button>
        <button type="button" onClick={() => zoomBy(0.15)} title="Zoom avant" aria-label="Zoom avant" className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-black/5">
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="w-[1px] h-4 bg-hairline mx-1" aria-hidden="true" />
        <button type="button" onClick={fit} title="Adapter à l'écran" aria-label="Adapter l'arbre à l'écran" className="w-8 h-8 rounded-full flex items-center justify-center text-discreet hover:text-ink hover:bg-black/5">
          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="absolute motion-safe:transition-transform motion-safe:duration-75"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <TreePoster ref={posterRef} snapshot={snapshot} className="rounded-[8px]" />
      </div>
    </main>
  );
};
