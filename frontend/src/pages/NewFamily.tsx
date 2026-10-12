import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { familiesApi } from '../api/families.js';
import { saveLocalFamily } from '../lib/localFamilies.js';
import { PosterLeftBanner } from '../components/tree/PosterLeftBanner.js';
import { formatPosterSubtitle } from '../lib/format.js';
import { ArrowLeft } from 'lucide-react';

export const NewFamily: React.FC = () => {
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState('');
  const [subtitle, setSubtitle] = useState('Arbre généalogique');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await familiesApi.createFamily({
        name: familyName.trim(),
        subtitle: subtitle.trim() || 'Arbre généalogique',
      });

      // Save token to localStorage
      saveLocalFamily({
        id: res.snapshot.family.id,
        name: res.snapshot.family.name,
        editToken: res.editToken,
      });

      // Navigate to editor with token in fragment
      navigate(`/e/${res.snapshot.family.id}#${res.editToken}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de créer la famille');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-page-radial flex flex-col justify-between overflow-x-hidden select-none">
      {/* Decorative Brush Stroke & Ink Splatters positioned discreetly behind the top-left edge */}
      <div className="absolute -top-4 -left-6 pointer-events-none z-0 opacity-40 sm:opacity-50">
        <svg width="240" height="180" viewBox="0 0 320 220" fill="none">
          <path
            d="M 48 0 C 52 40, 50 110, 52 170 C 53 185, 56 198, 66 200 C 76 198, 82 180, 84 165 C 87 110, 85 40, 88 0 Z"
            fill="url(#coralGradNewFam)"
            opacity="0.8"
          />
          <g fill="#1F1F1F" opacity="0.6">
            <circle cx="160" cy="20" r="4" />
            <circle cx="185" cy="42" r="6" />
            <circle cx="210" cy="25" r="5" />
            <circle cx="235" cy="50" r="4.5" />
            <circle cx="255" cy="30" r="5" />
          </g>
          <defs>
            <linearGradient id="coralGradNewFam" x1="45" y1="0" x2="88" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F0805F" />
              <stop offset="100%" stopColor="#F59A7A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Navigation */}
      <header className="relative z-30 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-[14px] sm:text-[15px] font-sans font-medium text-ink hover:text-muted transition-colors py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>

        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-[19px] sm:text-[21px] font-sans font-semibold tracking-tight text-ink lowercase">
            tree
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-coral ml-0.5 mt-0.5" />
        </div>
      </header>

      {/* Main Responsive Content with compact, harmonious proportions */}
      <main className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full">
          {/* Left Column: Title & Form */}
          <div className="lg:col-span-7 text-left">
            <Badge className="mb-2">Nouvelle famille</Badge>

            <h1 className="text-2xl sm:text-3xl lg:text-[40px] leading-tight lg:leading-[46px] tracking-tight font-semibold">
              <span className="block text-[#111111]">Donnez un nom</span>
              <span className="block text-[#8C8C8C]">à votre famille.</span>
            </h1>

            <p className="mt-2 max-w-[440px] text-[14px] sm:text-[15px] text-ink-body font-normal">
              Ce nom figurera fièrement au sommet de votre arbre. Vous pourrez le modifier à tout moment.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-3.5 max-w-[440px]">
              <Input
                label="Nom de la famille"
                placeholder="Ex. Famille Mballa"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                compact
                required

              />

              <Input
                label="Sous-titre (facultatif)"
                placeholder="Arbre généalogique"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                helperText="La date du jour est ajoutée automatiquement."
                compact
              />

              {error && <p className="text-[13px] text-danger">{error}</p>}

              <div className="pt-1.5">
                <Button
                  type="submit"
                  variant="primary"
                  arrow
                  disabled={!familyName.trim() || isSubmitting}
                  className="w-full sm:w-[200px] h-[48px] text-[15px] justify-center shadow-sm"
                >
                  {isSubmitting ? 'Création…' : "Créer l'arbre"}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Harmonious Live Preview Card */}
          <div className="lg:col-span-5 w-full flex flex-col items-center lg:items-start">
            <p className="text-[12px] font-sans font-medium text-discreet mb-1.5 self-start">
              Aperçu en direct
            </p>

            <div className="relative w-full max-w-[360px] sm:max-w-[400px] aspect-[4/3] rounded-2xl bg-paper border border-hairline shadow-card overflow-hidden">
              {/* Scaled Left Banner */}
              <div className="absolute top-0 left-0 h-full w-[120px] pointer-events-none">
                <PosterLeftBanner
                  familyName={familyName || 'Votre famille'}
                  subtitle={formatPosterSubtitle(undefined, subtitle)}
                  scale={0.3}
                />
              </div>

              {/* Pale Tree Skeleton */}
              <div className="absolute inset-0 pl-[105px] flex items-center justify-center pointer-events-none">
                <svg className="w-full max-w-[240px] h-auto" viewBox="0 0 340 280" fill="none">
                  {/* Top Ancestors Circles */}
                  <circle cx="130" cy="50" r="22" stroke="#DADDDB" strokeWidth="2" fill="#EAECEB" />
                  <circle cx="210" cy="50" r="22" stroke="#DADDDB" strokeWidth="2" fill="#EAECEB" />
                  <line x1="152" y1="50" x2="188" y2="50" stroke="#DADDDB" strokeWidth="2" />
                  <line x1="170" y1="50" x2="170" y2="125" stroke="#DADDDB" strokeWidth="2" />
                  <line x1="80" y1="125" x2="260" y2="125" stroke="#DADDDB" strokeWidth="2" />
                  <line x1="80" y1="125" x2="80" y2="170" stroke="#DADDDB" strokeWidth="2" />
                  <line x1="170" y1="125" x2="170" y2="170" stroke="#DADDDB" strokeWidth="2" />
                  <line x1="260" y1="125" x2="260" y2="170" stroke="#DADDDB" strokeWidth="2" />
                  {/* Descendants Circles */}
                  <circle cx="80" cy="195" r="22" stroke="#DADDDB" strokeWidth="2" fill="#EAECEB" />
                  <circle cx="170" cy="195" r="22" stroke="#DADDDB" strokeWidth="2" fill="#EAECEB" />
                  <circle cx="260" cy="195" r="22" stroke="#DADDDB" strokeWidth="2" fill="#EAECEB" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-2.5 text-center text-[11px] sm:text-xs text-discreet border-t border-hairline/60 flex-shrink-0">
        <span>tree. — Créez, sublimez et transmettez votre héritage familial</span>
      </footer>
    </div>
  );
};
