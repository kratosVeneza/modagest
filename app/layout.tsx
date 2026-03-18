"use client"

import "./globals.css"
import { usePathname } from "next/navigation"
import HeaderLoja from "./components/HeaderLoja"
import UserProfile from "./components/UserProfile"
import ThemeToggle from "./components/ThemeToggle"
import PageTransition from "./components/PageTransition"
import OnboardingTour from "./components/OnboardingTour"
import Sidebar from "./components/Sidebar"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()

  const rotaPublica = pathname === "/login"

  return (
    <html lang="pt-BR">
      <body>
        {rotaPublica ? (
          children
        ) : (
          <div className="app-shell">
            <Sidebar />

            <main className="main-area">
              <header className="soft-card top-bar">
                <div className="top-bar-content">
                  <div className="top-bar-left">
                    <HeaderLoja />
                    <p className="top-bar-subtitle">
                      Painel de gestão da sua operação
                    </p>
                  </div>

                  <div className="top-bar-actions">
                    <ThemeToggle />
                    <UserProfile />
                  </div>
                </div>
              </header>

              <section>
                <PageTransition>{children}</PageTransition>
              </section>
            </main>

            <OnboardingTour />
            <Sidebar />
          </div>
        )}
      </body>
    </html>
  )
}
