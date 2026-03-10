#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const { generateOneLevel, mulberry32 } = require('./levelgen/generator');
const { scoreLevel } = require('./levelgen/score');

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const configPath = path.resolve(projectRoot, 'tools/levelgen/config.js');
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const config = require(configPath);

  const outFile = path.resolve(projectRoot, config.output.outFile);

  const scored = [];
  let rejected = 0;
  const seed = Number.isFinite(config.seed) ? config.seed : 1;
  const rng = mulberry32(seed);
  let nextId = 1;

  for (const batch of config.levels) {
    const want = Math.max(1, batch.count || 1);
    const solverConstraints = batch.solverConstraints || {};
    const requireMinSlackAtMost = Number.isInteger(solverConstraints.requireMinSlackAtMost)
      ? solverConstraints.requireMinSlackAtMost
      : null;
    if (requireMinSlackAtMost !== null && (requireMinSlackAtMost < 0 || requireMinSlackAtMost > 7)) {
      throw new Error(`solverConstraints.requireMinSlackAtMost must be in [0..7] (got ${requireMinSlackAtMost})`);
    }

    let made = 0;
    let attempts = 0;
    const maxPerBatchAttempts = Math.max(want, batch.maxGenerateAttempts || want * 40);

    while (made < want) {
      attempts += 1;
      if (attempts > maxPerBatchAttempts) {
        throw new Error(
          `Failed to generate enough levels for template "${batch.templateId}". ` +
          `Made ${made}/${want} within ${maxPerBatchAttempts} attempts. ` +
          `Try relaxing solverConstraints or increasing maxGenerateAttempts.`
        );
      }

      const levelSeed = Math.floor(rng() * 2 ** 31) ^ (nextId * 2654435761);
      const levelRng = mulberry32(levelSeed);
      const level = generateOneLevel(levelRng, batch, nextId);
      nextId += 1;

      const scoredLevel = scoreLevel(level, {
        maxSolveNodes: 250000,
        rollouts: 30,
        rolloutSeed: seed
      });
      if (!scoredLevel.solvable) {
        rejected += 1;
        continue;
      }
      if (requireMinSlackAtMost !== null && scoredLevel.metrics.minSlack > requireMinSlackAtMost) {
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
      made += 1;
    }
  }

  scored.sort((a, b) => a.difficultyScore - b.difficultyScore);
  // Re-number ids in difficulty order to match game UI progression expectations.
  const levels = scored.map((lvl, idx) => ({
    ...lvl,
    id: idx + 1,
    name: lvl.name.replace(/\s+\d+$/, '') + ` ${idx + 1}`
  }));

  const banner = `// AUTO-GENERATED FILE. DO NOT EDIT.\n// Generated at: ${new Date().toISOString()}\n// Seed: ${seed}\n\n`;
  const contents =
    banner +
    `window.__TRIPLET_GENERATED_LEVELS__ = ${JSON.stringify(levels, null, 2)};\n`;

  fs.writeFileSync(outFile, contents, 'utf8');
  process.stdout.write(
    `Rejected ${rejected}, wrote ${levels.length} levels to ${path.relative(projectRoot, outFile)}\n`
  );
}

main();

