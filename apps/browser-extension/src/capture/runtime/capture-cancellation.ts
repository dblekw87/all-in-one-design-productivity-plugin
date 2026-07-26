export class BrowserCaptureCancellation {
  private readonly cancelled = new Set<string>();

  cancel(sessionId: string): void {
    this.cancelled.add(sessionId);
  }

  clear(sessionId: string): void {
    this.cancelled.delete(sessionId);
  }

  isCancelled(sessionId: string): boolean {
    return this.cancelled.has(sessionId);
  }
}

export const browserCaptureCancellation = new BrowserCaptureCancellation();
