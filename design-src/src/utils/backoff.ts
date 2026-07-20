export type RetryOptions = {
attempts?: number; // total tries incl. first
baseDelayMs?: number; // initial delay
maxDelayMs?: number; // cap
jitter?: boolean;
onRetry?: (err: unknown, attempt: number) => void; // attempt starts at 1 for first retry
};


export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}) {
const {
attempts = 4,
baseDelayMs = 500,
maxDelayMs = 4000,
jitter = true,
onRetry,
} = opts;


let lastErr: unknown;
for (let i = 0; i < attempts; i++) {
try {
return await fn();
} catch (e) {
lastErr = e;
if (i === attempts - 1) break;
const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** i);
const wait = jitter ? backoff * (0.5 + Math.random() * 0.5) : backoff;
onRetry?.(e, i + 1);
await new Promise((r) => setTimeout(r, wait));
}
}
throw lastErr;
}