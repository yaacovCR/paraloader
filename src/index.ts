import type { BatchLoadFn, Options as DataLoaderOptions } from 'dataloader';
import DataLoader from 'dataloader';
import FastPriorityQueue from 'fastpriorityqueue';

export interface PriorityQueue<T> {
  queue: (item: T, priority: number) => void;
  dequeue: () => T | undefined;
}

export type Dispatcher = () => void;
export type Scheduler = (dispatcher: Dispatcher) => void;

export interface ParaLoaderOptions<K, V, C> extends DataLoaderOptions<K, V, C> {
  maxPriority?: number;
  priorityQueue?: PriorityQueue<() => void>;
}

export class ParaLoader<K = any, V = any, C = K> {
  private maxPriority: number;
  private priorityQueue: PriorityQueue<() => void>;
  private processing: boolean;
  private scheduler: Scheduler;
  private batchLoader: BatchLoadFn<K, V>;
  private options: ParaLoaderOptions<K, V, C>;
  private loaders: Map<number, DataLoader<K, V, C>>;

  constructor(
    batchLoader: BatchLoadFn<K, V>,
    options: ParaLoaderOptions<K, V, C> = {},
  ) {
    this.maxPriority = options.maxPriority ?? 9;
    this.processing = false;
    this.scheduler = options.batchScheduleFn ?? enqueuePostPromiseJob;
    this.batchLoader = batchLoader;
    this.options = options;
    this.loaders = new Map();

    if (options.priorityQueue !== undefined) {
      this.priorityQueue = options.priorityQueue;
      return;
    }

    const priorityQueue = new FastPriorityQueue<{
      priority: number;
      dispatcher: () => void;
    }>((a, b) => a.priority < b.priority);

    // Initialize the queue with either the custom queue library or the default one
    this.priorityQueue = {
      queue: (dispatcher, priority) =>
        priorityQueue.add({ priority, dispatcher }),
      dequeue: () => priorityQueue.poll()?.dispatcher,
    };
  }

  get [Symbol.toStringTag]() {
    return 'ParaLoader';
  }

  public getLoader(priority: number): DataLoader<K, V, C> {
    if (priority < 0) {
      throw new Error('Priority must be greater than or equal to zero.');
    }

    const cappedPriority =
      priority > this.maxPriority ? this.maxPriority : priority;

    let loader = this.loaders.get(cappedPriority);
    if (loader !== undefined) {
      return loader;
    }

    const loaderOptions: DataLoaderOptions<K, V, C> = {
      ...this.options,
      batchScheduleFn: (dispatcher) =>
        this.schedule(cappedPriority, dispatcher),
    };

    loader = new DataLoader<K, V, C>(
      (keys) => this.batchLoader(keys),
      loaderOptions,
    );

    this.loaders.set(priority, loader);
    return loader;
  }

  private schedule(priority: number, dispatcher: () => void): void {
    this.priorityQueue.queue(dispatcher, priority);
    if (!this.processing) {
      this.processing = true;
      this.scheduler(() => this.dispatch());
    }
  }

  private dispatch(): void {
    let dispatcher = this.priorityQueue.dequeue();
    while (dispatcher !== undefined) {
      dispatcher();
      dispatcher = this.priorityQueue.dequeue();
    }
    this.processing = false;
  }
}

// Private: cached resolved Promise instance
let cachedResolvedPromise: Promise<void> | undefined;

const enqueuePostPromiseJob =
  typeof globalThis.process === 'object' &&
  typeof globalThis.process.nextTick === 'function'
    ? (fn: () => void) => {
        if (cachedResolvedPromise === undefined) {
          cachedResolvedPromise = Promise.resolve();
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        cachedResolvedPromise.then(() => {
          globalThis.process.nextTick(fn);
        });
      }
    : typeof globalThis.setImmediate === 'function'
    ? (fn: () => void) => {
        globalThis.setImmediate(fn);
      }
    : (fn: () => void) => {
        setTimeout(fn);
      };
