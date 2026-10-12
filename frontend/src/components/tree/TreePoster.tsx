import { forwardRef, useEffect, useMemo, useState } from 'react';
import { TreeSnapshot } from '../../shared/index.js';
import { computeTreeLayout } from '../../lib/layout.js';
import { PosterLeftBanner } from './PosterLeftBanner.js';
import { formatPosterSubtitle } from '../../lib/format.js';

interface TreePosterProps {
  snapshot: TreeSnapshot;
  className?: string;
  onNodeClick?: (personId: string) => void;
  interactive?: boolean;
}

export const TreePoster = forwardRef<HTMLDivElement, TreePosterProps>(
  ({ snapshot, className = '', onNodeClick, interactive = false }, ref) => {
    const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1200 : window.innerWidth);

    useEffect(() => {
      const onResize = () => setViewportWidth(window.innerWidth);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    const layout = useMemo(() => {
      const minWidth = viewportWidth < 640 ? 720 : 1040;
      return computeTreeLayout(snapshot, minWidth, 780, undefined, viewportWidth);
    }, [snapshot, viewportWidth]);

    const familyName = snapshot.family.name || 'Ma famille';
    const subtitle = formatPosterSubtitle(snapshot.family.createdAt, snapshot.family.subtitle);
    const posterWidth = layout.width;

    return (
      <div
        ref={ref}
        id="tree-poster-node"
        className={`relative bg-paper border border-[#E8E8E8] shadow-poster select-none transition-all duration-300 ${className}`}
        style={{
          width: posterWidth,
          height: layout.height,
          minWidth: posterWidth,
          minHeight: layout.height,
        }}
      >
        {/* Left Decorative Banner (brush stroke, ink dots, hairline, rotated titles) */}
        <PosterLeftBanner
          familyName={familyName}
          subtitle={subtitle}
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
              strokeLinejoin="miter"
            />
          ))}
        </svg>

        {/* Member Nodes */}
        <div className="absolute inset-0 w-full h-full z-20 pointer-events-none">
          {layout.nodes.map(({ person, x, y, radius }) => {
            const diameter = radius * 2; // 84 px
            const initials = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
            const fullName = `${person.firstName} ${person.lastName}`.trim();
            // Étiquette limitée à l'espace réservé à un membre (120 px) : pas de chevauchement entre voisins.
            const density = radius / 42;
            const labelWidth = Math.max(82, Math.round(124 * density));
            const labelFontSize = Math.max(10, Math.round((fullName.length > 22 ? 11 : 13) * Math.pow(density, 0.35)));

            return (
              <div
                key={person.id}
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
                className={`absolute ${
                  interactive ? 'pointer-events-auto cursor-pointer group' : ''
                }`}
                onClick={() => onNodeClick && onNodeClick(person.id)}
              >
                {/* Photo Circle 84 px */}
                <div
                  style={{ width: diameter, height: diameter }}
                  className="rounded-full overflow-hidden bg-[#E6E8E7] flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-md"
                >
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt={fullName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <span className="text-[#555] font-sans font-medium text-[20px] select-none">
                      {initials}
                    </span>
                  )}
                </div>

                {/* Name Label — BELOW the circle, never on it */}
                <div
                  className="pointer-events-none"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: diameter + 8,
                    transform: 'translateX(-50%)',
                    width: labelWidth,
                    maxWidth: labelWidth,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                >
                  <span
                    className="block w-full font-sans font-semibold uppercase leading-[1.15] text-[#1F1F1F]"
                    style={{ fontSize: labelFontSize, letterSpacing: '0.08em', textAlign: 'center' }}
                  >
                    {fullName}
                  </span>
                  {person.roleLabel && (
                    <span
                      className="block w-full mt-1 font-sans text-[#6B6B6B] leading-[1.1]"
                      style={{ fontSize: Math.max(9, labelFontSize - 1.5), textAlign: 'center' }}
                    >
                      {person.roleLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

TreePoster.displayName = 'TreePoster';
