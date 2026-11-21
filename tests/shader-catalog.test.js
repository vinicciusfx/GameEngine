import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { scanShaders } from "../tools/shaders/catalog.js";

test("the project catalog rejects unsupported assets before HLSL compilation", (t) => {
  const projects = mkdtempSync(join(tmpdir(), "bend-shader-catalog-"));
  t.after(() => rmSync(projects, { recursive: true, force: true }));
  const shaders = join(projects, "water", "shaders");
  mkdirSync(join(shaders, "effects"), { recursive: true });
  mkdirSync(join(projects, "character"));
  const descriptor = {
    label: "Water", stage: "fragment", lighting: "unlit",
    parameters: [{ name: "density", label: "Density", control: "slider", min: 0, max: 2, step: 0.1, default: 1 }],
  };
  const glsl = "#version 300 es\nprecision highp float;\nout vec4 color;\nvoid main() { color = vec4(1.0); }";
  function asset(path, settings, source = glsl) {
    writeFileSync(join(shaders, path), source);
    if (settings) writeFileSync(join(shaders, `${path}.json`), JSON.stringify(settings));
  }
  asset("effects/water.frag.glsl", descriptor);
  asset("valid.frag.hlsl", descriptor, "valid HLSL");
  asset("forbidden.vert.hlsl", descriptor);
  asset("forbidden.geom", null);
  asset("declared.hlsl", { ...descriptor, stage: "compute" });
  asset("lit.frag.hlsl", { ...descriptor, lighting: "lit" });
  asset("missing.frag.glsl", null);
  asset("invalid.frag.glsl", { ...descriptor, parameters: [{ ...descriptor.parameters[0], default: 3 }] });

  const calls = [];
  const catalog = scanShaders(projects, (source, path) => {
    calls.push([source, path]);
    return glsl;
  });
  assert.deepEqual(calls, [["valid HLSL", "valid.frag.hlsl"]]);
  assert.deepEqual(catalog.water.assets.map((shader) => shader.id), ["effects/water.frag.glsl", "valid.frag.hlsl"]);
  assert.deepEqual(catalog.water.assets[0].parameters[0].default, [1]);
  const errors = new Map(catalog.water.diagnostics.map(({ path, message }) => [path, message]));
  assert.match(errors.get("forbidden.vert.hlsl"), /stage "vertex"/);
  assert.match(errors.get("forbidden.geom"), /stage "geometry"/);
  assert.match(errors.get("declared.hlsl"), /stage "compute"/);
  assert.match(errors.get("lit.frag.hlsl"), /Only UNLIT/);
  assert.match(errors.get("missing.frag.glsl"), /Missing descriptor/);
  assert.match(errors.get("invalid.frag.glsl"), /Invalid settings/);
  assert.deepEqual(catalog.character, { assets: [], diagnostics: [] });
});
