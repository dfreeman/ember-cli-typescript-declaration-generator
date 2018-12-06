import path from 'path';
import { addon } from './lib/utilities/ember-cli-entities';
import Funnel from 'broccoli-funnel';
import MergeTrees from 'broccoli-merge-trees';
import { BroccoliNode } from 'broccoli-plugin';
import Addon from 'ember-cli/lib/models/addon';
import extractPathMappings from './lib/extract-path-mappings';
import DeclarationGeneratorRegistry from './lib/declaration-generator-registry';

export default addon({
  name: 'ember-cli-typescript-declaration-generator',

  _generatorRegistry: (null as unknown) as DeclarationGeneratorRegistry,

  setupPreprocessorRegistry(type, registry: any) {
    if (type !== 'parent') return;

    let { outputPath, pathMappings } = this._loadPathsConfiguration();

    this._generatorRegistry = new DeclarationGeneratorRegistry(outputPath, pathMappings);
    this._generatorRegistry.setup(this.parent);

    registry.add('js', {
      ext: this._generatorRegistry.getExtensions(),
      toTree: (tree: BroccoliNode) => tree
    });
  },

  preprocessTree(type: string, tree: BroccoliNode): BroccoliNode {
    if (type === 'src') {
      let name = this.app ? this.app.name : (this.parent as Addon).name;
      this._generatorRegistry.registerTree(type, new Funnel(tree, { destDir: name }));
    } else if (type === 'test' || (type === 'js' && !this._generatorRegistry.hasTree('src'))) {
      this._generatorRegistry.registerTree(type, tree);
    }

    return tree;
  },

  postprocessTree(type: string, tree: BroccoliNode): BroccoliNode {
    if (this._generatorRegistry.hasTree(type)) {
      return new MergeTrees([tree, this._generatorRegistry.processedTree(type)]);
    }

    return tree;
  },

  _loadPathsConfiguration() {
    let ts = this.project.require('typescript') as typeof import('typescript');
    let tsconfigPath = ts.findConfigFile(this.parent.root, ts.sys.fileExists);
    if (!tsconfigPath) {
      throw new Error(`Unable to locate a 'tsconfig.json' rooted above ${this.parent.root}`);
    }

    let rootPath = path.dirname(tsconfigPath);
    let configSource = ts.readJsonConfigFile(tsconfigPath, ts.sys.readFile);
    let config = ts.parseJsonSourceFileConfigFileContent(configSource, ts.sys, rootPath);
    let pathMappings = extractPathMappings(config.options.paths || {});
    let outputPath = `${rootPath}/types/generated`;

    return { outputPath, pathMappings };
  }
});
