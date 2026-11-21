import Base
import ../engine/material.bend as Mat
import ../engine/mesh.bend as Mesh
import ../engine/scene.bend as S
import ../engine/transform.bend as Tr

type Check is Data:
  Check{name: String, ok: Bool}

def thing(name: String) -> S.Thing:
  S.Thing{name, Tr.identity(), S.Shown{Mesh.plane(1.0, 1), Mat.imported("waves.frag.glsl")}}

def material_at(s: S.Scene, i: U32) -> Mat.Material:
  S.material(S.look(S.at(s, i)))

def instance_with_value() -> Mat.Material:
  Mat.instance(Mat.imported("waves.frag.glsl"), [Mat.Value{"density", [2.0]}])

def has_overrides(m: Mat.Material) -> Bool:
  Bool.not(List.is_empty(&2, Mat.Value, Mat.values(m)))

def edited() -> S.Scene:
  +original = {S.Scene{[thing("Lake"), thing("Sea")]} : S.Scene}
  S.with_material(original, 0, instance_with_value())

def checks() -> List<&2, Check>:
  [Check{"the two objects keep the same shader ID",
     String.eq(Mat.shader_id(material_at(edited(), 0)), Mat.shader_id(material_at(edited(), 1)))},
   Check{"only the edited object gets the instance value",
     (has_overrides(material_at(edited(), 0)) && Bool.not(has_overrides(material_at(edited(), 1))))},
   Check{"assigning another shader replaces the single material slot",
     String.eq(Mat.shader_id(material_at(S.with_material(edited(), 0, Mat.imported("foam.frag.hlsl")), 0)), "foam.frag.hlsl")}]
