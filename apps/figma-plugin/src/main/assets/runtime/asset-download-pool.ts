export async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, signal: AbortSignal, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  async function run(): Promise<void> {
    while (true) {
      if (signal.aborted) return;
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => run()));
  if (signal.aborted) throw signal.reason ?? new Error("cancelled");
  return results;
}
