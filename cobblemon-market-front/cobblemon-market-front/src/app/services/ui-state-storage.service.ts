import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiStateStorageService {
  getObject<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') {
      return fallback;
    }

    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setObject<T>(key: string, value: T): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota or serialization errors.
    }
  }

  getNumber(key: string, fallback = 0): number {
    const data = this.getObject<{ value?: number } | null>(key, null);
    const value = Number(data?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  setNumber(key: string, value: number): void {
    this.setObject(key, { value });
  }
}
