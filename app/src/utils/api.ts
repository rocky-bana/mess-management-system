import { auth } from '../firebase';

const rawUrl = import.meta.env.VITE_API_BASE_URL;

// Ensure we strip any accidental wrapping quotes, semicolons, or trailing slashes
export const API_BASE_URL = (
  rawUrl ? String(rawUrl).replace(/['";\s]/g, '') : 'http://localhost:8000'
).replace(/\/+$/, '');

/**
 * Universal authenticated fetch helper that:
 * 1. Automatically prefixes API_BASE_URL for relative paths.
 * 2. Automatically attaches 'Authorization: Bearer <token>' whenever a user is signed in with Firebase.
 * 3. Preserves any custom headers passed by the caller.
 */
export async function authFetch(
  endpointOrUrl: string,
  init?: RequestInit
): Promise<Response> {
  const url = endpointOrUrl.startsWith('http://') || endpointOrUrl.startsWith('https://')
    ? endpointOrUrl
    : `${API_BASE_URL}${endpointOrUrl.startsWith('/') ? '' : '/'}${endpointOrUrl}`;

  const headers = new Headers(init?.headers || {});

  // If Authorization header wasn't manually set, automatically fetch and inject the Firebase ID token
  if (!headers.has('Authorization') && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token for authFetch:', err);
    }
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
