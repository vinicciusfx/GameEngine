cbuffer MaterialParams : register(b0) {
    float3 tint;
    float density;
    int pattern;
    bool highlights;
};

float4 main(float3 localPosition : TEXCOORD0) : SV_Target0 {
    float2 p = localPosition.xz;
    float distanceAlongPattern = pattern == 0 ? p.x : max(abs(p.x), abs(p.y));
    float band = 0.5 + 0.5 * cos(distanceAlongPattern * density);
    float3 base = tint * (0.3 + 0.7 * band);
    if (highlights) base = lerp(base, float3(1.0, 0.78, 0.4), smoothstep(0.9, 1.0, band) * 0.65);
    return float4(base, 1.0);
}
