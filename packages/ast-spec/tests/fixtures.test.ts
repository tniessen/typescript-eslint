import { parse, TSESTree } from '@typescript-eslint/typescript-estree';
import fs from 'fs';
import glob from 'glob';
import makeDir from 'make-dir';
import path from 'path';

// Assign a segment set to this variable to limit the test to only this segment
// This is super helpful if you need to debug why a specific fixture isn't producing the correct output
// eg. ['declaration', 'ClassDeclaration', 'abstract'] will only test /declaration/ClassDeclaration/fixtures/abstract/fixture.ts
// prettier-ignore
const ONLY = [].join(path.sep);

const SRC_DIR = path.resolve(__dirname, '..', 'src');

const fixtures = glob
  .sync(`${SRC_DIR}/**/fixtures/*/*.{ts,tsx}`)
  .map(absolute => {
    const relative = path.relative(SRC_DIR, absolute);
    const { dir, ext } = path.parse(relative);
    const segments = dir.split(path.sep).filter(s => s !== 'fixtures');
    const name = segments.pop()!;
    const snapshotPath = path.join(SRC_DIR, dir, 'snapshots');
    return {
      absolute,
      name,
      ext,
      segments,
      snapshotPath,
      snapshotFiles: {
        tsestree: {
          ast: path.join(snapshotPath, '1-TSESTree-AST.shot'),
          tokens: path.join(snapshotPath, '2-TSESTree-Tokens.shot'),
          error: path.join(snapshotPath, '3-TSESTree-Error.shot'),
        },
        babel: {
          ast: path.join(snapshotPath, '4-Babel-AST.shot'),
          tokens: path.join(snapshotPath, '5-Babel-Tokens.shot'),
          error: path.join(snapshotPath, '6-Babel-Error.shot'),
        },
        alignment: {
          astDiff: path.join(snapshotPath, '7-AST-Alignment.shot'),
        },
      },
    };
  });

function testTSEStree(
  fixture: typeof fixtures[number],
  contents: string,
): { ast: TSESTree.Program | 'ERROR'; tokens: TSESTree.Token[] | 'ERROR' } {
  let ast: TSESTree.Program | 'ERROR' = 'ERROR';
  let tokens: TSESTree.Token[] | 'ERROR' = 'ERROR';
  let error = 'NO ERROR';

  let result;
  try {
    result = parse(contents, {
      comment: false,
      jsx: fixture.ext.endsWith('x'),
      loc: true,
      range: true,
      tokens: true,
    });
    const { tokens: _, comments: __, ...program } = result;

    tokens = result.tokens;
    ast = program;
  } catch (e) {
    error = e;
  }

  it('TSESTree - AST', () => {
    expect(ast).toMatchSpecificSnapshot(fixture.snapshotFiles.tsestree.ast);
  });
  it('TSESTree - Tokens', () => {
    expect(tokens).toMatchSpecificSnapshot(
      fixture.snapshotFiles.tsestree.tokens,
    );
  });
  it('TSESTree - Error', () => {
    expect(error).toMatchSpecificSnapshot(fixture.snapshotFiles.tsestree.error);
  });

  return {
    tokens,
    ast,
  };
}

function nestDescribe(
  fixture: typeof fixtures[number],
  segments = fixture.segments,
): void {
  if (segments.length > 0) {
    describe(segments[0], () => {
      nestDescribe(fixture, segments.slice(1));
    });
  } else {
    const test = (): void => {
      const contents = fs.readFileSync(fixture.absolute, 'utf8');

      try {
        makeDir.sync(fixture.snapshotPath);
      } catch (e) {
        if ('code' in e && e.code === 'EEXIST') {
          // already exists - ignored
        } else {
          throw e;
        }
      }

      testTSEStree(fixture, contents);

      // TODO - add babel tests
      // TODO - add alignment test
    };

    if ([...fixture.segments, fixture.name].join(path.sep) === ONLY) {
      // eslint-disable-next-line jest/no-focused-tests
      describe.only(fixture.name, test);
    } else {
      describe(fixture.name, test);
    }
  }
}

fixtures.forEach(f => nestDescribe(f));
