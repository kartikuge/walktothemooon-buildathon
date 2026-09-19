---
name: Routing response formats
description: A Valhalla API format distinction that can silently break pedestrian map previews.
---

Valhalla's `shape_format: "geojson"` applies to its OSRM output format, not its default JSON format.

**Why:** A live pedestrian request with `shape_format: "geojson"` still returned encoded polyline6 strings inside default JSON trip legs. Assuming GeoJSON would discard a valid route or render it incorrectly.

**How to apply:** When changing routing providers or request formats, inspect one actual response and pair the decoder with the selected output format. Do not silently fall back to a direct geographic line if a walking-route response cannot be decoded.