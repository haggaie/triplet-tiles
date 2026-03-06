#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const { generateLevelsFromConfig } = require('./levelgen/generator');
const { scoreLevel } = require('./levelgen/score');

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const configPath = path.resolve(projectRoot, 'tools/levelgen/config.js');
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const config = require(configPath);

  const { levels: candidates, meta } = generateLevelsFromConfig(config);
  const outFile = path.resolve(projectRoot, config.output.outFile);

  const scored = [];
  let rejected = 0;
  for (const level of candidates) {
    const scoredLevel = scoreLevel(level, {
      maxSolveNodes: 250000,
      rollouts: 30,
      rolloutSeed: meta.seed
    });
    if (!scoredLevel.solvable) {
      rejected += 1;
      continue;
    }
    const withScore = {
      ...level,
      difficultyScore: scoredLevel.difficultyScore
    };
    if (config.output.includeSolverStats) {
      withScore.solverMetrics = scoredLevel.metrics;
    }
    scored.push(withScore);
  }

  scored.sort((a, b) => a.difficultyScore - b.difficultyScore);
  // Re-number ids in difficulty order to match game UI progression expectations.
  const levels = scored.map((lvl, idx) => ({
    ...lvl,
    id: idx + 1,
    name: lvl.name.replace(/\s+\d+$/, '') + ` ${idx + 1}`
  }));

  const banner = `// AUTO-GENERATED FILE. DO NOT EDIT.\n// Generated at: ${new Date().toISOString()}\n// Seed: ${meta.seed}\n\n`;
  const contents =
    banner +
    `window.__TRIPLET_GENERATED_LEVELS__ = ${JSON.stringify(levels, null, 2)};\n`;

  fs.writeFileSync(outFile, contents, 'utf8');
  process.stdout.write(
    `Generated ${candidates.length} candidates, rejected ${rejected}, wrote ${levels.length} levels to ${path.relative(projectRoot, outFile)}\n`
  );
}

main();

