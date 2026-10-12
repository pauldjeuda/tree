import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

/** Les photos sont enregistrées sous un nom aléatoire de 32 caractères hexadécimaux. */
const PHOTO_NAME = /^[a-f0-9]{32}\.webp$/;

export class StorageService {
  private uploadDir: string;

  constructor(uploadDir: string = env.UPLOAD_DIR_ABS) {
    this.uploadDir = uploadDir;
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  public get directory(): string {
    return this.uploadDir;
  }

  public async saveFile(filename: string, buffer: Buffer): Promise<string> {
    if (!PHOTO_NAME.test(filename)) throw new Error('Nom de fichier photo invalide');
    await fs.promises.writeFile(path.join(this.uploadDir, filename), buffer, { flag: 'wx' });
    return filename;
  }

  /** Supprime une photo ; ignore tout ce qui n'est pas un nom de fichier généré par l'application. */
  public async deleteFile(filename: string | null | undefined): Promise<void> {
    if (!filename || !PHOTO_NAME.test(filename)) return;
    const filePath = path.join(this.uploadDir, filename);
    const retryDelaysMs = [25, 50, 100];

    for (let attempt = 0; ; attempt++) {
      try {
        await fs.promises.unlink(filePath);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') return;

        if ((code === 'EBUSY' || code === 'EPERM') && attempt < retryDelaysMs.length) {
          await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
          continue;
        }

        console.error('Erreur lors de la suppression du fichier :', err);
        return;
      }
    }
  }
  /** URL publique d'une photo (absolue si PUBLIC_API_URL est défini, relative sinon). */
  public getPublicUrl(filename: string | null | undefined): string | null {
    if (!filename || !PHOTO_NAME.test(filename)) return null;
    return `${env.PUBLIC_API_URL}/api/v1/uploads/${filename}`;
  }
}

export const storageService = new StorageService();
