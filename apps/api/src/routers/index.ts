import { router } from '../trpc';
import { facilityRouter } from './facility.router';
import { searchRouter } from './search.router';
import { adminRouter } from './admin.router';

export const appRouter = router({
  facility: facilityRouter,
  search: searchRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
