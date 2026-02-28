import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { checkCoverage } from './check-coverage';

describe('checkCoverage script', () => {
  const tmpDir = path.join(__dirname, 'tmp');
  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  });
  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeReport(name: string, data: any) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, JSON.stringify(data));
    return p;
  }

  it('returns failure when below threshold', () => {
    const low = {
      'file.js': {
        path: 'file.js',
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 0 },
        f: {},
        b: {},
      },
    };
    const p = writeReport('low.json', low);
    const { pct } = checkCoverage(90, [p]);
    expect(pct).toBeLessThan(90);
  });

  it('returns success when at or above threshold', () => {
    const high = {
      'file.js': {
        path: 'file.js',
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 1 },
        f: {},
        b: {},
      },
    };
    const p = writeReport('high.json', high);
    const { pct } = checkCoverage(90, [p]);
    expect(pct).toBeGreaterThanOrEqual(90);
  });

  it('treats missing reports as failure', () => {
    const { pct, missing } = checkCoverage(90, [
      path.join(tmpDir, 'does-not-exist.json'),
    ]);
    expect(missing).toBe(true);
    expect(pct).toBe(0);
  });

  it('merges overlapping file paths correctly', () => {
    const r1 = {
      'dup.js': {
        path: 'dup.js',
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 0 },
        f: {},
        b: {},
      },
    };
    const r2 = {
      'dup.js': {
        path: 'dup.js',
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 1 },
        f: {},
        b: {},
      },
    };
    const p1 = writeReport('r1.json', r1);
    const p2 = writeReport('r2.json', r2);
    const { pct } = checkCoverage(90, [p1, p2]);
    // after merging, one hit should exist giving 100% coverage for that line
    expect(pct).toBe(100);
  });

  it('uses default 90% threshold when no env provided', () => {
    // create a dummy report at exactly threshold
    const high = {
      'file.js': {
        path: 'file.js',
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 1 },
        f: {},
        b: {},
      },
    };
    const p = writeReport('high2.json', high);
    const { pct } = checkCoverage(undefined, [p]);
    expect(pct).toBeGreaterThanOrEqual(90);
  });

  it('honors THRESHOLD environment variable when provided', () => {
    process.env.THRESHOLD = '50';
    const low = {
      'file.js': {
        path: 'file.js',
        statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } },
        fnMap: {},
        branchMap: {},
        s: { 0: 0 },
        f: {},
        b: {},
      },
    };
    const p = writeReport('low2.json', low);
    const { pct } = checkCoverage(undefined, [p]);
    expect(pct).toBeLessThan(50);
    delete process.env.THRESHOLD;
  });
});
