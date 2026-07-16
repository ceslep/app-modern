---
name: openspec-suggest
description: Recomienda usar OpenSpec (spec-driven development) cuando el usuario pide cambios grandes, refactors, features nuevas, o migraciones. Trigger: cuando se mencionan palabras como "refactor", "migrar", "feature nueva", "cambio grande", "modernizar", "reescribir", o se propone un cambio que toca múltiples archivos. NO trigger para cambios pequeños (typo fix, un CSS tweak, un bug simple). Para cambios grandes, sugiere: 1) crear una change con /opsx:propose, 2) revisar el proposal, 3) implementar con /opsx:apply. OpenSpec ya está configurado en el proyecto (openspec/ + 6 skills + 6 comandos).
allowed-tools: Read, Glob
license: MIT
compatibility: OpenSpec CLI 1.6.0+, openspec/ directory
metadata:
  author: project
  version: "1.0"
---

# OpenSpec está instalado y listo

Este proyecto tiene **OpenSpec** (Spec-Driven Development) configurado. Estructura actual:
- `openspec/specs/` — specs vigentes (source of truth)
- `openspec/changes/` — cambios en progreso
- `openspec/config.yaml` — contexto del proyecto + reglas por artifact
- `.opencode/skills/openspec-*` (6 skills) — slash commands
- `.claude/commands/opsx/` (6 comandos) — slash commands para Claude Code

## Cuándo sugerir OpenSpec

**SÍ sugerir cuando el usuario pide:**
- "Refactoriza X" / "Reescribe X" / "Migra X a Y"
- "Implementa feature Z" (cualquier feature nueva con scope > 1 archivo)
- "Cambia el comportamiento de W" (cambio de UX, refactor de patrón)
- Cambios que tocan 3+ archivos
- Cambios con impacto en performance, schema, o contratos API
- "Moderniza / Mejora / Optimiza X"

**NO sugerir (hacer directo) cuando:**
- Bug fix de 1-2 líneas
- Typos en strings/CSS
- Ajustes de estilo o renames simples
- Una pregunta o explicación

## Flujo recomendado

```
/opsx:propose "<descripción del cambio>"
   → Crea openspec/changes/<name>/ con proposal.md, specs/, design.md, tasks.md
   → Espera a que el usuario revise

/opsx:apply
   → Implementa las tasks una por una
   → Marca como completadas

/opsx:archive
   → Archiva el change y actualiza los specs vigentes
```

Para cambios exploratorios: `/opsx:explore` — la IA piensa contigo sin generar artifacts.

## Comando de inspección rápida

Si necesitas saber qué hay en el repo:
- `openspec list` — cambios activos
- `openspec list --specs` — specs vigentes
- `cat openspec/config.yaml` — contexto y reglas

## Cuándo NO usar OpenSpec

- Si el usuario explícitamente dice "solo haz X" o "rápido"
- Si el cambio es trivial (1 archivo, 1-2 líneas)
- Si el usuario está iterando rápidamente y no quiere ceremonias

## Recordatorio

El proyecto tiene un historial de cambios grandes recientes:
- Modernización de `guardar_notas.php` y `guardar_notas2.php`
- Vista mobile de `notas.js` (cards + filter + aspect auto)
- Vista mobile de `concentrador.js` (cards + filter + dropdown)

Esos hubieran sido buenos candidatos para OpenSpec desde el inicio.
