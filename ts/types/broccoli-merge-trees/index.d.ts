declare module 'broccoli-merge-trees' {
  import BroccoliPlugin, { BroccoliNode } from 'broccoli-plugin';

  export = BroccoliMergeTrees;

  class BroccoliMergeTrees extends BroccoliPlugin {
    constructor(inputNodes: BroccoliNode[], options?: BroccoliMergeTrees.MergeTreesOptions);
  }

  namespace BroccoliMergeTrees {
    interface MergeTreesOptions {
      /**
       * By default, `broccoli-merge-trees` throws an error when a file exists in multiple
       * nodes. If you pass `{ overwrite: true }`, the output will contain the version of
       * the file as it exists in the last input node that contains it.
       */
      overwrite?: boolean;

      /**
       * A note to help tell multiple plugin instances apart.
       */
      annotation?: string;
    }
  }
}
