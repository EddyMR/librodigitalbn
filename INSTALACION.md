# GUÍA DE INSTALACIÓN COMPLETA
## Catequesis Digital — Plataforma de Libros Interactivos

---

## REQUISITOS PREVIOS

| Herramienta | Versión mínima | Cómo verificar |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Cuenta Supabase | Gratuita | supabase.com |
| Cuenta Vercel (para deploy) | Gratuita | vercel.com |

---

## PASO 1 — DESCOMPRIMIR EL PROYECTO

```bash
# Descomprime el archivo descargado
tar -xzf catequesis-app-completo.tar.gz

# Entra a la carpeta
cd catequesis

# Instala las dependencias (tarda ~1-2 minutos)
npm install
```

---

## PASO 2 — CREAR PROYECTO EN SUPABASE

1. Ve a **https://supabase.com** → New Project
2. Elige un nombre (ej: `catequesis-prod`) y una contraseña para la DB
3. Selecciona la región más cercana (ej: South America - São Paulo)
4. Espera ~2 minutos a que el proyecto se cree

### Configurar el schema de base de datos:

1. En el panel de Supabase → **SQL Editor** → New Query
2. Abre el archivo `supabase/schema.sql` (incluido en el proyecto)
3. Copia TODO el contenido y pégalo en el SQL Editor
4. Clic en **Run** (o Ctrl+Enter)
5. Deberías ver "Success. No rows returned"

### Crear buckets de almacenamiento:

En Supabase → **Storage** → New Bucket:

| Bucket | Público | Para qué sirve |
|---|---|---|
| `libros` | ✅ Sí | Imágenes de hojas y portadas |
| `avatares` | ✅ Sí | Fotos de perfil (avatares 1-10) |

---

## PASO 3 — CONFIGURAR VARIABLES DE ENTORNO

1. En Supabase → **Settings** → **API** → copia:
   - `Project URL` 
   - `anon public` key
   - `service_role` key (en la sección "Service Role")

2. En tu proyecto, crea el archivo `.env.local`:

```bash
cp .env.example .env.local
```

3. Edita `.env.local` con tus datos reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Esta contraseña protege el panel de administrador general (/admin)
# Cámbiala por algo seguro
ADMIN_GENERAL_SECRET=mi-contrasena-muy-segura-2024
```

---

## PASO 4 — AGREGAR LOS AVATARES

Coloca tus 10 imágenes de personajes en la carpeta `public/avatars/`:

```
public/
  avatars/
    avatar-1.png    ← Personaje 1
    avatar-2.png    ← Personaje 2
    avatar-3.png
    avatar-4.png
    avatar-5.png
    avatar-6.png
    avatar-7.png
    avatar-8.png
    avatar-9.png
    avatar-10.png   ← Personaje 10
```

**Formato recomendado:** PNG, fondo transparente si es posible, cuadradas (ej: 256×256px)

---

## PASO 5 — PROBAR EN LOCAL

```bash
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

Si todo está bien verás la pantalla de selección de colegio.

---

## PASO 6 — CREAR EL PRIMER ADMINISTRADOR GENERAL

El administrador general es el "superusuario" que controla todo desde `/admin`.

1. Ve a **http://localhost:3000/admin**
2. Ingresa la contraseña que pusiste en `ADMIN_GENERAL_SECRET`
3. Desde el panel podrás:
   - Crear colegios
   - Crear administradores por colegio
   - Gestionar libros y contenido

---

## PASO 7 — FLUJO INICIAL RECOMENDADO

Una vez dentro del panel admin, sigue este orden:

```
1. /admin → Colegios → Crear tu primer colegio
2. /admin → Usuarios → Crear admin para ese colegio (con su email)
3. /admin → Contenido → Crear libros → Bloques → Subir hojas (imágenes)
```

Luego, como Admin del Colegio:
```
4. /{codigo}/grupos → Crear grupos → Asignar catequista
5. /{codigo}/grupos → Asignar libros al grupo
6. /{codigo}/usuarios/nuevo → Agregar alumnos al grupo
```

---

