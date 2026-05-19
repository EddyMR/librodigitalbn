# PRD — Plataforma de Libro Digital para Catequesis
**Versión:** 1.0 | **Fase:** 1 — MVP PWA

---

## 1. Visión General

Plataforma educativa digital mobile-first diseñada para acompañar el proceso de catequesis a través de libros digitales interactivos. Permite a alumnos, catequistas y administradores de múltiples colegios trabajar en un mismo ecosistema centralizado, con contenido compartido y entregas individualizadas.

**Stack recomendado:** Next.js (PWA) + Supabase (PostgreSQL + Auth + Storage) + Tailwind CSS  
**Despliegue:** Vercel / Railway  
**Offline:** Service Worker con cache estratégico (Workbox)

---

## 2. Arquitectura de Roles

### 2.1 Jerarquía de roles

```
Administrador General (superadmin, 1 o pocos)
  └── Administrador de Colegio (por colegio)
        ├── Catequista / Profesor (por grupo dentro del colegio)
        └── Alumno (por grupo dentro del colegio)
```

### 2.2 Permisos por rol

| Acción | Admin General | Admin Colegio | Catequista | Alumno |
|---|---|---|---|---|
| Crear colegios | ✅ | ❌ | ❌ | ❌ |
| Crear admins de colegio | ✅ | ❌ | ❌ | ❌ |
| Crear catequistas | ✅ | ✅ | ❌ | ❌ |
| Crear alumnos | ✅ | ✅ | ✅ | ❌ |
| Crear grupos | ✅ | ✅ | ❌ | ❌ |
| Ver todos los grupos del colegio | ✅ | ✅ | ❌ | ❌ |
| Ver solo su grupo asignado | — | — | ✅ | ✅ |
| Modificar libros/bloques/hojas | ✅ | ❌ | ❌ | ❌ |
| Ver entregas de su grupo | — | — | ✅ | ❌ |
| Comentar sobre entregas | — | — | ✅ | ❌ |
| Realizar/modificar entregas | — | — | ❌ | ✅ |

---

## 3. Módulo de Colegios

- **Base de datos centralizada** de colegios, accesible desde el inicio.
- Cada colegio tiene:
  - `id` (UUID interno)
  - `codigo` (identificador alfanumérico aleatorio de ~6 caracteres, visible y único)
  - `nombre`
  - `link_acceso` (URL única por colegio: `/colegio/:codigo`)
- La pantalla de inicio tiene un **selector con búsqueda en tiempo real** para elegir el colegio antes de iniciar sesión.
- Al seleccionar el colegio, el usuario ve la pantalla de login contextualizada a ese colegio.
- Alternativamente, acceder directamente al link del colegio salta el selector.

---

## 4. Autenticación

### 4.1 Métodos de inicio de sesión

**Para alumnos (dos opciones):**
1. **Usuario + contraseña:** usuario generado automáticamente (ej. `nombre.apellido`) + contraseña de 6 caracteres en minúsculas, fácil de recordar.
2. **Código QR:** el catequista genera un QR desde la plataforma; al escanearlo, el alumno entra directamente a su sesión (token de un solo uso con expiración).

**Para catequistas y administradores:**
- Email + contraseña (estándar).

### 4.2 Flujo de creación de alumno

1. Admin/catequista crea al alumno → sistema genera credenciales automáticamente.
2. Se envía un correo al alumno (o tutor) con usuario y contraseña.
3. El catequista puede generar el QR en cualquier momento desde el perfil del alumno.

---

## 5. Módulo de Grupos

- Un grupo pertenece a un **único colegio**.
- Al crear un grupo se le asigna:
  - Nombre del grupo
  - Un catequista responsable
  - (Opcionalmente) alumnos iniciales
- Un alumno pertenece a **un solo grupo** a la vez.
- Un catequista puede tener **uno o más grupos** asignados.
- Los libros se asignan a grupos (no a alumnos individuales): si el libro A está asignado al Grupo 1, todos los alumnos del Grupo 1 lo ven.

