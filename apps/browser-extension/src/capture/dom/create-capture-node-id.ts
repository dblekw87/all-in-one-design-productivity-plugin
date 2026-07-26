export class CaptureNodeIdFactory {
  private nextId = 0;

  root(): string {
    return "cap_root";
  }

  next(): string {
    this.nextId += 1;
    return `cap_${String(this.nextId).padStart(6, "0")}`;
  }

  pseudo(parentCaptureNodeId: string, pseudoType: "before" | "after"): string {
    return `${parentCaptureNodeId}::${pseudoType}`;
  }
}
