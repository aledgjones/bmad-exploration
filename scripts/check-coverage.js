#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createCoverageMap } = require('istanbul-lib-coverage');

function checkCoverage(
  threshold = process.env.THRESHOLD ? Number(process.env.THRESHOLD) : 90,
  reportPaths = [],
) {
  const root = process.cwd();
  const defaults = [
    path.join(root, 'frontend', 'coverage', 'coverage-final.json'),
    path.join(root, 'backend', 'coverage', 'coverage-final.json'),
  ];
  const reports = reportPaths.length ? reportPaths : defaults;

  const map = createCoverageMap({});
  let missing = false;

  reports.forEach((reportPath) => {
    if (!fs.existsSync(reportPath)) {
      console.error(`coverage report not found: ${reportPath}`);
      missing = true;
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      map.merge(data);
    } catch (err) {
      console.error(`failed to parse coverage file ${reportPath}: ${err}`);
      missing = true;
    }
  });

  const summary = map.getCoverageSummary().toJSON();
  // istanbul returns "Unknown" when map has no files; cast to 0
  let pct = summary.lines.pct;
  if (typeof pct !== 'number' || isNaN(pct)) {
    pct = 0;
  }
  return { pct, missing };
}

// CLI entry point
if (require.main === module) {
  const result = checkCoverage();
  const pct = result.pct;
  console.log(`combined coverage: ${pct.toFixed(2)}%`);
  if (result.missing) {
    console.error('ERROR: one or more coverage reports missing or invalid');
    process.exit(1);
  }
  const envThreshold = process.env.THRESHOLD
    ? Number(process.env.THRESHOLD)
    : undefined;
  const effectiveThreshold =
    typeof envThreshold === 'number' ? envThreshold : 90;
  if (pct < effectiveThreshold) {
    console.error(
      `ERROR: total coverage ${pct.toFixed(2)}% < threshold ${effectiveThreshold}`,
    );
    process.exit(1);
  } else {
    process.exit(0);
  }
}

module.exports = { checkCoverage };
