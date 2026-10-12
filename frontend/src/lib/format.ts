/** « Octobre 2026 | Arbre généalogique » : le mois et l'année viennent de la date de création. */
export function formatPosterSubtitle(createdAt: string | undefined, subtitle: string | undefined): string {
  const date = createdAt ? new Date(createdAt) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(valid);
  const label = month.charAt(0).toUpperCase() + month.slice(1);
  return `${label} | ${subtitle?.trim() || 'Arbre généalogique'}`;
}
