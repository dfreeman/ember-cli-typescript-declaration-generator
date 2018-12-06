import Project from 'ember-cli/lib/models/project';
import Addon from 'ember-cli/lib/models/addon';
import { BroccoliNode } from 'broccoli-plugin';
import MergeTrees from 'broccoli-merge-trees';

import { DeclarationSynchronizer } from './declaration-synchronizer';
import { PathMapping } from './extract-path-mappings';

export default class DeclarationGeneratorRegistry {
  private generators: DeclarationGenerator[] = [];
  private inputTrees: Record<string, BroccoliNode> = {};

  constructor(private outputPath: string, private pathMappings: PathMapping[]) {}

  setup(addonOrProject: Addon | Project) {
    if (isGeneratorAddon(addonOrProject)) {
      addonOrProject.setupDeclarationGeneratorRegistry('self', this);
    }

    for (let addon of addonOrProject.addons) {
      if (isGeneratorAddon(addon)) {
        addon.setupDeclarationGeneratorRegistry('parent', this);
      }
    }
  }

  registerTree(type: string, node: BroccoliNode) {
    this.inputTrees[type] = node;
  }

  hasTree(type: string) {
    return type in this.inputTrees;
  }

  processedTree(type: string) {
    let tree = this.inputTrees[type];
    let declarations = new MergeTrees(this.generators
      .map(generator => generator.toTree(type, tree))
      .filter(Boolean) as BroccoliNode[]);

    return new DeclarationSynchronizer(declarations, this.outputPath, this.pathMappings);
  }

  addGenerator(generator: DeclarationGenerator) {
    this.generators.push(generator);
  }

  hasGenerators() {
    return !!this.generators.length;
  }

  getExtensions() {
    let extensions = new Set();
    for (let generator of this.generators) {
      for (let extension of generator.extensions || []) {
        extensions.add(extension);
      }
    }
    return [...extensions];
  }
}

interface DeclarationGeneratorAddon extends Addon {
  setupDeclarationGeneratorRegistry(type: 'self' | 'parent', registry: DeclarationGeneratorRegistry): void;
}

interface DeclarationGenerator {
  name?: string;
  extensions?: string[];
  toTree(type: string, tree: BroccoliNode): BroccoliNode | void;
}

function isGeneratorAddon(addon: Addon | Project): addon is DeclarationGeneratorAddon {
  return !!addon.pkg.keywords && addon.pkg.keywords.includes('ember-cli-typescript-declaration-generator');
}
