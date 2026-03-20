//! N-API bindings (requires `napi` feature).

use napi::{CallContext, JsNumber, JsObject, JsUnknown, Result};
use napi_derive::{js_function, module_exports};
use crate::solver::{
    forced_ratio_scan, solve, solve_heuristic, ForcedScanOptions, HeuristicOptions, SolveResult,
    SolveStatus, Tile,
};

const DEFAULT_MAX_NODES: u32 = 200_000;

fn parse_layout_tiles(level: &JsObject) -> Result<Vec<Tile>> {
    let layout = level.get_named_property::<JsObject>("layout")?;
    let len = layout.get_array_length()?;
    let mut type_strings: Vec<String> = Vec::new();
    let mut type_to_id: std::collections::HashMap<String, u8> = std::collections::HashMap::new();
    let mut tiles: Vec<Tile> = Vec::with_capacity(len as usize);

    for i in 0..len {
        let el = layout.get_element::<JsObject>(i)?;
        let type_val = el.get_named_property::<JsUnknown>("type")?;
        let type_str = type_val.coerce_to_string()?.into_utf8()?.into_owned()?;
        let type_id = *type_to_id.entry(type_str.clone()).or_insert_with(|| {
            let id = type_strings.len() as u8;
            type_strings.push(type_str);
            id
        });
        let x = el.get_named_property::<JsNumber>("x")?.get_int32()? as i32;
        let y = el.get_named_property::<JsNumber>("y")?.get_int32()? as i32;
        let z = el.get_named_property::<JsNumber>("z")?.get_int32()? as i32;
        tiles.push(Tile {
            type_id,
            x,
            y,
            z,
        });
    }

    Ok(tiles)
}

fn solve_result_to_js(env: &napi::Env, result: SolveResult, mode: &str) -> Result<JsObject> {
    let mut out = env.create_object()?;
    let status_str = match result.status {
        SolveStatus::Win => "win",
        SolveStatus::Fail => "fail",
        SolveStatus::Capped => "capped",
    };
    out.set_named_property("solvable", env.get_boolean(result.status == SolveStatus::Win)?)?;
    out.set_named_property("status", env.create_string(status_str)?)?;
    out.set_named_property("mode", env.create_string(mode)?)?;

    if let Some(ref path) = result.solution {
        let mut arr = env.create_array_with_length(path.len())?;
        for (i, &idx) in path.iter().enumerate() {
            arr.set_element(i as u32, env.create_int32(idx as i32)?)?;
        }
        out.set_named_property("solution", arr)?;
    } else {
        out.set_named_property("solution", env.get_null()?)?;
    }

    let mut stats = env.create_object()?;
    stats.set_named_property("nodesExpanded", env.create_uint32(result.nodes_expanded)?)?;
    stats.set_named_property("memoSize", env.create_int32(result.memo_size as i32)?)?;
    out.set_named_property("stats", stats)?;

    Ok(out)
}

#[module_exports]
fn init(mut exports: JsObject) -> Result<()> {
    exports.create_named_method("solveLevelExact", solve_level_exact)?;
    exports.create_named_method("solveLevel", solve_level)?;
    exports.create_named_method("computeForcedRatioK", compute_forced_ratio_k)?;
    Ok(())
}

#[js_function(2)]
fn solve_level_exact(ctx: CallContext) -> Result<JsObject> {
    dispatch_solve(ctx)
}

#[js_function(2)]
fn solve_level(ctx: CallContext) -> Result<JsObject> {
    dispatch_solve(ctx)
}

