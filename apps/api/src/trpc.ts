import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { prisma } from './db/client';

// Context creation
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return {
    prisma,
    req,
    res,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware (placeholder for future implementation)
const isAuthed = middleware(async ({ ctx, next }) => {
  // TODO: Implement actual auth check
  return next({
    ctx: {
      ...ctx,
      user: null, // Will be populated with actual user
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Admin middleware
const isAdmin = middleware(async ({ ctx, next }) => {
  // TODO: Implement actual admin check
  const isUserAdmin = false; // Placeholder

  if (!isUserAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  }

  return next({ ctx });
});

export const adminProcedure = t.procedure.use(isAdmin);
