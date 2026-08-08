'use client';

import { useEffect } from 'react';

/**
 * ContainerWakeup
 *
 * Silently pings the Azure Container App /health endpoint the moment
 * any page loads. Since ACA scales to zero when idle, this gives the
 * container 5-15s to warm up before the user actually hits "New Tailoring".
 *
 * Renders nothing — drop it in the root layout and forget about it.
 */
export function ContainerWakeup() {
  useEffect(() => {
    // Prefer ACA URL for wake-up (the one that scales to zero)
    // Falls back to API_URL for local dev
    const acaUrl = process.env.NEXT_PUBLIC_ACA_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!acaUrl) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    fetch(`${acaUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .catch(() => {}) // Never surface errors — this is fire-and-forget
      .finally(() => clearTimeout(timeout));
  }, []); // Runs once on mount

  return null;
}
