'use client';

import { useEffect } from 'react';

/**
 * ContainerWakeup
 *
 * Silently pings the pipeline health endpoint via the Next.js API proxy
 * the moment any page loads. Since ACA scales to zero when idle, this
 * gives the container 5-15s to warm up before the user hits "New Tailoring".
 *
 * Uses /api/pipeline/health (server-side proxy) to avoid CORS issues.
 *
 * Renders nothing — drop it in the root layout and forget about it.
 */
export function ContainerWakeup() {
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    fetch('/api/pipeline/health', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .catch(() => {}) // Never surface errors — this is fire-and-forget
      .finally(() => clearTimeout(timeout));
  }, []); // Runs once on mount

  return null;
}
