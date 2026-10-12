export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/** Côté le plus long de la page PDF : A3 (420 mm). */
export const PDF_LONG_SIDE_MM = 420;

/** Page PDF aux proportions exactes de l'affiche, pour ne jamais la déformer. */
export function pdfPageSize(width: number, height: number): { pageWidth: number; pageHeight: number } {
  const ratio = width / height;
  return ratio >= 1
    ? { pageWidth: PDF_LONG_SIDE_MM, pageHeight: Math.round((PDF_LONG_SIDE_MM / ratio) * 100) / 100 }
    : { pageWidth: Math.round(PDF_LONG_SIDE_MM * ratio * 100) / 100, pageHeight: PDF_LONG_SIDE_MM };
}

/** Attend que les polices (Inter, Mr Dafoe) soient chargées avant de dessiner l'affiche. */
async function waitForFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('400 58px "Mr Dafoe"'),
    document.fonts.load('600 13px "Inter"'),
  ]).catch(() => undefined);
  await document.fonts.ready;
}

async function renderPoster(element: HTMLElement, pixelRatio: number) {
  await waitForFonts();
  const width = element.offsetWidth; // dimensions réelles, indépendantes du zoom d'affichage
  const height = element.offsetHeight;
  // Chargées à la demande : ces deux bibliothèques pèsent lourd et ne servent qu'à l'export.
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, {
    pixelRatio,
    cacheBust: true,
    width,
    height,
    style: { margin: '0', transform: 'none', boxShadow: 'none' },
  });
  return { dataUrl, width, height };
}

function download(href: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();
}

export async function exportPosterAsPng(element: HTMLElement, familyName: string): Promise<void> {
  const { dataUrl } = await renderPoster(element, 3);
  download(dataUrl, `arbre-${slugify(familyName || 'famille')}.png`);
}

export async function exportPosterAsPdf(element: HTMLElement, familyName: string): Promise<void> {
  const { dataUrl, width, height } = await renderPoster(element, 2.5);
  const { pageWidth, pageHeight } = pdfPageSize(width, height);

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true,
  });
  pdf.setProperties({ title: `Arbre généalogique - ${familyName}`, creator: 'TREE' });
  pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  pdf.save(`arbre-${slugify(familyName || 'famille')}.pdf`);
}
