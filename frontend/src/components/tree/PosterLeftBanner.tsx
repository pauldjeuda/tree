import React from 'react';
import { formatPosterSubtitle } from '../../lib/format.js';

interface PosterLeftBannerProps {
  familyName?: string;
  subtitle?: string;
  className?: string;
  scale?: number;
  posterHeight?: number;
}

export function getFamilyBannerMetrics(familyName: string, posterHeight = 850): {
  fontSize: number;
  bannerWidth: number;
} {
  const safeName = (familyName || 'Votre famille').trim() || 'Votre famille';
  const nameLength = safeName.length;
  const desiredFontSize = Math.max(24, Math.min(58, 58 - Math.max(0, nameLength - 18) * 1.15));
  const availableNameLength = Math.max(160, posterHeight - 280);
  const fittedFontSize = availableNameLength / Math.max(1, nameLength * 0.55);
  const fontSize = Math.max(12, Math.min(desiredFontSize, fittedFontSize));
  const bannerWidth = Math.max(260, Math.min(420, 220 + nameLength * 6.2));

  return { fontSize, bannerWidth };
}

export const PosterLeftBanner: React.FC<PosterLeftBannerProps> = ({
  familyName = 'Famille Mballa',
  subtitle = formatPosterSubtitle(undefined, undefined),
  className = '',
  scale = 1,
  posterHeight = 850,
}) => {
  const safeName = (familyName || 'Votre famille').trim() || 'Votre famille';
  const safeSubtitle = subtitle || 'Arbre généalogique';
  const { fontSize: nameFontSize, bannerWidth } = getFamilyBannerMetrics(safeName, posterHeight);
  const availableNameLength = Math.max(160, posterHeight - 280);
  const familyNameLength = safeName.length * nameFontSize * 0.55;
  const familyNameY = Math.max(220, posterHeight - 50 - Math.min(familyNameLength, availableNameLength));
  const subtitleFontSize = Math.max(9, Math.min(15, availableNameLength / Math.max(1, safeSubtitle.length * 0.5)));
  const subtitleLength = safeSubtitle.length * subtitleFontSize * 0.5;
  const subtitleY = Math.max(220, posterHeight - 50 - Math.min(subtitleLength, availableNameLength));

  const inkDots = [
    { cx: 110, cy: 18, r: 5 },
    { cx: 135, cy: 35, r: 7 },
    { cx: 155, cy: 15, r: 4.5 },
    { cx: 180, cy: 45, r: 6.5 },
    { cx: 198, cy: 22, r: 6 },
    { cx: 225, cy: 50, r: 4 },
    { cx: 245, cy: 30, r: 7 },
    { cx: 125, cy: 62, r: 5.5 },
    { cx: 148, cy: 80, r: 6 },
    { cx: 172, cy: 68, r: 5 },
    { cx: 205, cy: 75, r: 6.5 },
    { cx: 232, cy: 85, r: 4 },
    { cx: 160, cy: 48, r: 3.5 },
    { cx: 190, cy: 88, r: 5 },
  ];

  return (
    <div
      className={`absolute top-0 left-0 h-full pointer-events-none select-none z-10 ${className}`}
      style={{
        width: bannerWidth,
        transformOrigin: 'top left',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${bannerWidth} ${posterHeight}`}
        className="h-full overflow-visible"
        style={{ width: bannerWidth, height: posterHeight }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="coralBrushGrad" x1="45" y1="0" x2="88" y2="219" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F0805F" />
            <stop offset="100%" stopColor="#F59A7A" />
          </linearGradient>
          <filter id="brushRoughness" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        <g filter="url(#brushRoughness)">
          <path
            d="M 48 0 C 52 40, 50 110, 52 180 C 53 198, 56 215, 66 219 C 76 217, 82 195, 84 175 C 87 110, 85 40, 88 0 Z"
            fill="url(#coralBrushGrad)"
            opacity="0.95"
          />
          <path
            d="M 52 10 Q 54 110 55 205 M 62 0 Q 64 120 66 215 M 74 15 Q 75 100 78 200 M 82 5 Q 84 85 85 185"
            stroke="#EA6C49"
            strokeWidth="1.2"
            opacity="0.4"
          />
        </g>

        <g fill="#1F1F1F">
          {inkDots.map((dot, idx) => (
            <circle key={idx} cx={dot.cx} cy={dot.cy} r={dot.r} opacity="0.9" />
          ))}
        </g>

        <path
          d="M 127 50 C 126.8 180, 127.3 320, 127 460 C 126.7 580, 127.2 680, 127 735"
          stroke="#222222"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <g transform={`translate(${Math.min(92, bannerWidth * 0.35)}, ${familyNameY}) rotate(-90)`}>
          <text
            x="0"
            y="0"
            fontFamily="'Mr Dafoe', cursive"
            fontSize={nameFontSize}
            fill="#111111"
            dominantBaseline="alphabetic"
            textAnchor="end"
            className="select-none tracking-normal"
          >
            {safeName}
          </text>
        </g>

        <g transform={`translate(108, ${subtitleY}) rotate(-90)`}>
          <text
            x="0"
            y="0"
            fontFamily="Inter, sans-serif"
            fontSize={subtitleFontSize}
            letterSpacing="0.05em"
            fill="#555555"
            dominantBaseline="alphabetic"
            className="select-none font-normal"
          >
            {safeSubtitle}
          </text>
        </g>
      </svg>
    </div>
  );
};