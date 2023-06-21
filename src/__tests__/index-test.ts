import { expect } from 'chai';
import DataLoader from 'dataloader';
import { describe, it } from 'mocha';

import { ParaLoader } from '../index.js';

describe('ParaLoader', () => {
  it('should create new loaders with specified priority', () => {
    const loader = new ParaLoader((keys: ReadonlyArray<number>) =>
      Promise.all(keys),
    );
    const priorityLoader = loader.getLoader(5);
    expect(priorityLoader).to.be.instanceOf(DataLoader);
  });

  it('should throw an error if priority is less than zero', () => {
    const loader = new ParaLoader((keys: ReadonlyArray<number>) =>
      Promise.all(keys),
    );
    expect(() => loader.getLoader(-1)).to.throw(
      'Priority must be greater than or equal to zero.',
    );
  });

  it('should execute loaders with higher priority first', async () => {
    const loads: Array<ReadonlyArray<number>> = [];
    const loadFn = (keys: ReadonlyArray<number>) =>
      Promise.resolve().then(() => {
        loads.push(keys);
        return keys;
      });
    const loader = new ParaLoader(loadFn);

    const lowPriorityLoader = loader.getLoader(5);
    const loadLow = lowPriorityLoader.load(2);

    const highPriorityLoader = loader.getLoader(1);
    const loadHigh = highPriorityLoader.load(1);

    await Promise.all([loadLow, loadHigh]);

    expect(loads).to.deep.equal([[1], [2]]);
  });
});
