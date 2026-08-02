

# AI Engineering Harness

Un arnés para agentes de codificación de IA que proporciona patrones de ingeniería de contexto, comandos y configuraciones. Instálalo una vez y configura instantáneamente Claude Code, OpenCode y Gemini CLI con prompts, agentes y flujos de trabajo probados en entornos reales.

## Herramientas Compatibles

- **Claude Code** (code.claude.com) — Compatible
- **OpenCode** (opencode.ai) — Compatible
- **Gemini CLI** (ai.google.dev/gemini-cli) — Compatible
- **Pi** (github.com/nicholasgasior/pi-coding-agent) — Compatible

## Inicio Rápido

### Prerrequisitos

- [Deno](https://deno.com/) (o `npx deno` como respaldo sin instalación)

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# macOS (Homebrew)
brew install deno
```

### Instalación

Registra la CLI (una sola vez):

```bash
deno install -Agf -n ai-harness \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts
```

Luego, instala las configuraciones:

```bash
ai-harness --tool=claude          # Claude Code
ai-harness --tool=opencode        # OpenCode
ai-harness --tool=gemini          # Gemini CLI
ai-harness --tool=pi              # Pi
ai-harness --tool=all             # Todas las herramientas
```

Más opciones:

```bash
ai-harness --tool=claude --dry-run        # Vista previa de cambios
ai-harness --tool=claude --interactive    # Seleccionar componentes
ai-harness --tool=claude --skill=agents   # Componente específico
ai-harness --help                         # Uso completo
```

Los archivos se copian como archivos reales: nada se romperá si descartas el instalador.
Volver a ejecutarlo es seguro: se omiten los archivos sin cambios, los archivos modificados muestran un diff y solicitan confirmación.

### Repositorios Privados y Empresariales

Para repositorios privados o empresariales de GitHub, clona y ejecuta localmente:

```bash
gh repo clone <org>/ai-engineering-harness /tmp/aih -- --depth=1 -q \
  && GITHUB_TOKEN=$(gh auth token) deno run -A /tmp/aih/install.ts --tool=claude \
  && rm -rf /tmp/aih
```

`gh` maneja toda la autenticación de git automáticamente. `GITHUB_TOKEN` permite al instalador obtener el manifiesto y el contenido de los archivos desde el origen remoto del repositorio clonado si es necesario.

### Alternativa: Ejecución Directa

Omite el registro de la CLI y ejecuta directamente:

```bash
deno run -A \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG>/install.ts \
  --tool=claude
```

Reemplaza `<TAG>` con una etiqueta git o un SHA de commit de la
[página de lanzamientos](https://github.com/adrielp/ai-engineering-harness/releases).

### Alternativa: Modo Repositorio (GNU Stow)

Para usuarios que desean el repositorio en su sistema con enlaces simbólicos (actualizaciones con `git pull` más sencillas):

```bash
# Prerrequisitos: GNU Stow (brew install stow / apt install stow)
git clone https://github.com/adrielp/ai-engineering-harness.git
cd ai-engineering-harness

./setup.sh claude             # Instalar Claude Code → ~/.claude/
./setup.sh opencode           # Instalar OpenCode → ~/.config/opencode/
./setup.sh gemini             # Instalar Gemini CLI → ~/.gemini/
./setup.sh pi                 # Instalar Pi → ~/.pi/agent/
./setup.sh all                # Instalar las cuatro herramientas

# Banderas útiles
./setup.sh <tool> --dry-run   # Vista previa de cambios
./setup.sh <tool> --restow    # Actualizar después de git pull
./setup.sh <tool> --delete    # Eliminar enlaces simbólicos
```

## Qué Incluye

### Agentes (Todas las Herramientas)

Subagentes especializados compartidos entre Claude Code, OpenCode y Gemini CLI:

| Agente | Propósito |
|-------|---------|
| `codebase_analyzer` | Analiza detalles de implementación y traza el flujo de datos |
| `codebase_locator` | Encuentra archivos y componentes por característica/tema |
| `codebase_pattern_finder` | Descubre implementaciones y patrones similares |
| `thoughts_analyzer` | Extrae ideas clave de documentos de investigación |
| `thoughts_locator` | Descubre documentos en el directorio thoughts/ |
| `web_search_researcher` | Investiga información a partir de fuentes web |

### Comandos y Habilidades

Todos los comandos funcionan idénticamente en todas las herramientas. OpenCode usa `commands/` + `skills/`, Claude Code usa `skills/` (los comandos tienen `disable-model-invocation: true`), Gemini CLI usa formato TOML y Pi usa `prompts/` (plantillas de prompts) + `skills/`.

| Comando | Tipo | Propósito |
|---------|------|---------|
| `/init_harness` | manual | Inicializar el arnés en un repositorio |
| `/create_plan` | manual | Crear un plan de implementación a partir de un ticket |
| `/implement_plan` | manual | Ejecutar el plan aprobado |
| `/validate_plan` | manual | Verificar la implementación |
| `/commit` | manual | Crear commits de git bien estructurados |
| `/debug` | manual | Investigar problemas durante las pruebas |
| `/debug-k8s` | manual | Depurar clusters de Kubernetes (prefiere K8s MCP) |
| `/research_codebase` | manual | Investigación exhaustiva de la base de código |
| `/validate_telemetry` | manual | Validar telemetría local contra una especificación narrativa |
| `/worktree` | manual + auto | Gestionar worktrees de git para desarrollo en paralelo |
| `git-commit-helper` | auto | Se activa al escribir "commit these changes" |
| `pr-description-generator` | auto | Se activa al crear PRs |
| `experimental-pr-workflow` | auto | Formaliza el trabajo experimental en tickets/PRs |
| `interview` | auto | Poner a prueba los planes mediante entrevistas exhaustivas al usuario |
| `improve-codebase-architecture` | auto | Identificar fricciones arquitectónicas y proponer refactorizaciones de módulos profundos |
| `prd-to-issues` | auto | Dividir un PRD en archivos de issues por rebanadas verticales |
| `tdd` | auto | Disciplina de TDD: rojo-verde-refactorizar |
| `write-a-prd` | auto | Generar un PRD a partir de un briefing del cliente |

### Habilidades de OpenTelemetry (Todas las Herramientas)

El orquestador `otel_instrument` se activa automáticamente ante solicitudes de observabilidad/telemetría y enruta a sub-habilidades especializadas:

| Habilidad | Ámbito |
|-------|-------|
| `observability_driven_development` | El ciclo interno de ODD, especificaciones narrativas, configuración local de Aspire, `/validate_telemetry` |
| `otel_instrumentation` | Configuración del SDK, trazas, métricas, registros (Node.js, Go, Python, Java, .NET, Ruby) |
| `otel_collector` | YAML del Collector — receptores, procesadores, exportadores, pipelines, muestreo |
| `otel_semantic_conventions` | Nomenclatura de atributos, ubicación, migración de legado a actual |
| `otel_ottl` | Expresiones OTTL para transformaciones del Collector, redacción y filtrado |

### Estructura del Directorio Thoughts

El directorio `thoughts/` implementa el patrón de ingeniería de contexto:

```
thoughts/
├── shared/           # Team-wide documents
│   ├── tickets/      # Feature requests, bug reports, tasks
│   ├── plans/        # Implementation plans
│   └── research/     # Research documents and investigations
├── global/           # Cross-repository concerns
└── {username}/       # Personal notes (create your own)
    ├── tickets/
    └── plans/
```

## Flujo de Trabajo de Ingeniería de Contexto

El arnés implementa un flujo de trabajo de desarrollo estructurado:

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

### Inicializar un Repositorio

Después de instalar el arnés, inicializa cualquier proyecto (los comandos son los mismos en todas las herramientas):

```bash
cd your-project
claude  # or: opencode, gemini, pi

/init_harness
```

Esto crea configuraciones específicas de la herramienta (`CLAUDE.md`, `AGENTS.md` o `GEMINI.md`), la estructura del directorio `thoughts/` y una plantilla de ticket.

### Flujo de Trabajo de Desarrollo

```bash
# 1. Create a ticket in thoughts/shared/tickets/
# 2. Generate a plan
/create_plan thoughts/shared/tickets/PROJ-001-add-feature.md

# 3. Implement the plan
/implement_plan thoughts/shared/plans/add-feature.md

# 4. Validate
/validate_plan thoughts/shared/plans/add-feature.md

# 5. Commit
/commit
```

## Personalización

### Agregar Agentes

Crea archivos `.md` en `<tool>/agents/`:

```markdown
---
name: my-custom-agent
description: What this agent does and when to use it.
---

[Agent system prompt here]
```

Funciona para las cuatro herramientas: Claude Code los llama "subagentes", OpenCode y Gemini CLI los llaman "agentes", y Pi los llama "agentes" (kebab-case).

### Agregar Comandos y Habilidades

- **OpenCode**: Agrega archivos `.md` en `opencode/commands/` o `opencode/skills/<name>/SKILL.md`
- **Claude Code**: Agrega `claude/skills/<name>/SKILL.md` (establece `disable-model-invocation: true` para uso manual solo)
- **Gemini CLI**: Agrega archivos `.toml` en `gemini/commands/` o `gemini/skills/<name>/SKILL.md`
- **Pi**: Agrega archivos `.md` en `pi/prompts/` (comandos) o `pi/skills/<name>/SKILL.md` (habilidades)

### Directorio de Thoughts Personales

```bash
mkdir -p thoughts/$(whoami)/{tickets,plans}
```

## Hoja de Ruta

¡Las contribuciones son bienvenidas! Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para conocer las directrices.

## Cómo Contribuir

1. Bifurca (fork) el repositorio
2. Crea un ticket en `thoughts/shared/tickets/`
3. Usa `/create_plan` para diseñar tus cambios
4. Implementa y valida
5. Envía un pull request

## Licencia

Apache 2.0 — Consulta [LICENSE](LICENSE) para más detalles.
