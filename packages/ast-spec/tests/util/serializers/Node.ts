import { TSESTree } from '@typescript-eslint/typescript-estree';
import { NewPlugin } from 'pretty-format';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '../../../src';

function sortKeys(node: Record<string, unknown>): string[] {
  const keySet = new Set(Object.keys(node));

  keySet.delete('type');
  keySet.delete('range');
  keySet.delete('loc');

  return Array.from(keySet).sort((a, b) => a.localeCompare(b));
}

function stringifyLineAndColumn(loc: TSESTree.LineAndColumnData): string {
  return `{ column: ${loc.column}, line: ${loc.line} }`;
}

const serializer: NewPlugin = {
  test(val) {
    return (
      val &&
      typeof val === 'object' &&
      // make sure it's not one of the classes from the package
      Object.getPrototypeOf(val) === Object.prototype &&
      'type' in val &&
      (val.type in AST_NODE_TYPES || val.type in AST_TOKEN_TYPES)
    );
  },
  serialize(
    node: Record<string, unknown>,
    config,
    indentation,
    depth,
    refs,
    printer,
  ) {
    const keys = sortKeys(node);
    const type = node.type;
    const loc = node.loc as TSESTree.SourceLocation;
    const range = node.range as TSESTree.Range;

    const outputLines = [];
    const childIndentation = indentation + config.indent;

    outputLines.push(`${type} {`);
    outputLines.push(`${childIndentation}type: "${type}",`);

    for (const key of keys) {
      const value = node[key];
      if (value === undefined) {
        continue;
      }

      outputLines.push(
        `${childIndentation}${key}: ${printer(
          value,
          config,
          childIndentation,
          depth,
          refs,
        )}`,
      );
    }

    outputLines.push('');
    outputLines.push(`${childIndentation}range: [${range.join(', ')}],`);
    outputLines.push(
      `${childIndentation}loc: {`,
      `${childIndentation}${config.indent}start: ${stringifyLineAndColumn(
        loc.start,
      )},`,
      `${childIndentation}${config.indent}end: ${stringifyLineAndColumn(
        loc.end,
      )},`,
      `${childIndentation}},`,
    );
    outputLines.push(`${indentation}}`);

    return outputLines.join('\n');
  },
};

export { serializer };
