import sharp from 'sharp';
import { RelationsError } from './relations.service.js';

export class ImagesService {
  public validateMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebP = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return isJpeg || isPng || isWebP;
  }

  /** Vérifie le format réel, redimensionne en 512 × 512 et supprime les métadonnées (EXIF, GPS). */
  public async processAvatar(buffer: Buffer): Promise<Buffer> {
    if (!this.validateMagicBytes(buffer)) {
      throw new RelationsError('FILE_INVALID', 'Format non pris en charge. Utilisez une image JPG, PNG ou WebP.');
    }
    try {
      return await sharp(buffer, { limitInputPixels: 40_000_000 })
        .rotate() // oriente selon l'EXIF avant de le supprimer
        .resize(512, 512, { fit: 'cover', position: 'attention' })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new RelationsError('FILE_INVALID', 'Cette image est illisible ou trop grande. Essayez un autre fichier.');
    }
  }
}

export const imagesService = new ImagesService();
