#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const { generateOneLevel, generateOneRandomLevel, mulberry32 } = require('./levelgen/generator');
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

  const useRandomPool = config.generationMode === 'randomPool' && config.pool && Number.isInteger(config.pool.count);

  if (useRandomPool) {
    const N = config.pool.count;
    const keep = Number.isInteger(config.pool.keep) ? config.pool.keep : null;
    const paramRanges = {
      ...config.pool.paramRanges,
      tileTypesPool: config.ALL_TILE_TYPES || config.pool.paramRanges?.tileTypesPool
    };
    if (!paramRanges.tileTypesPool || paramRanges.tileTypesPool.length < 3) {
      throw new Error('randomPool requires config.ALL_TILE_TYPES or pool.paramRanges.tileTypesPool');
    }
    for (let i = 0; i < N; i += 1) {
      const levelSeed = Math.floor(rng() * 2 ** 31) ^ ((i + 1) * 2654435761);
      const levelRng = mulberry32(levelSeed);
      const level = generateOneRandomLevel(levelRng, i + 1, paramRanges);
      if (level == null) {
        rejected += 1;
        continue;
      }
      const scoredLevel = scoreLevel(level, {
        maxSolveNodes: 250000,
        rollouts: 30,
        rolloutSeed: seed
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
      if (config.output.reportFile) {
        withScore._reportMetrics = scoredLevel.metrics;
      }
      scored.push(withScore);
    }
  } else {
    for (const batch of config.levels) {
      const want = Math.max(1, batch.count || 1);
      const solverConstraints = batch.solverConstraints || {};
      const requireMinSlackAtMost = Number.isInteger(solverConstraints.requireMinSlackAtMost)
        ? solverConstraints.requireMinSlackAtMost
        : null;
      const requireMaxDifficultyRange = typeof solverConstraints.requireMaxDifficultyRange === 'number'
        ? solverConstraints.requireMaxDifficultyRange
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
        if (requireMaxDifficultyRange !== null && scoredLevel.metrics.difficultyRange > requireMaxDifficultyRange) {
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
        if (config.output.reportFile) {
          withScore._reportMetrics = scoredLevel.metrics;
        }
        scored.push(withScore);
        made += 1;
      }
    }
  }

  scored.sort((a, b) => a.difficultyScore - b.difficultyScore);
  const toNumber = useRandomPool && Number.isInteger(config.pool.keep)
    ? scored.slice(0, config.pool.keep)
    : scored;
  // Re-number ids in difficulty order to match game UI progression expectations.
  const levels = toNumber.map((lvl, idx) => ({
    ...lvl,
    id: idx + 1,
    name: lvl.name.replace(/\s+\d+$/, '') + ` ${idx + 1}`
  }));

  const banner = `// AUTO-GENERATED FILE. DO NOT EDIT.\n// Generated at: ${new Date().toISOString()}\n// Seed: ${seed}\n\n`;
  const levelsForFile = levels.map(({ _reportMetrics, ...rest }) => rest);
  const contents =
    banner +
    `window.__TRIPLET_GENERATED_LEVELS__ = ${JSON.stringify(levelsForFile, null, 2)};\n`;

  fs.writeFileSync(outFile, contents, 'utf8');

  if (config.output.reportFile) {
    const reportPath = path.resolve(projectRoot, config.output.reportFile);
    const reportContent = buildDifficultyReport(levels, seed, rejected);
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    process.stdout.write(
      `Rejected ${rejected}, wrote ${levels.length} levels to ${path.relative(projectRoot, outFile)}, report to ${path.relative(projectRoot, reportPath)}\n`
    );
  } else {
    process.stdout.write(
      `Rejected ${rejected}, wrote ${levels.length} levels to ${path.relative(projectRoot, outFile)}\n`
    );
  }
}

function buildDifficultyReport(levels, seed, rejected) {
  const withMetrics = levels.filter(l => l._reportMetrics);
  if (withMetrics.length === 0) {
    return `# Level difficulty report\n\nGenerated: ${new Date().toISOString()}\nSeed: ${seed}\n\nNo level metrics available (report requires reportFile in config).\n`;
  }

  const n = withMetrics.length;
  const third = Math.floor(n / 3);
  const easy = withMetrics.slice(0, third);
  const medium = withMetrics.slice(third, 2 * third);
  const hard = withMetrics.slice(2 * third);

  function stats(arr, getVal) {
    if (arr.length === 0) return { min: null, max: null, mean: null };
    const vals = arr.map(getVal).filter(v => typeof v === 'number' && Number.isFinite(v));
    if (vals.length === 0) return { min: null, max: null, mean: null };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, mean };
  }

  function section(title, levelsInBand) {
    const scores = levelsInBand.map(l => l.difficultyScore);
    const m = levelsInBand.filter(l => l._reportMetrics);
    const scoreS = stats(m, l => l.difficultyScore);
    const minSlackS = stats(m, l => l._reportMetrics.minSlack);
    const forcedRatioS = stats(m, l => l._reportMetrics.forcedRatio);
    const failureRateS = stats(m, l => l._reportMetrics.failureRate);
    const avgTappableS = stats(m, l => l._reportMetrics.avgTappable);
    const minTappableS = stats(m, l => l._reportMetrics.minTappable);
    const stepsS = stats(m, l => l._reportMetrics.steps);
    const nodesS = stats(m, l => l._reportMetrics.nodesExpanded);
    const difficultyRangeS = stats(m, l => l._reportMetrics.difficultyRange);
    const difficultyVarianceS = stats(m, l => l._reportMetrics.difficultyVariance);

    let out = `### ${title}\n\n`;
    out += `| Metric | Min | Max | Mean |\n|--------|-----|-----|------|\n`;
    out += `| Difficulty score | ${format(scoreS.min)} | ${format(scoreS.max)} | ${format(scoreS.mean)} |\n`;
    out += `| Min tray slack (7 - tray size) | ${format(minSlackS.min)} | ${format(minSlackS.max)} | ${format(minSlackS.mean)} |\n`;
    out += `| Forced-move ratio | ${format(forcedRatioS.min)} | ${format(forcedRatioS.max)} | ${format(forcedRatioS.mean)} |\n`;
    out += `| Dead-end (rollout) failure rate | ${format(failureRateS.min)} | ${format(failureRateS.max)} | ${format(failureRateS.mean)} |\n`;
    out += `| Avg tappable tiles per step | ${format(avgTappableS.min)} | ${format(avgTappableS.max)} | ${format(avgTappableS.mean)} |\n`;
    out += `| Min tappable tiles (bottleneck) | ${format(minTappableS.min)} | ${format(minTappableS.max)} | ${format(minTappableS.mean)} |\n`;
    out += `| Solution steps | ${format(stepsS.min)} | ${format(stepsS.max)} | ${format(stepsS.mean)} |\n`;
    out += `| Solver nodes expanded | ${format(nodesS.min)} | ${format(nodesS.max)} | ${format(nodesS.mean)} |\n`;
    out += `| Difficulty range (in-level uniformity) | ${format(difficultyRangeS.min)} | ${format(difficultyRangeS.max)} | ${format(difficultyRangeS.mean)} |\n`;
    out += `| Difficulty variance (in-level uniformity) | ${format(difficultyVarianceS.min)} | ${format(difficultyVarianceS.max)} | ${format(difficultyVarianceS.mean)} |\n`;
    out += `\n**Level count:** ${levelsInBand.length}\n\n`;
    return out;
  }

  function format(x) {
    if (x == null) return '—';
    if (Number.isInteger(x)) return String(x);
    return typeof x === 'number' ? x.toFixed(3) : String(x);
  }

  let md = `# Level difficulty report\n\n`;
  md += `Generated: ${new Date().toISOString()}  \n`;
  md += `Seed: ${seed}  \n`;
  md += `Levels: ${levels.length} (rejected: ${rejected})\n\n`;

  md += `## Overall\n\n`;
  const overallScore = stats(withMetrics, l => l.difficultyScore);
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Difficulty score range | ${format(overallScore.min)} – ${format(overallScore.max)} |\n`;
  md += `| Mean difficulty score | ${format(overallScore.mean)} |\n`;
  md += `| Mean min tray slack | ${format(stats(withMetrics, l => l._reportMetrics.minSlack).mean)} |\n`;
  md += `| Mean forced-move ratio | ${format(stats(withMetrics, l => l._reportMetrics.forcedRatio).mean)} |\n`;
  md += `| Mean rollout failure rate | ${format(stats(withMetrics, l => l._reportMetrics.failureRate).mean)} |\n`;
  md += `| Mean solution steps | ${format(stats(withMetrics, l => l._reportMetrics.steps).mean)} |\n`;
  md += `| Mean difficulty range (in-level uniformity) | ${format(stats(withMetrics, l => l._reportMetrics.difficultyRange).mean)} |\n`;
  md += `| Mean difficulty variance (in-level uniformity) | ${format(stats(withMetrics, l => l._reportMetrics.difficultyVariance).mean)} |\n`;
  md += `\n`;

  md += `## By difficulty band\n\n`;
  md += `Bands are **tertiles** (bottom/middle/top third by difficulty score).\n\n`;
  md += section('Easy (bottom third)', easy);
  md += section('Medium (middle third)', medium);
  md += section('Hard (top third)', hard);

  return md;
}

main();

