//! DFS solver for Triplet Tiles. Same rules as game.js / tile-layering.js:
//! - Tray holds tiles; 3 of same type clear. Tray size max 7.
//! - A tile is tappable iff not removed and no covering tile (higher z, overlapping footprint) remains.
//! - Covering: odd z shifts the tile center by 0.5 cell along (+x,-y); even z has no shift.
//!   Unit squares (1x1 cells) at those centers overlap and other.z > tile.z => other covers tile.

use bit_set::BitSet;
use rustc_hash::FxHashSet;
use std::hash::Hash;

/// One tile in the layout (after mapping type string -> type_id).
#[derive(Clone, Debug)]
pub struct Tile {
    pub type_id: u8,
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

/// Memo key: (removed bitset, tray counts). BitSet and Vec<u8> both implement Hash + Eq.
#[derive(Clone, Hash, PartialEq, Eq)]
struct StateKey {
    removed: BitSet,
    tray: Vec<u8>,
}

fn layer_diagonal_fraction(z: i32) -> f64 {
    if z.rem_euclid(2) == 1 {
        0.5
    } else {
        0.0
    }
}

fn tile_center_cells(t: &Tile) -> (f64, f64) {
    let f = layer_diagonal_fraction(t.z);
    (t.x as f64 + 0.5 + f, t.y as f64 + 0.5 - f)
}

fn unit_squares_overlap(c1: (f64, f64), c2: (f64, f64)) -> bool {
    (c1.0 - c2.0).abs() < 1.0 && (c1.1 - c2.1).abs() < 1.0
}

fn tile_covers(other: &Tile, tile: &Tile) -> bool {
    other.z > tile.z && unit_squares_overlap(tile_center_cells(other), tile_center_cells(tile))
}

/// Build coverers: coverers[i] = list of tile indices j that cover tile i.
fn compute_coverers(tiles: &[Tile]) -> Vec<Vec<usize>> {
    let n = tiles.len();
    let mut coverers = vec![Vec::new(); n];
    for i in 0..n {
        let a = &tiles[i];
        for j in 0..n {
            if i == j {
                continue;
            }
            let b = &tiles[j];
            if tile_covers(b, a) {
                coverers[i].push(j);
            }
        }
    }
    coverers
}

fn get_tappable(n: usize, removed: &BitSet, coverers: &[Vec<usize>]) -> Vec<usize> {
    let mut tappable = Vec::new();
    for i in 0..n {
        if removed.contains(i) {
            continue;
        }
        let covered = coverers[i].iter().any(|&j| !removed.contains(j));
        if !covered {
            tappable.push(i);
        }
    }
    tappable
}

/// Move ordering score (higher = prefer this move). Same as JS moveOrderingScore.
fn move_ordering_score(tray_counts: &[u8], tray_len: u8, type_id: u8) -> i32 {
    let in_tray = tray_counts[type_id as usize];
    let mut score = 0i32;
    if in_tray == 2 {
        score += 100;
    }
    if in_tray == 1 {
        score += 25;
    }
    if in_tray == 0 {
        score -= 5;
    }
    if tray_len >= 5 && in_tray == 0 {
        score -= 20;
    }
    if tray_len >= 6 && in_tray == 0 {
        score -= 50;
    }
    score
}

/// Apply one pick: add tile type to tray (count mod 3, tray_len update).
fn apply_tray_add(
    tray_counts: &[u8],
    tray_len: u8,
    type_id: u8,
) -> (Vec<u8>, u8) {
    let mut next = tray_counts.to_vec();
    let t = type_id as usize;
    let prev = next[t];
    let now = prev + 1;
    next[t] = if now >= 3 { 0 } else { now };
    let next_len = if now >= 3 {
        tray_len + 1 - 3
    } else {
        tray_len + 1
    };
    (next, next_len)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SolveStatus {
    Win,
    Fail,
    Capped,
}

pub struct SolveResult {
    pub status: SolveStatus,
    pub solution: Option<Vec<usize>>,
    pub nodes_expanded: u32,
    pub memo_size: usize,
}

/// Depth-limited lookahead + leaf evaluation (max-player).
#[derive(Clone, Debug)]
pub struct HeuristicOptions {
    pub search_depth: u8,
    pub max_moves_per_node: usize,
    pub max_steps: u32,
}

impl Default for HeuristicOptions {
    fn default() -> Self {
        Self {
            search_depth: 3,
            max_moves_per_node: 8,
            max_steps: 200,
        }
    }
}

/// Soft forcing: count taps with value in [v* - margin_delta, v*]; forced if that count <= 1.
#[derive(Clone, Debug)]
pub struct ForcedScanOptions {
    pub lookahead_depth: u8,
    pub max_moves_per_node: usize,
    pub margin_delta: i32,
}

impl Default for ForcedScanOptions {
    fn default() -> Self {
        Self {
            lookahead_depth: 3,
            max_moves_per_node: 8,
            margin_delta: 100,
        }
    }
}

pub struct ForcedScanResult {
    pub forced_ratio_k: f64,
    pub forced_steps_k: u32,
    pub steps: u32,
    pub step_forced_k: Vec<u8>,
    pub lookahead_nodes: u64,
}

const EVAL_WIN: i32 = 1_000_000;
const EVAL_LOSS: i32 = -1_000_000;

fn removed_count(n: usize, removed: &BitSet) -> usize {
    (0..n).filter(|&i| removed.contains(i)).count()
}

fn is_terminal_win(n: usize, removed: &BitSet, tray_len: u8) -> bool {
    tray_len == 0 && (0..n).all(|i| removed.contains(i))
}

/// Leaf heuristic: higher is better for the player (more slack, more choice, more progress).
fn evaluate_leaf(
    n: usize,
    removed: &BitSet,
    _tray: &[u8],
    tray_len: u8,
    coverers: &[Vec<usize>],
) -> i32 {
    if tray_len > 7 {
        return EVAL_LOSS;
    }
    if is_terminal_win(n, removed, tray_len) {
        return EVAL_WIN;
    }
    let tappable = get_tappable(n, removed, coverers);
    if tappable.is_empty() {
        return EVAL_LOSS;
    }
    let slack = (7i32 - i32::from(tray_len)).max(0);
    let r = removed_count(n, removed) as i32;
    slack * 200 + (tappable.len() as i32) * 15 + r * 12
}

fn lookahead_value(
    n: usize,
    tiles: &[Tile],
    coverers: &[Vec<usize>],
    num_types: usize,
    removed: &BitSet,
    tray: &[u8],
    tray_len: u8,
    depth: u8,
    max_moves: usize,
    nodes: &mut u64,
) -> i32 {
    *nodes += 1;

    if is_terminal_win(n, removed, tray_len) {
        return EVAL_WIN;
    }
    if tray_len > 7 {
        return EVAL_LOSS;
    }

    let mut tappable = get_tappable(n, removed, coverers);
    if tappable.is_empty() {
        return EVAL_LOSS;
    }

    if depth == 0 {
        return evaluate_leaf(n, removed, tray, tray_len, coverers);
    }

    tappable.sort_by(|&i, &j| {
        let si = move_ordering_score(tray, tray_len, tiles[i].type_id);
        let sj = move_ordering_score(tray, tray_len, tiles[j].type_id);
        sj.cmp(&si)
    });
    if max_moves > 0 && tappable.len() > max_moves {
        tappable.truncate(max_moves);
    }

    let mut best = EVAL_LOSS;
    for &idx in &tappable {
        if tray_len >= 7 {
            break;
        }
        let type_id = tiles[idx].type_id;
        let mut next_removed = removed.clone();
        next_removed.insert(idx);
        let (next_tray, next_len) = apply_tray_add(tray, tray_len, type_id);
        let v = lookahead_value(
            n,
            tiles,
            coverers,
            num_types,
            &next_removed,
            &next_tray,
            next_len,
            depth - 1,
            max_moves,
            nodes,
        );
        if v > best {
            best = v;
        }
    }
    best
}

/// Greedy play: each step pick first tap with maximal `lookahead_value(child, search_depth)`.
pub fn solve_heuristic(tiles: &[Tile], opts: &HeuristicOptions) -> SolveResult {
    let n = tiles.len();
    if n == 0 {
        return SolveResult {
            status: SolveStatus::Fail,
            solution: None,
            nodes_expanded: 0,
            memo_size: 0,
        };
    }

    let num_types = tiles
        .iter()
        .map(|t| t.type_id as usize)
        .max()
        .unwrap_or(0)
        + 1;

    let mut type_counts = vec![0usize; num_types];
    for t in tiles {
        type_counts[t.type_id as usize] += 1;
    }
    if type_counts.iter().any(|&c| c % 3 != 0) {
        return SolveResult {
            status: SolveStatus::Fail,
            solution: None,
            nodes_expanded: 0,
            memo_size: 0,
        };
    }

    let coverers = compute_coverers(tiles);
    let mut removed = BitSet::new();
    let mut tray = vec![0u8; num_types];
    let mut tray_len: u8 = 0;
    let mut path = Vec::new();
    let mut nodes: u64 = 0;
    let max_m = opts.max_moves_per_node.max(1);

    for _ in 0..opts.max_steps {
        if is_terminal_win(n, &removed, tray_len) {
            return SolveResult {
                status: SolveStatus::Win,
                solution: Some(path),
                nodes_expanded: nodes.min(u32::MAX as u64) as u32,
                memo_size: 0,
            };
        }
        if tray_len > 7 {
            break;
        }

        let mut tappable = get_tappable(n, &removed, &coverers);
        if tappable.is_empty() {
            break;
        }

        tappable.sort_by(|&i, &j| {
            let si = move_ordering_score(&tray, tray_len, tiles[i].type_id);
            let sj = move_ordering_score(&tray, tray_len, tiles[j].type_id);
            sj.cmp(&si)
        });
        if tappable.len() > max_m {
            tappable.truncate(max_m);
        }

        let mut best_idx = tappable[0];
        let mut best_v = EVAL_LOSS;
        for &idx in &tappable {
            let type_id = tiles[idx].type_id;
            let mut next_removed = removed.clone();
            next_removed.insert(idx);
            let (next_tray, next_len) = apply_tray_add(&tray, tray_len, type_id);
            let v = lookahead_value(
                n,
                tiles,
                &coverers,
                num_types,
                &next_removed,
                &next_tray,
                next_len,
                opts.search_depth,
                max_m,
                &mut nodes,
            );
            if v > best_v {
                best_v = v;
                best_idx = idx;
            }
        }

        removed.insert(best_idx);
        let type_id = tiles[best_idx].type_id;
        let (next_tray, next_len) = apply_tray_add(&tray, tray_len, type_id);
        tray = next_tray;
        tray_len = next_len;
        path.push(best_idx);
    }

    let status = if is_terminal_win(n, &removed, tray_len) {
        SolveStatus::Win
    } else {
        SolveStatus::Fail
    };

    SolveResult {
        status,
        solution: if status == SolveStatus::Win {
            Some(path)
        } else {
            None
        },
        nodes_expanded: nodes.min(u32::MAX as u64) as u32,
        memo_size: 0,
    }
}

/// Walk `solution` states; at each step score every tappable tile with lookahead from the child state.
pub fn forced_ratio_scan(
    tiles: &[Tile],
    solution: &[usize],
    opts: &ForcedScanOptions,
) -> Option<ForcedScanResult> {
    let n = tiles.len();
    if n == 0 {
        return None;
    }

    let num_types = tiles
        .iter()
        .map(|t| t.type_id as usize)
        .max()
        .unwrap_or(0)
        + 1;

    let mut type_counts = vec![0usize; num_types];
    for t in tiles {
        type_counts[t.type_id as usize] += 1;
    }
    if type_counts.iter().any(|&c| c % 3 != 0) {
        return None;
    }

    let coverers = compute_coverers(tiles);
    let mut removed = BitSet::new();
    let mut tray = vec![0u8; num_types];
    let mut tray_len: u8 = 0;
    let mut step_forced_k: Vec<u8> = Vec::new();
    let mut forced_steps_k: u32 = 0;
    let mut steps: u32 = 0;
    let mut lookahead_nodes: u64 = 0;
    let max_m = opts.max_moves_per_node.max(1);
    let depth = opts.lookahead_depth;

    for &sol_idx in solution {
        if tray_len >= 7 {
            break;
        }
        if is_terminal_win(n, &removed, tray_len) {
            break;
        }

        let tappable = get_tappable(n, &removed, &coverers);
        if tappable.is_empty() {
            break;
        }

        let mut values: Vec<i32> = Vec::with_capacity(tappable.len());
        for &idx in &tappable {
            let type_id = tiles[idx].type_id;
            let mut next_removed = removed.clone();
            next_removed.insert(idx);
            let (next_tray, next_len) = apply_tray_add(&tray, tray_len, type_id);
            let v = lookahead_value(
                n,
                tiles,
                &coverers,
                num_types,
                &next_removed,
                &next_tray,
                next_len,
                depth,
                max_m,
                &mut lookahead_nodes,
            );
            values.push(v);
        }

        let v_star = *values.iter().max().unwrap_or(&EVAL_LOSS);
        let in_band = values
            .iter()
            .filter(|&&v| v >= v_star.saturating_sub(opts.margin_delta))
            .count();
        let is_forced = in_band <= 1;
        if is_forced {
            forced_steps_k += 1;
        }
        step_forced_k.push(if is_forced { 1 } else { 0 });

        removed.insert(sol_idx);
        let ty = tiles[sol_idx].type_id;
        let (nt, nl) = apply_tray_add(&tray, tray_len, ty);
        tray = nt;
        tray_len = nl;
        steps += 1;
    }

    let forced_ratio_k = if steps > 0 {
        f64::from(forced_steps_k) / f64::from(steps)
    } else {
        1.0
    };

    Some(ForcedScanResult {
        forced_ratio_k,
        forced_steps_k,
        steps,
        step_forced_k,
        lookahead_nodes,
    })
}

/// Run DFS. Returns solution path (tile indices to tap in order) if solvable.
pub fn solve(
    tiles: &[Tile],
    max_nodes: u32,
) -> SolveResult {
    let n = tiles.len();
    if n == 0 {
        return SolveResult {
            status: SolveStatus::Fail,
            solution: None,
            nodes_expanded: 0,
            memo_size: 0,
        };
    }

    let num_types = tiles
        .iter()
        .map(|t| t.type_id as usize)
        .max()
        .unwrap_or(0)
        + 1;

    // Unsolvable if any type count is not a multiple of 3 (cannot clear all tiles).
    let mut type_counts = vec![0usize; num_types];
    for t in tiles {
        type_counts[t.type_id as usize] += 1;
    }
    if type_counts.iter().any(|&c| c % 3 != 0) {
        return SolveResult {
            status: SolveStatus::Fail,
            solution: None,
            nodes_expanded: 0,
            memo_size: 0,
        };
    }

    let coverers = compute_coverers(tiles);
    let removed0 = BitSet::new();
    let tray0 = vec![0u8; num_types];

    let mut memo: FxHashSet<StateKey> = FxHashSet::default();
    let mut nodes_expanded: u32 = 0;

    fn dfs(
        tiles: &[Tile],
        coverers: &[Vec<usize>],
        num_types: usize,
        removed: &BitSet,
        tray: &[u8],
        tray_len: u8,
        path: &mut Vec<usize>,
        memo: &mut FxHashSet<StateKey>,
        nodes_expanded: &mut u32,
        max_nodes: u32,
    ) -> Option<Vec<usize>> {
        *nodes_expanded += 1;
        if *nodes_expanded > max_nodes {
            return None; // capped
        }

        let n = tiles.len();
        if tray_len > 7 {
            return None;
        }
        let all_removed = (0..n).all(|i| removed.contains(i));
        if all_removed && tray_len == 0 {
            return Some(path.clone());
        }

        let key = StateKey {
            removed: removed.clone(),
            tray: tray.to_vec(),
        };
        if memo.contains(&key) {
            return None;
        }

        let mut tappable = get_tappable(n, removed, coverers);
        if tappable.is_empty() {
            memo.insert(key);
            return None;
        }

        tappable.sort_by(|&i, &j| {
            let si = move_ordering_score(tray, tray_len, tiles[i].type_id);
            let sj = move_ordering_score(tray, tray_len, tiles[j].type_id);
            sj.cmp(&si) // descending: higher score first
        });

        for &idx in &tappable {
            if tray_len >= 7 {
                break;
            }
            let type_id = tiles[idx].type_id;
            let mut next_removed = removed.clone();
            next_removed.insert(idx);
            let (next_tray, next_len) = apply_tray_add(tray, tray_len, type_id);

            path.push(idx);
            let res = dfs(
                tiles,
                coverers,
                num_types,
                &next_removed,
                &next_tray,
                next_len,
                path,
                memo,
                nodes_expanded,
                max_nodes,
            );
            path.pop();

            if let Some(sol) = res {
                return Some(sol);
            }
        }

        memo.insert(key);
        None
    }

    let mut path = Vec::new();
    let solution = dfs(
        tiles,
        &coverers,
        num_types,
        &removed0,
        &tray0,
        0,
        &mut path,
        &mut memo,
        &mut nodes_expanded,
        max_nodes,
    );

    let (status, solution) = if nodes_expanded > max_nodes {
        (SolveStatus::Capped, None)
    } else if let Some(sol) = solution {
        (SolveStatus::Win, Some(sol))
    } else {
        (SolveStatus::Fail, None)
    };

    SolveResult {
        status,
        solution,
        nodes_expanded,
        memo_size: memo.len(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tile(type_id: u8, x: i32, y: i32, z: i32) -> Tile {
        Tile {
            type_id,
            x,
            y,
            z,
        }
    }

    #[test]
    fn test_trivial_solvable() {
        // 3 tiles same type, no stacking: all tappable at start, pick one and clear.
        let tiles = vec![
            tile(0, 0, 0, 0),
            tile(0, 1, 0, 0),
            tile(0, 2, 0, 0),
        ];
        let result = solve(&tiles, 10_000);
        assert_eq!(result.status, SolveStatus::Win);
        assert_eq!(result.solution.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_capped() {
        let tiles = vec![
            tile(0, 0, 0, 0),
            tile(0, 1, 0, 0),
            tile(0, 2, 0, 0),
        ];
        let result = solve(&tiles, 1);
        assert_eq!(result.status, SolveStatus::Capped);
        assert!(result.solution.is_none());
    }

    #[test]
    fn test_heuristic_trivial_win() {
        let tiles = vec![
            tile(0, 0, 0, 0),
            tile(0, 1, 0, 0),
            tile(0, 2, 0, 0),
        ];
        let opts = HeuristicOptions {
            search_depth: 2,
            max_moves_per_node: 8,
            max_steps: 10,
        };
        let r = solve_heuristic(&tiles, &opts);
        assert_eq!(r.status, SolveStatus::Win);
        assert_eq!(r.solution.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_forced_scan_trivial() {
        let tiles = vec![
            tile(0, 0, 0, 0),
            tile(0, 1, 0, 0),
            tile(0, 2, 0, 0),
        ];
        let exact = solve(&tiles, 10_000);
        let sol = exact.solution.unwrap();
        let scan = forced_ratio_scan(
            &tiles,
            &sol,
            &ForcedScanOptions {
                lookahead_depth: 2,
                max_moves_per_node: 8,
                margin_delta: 100,
            },
        )
        .unwrap();
        assert_eq!(scan.steps, 3);
        assert!(scan.forced_ratio_k >= 0.0 && scan.forced_ratio_k <= 1.0);
        assert_eq!(scan.step_forced_k.len(), 3);
    }
}
