import { dropdown, materialField } from "./controls.js";

function el(tag, classes, text) {
  const node = document.createElement(tag);
  if (classes) node.className = classes;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function materialInspector({ assets, errors, inspect, assign, edit }) {
  const controls = el("div");
  const warnings = el("div", "editor-material__warnings");
  warnings.setAttribute("role", "status");

  function warn() {
    warnings.replaceChildren();
    warnings.hidden = !errors.size;
    if (warnings.hidden) return;
    const details = el("details", "disclosure");
    details.open = true;
    details.append(el("summary", "disclosure__title", `Shader warnings (${errors.size})`));
    const list = el("ul", "editor-material__diagnostics");
    for (const [path, message] of errors) {
      const item = el("li");
      item.append(el("span", "field__label", path), el("p", "meta", message));
      list.append(item);
    }
    details.append(list);
    warnings.append(details);
  }

  function render(selected) {
    warn();
    controls.replaceChildren();
    const object = inspect(selected);
    if (!object) return;
    const current = object.shader.asset?.id ?? "";
    const choices = assets.map((asset) => ({
      label: asset.label, value: asset.id, selected: current === asset.id, disabled: errors.has(asset.id),
    }));
    if (object.original) choices.unshift({ label: "Original graph", value: "", selected: !current });
    if (choices.length > 1 || (!object.original && choices.length)) {
      const label = choices.find((choice) => choice.selected)?.label ?? "Choose shader";
      const picker = dropdown(el, "Shader", choices, label, (id) => {
        assign(selected, id);
        render(selected);
        controls.querySelector("[data-shader-picker]")?.focus();
      });
      picker.button.dataset.shaderPicker = "";
      controls.append(picker.field);
    }
    for (const field of object.values.fields) {
      controls.append(materialField(el, field, (name, numbers) => edit(selected, name, numbers)));
    }
  }

  // Bend-UI patches its own nodes. Keep the shader controls mounted across
  // those updates so a material edit leaves the active input in place.
  function attach(root) {
    const body = root.querySelector(".editor-panels__body");
    if (body && warnings.parentNode !== body) body.prepend(warnings);
    const slot = root.querySelector('[data-details-section="Material"]');
    if (slot && controls.parentNode !== slot) slot.append(controls);
  }

  return { attach, render };
}
