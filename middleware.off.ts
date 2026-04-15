import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ROTAS_PROTEGIDAS = ["/dashboard", "/produtos", "/estoque", "/pedidos", "/vendas", "/clientes", "/financeiro", "/historico-vendas", "/relatorios", "/loja", "/assistente-ia"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const rotaProtegida = ROTAS_PROTEGIDAS.some((rota) => pathname.startsWith(rota))

  if (!rotaProtegida) {
    return NextResponse.next()
  }

  const accessToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("supabase-auth-token")?.value

  if (!accessToken) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectedFrom", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/produtos/:path*",
    "/estoque/:path*",
    "/pedidos/:path*",
    "/vendas/:path*",
    "/clientes/:path*",
    "/financeiro/:path*",
    "/historico-vendas/:path*",
    "/relatorios/:path*",
    "/loja/:path*",
    "/assistente-ia/:path*",
  ],
}