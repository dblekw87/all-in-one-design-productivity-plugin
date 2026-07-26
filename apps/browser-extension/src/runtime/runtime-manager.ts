import { ExtensionRuntime } from "./extension-runtime.js";

export class RuntimeManager {
  private readonly runtime = new ExtensionRuntime();

  initialize(): ExtensionRuntime {
    this.runtime.initialize();
    return this.runtime;
  }

  current(): ExtensionRuntime {
    return this.runtime;
  }
}