fn dispatch_solve(ctx: CallContext) -> Result<JsObject> {
    let level = ctx.get::<JsObject>(0)?;
    let options = ctx.get::<JsObject>(1)?;
    let env = ctx.env;

    let tiles = parse_layout_tiles(&level)?;

    let mode = match options.get_named_property::<JsUnknown>("mode") {
        Ok(u) => match u.coerce_to_string() {
            Ok(js) => match js.into_utf8() {
                Ok(utf) => match utf.into_owned() {
                    Ok(s) => s,
                    Err(_) => "exact".to_string(),
                },
                Err(_) => "exact".to_string(),
            },
            Err(_) => "exact".to_string(),
        },
        Err(_) => "exact".to_string(),
    };

    match mode.as_str() {
        "heuristic" => {
            let search_depth = options
                .get_named_property::<JsNumber>("searchDepth")
                .ok()
                .and_then(|n| n.get_uint32().ok())
                .unwrap_or(3) as u8;
            let max_moves_per_node = options
                .get_named_property::<JsNumber>("maxMovesPerNode")
                .ok()
                .and_then(|n| n.get_uint32().ok())
                .unwrap_or(8) as usize;
            let max_steps = options
                .get_named_property::<JsNumber>("maxSteps")
                .ok()
                .and_then(|n| n.get_uint32().ok())
                .unwrap_or(200);
            let hopts = HeuristicOptions {
                search_depth,
                max_moves_per_node,
                max_steps,
            };
            let result = solve_heuristic(&tiles, &hopts);
            solve_result_to_js(&env, result, "heuristic")
        }
        _ => {
            let max_nodes = options
                .get_named_property::<JsNumber>("maxNodes")
                .ok()
                .and_then(|n| n.get_uint32().ok())
                .unwrap_or(DEFAULT_MAX_NODES);
            let result = solve(&tiles, max_nodes);
            solve_result_to_js(&env, result, "exact")
        }
    }
}

#[js_function(2)]
fn compute_forced_ratio_k(ctx: CallContext) -> Result<JsObject> {
    let level = ctx.get::<JsObject>(0)?;
    let options = ctx.get::<JsObject>(1)?;
    let env = ctx.env;

    let tiles = parse_layout_tiles(&level)?;

    let solution_arr = options.get_named_property::<JsObject>("solution")?;
    let slen = solution_arr.get_array_length()?;
    let mut solution = Vec::with_capacity(slen as usize);
    for i in 0..slen {
        let v = solution_arr.get_element::<JsNumber>(i)?.get_int32()? as usize;
        solution.push(v);
    }

    let lookahead_depth = options
        .get_named_property::<JsNumber>("lookaheadDepth")
        .ok()
        .and_then(|n| n.get_uint32().ok())
        .unwrap_or(3) as u8;
    let max_moves_per_node = options
        .get_named_property::<JsNumber>("maxMovesPerNode")
        .ok()
        .and_then(|n| n.get_uint32().ok())
        .unwrap_or(8) as usize;
    let margin_delta = options
        .get_named_property::<JsNumber>("marginDelta")
        .ok()
        .and_then(|n| n.get_int32().ok())
        .unwrap_or(100);

    let fopts = ForcedScanOptions {
        lookahead_depth,
        max_moves_per_node,
        margin_delta,
    };

    let mut out = env.create_object()?;
    let scan = forced_ratio_scan(&tiles, &solution, &fopts);
    match scan {
        Some(s) => {
            out.set_named_property("ok", env.get_boolean(true)?)?;
            out.set_named_property("forcedRatioK", env.create_double(s.forced_ratio_k)?)?;
            out.set_named_property("forcedStepsK", env.create_uint32(s.forced_steps_k)?)?;
            out.set_named_property("steps", env.create_uint32(s.steps)?)?;
            out.set_named_property(
                "lookaheadNodes",
                env.create_double(s.lookahead_nodes as f64)?,
            )?;
            let mut arr = env.create_array_with_length(s.step_forced_k.len())?;
            for (i, &b) in s.step_forced_k.iter().enumerate() {
                arr.set_element(
                    i as u32,
                    env.create_uint32(b as u32)?,
                )?;
            }
            out.set_named_property("stepForcedK", arr)?;
        }
        None => {
            out.set_named_property("ok", env.get_boolean(false)?)?;
            out.set_named_property("forcedRatioK", env.get_null()?)?;
            out.set_named_property("reason", env.create_string("invalid_layout")?)?;
        }
    }

    Ok(out)
}
