/**
 * Shared token manager for automatic access-token refresh.
 *
 * Used by both the API service layer and AuthContext to ensure
 * silent token rotation works regardless of which layer initiates
 * the request.
 */

/** Expiry (ms epoch) read from the JWT `exp` claim, or null if the token is not a decodable JWT. */
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function notifyRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

export async function performTokenRefresh() {
  const storedRefreshToken = localStorage.getItem('auth_refresh_token');
  if (!storedRefreshToken) {
    return null;
  }

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    const text = await res.text().catch(() => '');
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }

    if (res.ok && data && data.success && data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_refresh_token', data.refreshToken);
      if (data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
      notifyRefreshed(data.token);
      window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: data }));
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to refresh the access token. If a refresh is already in
 * flight, waits for it to complete instead of sending a second
 * request.
 */
export async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => resolve(newToken ? { token: newToken } : null));
    });
  }

  isRefreshing = true;
  try {
    const result = await performTokenRefresh();
    return result;
  } finally {
    isRefreshing = false;
  }
}
