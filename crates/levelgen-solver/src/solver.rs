//! DFS solver for Triplet Tiles. Same rules as game.js / solver.js:
//! - Tray holds tiles; 3 of same type clear. Tray size max 7.
//! - A tile is tappable iff not removed and no covering tile (higher z, overlapping footprint) remains.
//! - Covering: other covers tile if other.z > tile.z and -1 <= other.x - tile.x <= 0 and 0 <= other.y - tile.y <= 1.

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
            if b.z <= a.z {
                continue;
            }
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            if (-1..=0).contains(&dx) && (0..=1).contains(&dy) {
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
}