---

## 6. Módulo de Libros Digitales

### 6.1 Estructura del contenido (central, compartida por todos)

```
Plataforma
  └── Libro (3 libros)
        └── Bloque (varios por libro)
              └── Hoja (varias por bloque)
                    └── Actividad (puede ser: solo lectura o interactiva)
```

> ⚠️ El contenido de libros, bloques y hojas es **central y único** para todos los colegios. Solo el Administrador General puede editarlo. Lo que varía por alumno son sus **entregas**.

### 6.2 Tipos de hojas / actividades

| Tipo | Descripción |
|---|---|
| `lectura` | Solo se muestra la imagen. No requiere entrega. |
| `escritura_libre` | Caja de texto flotante sobre la imagen donde el alumno escribe. |
| `escritura_sobre_imagen` | El alumno escribe directamente sobre zonas definidas de la imagen. |

- Las imágenes ya están diseñadas (formato vertical tipo wallpaper de móvil, proporción ~9:16).
- Las hojas se visualizan con navegación tipo **swipe vertical u horizontal** dentro del bloque.

### 6.3 Asignación de libros a grupos

- Cada libro puede asignarse a **uno o más grupos** de cualquier colegio.
- La asignación la hace el Admin de Colegio o el Admin General.
- El alumno solo ve los libros que su grupo tiene asignados.

### 6.4 Progreso y visitas

- Se registra automáticamente cada vez que un alumno **abre una hoja** (fecha y hora).
- El catequista puede ver:
  - Qué hojas ha visitado el alumno y cuántas veces.
  - Fecha de primera visita y última visita por hoja.
  - Porcentaje de avance en el libro (hojas visitadas / total de hojas).

---

## 7. Módulo de Entregas

### 7.1 Flujo del alumno

1. Alumno navega al libro → bloque → hoja interactiva.
2. Escribe su respuesta en la caja de texto o sobre la imagen.
3. Presiona "Entregar" → se guarda en base de datos con `fecha_entrega`.
4. El alumno puede **modificar** la entrega en cualquier momento → se actualiza `fecha_modificacion`.

### 7.2 Datos que se guardan por entrega

```
entrega {
  id
  alumno_id
  hoja_id
  contenido (texto o referencia a imagen anotada)
  fecha_entrega
  fecha_modificacion
  estado: "borrador" | "entregado"
}
```

### 7.3 Vista del catequista sobre entregas

El catequista ve por cada alumno de su grupo:
- Estado de entrega por hoja (entregado / pendiente / no visitado).
- Contenido de la entrega.
- Fecha de entrega y fecha de última modificación (con indicador visual si fue modificada después de una revisión).
- Historial de visitas a cada hoja.
- **Campo de comentario/retroalimentación** del catequista sobre la entrega.

### 7.4 Comentarios del catequista

- El catequista puede agregar un comentario escrito sobre cualquier entrega.
- El alumno ve el comentario de su catequista al abrir esa hoja.
- Se guarda: `comentario`, `fecha_comentario`, `catequista_id`.

---

## 8. Módulo de Perfiles

Todos los usuarios (alumnos, catequistas, administradores) tienen un perfil con:

- **Nombre completo**
- **Mini biografía** (texto corto, editable)
- **Personaje/avatar:** el usuario selecciona de un catálogo de personajes con imágenes prediseñadas. Este personaje será su foto de perfil en toda la plataforma.
- Los perfiles son **visibles** entre los miembros del mismo colegio/grupo según corresponda.

---

## 9. Notificaciones (Recomendado agregar)

Aprovechando que es una PWA instalable, se recomienda implementar **push notifications** para:

- Notificar al alumno cuando el catequista deja un comentario en su entrega.
- Recordatorio al catequista cuando un alumno entrega una actividad.
- Alertas del admin a todo el colegio (avisos generales).

