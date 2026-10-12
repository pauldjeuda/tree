import fs from 'fs';
import path from 'path';
import { del, put } from '@vercel/blob';
import { env } from '../config/env.js';

const PHOTO_NAME = /^[a-f0-9]{32}\.webp$/;
const BLOB_PATH = /^\/photos\/[a-f0-9]{32}\.webp$/;

function isPublicBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname.endsWith('.public.blob.vercel-storage.com') &&
      BLOB_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

export class StorageService {
  private readonly uploadDir: string;
  private readonly blobToken?: string;
  private readonly blobStoreId?: string;

  constructor(
    uploadDir: string = env.UPLOAD_DIR_ABS,
    blobToken: string | undefined = env.BLOB_READ_WRITE_TOKEN,
    blobStoreId: string | undefined = env.BLOB_STORE_ID,
  ) {
    this.uploadDir = uploadDir;
    this.blobToken = blobToken;
    this.blobStoreId = blobStoreId;
    // Les fonctions serverless n'ont pas de disque persistant : ne crée pas ./uploads dans ce mode.
    if (!this.usesBlob) fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  public get usesBlob(): boolean {
    // Les projets Vercel connectés au store utilisent un token OIDC éphémère fourni au runtime.
    return Boolean(this.blobToken || (this.blobStoreId && process.env.VERCEL === '1'));
  }

  private get blobAuthOptions(): { token?: string; storeId?: string } {
    if (this.blobToken) return { token: this.blobToken };
    if (this.blobStoreId) return { storeId: this.blobStoreId };
    return {};
  }

  public get directory(): string {
    return this.uploadDir;
  }

  /** Retourne le nom local ou l'URL durable de l'objet Blob. */
  public async saveFile(filename: string, buffer: Buffer): Promise<string> {
    if (!PHOTO_NAME.test(filename)) throw new Error('Nom de fichier photo invalide');
    if (this.usesBlob) {
      const blob = await put('photos/' + filename, buffer, {
        access: 'public',
        contentType: 'image/webp',
        addRandomSuffix: false,
        cacheControlMaxAge: 31_536_000,
        ...this.blobAuthOptions,
      });
      return blob.url;
    }

    await fs.promises.writeFile(path.join(this.uploadDir, filename), buffer, { flag: 'wx' });
    return filename;
  }

  /** Supprime uniquement un fichier local généré ou une URL de Blob reconnue. */
  public async deleteFile(filename: string | null | undefined): Promise<void> {
    if (!filename) return;
    if (isPublicBlobUrl(filename)) {
      if (!this.usesBlob) return;
      try {
        await del(filename, this.blobAuthOptions);
      } catch (err) {
        // La référence a déjà été retirée de la base : une erreur de ménage ne doit pas annuler la réponse.
        console.error('Erreur lors de la suppression de la photo Blob :', err);
      }
      return;
    }
    if (!PHOTO_NAME.test(filename)) return;

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

  /** Retourne l'URL Blob stockée ou l'URL API pour une photo locale historique. */
  public getPublicUrl(filename: string | null | undefined): string | null {
    if (!filename) return null;
    if (isPublicBlobUrl(filename)) return filename;
    if (!PHOTO_NAME.test(filename)) return null;
    return env.PUBLIC_API_URL + '/api/v1/uploads/' + filename;
  }
}

export const storageService = new StorageService();
