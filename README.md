# Catequesis Digital — Plataforma de Libros Interactivos

Plataforma mobile-first PWA para catequesis, con libros digitales interactivos, entregas de alumnos, retroalimentación de catequistas y gestión multiescuela.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| PWA | next-pwa + Workbox |
| Estado | React hooks + Supabase Realtime |
| QR | qrcode |

---

## Configuración inicial

### 1. Clonar e instalar

```bash
git clone <repo>
cd catequesis-app
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. En el SQL Editor, ejecuta el archivo `supabase/schema.sql` completo
3. En Storage, crea dos buckets:
   - `libros` (público) — para imágenes de las hojas
   - `avatares` (público) — para los 10 avatares (subir como `avatar-1.png` ... `avatar-10.png`)

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_GENERAL_SECRET=una-contraseña-segura-aqui
```

### 4. Imágenes de avatares

Coloca los 10 archivos en `public/avatars/`:
```
public/
  avatars/
    avatar-1.png
    avatar-2.png
    ...
    avatar-10.png
```

### 5. Correr en desarrollo

```bash
npm run dev
```

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                    ← Landing: selector de colegio
│   ├── [colegio]/
│   │   ├── login/page.tsx          ← Login contextualizado al colegio
│   │   ├── (alumno)/               ← Rutas protegidas para alumnos
│   │   │   ├── layout.tsx          ← Nav bar inferior
│   │   │   ├── dashboard/          ← Inicio del alumno
│   │   │   ├── libros/[libroId]/   ← Vista del libro (bloques)
│   │   │   │   └── [bloqueId]/[hojaId]/ ← Lector de hoja + entrega
│   │   │   └── perfil/             ← Perfil + avatar
│   │   └── (catequista)/           ← Rutas protegidas para catequistas
│   │       ├── dashboard/          ← Mis grupos + stats
│   │       ├── grupo/[alumnoId]/   ← Progreso y entregas por alumno
│   │       └── perfil/
│   ├── admin/                      ← Back-office (protegido por password)
│   │   ├── page.tsx                ← Login admin
│   │   ├── dashboard/              ← Stats globales
│   │   ├── colegios/               ← CRUD colegios
│   │   ├── usuarios/               ← CRUD usuarios
│   │   └── contenido/              ← CRUD libros/bloques/hojas
│   └── auth/qr/[token]/            ← Redirect de login por QR
├── components/
│   ├── auth/                       ← ColegioSelector, LoginForm
│   ├── libro/                      ← HojaViewer, HojaNav
│   ├── catequista/                 ← ComentarioForm, QRGenerador
│   ├── perfil/                     ← PerfilEditForm (con AvatarPicker)
│   └── layout/                     ← BottomNav
├── lib/
│   ├── supabase.ts                 ← Browser/server/admin clients
│   ├── auth.ts                     ← Server actions de autenticación
│   └── utils.ts                    ← Helpers: fechas, avatares, etc.
└── types/
    └── index.ts                    ← Todos los tipos TypeScript
```

---

## Roles y Acceso

| Rol | Acceso |
|---|---|
| **Alumno** | Sus libros asignados (vía grupo), entregas, perfil. Login con usuario/contraseña o QR |
| **Catequista** | Sus grupos asignados + progreso y entregas de cada alumno + retroalimentación |
| **Admin Colegio** | Todo lo anterior + gestión de usuarios y grupos de su colegio |
| **Admin General** | Panel `/admin` separado: colegios, usuarios, contenido central |

---

## Flujo: Cómo agregar contenido

1. **Admin General** → `/admin/contenido` → Crear libros → Bloques → Hojas (subir imágenes)
2. Para hojas de `escritura_imagen`, agregar zonas con posición en % de la imagen
3. **Admin Colegio** → Asignar libro a un grupo desde el panel del colegio

---

## Flujo: Crear un alumno

1. Catequista o Admin Colegio → "Agregar alumno" → llena nombre, apellido, email (opcional)
2. Sistema genera: `username = nombre.apellido`, contraseña de 6 chars en minúsculas
3. Si tiene email: recibe correo automático con credenciales
4. Si no: catequista genera QR desde el perfil del alumno y lo imprime/comparte

---

## PWA e Instalación

La app es instalable en móviles como PWA:
- iOS: Safari → Compartir → "Añadir a pantalla de inicio"
- Android: Chrome → menú → "Instalar app"

**Estrategia de cache offline:**
- Imágenes de libros (Supabase Storage) → `CacheFirst` (30 días)
- Assets estáticos → `CacheFirst`
- API de datos → `NetworkFirst` con fallback a caché 5 min

---

## Despliegue

### Vercel (recomendado)

```bash
npm i -g vercel
vercel --prod
```

Agrega las variables de entorno en el dashboard de Vercel.

---

## Pendiente / Próximas fases

- [ ] Admin Colegio: gestión de grupos y asignación de libros
- [ ] Admin Colegio: gestión de catequistas y alumnos con UI completa
- [ ] Push notifications (Web Push API)
- [ ] Dashboard con gráficas de progreso
- [ ] Export de reportes a PDF
- [ ] Soporte completo offline con IndexedDB + sync
- [ ] Email de bienvenida con Resend / Mailgun
- [ ] Modo oscuro
