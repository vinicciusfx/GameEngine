# A material instance owns its values and refers to one shader.
# Bend graphs carry their node tree. Imported shaders use a stable ID from
# the project's shader catalog, which also defines their parameter defaults.
# The renderer shares the linked program between instances of the same shader.

import Base
import ./shader/node.bend as N
import ./shader/compile.bend as G
import ./shader/glsl.bend as Glsl

type Value is Data:
  Value{name: String, numbers: List<&2, F32>}

type Material is Data:
  Material{graph: N.Node, values: List<&2, Value>}
  Imported{shader: String, overrides: List<&2, Value>}

def imported(shader: String) -> Material:
  Imported{shader, Nil{}}

def missing() -> Material:
  Material{N.Rgb{1.0, 0.0, 1.0}, Nil{}}

def graph(m: Material) -> N.Node:
  match m:
    case Material{g, _}:
      g
    case Imported{_, _}:
      N.Rgb{1.0, 0.0, 1.0}

def shader_id(m: Material) -> String:
  match m:
    case Material{_, _}:
      ""
    case Imported{id, _}:
      id

def values(m: Material) -> List<&2, Value>:
  match m:
    case Material{_, vs}:
      vs
    case Imported{_, vs}:
      vs

# The fragment shader of a graph material, or the missing asset color.
def frag(m: Material) -> String:
  Glsl.mesh_frag(graph(m))

# The uniform a value goes to, and its numbers (for main.js).
def uniform(v: Value) -> String:
  Value{nm, _} = v
  G.uniform(nm)

def numbers(v: Value) -> List<&2, F32>:
  Value{_, xs} = v
  xs

# An instance keeps the shader and replaces its values.
def instance(m: Material, vs: List<&2, Value>) -> Material:
  match m:
    case Material{g, _}:
      Material{g, vs}
    case Imported{id, _}:
      Imported{id, vs}

# Completeness
# ============

# Does this value fill parameter p: same name, and as many numbers as its
# type holds?
def fills_param(+pn: String, +k: N.Ty, v: Value) -> Bool:
  Value{+nm, +xs} = v
  (String.eq(pn, nm) && Nat.is_eq(List.length(&2, F32, xs), N.size(k)))

def fills(+p: N.Node, v: Value) -> Bool:
  match p:
    case N.Param{+pn, +k}:
      fills_param(pn, k, v)
    case _:
      False{}

def filled(+p: N.Node, vs: List<&2, Value>) -> Bool:
  match vs:
    case Nil{}:
      False{}
    case h <> t:
      (fills(p, h) || filled(p, t))

def all_filled(ps: List<&2, N.Node>, +vs: List<&2, Value>) -> Bool:
  match ps:
    case Nil{}:
      True{}
    case h <> t:
      (filled(h, vs) && all_filled(t, vs))

# Graphs need a value of the right size for every parameter. Imported
# materials inherit defaults from their catalog asset. Its schema and GPU
# interface are checked at import and link time.
def complete(+m: Material) -> Bool:
  match m:
    case Material{g, vs}:
      all_filled(N.params(g), vs)
    case Imported{id, _}:
      Bool.not(String.is_empty(id))
