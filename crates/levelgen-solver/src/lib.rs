//! N-API bindings for the levelgen DFS solver.

pub mod solver;

use napi::{CallContext, JsNumber, JsObject, JsUnknown, Result};
use napi_derive::{js_function, module_exports};
use solver::{solve, SolveStatus, Tile};

const DEFAULT_MAX_NODES: u32 = 200_000;

#[module_exports]
fn init(mut exports: JsObject) -> Result<()> {
    exports.create_named_method("solveLevelExact", solve_level_exact)?;
    Ok(())
}

#[js_function(2)]
fn solve_level_exact(ctx: CallContext) -> Result<JsObject> {
    let level = ctx.get::<JsObject>(0)?;
    let options = ctx.get::<JsObject>(1)?;
    let env = ctx.env;

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

    let max_nodes = options
        .get_named_property::<JsNumber>("maxNodes")
        .ok()
        .and_then(|n| n.get_uint32().ok())
        .unwrap_or(DEFAULT_MAX_NODES);

    let result = solve(&tiles, max_nodes);

    let mut out = env.create_object()?;
    let status_str = match result.status {
        SolveStatus::Win => "win",
        SolveStatus::Fail => "fail",
        SolveStatus::Capped => "capped",
    };
    out.set_named_property("solvable", env.get_boolean(result.status == SolveStatus::Win)?)?;
    out.set_named_property("status", env.create_string(status_str)?)?;

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
