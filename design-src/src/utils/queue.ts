export function createQueue(concurrency: number) {
let active = 0;
const q: Array<() => Promise<void>> = [];


const runNext = () => {
if (active >= concurrency) return;
const job = q.shift();
if (!job) return;
active++;
job()
.catch(() => {})
.finally(() => {
active--;
runNext();
});
};


function push<T>(task: () => Promise<T>) {
return new Promise<T>((resolve, reject) => {
q.push(async () => {
try {
const val = await task();
resolve(val);
} catch (e) {
reject(e);
}
});
// schedule
queueMicrotask(runNext);
});
}


return { push };
}