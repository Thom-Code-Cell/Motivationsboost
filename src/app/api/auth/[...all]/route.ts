import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/server/auth';

// Separate migration endpoint. The existing login has not yet been migrated.
export async function GET(request: Request) { return toNextJsHandler(getAuth()).GET(request); }
export async function POST(request: Request) { return toNextJsHandler(getAuth()).POST(request); }
