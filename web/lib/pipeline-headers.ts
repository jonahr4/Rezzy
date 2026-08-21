/**
 * Build standard headers for pipeline step API calls.
 * Includes Content-Type and the user's Firebase UID for per-user source bank resolution.
 */
export function pipelineHeaders(uid?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (uid) {
    headers["x-user-id"] = uid;
  }
  return headers;
}
