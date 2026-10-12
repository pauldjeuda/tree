import { del, put } from '@vercel/blob';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../src/services/storage.service.js';

vi.mock('@vercel/blob', () => ({ del: vi.fn(), put: vi.fn() }));

describe('StorageService avec Vercel Blob', () => {
  const token = 'blob-read-write-test-token';
  const filename = '0123456789abcdef0123456789abcdef.webp';
  const blobUrl = 'https://tree.public.blob.vercel-storage.com/photos/' + filename;

  beforeEach(() => vi.clearAllMocks());

  it('envoie les photos vers Blob et conserve leur URL durable', async () => {
    vi.mocked(put).mockResolvedValue({ url: blobUrl } as unknown as Awaited<ReturnType<typeof put>>);
    const uploadDir = path.join(os.tmpdir(), 'tree-blob-test-' + Math.random().toString(16).slice(2));
    const storage = new StorageService(uploadDir, token);
    const reference = await storage.saveFile(filename, Buffer.from('webp'));

    expect(storage.usesBlob).toBe(true);
    expect(fs.existsSync(uploadDir)).toBe(false);
    expect(put).toHaveBeenCalledWith(
      'photos/' + filename,
      Buffer.from('webp'),
      expect.objectContaining({ access: 'public', contentType: 'image/webp', token }),
    );
    expect(storage.getPublicUrl(reference)).toBe(blobUrl);
  });

  it('supprime uniquement les URL Blob reconnues', async () => {
    const storage = new StorageService(path.join(os.tmpdir(), 'tree-blob-delete-test'), token);
    await storage.deleteFile(blobUrl);
    await storage.deleteFile('https://example.com/photos/' + filename);

    expect(del).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledWith(blobUrl, { token });
  });
});
