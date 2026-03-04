import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@aalta/api/src/routers';
import superjson from 'superjson';

// Create a tRPC client
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/trpc`
        : 'http://localhost:4000/trpc',
      transformer: superjson,
    }),
  ],
});

// Server-side API URL (for SSR)
export function getApiUrl() {
  // For SSR, use internal Docker network URL if available
  if (typeof window === 'undefined') {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }
  // For client-side, use public URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

// Create a fetch wrapper for simple API calls
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
