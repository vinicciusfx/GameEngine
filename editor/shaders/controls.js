// Bend-UI supplies the field, toggle and menu. Native ranges provide the
// slider's keyboard and pointer behavior.
export function dropdown(el, label, options, current, onPick) {
  const field = el("div", "field editor-material__field");
  const root = el("div", "dropdown editor-material__dropdown");
  const button = el("button", "btn btn--bordered btn--neutral btn--sm");
  const text = el("span");
  const menu = el("div", "menu menu--end");
  const choices = new Map();
  button.type = "button";
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = '<svg class="icon icon--sm" aria-hidden="true"><use href="#i-chevron-down"/></svg>';
  button.prepend(text);
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", label);
  menu.hidden = true;

  function show(value) {
    text.textContent = value;
    button.setAttribute("aria-label", `${label}: ${value}`);
  }
  show(current);
  for (const option of options) {
    const item = el("button", "menu__item");
    item.type = "button";
    item.disabled = option.disabled ?? false;
    item.setAttribute("role", "menuitemradio");
    item.setAttribute("aria-checked", String(option.selected ?? false));
    item.innerHTML = '<svg class="icon icon--sm menu__check" aria-hidden="true"><use href="#i-check"/></svg>';
    item.prepend(el("span", "", option.label));
    choices.set(item, option);
    menu.append(item);
  }
  button.disabled = !options.some((option) => !option.disabled);
  root.addEventListener("pick", (event) => {
    const option = choices.get(event.detail);
    if (!option) return;
    show(option.label);
    button.focus();
    onPick(option.value);
  });
  root.append(button, menu);
  field.append(el("span", "field__label", label), root);
  return { field, button };
}

function numberField(el, label, value, change, rgb = false) {
  const field = el("label", "field editor-panels__field");
  const input = el("input", "input input--sm");
  input.type = "number";
  input.step = rgb ? "0.01" : "any";
  if (rgb) { input.min = "0"; input.max = "1"; }
  input.value = String(Number(value.toPrecision(7)));
  input.addEventListener("input", () => {
    const number = input.valueAsNumber;
    if (!Number.isFinite(Math.fround(number)) || (rgb && (number < 0 || number > 1))) return;
    value = number;
    change(number);
  });
  input.addEventListener("blur", () => { input.value = String(value); });
  field.append(el("span", "field__label", label), input);
  return field;
}

export function materialField(el, { parameter: p, value }, edit) {
  switch (p.control) {
    case "number":
      return numberField(el, p.label, value[0], (n) => edit(p.name, [n]));
    case "color": {
      const field = el("fieldset", "form__section editor-material__group");
      const channels = el("div", "editor-panels__fields");
      const rgb = [...value];
      ["R", "G", "B"].forEach((label, i) => {
        channels.append(numberField(el, label, rgb[i], (n) => {
          rgb[i] = n;
          edit(p.name, rgb);
        }, true));
      });
      field.append(el("legend", "field__label", p.label), channels);
      return field;
    }
    case "toggle": {
      const field = el("div", "field editor-material__field");
      const button = el("button", "btn btn--bordered btn--neutral btn--toggle btn--sm editor-material__toggle");
      button.type = "button";
      button.setAttribute("aria-label", p.label);
      let enabled = value[0] === 1;
      function show() {
        button.setAttribute("aria-pressed", String(enabled));
        button.textContent = enabled ? "On" : "Off";
      }
      show();
      button.addEventListener("click", () => {
        enabled = !enabled;
        show();
        edit(p.name, [Number(enabled)]);
      });
      field.append(el("span", "field__label", p.label), button);
      return field;
    }
    case "slider": {
      const field = el("label", "field editor-material__field");
      const row = el("span", "editor-material__slider");
      const output = el("output", "meta mono");
      const input = el("input", "editor-material__range");
      input.type = "range";
      input.setAttribute("aria-label", p.label);
      input.min = String(p.min);
      input.max = String(p.max);
      input.step = String(p.step);
      input.value = String(value[0]);
      output.value = input.value;
      input.addEventListener("input", () => {
        output.value = input.value;
        edit(p.name, [input.valueAsNumber]);
      });
      row.append(input, output);
      field.append(el("span", "field__label", p.label), row);
      return field;
    }
    case "dropdown": {
      const options = p.options.map((option) => ({ ...option, selected: option.value === value[0] }));
      const current = options.find((option) => option.selected).label;
      return dropdown(el, p.label, options, current, (n) => edit(p.name, [n])).field;
    }
  }
}
