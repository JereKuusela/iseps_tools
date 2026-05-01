import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPersistedSignal } from "./persisted-signal";

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

let storageMock: LocalStorageMock;
let originalLocalStorageDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  storageMock = new LocalStorageMock();
  originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storageMock,
  });
});

afterEach(() => {
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(
      globalThis,
      "localStorage",
      originalLocalStorageDescriptor,
    );
    return;
  }

  delete (globalThis as { localStorage?: Storage }).localStorage;
});

describe("createPersistedSignal", () => {
  it("loads an existing value from localStorage", () => {
    storageMock.setItem("test.key", JSON.stringify("stored-value"));

    createRoot((dispose) => {
      const [value] = createPersistedSignal("test.key", "fallback");
      expect(value()).toBe("stored-value");
      dispose();
    });
  });

  it("updates localStorage when the signal updates", () => {
    createRoot((dispose) => {
      const [value, setValue] = createPersistedSignal("counter.key", 1);

      setValue((previous) => previous + 1);

      expect(value()).toBe(2);
      expect(storageMock.getItem("counter.key")).toBe("2");
      dispose();
    });
  });

  it("falls back to initial value when stored JSON is invalid", () => {
    storageMock.setItem("broken.key", "{invalid json");

    createRoot((dispose) => {
      const [value] = createPersistedSignal("broken.key", "fallback");
      expect(value()).toBe("fallback");
      dispose();
    });
  });
});
