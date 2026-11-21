// Port of Freeze.shadergraph (Unity 6 URP Unlit). The GameEngine supplies
// object-space position and the vector from the surface to the eye.
cbuffer MaterialParams : register(b0) {
    float3 _Color_1;
    float3 _Color_2;
    float _Noise_Scale;
    float _Roughness;
    float _Fresnel_Power;
    float _Cracks_Power;
    float _Cracks_Brightness;
    float _Float;
    float _Posterize;
};

// The deterministic Tchou hash used by the original noise nodes.
float2 cellHash(int2 cell) {
    uint seed = uint(cell.y) ^ 1103515245u;
    uint mixed = (uint(cell.x) + seed) * seed;
    mixed = (mixed ^ (mixed >> 5u)) * 0x27d4eb2du;
    return float2(uint2(mixed, seed ^ (mixed << 3u)) >> 8u) / 16777215.0;
}

float valueNoise(float2 uv) {
    int2 cell = int2(floor(uv));
    float2 weight = frac(uv);
    weight = weight * weight * (3.0 - 2.0 * weight);
    float bottom = lerp(cellHash(cell).x, cellHash(cell + int2(1, 0)).x, weight.x);
    float top = lerp(cellHash(cell + int2(0, 1)).x, cellHash(cell + 1).x, weight.x);
    return lerp(bottom, top, weight.y);
}

float voronoiDistance(float2 uv) {
    float2 grid = uv * 3.0;
    int2 cell = int2(floor(grid));
    float2 fractional = frac(grid);
    float nearestSquared = 8.0;
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            int2 neighbor = int2(x, y);
            float2 hash = cellHash(cell + neighbor);
            float2 offset = 0.5 + 0.5 * float2(sin(hash.y * 5.0), cos(hash.x * 5.0));
            float2 delta = float2(neighbor) + offset - fractional;
            nearestSquared = min(nearestSquared, dot(delta, delta));
        }
    }
    return sqrt(nearestSquared);
}

float4 main(float3 position : TEXCOORD0, float3 localView : TEXCOORD1) : SV_Target0 {
    float3 view = normalize(localView);
    float3 dx = ddx(position);
    float3 dy = ddy(position);
    float3 face = cross(dx, dy);
    // Derive the mesh normal because v1 meshes carry positions only.
    float3 normal = face * rsqrt(max(dot(face, face), 1e-24));
    normal *= dot(normal, view) < 0.0 ? -1.0 : 1.0;

    // The graph projects along XY. Use XZ on surfaces facing up or down
    // so the pattern remains two-dimensional on the Water preview mesh.
    float2 uv = float2(position.x, abs(normal.y) > abs(normal.z) ? position.z : position.y);
    float2 p = uv * _Noise_Scale;
    float height = _Roughness * (valueNoise(p) * 0.125
        + valueNoise(p * 0.5) * 0.25 + valueNoise(p * 0.25) * 0.5);

    float3 tangentX = cross(dy, normal);
    float3 tangentY = cross(normal, dx);
    float area = dot(dx, tangentX);
    float3 slope = (ddx(height) * tangentX + ddy(height) * tangentY)
        * ((area < 0.0 ? -1.0 : 1.0) / max(abs(area), 1e-12));
    float3 roughNormal = normalize(normal - 0.01 * slope);

    float heightWeight = saturate(position.y + _Float);
    float fresnel = pow(max(1.0 - saturate(dot(roughNormal, view)), 1e-6), _Fresnel_Power);
    float steps = max(_Posterize, 1.0);
    float rim = floor((fresnel * heightWeight) * steps) / steps;
    float cells = smoothstep(-0.2, 2.26, voronoiDistance(uv));
    float cracks = _Cracks_Brightness * pow(max(cells, 1e-6), _Cracks_Power);

    float detail = cracks + rim;
    float3 color = lerp(_Color_1, _Color_2, heightWeight) + detail;
    // The source colors have alpha 1. The graph uses the summed alpha
    // for clipping, then renders the surviving fragments as opaque.
    clip(1.0 + detail - 0.5);
    return float4(color, 1.0);
}
