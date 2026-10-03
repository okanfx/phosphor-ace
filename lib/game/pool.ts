/**
 * Indexed object pool. The simulation allocates *nothing* after boot:
 * bullets, particles, pickups, floating numbers and enemy slots are all
 * pre-allocated at construction and recycled forever.
 *
 * An OKANFXLABS AI Design Labs production.
 */
export class Pool<T> {
  readonly items: T[] = [];
  /** Active items live in [0, count) and are kept dense. */
  count = 0;
  readonly capacity: number;

  constructor(capacity: number, factory: (index: number) => T, reset: (item: T) => void) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      const item = factory(i);
      reset(item);
      this.items.push(item);
    }
  }

  /** Returns a recycled item, or `null` when the pool is saturated. */
  spawn(): T | null {
    if (this.count >= this.capacity) return null;
    const item = this.items[this.count] as T;
    this.count++;
    return item;
  }

  /** Swap-remove: O(1) and order-independent (we never rely on ordering). */
  release(index: number): void {
    const last = this.count - 1;
    if (index !== last) {
      const tmp = this.items[index] as T;
      this.items[index] = this.items[last] as T;
      this.items[last] = tmp;
    }
    this.count = last;
  }

  clear(): void {
    this.count = 0;
  }

  /** Iterate backwards so `release()` during iteration is safe. */
  forEachReverse(fn: (item: T, index: number) => void): void {
    for (let i = this.count - 1; i >= 0; i--) {
      fn(this.items[i] as T, i);
    }
  }
}
