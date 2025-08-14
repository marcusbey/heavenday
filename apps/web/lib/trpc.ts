import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/routers/_app';

// Get the base URL for API calls
function getBaseUrl() {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
}

export const trpc = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          // Optional: Add headers for authentication if needed
          headers() {
            return {};
          },
        }),
      ],
      // Optional: Add transformer
      // transformer: superjson,
    };
  },
  ssr: false, // We'll handle SSR manually for better performance
});