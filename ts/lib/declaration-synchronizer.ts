import fs from 'fs-extra';
import FSTree from 'fs-tree-diff';
import walkSync, { WalkSyncEntry } from 'walk-sync';
import BroccoliPlugin, { BroccoliNode } from 'broccoli-plugin';

import { PathMapping } from './extract-path-mappings';

export class DeclarationSynchronizer extends BroccoliPlugin {
  constructor(
    declarationsTree: BroccoliNode,
    private outputRoot: string,
    private pathMappings: PathMapping[]
  ) {
    super([declarationsTree]);
  }

  public build() {
    for (let { physicalPath, logicalPath } of this.pathMappings) {
      let inputPath = `${this.inputPaths[0]}/${logicalPath}`;
      let outputPath = `${this.outputRoot}/${physicalPath}`;
      if (!fs.existsSync(inputPath)) { continue; }

      fs.ensureDirSync(outputPath);

      let inputTree = FSTree.fromEntries(walkSync.entries(inputPath));
      let outputTree = FSTree.fromEntries(walkSync.entries(outputPath));
      let patch = this.calculatePatch(inputTree, outputTree);

      this.applyPatch(inputPath, outputPath, patch);
    }
  }

  private calculatePatch(inputTree: FSTree, outputTree: FSTree) {
    return outputTree.calculatePatch(inputTree, (output, input) => {
      // If they're equal by cheap metrics already, we're good
      if (FSTree.defaultIsEqual(input, output)) {
        return true;
      }

      let inputPath = (input as WalkSyncEntry).fullPath;
      let outputPath = (output as WalkSyncEntry).fullPath;

      // Otherwise, check the actual contents, and if they match, sync the
      // mtimes as a shortcut for quick checks in the future.
      let isEqual = fs.readFileSync(inputPath).equals(fs.readFileSync(outputPath));
      if (isEqual) {
        let { atimeMs, mtimeMs } = fs.lstatSync(outputPath);
        fs.utimesSync(inputPath, atimeMs / 1000, mtimeMs / 1000);
      }

      return isEqual;
    });
  }

  private applyPatch(inputDir: string, outputDir: string, patch: FSTree.Patch[]) {
    // @ts-ignore: the declarations don't allow for the 4th param
    FSTree.applyPatch(inputDir, outputDir, patch, {
      change(inputPath: string, outputPath: string) {
        fs.copySync(inputPath, outputPath, { dereference: true });
      },

      create(inputPath: string, outputPath: string) {
        fs.copySync(inputPath, outputPath, { dereference: true });
      },
    });
  }
}