---

## 10. Dashboard y Reportes (Recomendado agregar)

### Para catequistas:
- Resumen visual del grupo: cuántos alumnos han entregado cada actividad (barra de progreso).
- Alumnos que no han visitado el libro en X días (alerta de inactividad).

### Para administradores de colegio:
- Vista de todos los grupos: progreso promedio por grupo, por libro.
- Comparativa de entregas y visitas entre grupos.

### Exportación:
- Reporte de progreso por alumno exportable a PDF.
- Lista de alumnos por grupo con sus credenciales (para distribución inicial).

---

## 11. Funcionalidad Offline (Recomendado)

- Las **hojas de lectura** se cachean para visualización sin conexión.
- Las **entregas** se guardan localmente (IndexedDB) y se sincronizan al recuperar conexión, con indicador de "pendiente de sincronización".
- El catequista puede ver entregas ya cargadas sin conexión.
- Las imágenes de los libros se pre-cachean al abrir el libro por primera vez (estrategia: Cache First para assets estáticos, Network First para datos dinámicos).

---

## 12. UX / Navegación

### Navegación principal del alumno:
```
Home → Mis Libros → [Libro] → [Bloque] → [Hoja]
                                              └── Ver comentario del catequista
```

### Navegación del catequista:
```
Home → Mi Grupo → [Alumno] → Progreso + Entregas + Comentar
```

### Principios UX:
- **Mobile-first:** toda la interfaz diseñada para pantallas de 375–430px.
- Gestos de swipe para navegar entre hojas.
- Barra de progreso visible al navegar el libro.
- Feedback visual inmediato al guardar una entrega (animación de confirmación).
- Modo oscuro recomendado como opción.
- Tipografía grande y legible (mínimo 16px en cuerpo).
- Carga progresiva: skeleton screens mientras carga el contenido.

---

## 13. Escalabilidad

- Arquitectura **multitenancy** desde el inicio: cada consulta filtra por `colegio_id`.
- El contenido del libro (hojas, bloques) es **compartido y centralizado** (una sola tabla, sin duplicación).
- Las entregas, visitas y comentarios son **por alumno** (datos propios de cada institución).
- Posibilidad futura de agregar más libros, más tipos de actividades y más roles sin romper la arquitectura.

---

## 14. Preguntas Abiertas (A definir antes de desarrollar)

1. **¿El alumno puede ver su propia nota o comentario antes de que el catequista lo publique?** ¿O el comentario es visible inmediatamente al guardarse?
2. **¿Cuántos personajes/avatares hay disponibles?** ¿Están agrupados por categoría o son una lista plana?
3. **¿El catequista puede editar o eliminar un comentario ya publicado?**
4. **¿El Administrador General es un usuario de la plataforma o es solo acceso a un panel de back-office separado?**
5. **¿Los libros tienen un orden secuencial obligatorio** (no puedes ir al Libro 2 sin terminar el 1) o son de acceso libre?
6. **¿Se requiere aprobación del catequista** para que el alumno avance al siguiente bloque?
7. **¿Hay alguna funcionalidad de gamificación** (puntos, insignias, rachas) que se quiera incluir desde el inicio o en fases posteriores?
8. **¿El colegio tiene nombre de dominio propio** o todos usan el dominio central de la plataforma?

---

## 15. Fases de Desarrollo Sugeridas

| Fase | Alcance |
|---|---|
| **Fase 1 — MVP** | Auth, colegios, grupos, perfiles, libros (solo lectura), navegación base, PWA instalable |
| **Fase 2 — Entregas** | Actividades interactivas, entregas de alumnos, vista de catequista, comentarios |
| **Fase 3 — Analytics** | Dashboard de progreso, reportes, notificaciones push |
| **Fase 4 — Offline + Pulido** | Service Worker completo, sync en background, optimizaciones de rendimiento |
