//! N-API bindings for the levelgen DFS solver (optional `napi` feature).

pub mod solver;

#[cfg(feature = "napi")]
mod napi_impl;
