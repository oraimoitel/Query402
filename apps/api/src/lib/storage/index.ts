import type { StorageRepository } from "./types.js";
import { createInMemoryStorageRepository } from "./memory.js";

export type { StorageRepository } from "./types.js";
export { createInMemoryStorageRepository } from "./memory.js";
export { resolveApiDataPath } from "./paths.js";

let repository: StorageRepository | null = null;

export function setStorageRepository(next: StorageRepository | null): void {
  if (repository) {
    repository.close();
  }
  repository = next;
}

export function getStorageRepository(): StorageRepository {
  if (!repository) {
    repository = createInMemoryStorageRepository();
  }

  return repository;
}

export function isStorageAvailable(): boolean {
  try {
    return getStorageRepository().isAvailable();
  } catch {
    return false;
  }
}

export function closeStorageRepository(): void {
  if (repository) {
    repository.close();
    repository = null;
  }
}
