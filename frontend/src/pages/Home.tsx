import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button.js';

// Portraits : photos dans public/portraits (pNN.webp), déjà recadrées aux proportions de chaque cadre
// (143 × 176 px ; 140 × 236 px pour la carte vedette) et centrées sur le visage.
// Pour changer une photo, remplacez simplement le fichier en gardant son nom et ses proportions.
const portrait = (n: number) => `/portraits/p${String(n).padStart(2, '0')}.webp`;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);

  // Proportional fluid scale for desktop & laptop displays >= 1024px
  // Takes both window width and window height into account so buttons are always visible
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width >= 1024) {
        const scaleW = width / 1440;
        // 780 is the compact baseline height of the desktop stage
        const scaleH = (height - 16) / 780;
        setScale(Math.min(1, scaleW, scaleH));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 9 Columns specifications shifted up by 120px so buttons are clearly visible above the fold
  const columns = [
    {
      col: 1,
      x: 20,
      cards: [
        { y: 125, img: portrait(1), label: 'Ancêtre' },
        { y: 314, img: portrait(2), label: 'Mère' },
      ],
    },
    {
      col: 2,
      x: 176,
      cards: [
        { y: 58, img: portrait(3), label: 'Père' },
        { y: 248, img: portrait(4), label: 'Tante' },
      ],
    },
    {
      col: 3,
      x: 333,
      cards: [{ y: 136, img: portrait(5), label: 'Fils' }],
    },
    {
      col: 4,
      x: 489,
      cards: [{ y: 66, img: portrait(6), label: 'Grand-mère' }],
    },
    {
      col: 5,
      x: 648,
      cards: [{ y: 109, img: portrait(7), label: 'Oncle' }],
    },
    {
      col: 6,
      x: 804,
      cards: [{ y: 62, img: portrait(8), label: 'Sœur' }],
    },
    {
      col: 7,
      x: 963,
      cards: [{ y: 138, img: portrait(9), label: 'Petit-fils' }],
    },
    {
      col: 8,
      x: 1119,
      cards: [{ y: 58, img: portrait(10), label: 'Cousin' }],
    },
    {
      col: 9,
      x: 1278,
      cards: [
        { y: 123, img: portrait(11), label: 'Cousine' },
        { y: 314, img: portrait(12), label: 'Fille' },
      ],
    },
  ];

  // Highlight Card portrait
  const highlightCardImg = portrait(13);
  const responsivePortraitRows: { image: number; tilt: string }[][] = [
    [
      { image: 1, tilt: '-rotate-2 translate-y-1' },
      { image: 4, tilt: 'rotate-2 -translate-y-1' },
      { image: 6, tilt: '-rotate-1 translate-y-1' },
      { image: 9, tilt: 'rotate-2 -translate-y-1' },
    ],
    [
      { image: 2, tilt: 'rotate-2 -translate-y-1' },
      { image: 7, tilt: '-rotate-2 translate-y-1' },
      { image: 10, tilt: 'rotate-1 -translate-y-1' },
      { image: 12, tilt: '-rotate-2 translate-y-1' },
    ],
  ];
  const renderPortraitRow = (portraits: (typeof responsivePortraitRows)[number], placement: 'above' | 'below') => (
    <div aria-hidden="true" className={`w-full max-w-[440px] grid grid-cols-4 items-center gap-2 sm:gap-3 ${placement === 'above' ? 'mb-4 sm:mb-6' : 'mt-4 sm:mt-6'}`}>
      {portraits.map((photo) => (
        <div
          key={photo.image}
          className={`w-full aspect-[4/5] rounded-[16px] sm:rounded-[20px] border-[3px] border-white bg-white shadow-highlight overflow-hidden ${photo.tilt}`}
        >
          <img
            src={portrait(photo.image)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover object-top"
          />
        </div>
      ))}
    </div>
  );

  // Vertical hairlines at column centers
  const hairlines = [91, 247, 404, 560, 719, 875, 1034, 1190, 1349];

  return (
    <div className="relative w-full min-h-screen bg-page-radial flex flex-col items-center justify-start overflow-x-hidden">
      {/* =========================================================================
          1. DESKTOP & LAPTOP VIEW (screens >= 1024px)
          Reduced top offset so heading, subtitle, and action buttons are fully in view
      ========================================================================= */}
      <div
        className="hidden lg:flex w-full justify-center items-start overflow-hidden select-none"
        style={{ height: `${780 * scale}px` }}
      >
        <div
          className="relative w-[1440px] h-[780px] flex-shrink-0"
          style={{
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
          }}
        >
          {/* Top subtle strip */}
          <div className="absolute top-0 left-0 right-0 h-[48px] bg-gradient-to-b from-[#EFEFEF] to-[#FAFAFA] z-0" />

          {/* Bottom Strip */}
          <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-[#F0F0F0] shadow-[0_-16px_32px_rgba(0,0,0,0.03)] z-0" />

          {/* Vertical Hairlines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            width="1440"
            height="780"
          >
            {hairlines.map((hx, idx) => (
              <line
                key={idx}
                x1={hx}
                y1="24"
                x2={hx}
                y2="716"
                stroke="#E9E9E9"
                strokeWidth="1"
              />
            ))}

            {/* Dotted coral segments */}
            <line
              x1="247"
              y1="477"
              x2="247"
              y2="555"
              stroke="#F0805F"
              strokeWidth="2"
              strokeDasharray="2 4"
            />
            <line
              x1="1190"
              y1="549"
              x2="1190"
              y2="663"
              stroke="#F0805F"
              strokeWidth="2"
              strokeDasharray="2 4"
            />
          </svg>

          {/* Ghost Cards */}
          {columns.map((col) => {
            const firstCard = col.cards[0];
            const height = firstCard.y - 12 - 24;
            if (height <= 0) return null;

            return (
              <div
                key={`ghost-${col.col}`}
                style={{
                  left: col.x,
                  top: 24,
                  width: 143,
                  height,
                }}
                className="absolute rounded-[20px] bg-gradient-to-b from-transparent to-[#F1F1F1] z-10 pointer-events-none"
              />
            );
          })}

          {/* Photo Cards */}
          {columns.map((col) =>
            col.cards.map((c, idx) => (
              <div
                key={`card-${col.col}-${idx}`}
                style={{
                  left: col.x,
                  top: c.y,
                  width: 143,
                  height: 176,
                }}
                className="absolute rounded-[20px] overflow-hidden bg-white shadow-sm border border-black/5 z-20 transition-transform duration-300 hover:scale-105"
              >
                <img
                  src={c.img}
                  alt={`Portrait : ${c.label}`}
                  width={143}
                  height={176}
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            ))
          )}

          {/* Highlight Card: shifted up to y = 252 */}
          <div
            style={{
              left: 1123,
              top: 252,
              width: 140,
              height: 236,
            }}
            className="perspective-card absolute z-30"
          >
            <div className="tilt-card relative w-full h-full rounded-[22px] border-[3px] border-white shadow-highlight overflow-hidden bg-white">
              <img
                src={highlightCardImg}
                alt="Portrait mis en avant"
                width={140}
                height={236}
                decoding="async"
                draggable={false}
                className="w-full h-full object-cover object-top"
              />

            </div>
          </div>

          {/* Central Block: shifted up to top-[295px] so buttons are fully in view */}
          <div className="absolute inset-x-0 top-[295px] flex flex-col items-center text-center z-30 pointer-events-none">
            {/* Voile blanc limité à la zone du texte (ellipse centrale) : les photos des côtés restent pleinement visibles */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-14 w-[860px] h-[460px] -z-10"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 48%, rgba(255,255,255,0) 74%)',
              }}
            />

            {/* Badge */}
            <div className="pointer-events-auto">
              <div className="flex items-center gap-1.5 text-ink" aria-label="tree">
                <span className="text-[20px] sm:text-[22px] font-sans font-semibold tracking-tight lowercase">tree</span>
                <span className="w-1.5 h-1.5 rounded-full bg-coral ml-0.5 mt-1" aria-hidden="true" />
              </div>
            </div>

            {/* Title: 56px / 62px */}
            <h1 className="mt-4 text-[56px] leading-[62px] tracking-tighter font-semibold select-text">
              <span className="block text-[#1A1A1A]">Toute une famille,</span>
              <span className="block text-[#8C8C8C]">un seul arbre.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 max-w-[500px] text-[17px] leading-[27px] text-[#222] font-normal select-text">
              Ajoutez vos proches, tracez leurs liens et générez un arbre généalogique à télécharger et à partager en quelques minutes.
            </p>

            {/* Action Buttons: clearly visible and elevated */}
            <div className="mt-6 flex items-center gap-4 pointer-events-auto">
              <Button
                variant="primary"
                arrow
                onClick={() => navigate('/nouvelle-famille')}
                className="w-[220px] h-[52px] text-[16px] shadow-sm"
              >
                Créer la famille
              </Button>
              <button
                onClick={() => navigate('/exemple')}
                className="h-[52px] px-6 rounded-pill bg-white text-ink border border-hairline hover:bg-ghost text-[15px] font-sans font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <span>Voir l'exemple</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE & TABLET RESPONSIVE VIEW (screens < 1024px)
          Centered touch experience with buttons directly accessible
      ========================================================================= */}
      <div className="lg:hidden relative isolate w-full min-h-screen flex flex-col justify-between px-4 sm:px-8 py-5 sm:py-7 max-w-5xl mx-auto items-center overflow-hidden">
        {/* Desktop-like portraits frame the hero without pushing content down. */}
        {/* Top Branding Bar */}
        <header className="relative z-20 w-full max-w-2xl flex items-center justify-between pb-4">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-[24px] font-sans font-semibold tracking-tight text-ink lowercase">
              tree
            </span>
            <span className="w-2 h-2 rounded-full bg-coral mt-1" />
          </div>

        </header>

        {/* Hero Section */}
        <div className="relative z-20 flex-1 w-full max-w-xl flex flex-col items-center justify-center text-center my-2">
          {renderPortraitRow(responsivePortraitRows[0], 'above')}
          <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tighter leading-tight sm:leading-[1.15]">
              <span className="block text-[#111]">Toute une famille,</span>
              <span className="block text-[#8C8C8C]">un seul arbre.</span>
            </h1>

            <p className="mt-3 text-[15px] sm:text-[17px] text-[#444] leading-relaxed max-w-md mx-auto">
              Ajoutez vos proches, tracez leurs liens et générez un poster généalogique élégant à exporter et à partager.
            </p>
          </div>
          {renderPortraitRow(responsivePortraitRows[1], 'below')}

          {/* Action CTAs: directly accessible */}
          <div className="mt-5 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              arrow
              onClick={() => navigate('/nouvelle-famille')}
              className="w-full sm:w-auto h-[50px] px-8 text-[16px] shadow-sm justify-center"
            >
              Créer la famille
            </Button>
            <button
              onClick={() => navigate('/exemple')}
              className="w-full sm:w-auto h-[50px] px-6 rounded-pill bg-white text-ink border border-hairline hover:bg-ghost text-[15px] font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Voir l'exemple Mballa</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