## PASO 8 — DEPLOY A PRODUCCIÓN (Vercel)

### Opción A: Desde terminal

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Dentro de la carpeta del proyecto
vercel

# Sigue las instrucciones (login, nombre del proyecto, etc.)
# Al final te dará una URL pública
```

### Opción B: Desde el dashboard de Vercel

1. Ve a **https://vercel.com** → New Project
2. Conecta tu repositorio de GitHub (o sube el código)
3. En **Environment Variables** agrega exactamente las mismas variables de `.env.local` PERO cambia:
   ```
   NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
   ```
4. Clic en **Deploy**

### Configurar URL en Supabase (importante para Auth):

1. Supabase → **Authentication** → **URL Configuration**
2. Agrega tu dominio de Vercel en "Redirect URLs":
   ```
   https://tu-app.vercel.app/**
   ```

---

## PASO 9 — INSTALAR COMO PWA EN EL MÓVIL

Una vez desplegado en Vercel:

**En Android (Chrome):**
1. Abre la URL en Chrome
2. Menú (3 puntos) → "Instalar app" o "Agregar a pantalla de inicio"
3. La app se instala como nativa

**En iPhone (Safari):**
1. Abre la URL en Safari (no Chrome)
2. Toca el ícono de compartir (□↑)
3. "Añadir a pantalla de inicio"
4. La app se instala como nativa

---

## ESTRUCTURA DE URLs EN PRODUCCIÓN

```
tudominio.com/                          → Selector de colegio
tudominio.com/CG-4F2X/login             → Login del colegio con código CG-4F2X
tudominio.com/CG-4F2X/dashboard         → Dashboard (redirige según rol)
tudominio.com/CG-4F2X/libros/...        → Libros del alumno
tudominio.com/CG-4F2X/grupo/...         → Vista del catequista
tudominio.com/CG-4F2X/usuarios          → Gestión de usuarios (admin colegio)
tudominio.com/CG-4F2X/grupos            → Gestión de grupos (admin colegio)
tudominio.com/admin                     → Panel general (superadmin)
tudominio.com/auth/qr/TOKEN             → Login por QR
```

---

## SOLUCIÓN DE PROBLEMAS COMUNES

### "Error: supabase not configured"
→ Verifica que `.env.local` tenga las 3 variables de Supabase correctas y reinicia el servidor (`npm run dev`)

### "Relation does not exist"
→ El schema SQL no se ejecutó correctamente. Vuelve al SQL Editor y corre el archivo `schema.sql` completo

### Las imágenes no cargan
→ Verifica que el bucket `libros` en Supabase sea público y que la URL del proyecto en `.env.local` sea correcta

### El QR expira muy rápido
→ En `src/lib/auth.ts` busca `interval '1 hour'` y cámbialo al tiempo que prefieras (ej: `interval '24 hours'`)

### Error 401 en el panel `/admin`
→ La cookie de sesión expiró (duración: 8 horas). Vuelve a iniciar sesión en `/admin`

---

## AGREGAR CONTENIDO (HOJAS DE LOS LIBROS)

Las imágenes de las hojas deben ser:
- **Formato:** PNG o JPG
- **Orientación:** Vertical (portrait)
- **Resolución recomendada:** 430 × 932 px (proporción 9:20, optimizada para móvil)
- **Peso máximo:** 2MB por imagen (Supabase las sirve con CDN)

Para hojas de tipo `escritura_imagen` (donde el alumno escribe sobre la imagen), después de crear la hoja ve a la base de datos (Supabase → Table Editor → `zonas_escritura`) y agrega las zonas en % de la imagen donde aparecerán los campos de texto.

---

## PRÓXIMAS MEJORAS (roadmap)

- [ ] Notificaciones push cuando el catequista comenta
- [ ] Dashboard con gráficas de progreso por grupo
- [ ] Export de reportes a PDF
- [ ] Soporte offline completo (sync automático)
- [ ] Email automático de bienvenida con Resend
- [ ] Modo oscuro
- [ ] Zonas de escritura con editor visual (drag & drop)
