import React, { useRef, useState, useMemo, useEffect } from 'react';
import { TreeSnapshot } from '../../shared/index.js';
import { computeTreeLayout } from '../../lib/layout.js';
import { useTreeStore } from '../../store/useTreeStore.js';
import { Plus, Minus, RotateCcw, Maximize2 } from 'lucide-react';
import { PosterLeftBanner } from './PosterLeftBanner.js';

interface EditorCanvasProps {
  snapshot: TreeSnapshot;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ snapshot }) => {
  const {
    selectedId,
    selectPersonForEdit,
    startAddRelative,
    saveStatus,
    isPanelCollapsed,
  } = useTreeStore();

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialTouchDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1200 : window.innerWidth);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const layout = useMemo(() => {
    return computeTreeLayout(snapshot, viewportWidth < 640 ? 720 : 1100, 850, undefined, viewportWidth);
  }, [snapshot, viewportWidth]);

  const memberCount = snapshot.persons.length;

  // Fit to screen calculation with panel offset awareness
  const fitTree = () => {
    if (!canvasRef.current) return;
    const { clientWidth, clientHeight } = canvasRef.current;
    const pad = 40;
    const panelOffset = !isPanelCollapsed && clientWidth >= 768 ? 440 : 0;
    const availableWidth = clientWidth - panelOffset - pad;
    const scaleX = availableWidth / layout.width;
    const scaleY = (clientHeight - pad) / layout.height;
    const newScale = Math.min(scaleX, scaleY, 1.1);
    const fittedScale = Math.max(newScale, 0.04);
    setScale(fittedScale);
    setPan({
      x: panelOffset + (availableWidth - layout.width * fittedScale) / 2,
      y: (clientHeight - layout.height * fittedScale) / 2,
    });
  };

  useEffect(() => {
    const timer = setTimeout(fitTree, 60);
    const canvas = canvasRef.current;
    const resizeObserver = canvas ? new ResizeObserver(fitTree) : null;
    if (canvas) resizeObserver?.observe(canvas);
    window.addEventListener('resize', fitTree);
    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', fitTree);
    };
  }, [layout.width, layout.height, isPanelCollapsed, viewportWidth]);

  // Zoom handlers
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 2.2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.04));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.member-interactive-node')) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Touch pan & pinch zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.member-interactive-node')) return;
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistance.current = dist;
      initialScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      setPan({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && initialTouchDistance.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDistance.current;
      setScale(Math.min(Math.max(initialScale.current * ratio, 0.04), 2.2));
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    initialTouchDistance.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setScale((s) => Math.min(Math.max(s + delta, 0.04), 2.2));
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden canvas-dots select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Top Family Pill (Dynamically positioned depending on panel state and screen size) */}
      <div
        className={`absolute top-4 sm:top-6 z-30 flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-sm border border-hairline rounded-pill px-3.5 sm:px-5 py-1.5 sm:py-2 shadow-sm pointer-events-auto transition-all ${
          isPanelCollapsed
            ? 'left-16 sm:left-20 max-w-[calc(100vw-15rem)] sm:max-w-[min(32vw,320px)]'
            : 'hidden md:flex md:left-[456px]'
        }`}
      >
        <span
          title={snapshot.family.name || 'Famille'}
          className="min-w-0 truncate font-script text-[20px] sm:text-[24px] text-ink leading-none"
        >
          {snapshot.family.name || 'Famille'}
        </span>
        <span className="hidden sm:inline text-[12px] sm:text-[13px] font-sans text-discreet flex-shrink-0">
          {memberCount} {memberCount > 1 ? 'membres' : 'membre'}
        </span>
      </div>

      {/* Top Right Save Indicator */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-sm border border-hairline rounded-pill px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm pointer-events-auto">
        <span
          className={`w-2 h-2 rounded-full ${
            saveStatus === 'saved'
              ? 'bg-success'
              : saveStatus === 'saving'
              ? 'bg-coral animate-ping'
              : 'bg-danger'
          }`}
        />
        <span className="text-[12px] sm:text-[13px] font-sans text-ink-body">
          {saveStatus === 'saved'
            ? 'Enregistré'
            : saveStatus === 'saving'
            ? 'Enregistrement…'
            : 'Erreur'}
        </span>
      </div>

      {/* Floating Zoom Bar Bottom Right */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-hairline rounded-pill px-2 py-1 shadow-card h-[40px] sm:h-[44px] pointer-events-auto">
        <button
          onClick={handleZoomOut}
          title="Zoom arrière"
          aria-label="Zoom arrière"
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-black/5"
        >
          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Réinitialiser"
          aria-label="Réinitialiser"
          className="px-1.5 sm:px-2 text-[12px] sm:text-[13px] font-medium text-ink hover:bg-black/5 rounded-full h-8"
        >
          {Math.round(scale * 100)} %
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom avant"
          aria-label="Zoom avant"
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-black/5"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <div className="w-[1px] h-4 bg-hairline mx-1" />
        <button
          onClick={fitTree}
          title="Adapter la vue"
          aria-label="Adapter la vue"
          className="w-8 h-8 rounded-full flex items-center justify-center text-discreet hover:text-ink hover:bg-black/5"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Recentrer"
          aria-label="Recentrer"
          className="w-8 h-8 rounded-full flex items-center justify-center text-discreet hover:text-ink hover:bg-black/5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transformable Canvas Surface */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          width: layout.width,
          height: layout.height,
        }}
      >
        {/* Poster Left Banner inside canvas */}
        <PosterLeftBanner
          familyName={snapshot.family.name}
          subtitle={`Arbre généalogique | ${memberCount} membres`}
          posterHeight={layout.height}
        />

        {/* Orthogonal SVG Connectors */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          width={layout.width}
          height={layout.height}
        >
          {layout.connectors.map((conn, idx) => (
            <path
              key={idx}
              d={conn.d}
              stroke="#2B2B2B"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="square"
            />
          ))}
        </svg>

        {/* Member Nodes */}
        <div className="absolute inset-0 w-full h-full z-20 pointer-events-none">
          {layout.nodes.map(({ person, x, y, radius }) => {
            const isSelected = selectedId === person.id;
            const isHovered = hoveredNodeId === person.id;
            const diameter = radius * 2;
            const initials = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();

            return (
              <div
                key={person.id}
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                }}
                className="member-interactive-node absolute flex flex-col items-center pointer-events-auto cursor-pointer"
                onMouseEnter={() => setHoveredNodeId(person.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => selectPersonForEdit(person.id)}
              >
                {/* Photo Circle with interactive ring and hover scale */}
                <div
                  style={{
                    width: diameter,
                    height: diameter,
                  }}
                  className={`relative rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? 'ring-[3px] ring-coral ring-offset-[3px]'
                      : isHovered
                      ? 'scale-[1.04] shadow-md'
                      : ''
                  } ${person.photoUrl ? '' : 'bg-[#E6E8E7]'}`}
                >
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt={person.firstName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <span className="text-[#555] font-sans font-medium text-[20px] select-none">
                      {initials}
                    </span>
                  )}
                </div>

                {/* Action Buttons (+) — visible on hover OR when node is selected */}
                {(isHovered || isSelected) && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Add Parent: Top */}
                    <button
                      type="button"
                      title="Ajouter un parent"
                      aria-label="Ajouter un parent"
                      onClick={(e) => {
                        e.stopPropagation();
                        startAddRelative(person.id, 'parent_of');
                      }}
                      className="group absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-md border border-hairline flex items-center justify-center text-ink hover:bg-coral hover:text-white transition-all pointer-events-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink text-white text-[11px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ajouter un parent
                      </span>
                    </button>

                    {/* Add Child: Bottom */}
                    <button
                      type="button"
                      title="Ajouter un enfant"
                      aria-label="Ajouter un enfant"
                      onClick={(e) => {
                        e.stopPropagation();
                        startAddRelative(person.id, 'child_of');
                      }}
                      className="group absolute -bottom-8 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-md border border-hairline flex items-center justify-center text-ink hover:bg-coral hover:text-white transition-all pointer-events-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink text-white text-[11px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ajouter un enfant
                      </span>
                    </button>

                    {/* Add Spouse: Right */}
                    <button
                      type="button"
                      title="Ajouter un(e) conjoint(e)"
                      aria-label="Ajouter un(e) conjoint(e)"
                      onClick={(e) => {
                        e.stopPropagation();
                        startAddRelative(person.id, 'spouse_of');
                      }}
                      className="group absolute top-1/2 -right-8 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-md border border-hairline flex items-center justify-center text-ink hover:bg-coral hover:text-white transition-all pointer-events-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="absolute top-1/2 left-8 -translate-y-1/2 whitespace-nowrap bg-ink text-white text-[11px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ajouter un(e) conjoint(e)
                      </span>
                    </button>
                  </div>
                )}

                {/* Name + Role Label — BELOW the circle */}
                <div
                  style={{
                    position: 'absolute',
                    top: diameter + 6,
                    width: Math.max(82, Math.round(120 * radius / 42)),
                    textAlign: 'center',
                  }}
                  className="pointer-events-none"
                >
                  <span className="text-[11px] font-sans font-semibold tracking-wide text-[#1F1F1F] uppercase block leading-tight">
                    {person.firstName} {person.lastName}
                  </span>
                  {person.roleLabel && (
                    <span className="text-[10px] font-sans font-normal text-[#6B6B6B] block leading-tight mt-0.5">
                      {person.roleLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Tree State */}
        {snapshot.persons.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#CFCFCF] flex items-center justify-center text-muted mb-4">
              <Plus className="w-8 h-8 text-muted" />
            </div>
            <p className="text-[16px] text-discreet font-medium">
              Votre arbre est vide pour le moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
