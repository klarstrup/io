import { PersistentStorage } from "../types";

export class SessionStorageWrapper implements PersistentStorage<string | null> {
  constructor(protected storage: SessionStorageInterface) {}

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  removeItem(key: string): undefined {
    this.storage.removeItem(key);
  }

  setItem(key: string, value: string | null): undefined {
    if (value !== null) {
      // setting null to sessionstorage stores "null" as string
      this.storage.setItem(key, value);
    } else {
      this.removeItem(key);
    }
  }
}

interface SessionStorageInterface {
  // Actual type definition: https://github.com/microsoft/TypeScript/blob/main/lib/lib.dom.d.ts#L14276
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
