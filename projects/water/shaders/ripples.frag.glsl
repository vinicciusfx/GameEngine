#version 300 es
precision highp float;
precision highp int;

in vec3 v_local_position;
uniform vec3 tint;
uniform float density;
uniform float phase;
uniform int pattern;
uniform bool highlights;
out vec4 color;

void main() {
  vec2 p = v_local_position.xz;
  float distanceAlongPattern = pattern == 0 ? length(p) : p.x + p.y;
  float wave = cos(distanceAlongPattern * density + phase);
  float crest = smoothstep(0.65, 1.0, wave);
  vec3 base = tint * (0.48 + 0.32 * (wave * 0.5 + 0.5));
  color = vec4(highlights ? mix(base, vec3(0.65, 0.92, 0.93), crest * 0.65) : base, 1.0);
}
