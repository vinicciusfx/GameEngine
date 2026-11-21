// The engine's page: opens the project PROJECT.bend names in the editor
// (editor/app.js).

import Project from "./PROJECT.bend";
import { startEditor } from "./editor/app.js";
import shaders from "./editor/shaders/catalog.generated.json";

const slug = new URLSearchParams(location.search).get("project") ?? "";
const project = Project.preview(slug);
startEditor(Project.start(project), { camera: Project.camera(project), shaders: shaders[Project.folder(project)] });
