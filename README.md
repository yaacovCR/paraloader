# @yaacovcr/paraloader

- @yaacovcr/paraloader - A utility for managing concurrent data loaders of different priorities.

Paraloader is a utility that enhances the DataLoader library by adding a layer of priority to batch requests. It leverages DataLoader's batching and caching features, but with a priority system for scheduling the order of execution. This makes Paraloader ideal for applications where certain data fetching operations are more critical than others.

Paraloader is specifically designed to work with the experimental version of incremental delivery for GraphQL, which allows concurrent (early) execution of resolvers for fields in the initial result as well as within deferred payloads. Using DataLoaders with priorities helps prevent entangling of loads from fields in the initial result and deferred payloads.

## Getting Started

```sh
npm install --save paraloader
```

## Usage

```ts
import { ParaLoader } from 'paraloader';
import * as DataLoader from 'dataloader';

const batchLoadFn = async (keys: Array<string>) => {
  // Fetch your data here based on the keys
};

const paraloader = new ParaLoader(batchLoadFn, { maxPriority: 5 });

// Inside your low priority resolver (priority exposed through info argument):
const lowPriorityLoader = paraloader.getLoader(1);
lowPriorityLoader.load('key2'); 

// Elsewhere in your high priority resolver:
const highPriorityLoader = paraloader.getLoader(0);
highPriorityLoader.load('key1');  // <= key1 will be loaded separately and first!
```

## API

### `ParaLoader`

The `ParaLoader` class is the main interface of the library. It takes a `batchLoadFn` and an optional `options` object as arguments.

#### `constructor(batchLoadFn: BatchLoadFn, options: ParaLoaderOptions)`

Creates a new ParaLoader instance.

- `batchLoadFn`: A function that will be used to fetch the data. The function should return a Promise which resolves to an array of values.
- `options`: An optional options object. This can have the following properties:
  - `maxPriority`: The maximum priority level. Defaults to 9.
  - `priorityQueue`: An optional custom queue library that should implement the `queue` and `dequeue` methods. ParaLoader uses [fastpriorityqueue](https://www.npmjs.com/package/fastpriorityqueue) by default.

#### `getLoader(priority: number): DataLoader`

Returns a DataLoader instance with the specified priority. If a DataLoader for the given priority already exists, it will return the cached instance. If the specified priority exceeds the `maxPriority`, it will be set to the `maxPriority`.

## Contribute

If you have any ideas on how we could improve this library, feel free to contribute! Open an issue or a pull request, and we will do our best to respond in a timely manner.

### Changelog

Changes are tracked as [GitHub releases](https://github.com/yaacovcr/ParaLoader/releases).

### License

@yaacovcr/paraloader is [MIT-licensed](./LICENSE).
