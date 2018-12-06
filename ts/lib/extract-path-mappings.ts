export interface PathMapping {
  logicalPath: string;
  physicalPath: string;
}

/**
 * Given a `paths` hash as it appears in `tsconfig.json`, returns an array
 * of objects containing `physicalPath` and `logicalPath` keys, correlating
 * physical paths on disk with logical import locations.
 *
 * Note that this makes the simplifying assumption in the case of multiple
 * physical paths associated with a single logical one that the _first_
 * physical path is the "primary" one.
 */
export default function extractPathMappings(paths: Record<string, string[]>): PathMapping[] {
  return Object.keys(paths)
    .filter(key => key !== '*' && key.indexOf('*') === key.length - 1)
    .map(key => {
      let logicalPath = key.replace(/\*$/, '');
      let physicalPath = paths[key][0].replace(/\*$/, '');
      return { logicalPath, physicalPath };
    });
}

