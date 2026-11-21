# Shaders e materiais

Com o editor em execução (`bun run dev`), abra [o projeto Water](http://localhost:3100/?project=water). Selecione **Water** na cena e escolha **Ripples (GLSL)** ou **Bands (HLSL)** em **Details → Material → Shader**. O viewport atualiza conforme você edita os parâmetros. **Original graph** restaura o material Bend da água. As edições do inspetor duram a sessão. Para gravar uma atribuição na cena, use `Mat.imported("ripples.frag.glsl")` no objeto em `scene.bend`. `Mat.instance` permite gravar valores próprios na mesma definição de material.

## Importação

Coloque os arquivos em `projects/<projeto>/shaders/`, com subpastas se necessário. O caminho relativo à pasta `shaders/` identifica o shader. O descritor tem o mesmo nome do arquivo fonte, acrescido de `.json`. O servidor recria o catálogo ao detectar alterações nessa pasta. Recarregue a página para vê-las. A build executa a mesma importação.

```json
{
  "label": "Water",
  "stage": "fragment",
  "lighting": "unlit",
  "parameters": [
    { "name": "density", "label": "Density", "control": "slider", "min": 0.5, "max": 8, "step": 0.1, "default": 2 },
    { "name": "highlights", "label": "Highlights", "control": "toggle", "default": true }
  ]
}
```

| Controle | Tipo GLSL | Tipo HLSL | Dados no descritor |
| --- | --- | --- | --- |
| `number` | `float` | `float` | `default` numérico |
| `slider` | `float` | `float` | `default`, `min`, `max` e `step` numéricos |
| `dropdown` | `int` | `int` | `options` com `label` e `value` inteiro, e `default` igual a uma opção |
| `toggle` | `bool` ou `int` | `bool`, `int` ou `uint` | `default` booleano |
| `color` | `vec3` | `float3` | `default` com três canais RGB entre 0 e 1 |

- **GLSL.** Use `#version 300 es`, `main()`, uma saída `vec4` para a cor e uniforms com os nomes do descritor. O vértice fixo de malha fornece `in highp vec3 v_local_position`, em metros locais do objeto.
- **HLSL.** Use `float4 main(...) : SV_Target0`. As entradas opcionais são `float3 ... : TEXCOORD0` para a posição local e `float3 ... : TEXCOORD1` para o vetor até a câmera em espaço local. Declare os parâmetros no `cbuffer`, com os mesmos nomes do descritor. Use código autocontido. O importador executa o [DXC com suporte a SPIR-V](https://github.com/microsoft/DirectXShaderCompiler/wiki/SPIR%E2%80%90V-CodeGen) e o [SPIRV-Cross](https://github.com/KhronosGroup/SPIRV-Cross), que emite GLSL ES 3.00. Coloque ambos no `PATH` ou configure `DXC` e `SPIRV_CROSS` com os caminhos dos executáveis. O [Vulkan SDK](https://vulkan.lunarg.com/doc/view/latest/windows/spirv_toolchain.html) inclui essas ferramentas no Windows.
- **Validação.** O descritor declara fragment e UNLIT. A extensão também pode declarar a etapa, como em `.vert.hlsl` ou `.geom`. O editor exibe **Shader warnings** quando o importador rejeita um arquivo. Ao aplicar um shader, o WebGL2 verifica compilação, linkagem e tipos dos uniforms ativos. Todos os parâmetros declarados no descritor aparecem no inspetor, inclusive os que o compilador otimiza. A ausência de um compilador HLSL aparece como aviso e os demais shaders continuam disponíveis.
- **Escopo.** O material importado é aplicado a malhas estáticas. Cada objeto tem um único slot de material, e cada material contém um grafo Bend ou um ID de shader importado. A pipeline interna para a grade e personagens com skin tem programas próprios. O shader importado recebe a posição local e os parâmetros do material. O descritor é a fonte de verdade para o modelo de iluminação declarado.

## Arquitetura

| Pasta ou arquivo | Responsabilidade |
| --- | --- |
| `engine/material.bend`, `engine/scene.bend` | Instâncias, valores próprios e slot único de material no objeto. |
| `engine/shader/` | Grafo e geração de GLSL em Bend, vértice fixo de malha e ligação ao WebGL2. |
| `projects/<projeto>/shaders/` | Fontes HLSL ou GLSL e descritores versionados com o conteúdo. |
| `tools/shaders/` | Descoberta, validação e tradução HLSL antes do carregamento no navegador. |
| `editor/shaders/`, `editor/panels/` | Catálogo gerado, ligação entre seleção e materiais Bend, e controles do inspetor. |

### Unity e Unreal

- **Unity.** O Blackboard do Shader Graph dá um nome de referência a cada propriedade e define quais aparecem no material. O alvo Unlit fornece cor e alfa no contexto de fragmento. Usamos o descritor como contrato de exposição para código HLSL e GLSL. Ele exige manter nomes e tipos sincronizados, mas elimina a ambiguidade de inferir controles a partir de uniforms. O grafo Bend existente continua disponível para os materiais internos. [Blackboard](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Blackboard.html) · [Alvo Unlit da URP](https://docs.unity3d.com/ja/current/Manual/urp/prebuilt-shader-graphs-urp-unlit.html).
- **Unreal.** Material Instances herdam a definição do material e mudam parâmetros por instância. A Unreal também oferece switches estáticos que podem gerar permutações. Aqui, sliders, dropdowns e toggles mudam uniforms em tempo real. Isso economiza compilações e programas, com o custo de que uma condição dinâmica pode exigir trabalho adicional no fragmento. [Material Instances](https://dev.epicgames.com/documentation/unreal-engine/creating-and-using-material-instances-in-unreal-engine) · [Static switches](https://dev.epicgames.com/documentation/unreal-engine/artist-04-expanded-material-instances).

### Verificação de coerência com Jason Gregory

- **Capítulo 7, Resources and the File System.** A identidade do asset é estável e limitada ao projeto. O catálogo resolve a fonte e o descritor, e os materiais armazenam seus próprios valores. O programa é compartilhado por fonte e contexto WebGL. O editor precisa manter os programas carregados durante a sessão e a build inclui o catálogo dos projetos. [Game Engine Architecture, 3ª edição](https://www.oreilly.com/library/view/game-engine-architecture/9781351974271/).
- **Capítulo 11, The Rendering Engine.** O importador e o compilador ficam fora do caminho de desenho. O renderizador resolve localizações dos uniforms uma vez e vincula os valores da instância antes de desenhar. O primeiro uso tem o custo de linkagem no dispositivo. A troca entre objetos com o mesmo programa ainda requer atualizar os uniforms de cada instância. Essas escolhas seguem a separação entre recursos e renderização discutida nos capítulos. [Game Engine Architecture, 3ª edição](https://www.oreilly.com/library/view/game-engine-architecture/9781351974271/).

### Bend e Bend-UI

- **Bend 2.0.40.** O módulo segue o padrão do carregador Bend para o navegador. Tipos e transições de cena ficam em Bend. A interface WebGL e o acesso ao sistema de arquivos ficam nos adaptadores. O guia de shaders da linguagem descreve também uma pipeline nativa própria. O catálogo desta versão tem como alvo o WebGL2 já usado pelo editor. O repositório oficial indica WSL como caminho para Windows. [Release da Bend](https://github.com/bendlang/bend/releases/tag/v2.0.40) · [Guia de shaders](https://github.com/bendlang/bend/blob/v2.0.40/guide/SHADERS.md) · [Plataformas suportadas](https://github.com/bendlang/bend#readme).
- **Bend-UI.** A revisão fixada pelo projeto, `85556a2`, já oferece `panel`, `disclosure`, `field`, `input`, `dropdown` com `menuitemradio` e botões com `aria-pressed`. O inspetor usa esses componentes, um range nativo para sliders e os campos RGB já adotados pelo editor. A lacuna do slider foi registrada em [pedidos para a Bend-UI](bend-ui-requests.txt). [Bend-UI](https://github.com/isabellaherman/Bend-UI).
