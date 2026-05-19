import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // API routes handle their own auth — never redirect them
  if (path.startsWith('/api')) {
    return supabaseResponse
  }

  // Public paths (no auth required)
  const publicPaths = ['/', '/admin', '/auth']
  const isPublic = publicPaths.some(p => path === p || path.startsWith('/auth'))
  const isLoginPage = path.includes('/login')
  const isAdminPath = path.startsWith('/admin')

  // Admin back-office: protect with separate logic
  if (isAdminPath && path !== '/admin' && path !== '/admin/login') {
    const adminToken = request.cookies.get('admin_token')?.value
    if (!adminToken || adminToken !== process.env.ADMIN_GENERAL_SECRET) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return supabaseResponse
  }

  // Not authenticated → allow only public/login paths
  if (!user && !isPublic && !isLoginPage) {
    // Extract colegio code from path: /[colegio]/...
    const parts = path.split('/')
    const colegioCodigo = parts[1]
    if (colegioCodigo) {
      return NextResponse.redirect(new URL(`/${colegioCodigo}/login`, request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Authenticated → redirect away from login to role-specific home
  if (user && isLoginPage) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol, colegio:colegios(codigo)')
      .eq('user_id', user.id)
      .single()

    if (perfil) {
      const colegioCodigo = (perfil.colegio as any)?.codigo
      let home = `/${colegioCodigo}/dashboard`
      if (perfil.rol === 'alumno') home = `/${colegioCodigo}/inicio`
      else if (perfil.rol === 'catequista') home = `/${colegioCodigo}/grupo`
      return NextResponse.redirect(new URL(home, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|avatars|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
}
