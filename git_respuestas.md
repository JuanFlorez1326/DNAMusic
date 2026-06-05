# Git y Control de Versiones

## 1. Crear rama `feature/filtro-por-sede` desde `main`

```bash
git checkout main
git pull origin main
git checkout -b feature/filtro-por-sede
```

**Explicación:** Me aseguro de partir desde `main` actualizado para evitar conflictos innecesarios. `checkout -b` crea la rama y me cambia a ella en un solo paso.

---

## 2. Commit con Conventional Commits

```bash
git add src/controllers/estudiantes.controller.ts src/routes/estudiantes.routes.ts
git commit -m "feat(estudiantes): add sede filter to student listing endpoint

- Add sedeId query parameter to GET /api/estudiantes
- OPERADOR role automatically scoped to their assigned sede
- ADMIN can filter by any sede or view all"
```

**Explicación:** El formato es `tipo(scope): descripción corta`. El cuerpo (opcional) explica el *qué* y el *por qué*. Prefijos comunes:
- `feat`: nueva funcionalidad
- `fix`: corrección de bug
- `refactor`: refactor sin cambio de comportamiento
- `docs`: solo documentación
- `chore`: tareas de mantenimiento (deps, build)
- `test`: agregar o modificar tests

---

## 3. Subir la rama al remoto

```bash
git push -u origin feature/filtro-por-sede
```

**Explicación:** `-u` (upstream) vincula la rama local con la remota. Después de este primer push, basta con `git push` para actualizarla.

---

## 4. Crear un Pull Request

**Proceso:**
1. En GitHub, ir al repositorio → "Pull requests" → "New pull request"
2. Seleccionar `base: main` ← `compare: feature/filtro-por-sede`
3. Completar el formulario:

**Título:** `feat(estudiantes): filtro por sede en listado`

**Descripción que incluiría:**

```markdown
## ¿Qué hace este PR?
Agrega filtro por sede al endpoint de listado de estudiantes.

## Cambios
- `GET /api/estudiantes?sedeId=xxx` filtra por sede (solo ADMIN)
- Los OPERADORES ven automáticamente solo su sede (sin parámetro necesario)

## Cómo probar
1. Login como ADMIN → listar estudiantes → filtrar por sede Bogotá
2. Login como operador.bog@dnamusic.co → verificar que solo ve estudiantes de Bogotá
3. Intentar pasar sedeId diferente como OPERADOR → debe ignorarse

## Checklist
- [x] TypeScript sin errores
- [x] Validación de roles correcta
- [x] Probado manualmente con los dos roles
```

---

## 5. Resolver conflictos al hacer pull de `main`

Si al hacer `git pull origin main` desde mi rama hay conflictos:

```bash
# 1. Estoy en mi rama de feature
git checkout feature/filtro-por-sede

# 2. Traigo los cambios de main
git pull origin main

# Git avisa: "CONFLICT (content): Merge conflict in src/controllers/estudiantes.controller.ts"

# 3. Abro los archivos en conflicto — tienen marcadores como:
# <<<<<<< HEAD
# mi código
# =======
# código de main
# >>>>>>> origin/main

# 4. Resuelvo manualmente: decido qué código queda, combino si es necesario
# Borro los marcadores <<<<<<<, =======, >>>>>>>

# 5. Marco el conflicto como resuelto
git add src/controllers/estudiantes.controller.ts

# 6. Completo el merge con un commit
git commit -m "chore: merge main into feature/filtro-por-sede, resolve conflicts"

# 7. Subo la rama actualizada
git push origin feature/filtro-por-sede
```

**Alternativa con rebase** (historial más limpio):
```bash
git fetch origin
git rebase origin/main
# Resolver conflictos uno por uno si los hay
git add <archivo>
git rebase --continue
git push --force-with-lease origin feature/filtro-por-sede
```

Prefiero `rebase` para ramas de feature cortas porque produce un historial lineal más fácil de leer en el PR. Uso `--force-with-lease` (no `--force`) para no sobreescribir trabajo de otros.

---

## Comandos Git utilizados en el desarrollo de este proyecto

El proyecto se desarrolló con commits incrementales directamente en `main`, sin ramas de feature:

```bash
# Inicializar repo y conectar al remoto
git init
git remote add origin https://github.com/juanks339/dnamusic-erp.git

# Flujo real usado: commit directo a main
git add <archivos>
git commit -m "feat: API configuration"
git push origin main

# Ver historial
git log --oneline

# Revisar cambios antes de hacer commit
git diff
git diff --staged

# Deshacer cambios en un archivo (sin perder otros cambios)
git checkout -- api/src/app.ts

# Stash para pausar trabajo en progreso
git stash
git stash pop
```

**Nota:** Para un proyecto en equipo aplicaría el flujo de ramas descrito en las secciones anteriores. En este caso, al ser una prueba técnica individual con entregas incrementales, trabajé directamente sobre `main` para mantener el historial simple.
