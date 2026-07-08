// Opens a protected document (GET /api/documents/:documentId/download) in a
// new tab using an authenticated fetch rather than embedding the raw JWT in
// a clickable URL. Putting a token in a query string is fragile — it has to
// be read fresh from storage at render time, survives in browser history/
// server logs, and silently breaks if that render happened before the token
// was available. Fetching with the same Authorization header used for every
// other API call and handing the browser a blob: URL avoids all of that.
export async function openDocumentInNewTab(authFetch, apiBase, documentId) {
    const res = await authFetch(`${apiBase}/api/documents/${documentId}/download`);

    if (!res.ok) {
        let message = 'Failed to open document.';
        try {
            const data = await res.json();
            message = data.error || data.message || message;
        } catch {
            // response wasn't JSON — keep the default message
        }
        throw new Error(message);
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');

    // Revoke once the new tab has had a chance to load it (or immediately if
    // the popup was blocked, so we don't leak the object URL either way).
    setTimeout(() => URL.revokeObjectURL(blobUrl), win ? 60_000 : 0);

    if (!win) {
        throw new Error('Your browser blocked the popup. Please allow popups for this site and try again.');
    }
}
