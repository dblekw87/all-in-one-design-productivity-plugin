import type { AnalyzeWarning } from "@aio/shared-contracts";

export interface BrowserNavigationSecurityReport {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  redirectCount: number;
  blockedByCode: Record<string, number>;
  warnings: AnalyzeWarning[];
}

export class MutableSecurityReport {
  private readonly blockedByCode = new Map<string, number>();
  readonly warnings: AnalyzeWarning[] = [];
  totalRequests = 0;
  allowedRequests = 0;
  blockedRequests = 0;
  redirectCount = 0;

  recordAllowed(): void {
    this.totalRequests += 1;
    this.allowedRequests += 1;
  }

  recordBlocked(code: string, message: string): void {
    this.totalRequests += 1;
    this.blockedRequests += 1;
    this.blockedByCode.set(code, (this.blockedByCode.get(code) ?? 0) + 1);
    this.warnings.push({ code, message, severity: "WARNING" });
  }

  recordRedirect(): void {
    this.redirectCount += 1;
  }

  snapshot(): BrowserNavigationSecurityReport {
    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      blockedRequests: this.blockedRequests,
      redirectCount: this.redirectCount,
      blockedByCode: Object.fromEntries(this.blockedByCode),
      warnings: [...this.warnings]
    };
  }
}
