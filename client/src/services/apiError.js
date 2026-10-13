/**
 * User-friendly error handling for API responses.
 *
 * This module ensures the browser's raw JSON parse errors
 * (e.g. "Failed to execute 'json' on 'Response': Unexpected end of JSON input")
 * are never surfaced directly to users. All parsing failures, non-OK statuses,
 * and network rejections are mapped to short, actionable error messages.
 */

// Map an HTTP status code to a user-friendly fallback message.
function statusFallbackMessage(status) {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 408) return 'The request timed out. Please try again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server ran into a problem. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

/**
 * Strips technical runtime / parse errors and converts them to clear, user-friendly language.
 * Guarantees strings like "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * or "Unexpected token < in JSON at position 0" are never displayed.
 *
 * @param {any} errorOrMsg - Error object or string message.
 * @returns {string} Safe, user-friendly error message.
 */
export function sanitizeUserErrorMessage(errorOrMsg) {
  if (!errorOrMsg) return 'Something went wrong. Please try again.';
  const raw = typeof errorOrMsg === 'string' ? errorOrMsg : (errorOrMsg.message || String(errorOrMsg));
  const trimmed = raw.trim();

  // Check for JSON parsing / streaming / unexpected end errors
  if (
    /unexpected end of (json|data|input)/i.test(trimmed) ||
    /failed to execute ['"]?json['"]?/i.test(trimmed) ||
    /is not valid json/i.test(trimmed) ||
    /unexpected token.*json/i.test(trimmed) ||
    /syntaxerror:.*json/i.test(trimmed) ||
    /json\.parse/i.test(trimmed)
  ) {
    return 'The server returned an empty or invalid response. Please try again in a moment.';
  }

  // Check for network and offline failures
  if (
    /failed to fetch/i.test(trimmed) ||
    /networkerror/i.test(trimmed) ||
    /load failed/i.test(trimmed) ||
    /connection refused/i.test(trimmed) ||
    /err_connection/i.test(trimmed) ||
    /network request failed/i.test(trimmed)
  ) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  // Check for client script / type runtime failures
  if (/typeerror:/i.test(trimmed) || /referenceerror:/i.test(trimmed)) {
    return 'An unexpected application error occurred. Please refresh the page and try again.';
  }

  // Check for raw HTML error dumps leaked from server/proxy
  if (/<html|<!doctype|<body|<head/i.test(trimmed)) {
    return 'The server ran into a problem. Please try again in a moment.';
  }

  return trimmed;
}

/**
 * Safely parse a fetch Response as JSON and validate that it succeeded.
 *
 * Never throws the browser's native JSON parse error. Instead, a failed parse,
 * an empty body, a non-JSON response (e.g. an HTML proxy error page), or a
 * non-OK HTTP status all result in a friendly Error whose message is safe to
 * display to the user.
 *
 * @param {Response} res - The fetch Response object.
 * @returns {Promise<any>} Parsed JSON payload on success.
 * @throws {Error} A user-friendly Error describing what went wrong.
 */
export async function parseApiResponse(res) {
  let data = null;
  let rawText = '';

  // Read the body as text first so we can parse defensively.
  try {
    rawText = await res.text();
  } catch {
    rawText = '';
  }

  if (rawText && rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  // If the response is not OK, prefer a server-provided error message
  // when it's a non-empty string; otherwise fall back to a status-based message.
  if (!res.ok || !data || typeof data !== 'object') {
    const serverMessage =
      data && typeof data.error === 'string' && data.error.trim()
        ? data.error
        : data && typeof data.message === 'string' && data.message.trim()
          ? data.message
          : null;

    const friendlyMessage = serverMessage
      ? sanitizeUserErrorMessage(serverMessage)
      : statusFallbackMessage(res.status);

    throw new Error(friendlyMessage);
  }

  return data;
}

/**
 * Wrap a rejected fetch (offline, DNS, CORS, connection reset, timeout)
 * into a user-friendly Error.
 *
 * @returns {Error} A friendly Error suitable for direct display.
 */
export function friendlyNetworkError() {
  return new Error(
    'Unable to reach the server. Please check your connection and try again.',
  );
}
