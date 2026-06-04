# Análisis Técnico de Performance

## Caso
El módulo donde los asesores de admisiones ven los agendamientos del día tarda entre 6 y 10 segundos en cargar.

---

## Mi proceso de diagnóstico (antes de cambiar una sola línea de código)

### Paso 1 — Reproducir y acotar el problema

Lo primero es asegurarme de que el problema es real y consistente. Abro el módulo de agendamientos en el navegador con DevTools abierto y mido cuánto tarda. Anoto:

- ¿Tarda siempre o solo a veces? (descarta intermitencias de red o picos de carga)
- ¿Ocurre para todos los usuarios o solo algunos? (podría ser volumen de datos específico de una sede)
- ¿Ocurre en todas las horas del día o solo en horas pico?

Le pregunto al equipo que reportó el problema: **¿cuándo empezó?** Un cambio reciente (deploy, migración de datos) es la pista más valiosa.

---

### Paso 2 — Medir en el navegador (Network tab)

Abro **Chrome DevTools → Network** y recargo el módulo. Identifico:

1. **¿Cuántas peticiones HTTP hace el módulo?** Si hace 20 peticiones para cargar una vista, el problema puede estar en el frontend (N+1 de requests).
2. **¿Cuál petición es la más lenta?** Anoto el endpoint y su tiempo de respuesta (TTFB vs. Download).
3. **¿El tiempo está en TTFB (Time To First Byte) o en descarga?** Si el TTFB es alto (ej. 7s) pero la descarga es rápida (50ms), el problema está en el **servidor o la base de datos**, no en la red ni el payload.
4. **¿Cuánto pesa la respuesta?** Si la API devuelve 5MB de JSON, el problema puede ser que está trayendo demasiados datos.

Con esto ya sé si el cuello de botella está en el **frontend, el backend o la red**.

---

### Paso 3 — Medir en el backend (logs de tiempos)

Si el TTFB es alto, voy al servidor. Busco los logs del endpoint en cuestión. Si no hay logs de tiempos, agrego temporalmente un middleware de logging:

```ts
// Mide cuánto tarda cada request
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} — ${Date.now() - start}ms`);
  });
  next();
});
```

Quiero saber: **¿todo el tiempo es en el servidor o hay latencia de red?**

---

### Paso 4 — Identificar si el cuello de botella es la base de datos

Activo el **query logging de Prisma** (ya lo tengo habilitado en desarrollo):

```ts
new PrismaClient({ log: ['query', 'info', 'warn'] })
```

Reviso los logs cuando llega la petición del módulo de agendamientos. Busco:

1. **¿Cuántas queries se ejecutan?** Si veo 50 queries para un solo request, hay un **problema N+1** — probablemente un `findMany` sin `include`, seguido de un loop que hace una query por cada registro.
2. **¿Alguna query tarda más de 1 segundo?** Esa es la candidata principal.
3. **¿Hay queries repetidas?** Misma query ejecutada múltiples veces = falta de caché o N+1.

---

### Paso 5 — Analizar la query lenta con EXPLAIN ANALYZE

Si identifiqué una query lenta, la ejecuto directamente en PostgreSQL con:

```sql
EXPLAIN ANALYZE
SELECT a.*, u.nombre, s.nombre as sede
FROM agendamientos a
JOIN usuarios u ON a.asesor_id = u.id
JOIN sedes s ON a.sede_id = s.id
WHERE DATE(a.fecha) = CURRENT_DATE;
```

Leo el plan de ejecución. Busco:
- **Seq Scan** en tablas grandes → falta de índice en la columna filtrada (`fecha`, `sede_id`, `asesor_id`)
- **Hash Join** con muchas filas → posible falta de índice en columnas de JOIN
- **Sort** sin índice → ORDER BY sobre columna sin índice

Si veo un `Seq Scan` sobre `agendamientos` filtrando por fecha, la solución es un índice:

```sql
CREATE INDEX idx_agendamientos_fecha ON agendamientos (fecha);
```

Antes de crear el índice, mido el tiempo de la query con `\timing` en psql para tener baseline.

---

### Paso 6 — Descartar problemas de infraestructura

Si los pasos anteriores no muestran una query lenta específica (todas están bajo 100ms pero el total sigue siendo 8s), reviso el servidor:

- **CPU**: `top` o `htop` — ¿está al 100%? Podría ser que el servidor está saturado en horas pico.
- **Memoria**: ¿hay swap activo? Si la RAM está llena y usa swap, todo se vuelve lento.
- **Disco**: ¿el PostgreSQL está en disco HDD? Las queries que hacen Seq Scan en disco lento son muy lentas.
- **Conexiones de BD**: ¿se está agotando el connection pool? Si la app hace 100 requests simultáneos y el pool tiene 5 conexiones, los otros 95 esperan en cola.

Herramientas: `pg_stat_activity` en Postgres para ver conexiones activas y queries bloqueadas.

---

### Paso 7 — Revisar el código del endpoint

Recién en este paso miro el código. Ya sé dónde está el problema (DB, red, CPU, N+1). Busco específicamente:

- **¿Usa `include` correctamente o hace queries en un loop?**
  ```ts
  // MAL: N+1
  const agendamientos = await prisma.agendamiento.findMany({ where: { fecha: hoy } });
  for (const a of agendamientos) {
    a.asesor = await prisma.user.findUnique({ where: { id: a.asesorId } }); // N queries!
  }

  // BIEN: 1 query con join
  const agendamientos = await prisma.agendamiento.findMany({
    where: { fecha: hoy },
    include: { asesor: true, sede: true },
  });
  ```
- **¿Trae todas las columnas o solo las necesarias?** (`select` en Prisma)
- **¿Tiene paginación?** Si devuelve 10.000 registros de un día muy ocupado, sin paginar, eso mata al servidor.

---

### Paso 8 — Solución y validación

Solo después de confirmar la causa raíz, hago el cambio. Lo hago en una rama separada, mido el tiempo antes y después con los mismos datos, y lo valido en staging antes de llevar a producción.

**Resumen del proceso:**

```
Browser DevTools → ¿dónde está el tiempo? (TTFB vs. download)
      ↓
Si TTFB alto → Logs de backend → ¿cuánto tarda el servidor?
      ↓
Si el servidor tarda → Logs de Prisma → ¿cuántas queries? ¿cuál es lenta?
      ↓
Si hay query lenta → EXPLAIN ANALYZE → ¿falta índice? ¿N+1?
      ↓
Si las queries son rápidas → Infraestructura → CPU, RAM, pool de conexiones
      ↓
Recién ahora → Cambiar código / agregar índice / optimizar query
```

El objetivo es nunca adivinar. Cada paso descarta hipótesis hasta que queda solo una causa.
