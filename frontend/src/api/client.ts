import { ApiError } from '../shared/index.js';
import { getEditTokenForFamily } from '../lib/localFamilies.js';

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/, '');

export class ApiRequestError extends Error {
  public code: string;
  public details?: unknown[];
  public status: number;

  constructor(status: number, errorData: ApiError['error']) {
    super(errorData.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = errorData.code;
    this.details = errorData.details;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  familyId?: string
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (familyId) {
    const token = getEditTokenForFamily(familyId);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR' as ApiError['error']['code'],
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
    });
  }

  if (!response.ok) {
    let errorData: ApiError['error'];
    try {
      const json = await response.json();
      errorData = json.error || {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur est survenue lors de la communication avec le serveur',
      };
    } catch {
      errorData = {
        code: 'INTERNAL_ERROR',
        message: `Erreur HTTP ${response.status}`,
      };
    }
    throw new ApiRequestError(response.status, errorData);
  }

  return response.json();
}
