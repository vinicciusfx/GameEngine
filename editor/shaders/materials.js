import Material from "../../engine/material.bend";
import { assetUniforms, meshPrograms } from "../../engine/shader/webgl.js";

function bendList(items) {
  return items.reduceRight((tail, head) => ({ $: "Con", head, tail }), { $: "Nil" });
}

function validValue(parameter, values) {
  if (!values || values.length !== parameter.default.length
    || values.some((v) => !Number.isFinite(Math.fround(v)))) return false;
  const [value] = values;
  switch (parameter.control) {
    case "slider": return value >= Math.fround(parameter.min) && value <= Math.fround(parameter.max);
    case "color": return values.every((v) => v >= 0 && v <= 1);
    case "toggle": return value === 0 || value === 1;
    case "dropdown": return parameter.options.some((option) => option.value === value);
    default: return true;
  }
}

export function createMaterials(gl, vertex, { assets = [], diagnostics = [] }, flat) {
  const program = meshPrograms(gl, vertex);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const linked = new Map();
  const errors = new Map(diagnostics.map(({ path, message }) => [path, message]));

  function graphMaterial(material) {
    return { mesh: program(Material.frag(material)), asset: null };
  }

  function prepare(material) {
    const id = Material.shader_id(material);
    if (!id) return graphMaterial(material);
    if (errors.has(id)) throw new Error(errors.get(id));
    if (linked.has(id)) return linked.get(id);
    const asset = assetsById.get(id);
    if (!asset) throw new Error("The shader is missing from this project's catalog.");
    const mesh = program(asset.source);
    const shader = { mesh, asset, uniforms: assetUniforms(gl, mesh, asset) };
    linked.set(id, shader);
    return shader;
  }

  function values(shader, material) {
    const entries = flat(Material.values(material));
    if (!shader.asset) {
      const apply = material.$ !== "Material" ? [] : entries.flatMap((entry) => {
        const uniform = shader.mesh.uniforms.get(Material.uniform(entry));
        if (!uniform) return [];
        const numbers = flat(Material.numbers(entry));
        if (uniform.type === gl.FLOAT && numbers.length === 1) {
          return [() => gl.uniform1f(uniform.location, numbers[0])];
        }
        if (uniform.type === gl.FLOAT_VEC3 && numbers.length === 3) {
          return [() => gl.uniform3fv(uniform.location, numbers)];
        }
        return [];
      });
      return { fields: [], apply };
    }
    const overrides = new Map(entries.map((entry) => [entry.name, flat(Material.numbers(entry))]));
    const fields = shader.asset.parameters.map((parameter) => {
      const override = overrides.get(parameter.name);
      const value = validValue(parameter, override) ? override : parameter.default;
      const upload = shader.uniforms.get(parameter.name);
      return { parameter, value, apply: upload ? () => upload(value) : null };
    });
    return { fields, apply: fields.flatMap((field) => field.apply ? [field.apply] : []) };
  }

  function update(material, fields, name, numbers) {
    const field = fields.find(({ parameter }) => parameter.name === name);
    if (!field || !validValue(field.parameter, numbers)) return material;
    const overrides = fields.map(({ parameter, value }) => ({
      $: "Value", name: parameter.name, numbers: bendList(parameter.name === name ? numbers : value),
    }));
    return Material.instance(material, bendList(overrides));
  }

  return { assets, errors, prepare, values, update };
}
