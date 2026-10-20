import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { closeDB } from "../lib/storage/db";

// Fresh, isolated IndexedDB for every test.
beforeEach(async () => {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => cleanup());
