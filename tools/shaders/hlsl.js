import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const meshInputs = [
  { semantic: "IN.VAR.TEXCOORD0", varying: "v_local_position" },
  { semantic: "IN.VAR.TEXCOORD1", varying: "v_local_view" },
];

function run(tool, env, args, cwd) {
  const result = spawnSync(process.env[env] || tool, args, { cwd, encoding: "utf8", windowsHide: true });
  if (result.error?.code === "ENOENT") {
    throw new Error(`HLSL compilation requires ${tool} on PATH or a path set in ${env}.`);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${tool}: ${(result.stderr || result.stdout).trim() || "compilation failed"}`);
  return result.stdout;
}

export function compileHlsl(source, path) {
  const directives = source.replace(/\\\r?\n/g, "").replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, " ");
  if (/^\s*#\s*include\b/m.test(directives)) {
    throw new Error("HLSL shader sources must be self-contained (#include is unsupported).");
  }
  const directory = mkdtempSync(join(tmpdir(), "bend-fragment-"));
  try {
    const input = join(directory, "fragment.hlsl");
    const spv = join(directory, "fragment.spv");
    writeFileSync(input, `#line 1 "${path.replace(/["\\\r\n]/g, "_")}"\n${source}`);
    run("dxc", "DXC", ["-spirv", "-T", "ps_6_0", "-E", "main", "-Fo", spv, input], directory);
    const reflection = JSON.parse(run("spirv-cross", "SPIRV_CROSS", [spv, "--reflect"], directory));
    const inputs = reflection.inputs ?? [];
    const outputs = reflection.outputs ?? [];
    const inputNames = new Set();
    const renameInputs = [];
    for (const input of inputs) {
      const name = input.name?.toUpperCase();
      const binding = meshInputs.find(({ semantic }) => semantic === name);
      if (!binding || inputNames.has(name) || input.type !== "vec3" || input.array) {
        throw new Error("HLSL mesh inputs are optional TEXCOORD0 (float3 position) and TEXCOORD1 (float3 view vector).");
      }
      inputNames.add(name);
      renameInputs.push("--rename-interface-variable", "in", String(input.location), binding.varying);
    }
    if (outputs.length !== 1 || outputs.some((p) => p.location !== 0 || p.type !== "vec4" || p.array)) {
      throw new Error("HLSL requires one SV_Target0 (float4) color output.");
    }
    return run("spirv-cross", "SPIRV_CROSS", [
      spv, "--es", "--version", "300", "--glsl-emit-ubo-as-plain-uniforms",
      ...renameInputs,
      "--rename-interface-variable", "out", "0", "color",
    ], directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
