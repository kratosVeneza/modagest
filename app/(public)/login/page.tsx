type LoginPageProps = {
  searchParams?: Promise<{ plan?: string }>
}

import LoginPageClient from "./LoginPageClient"

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const initialPlan = params?.plan || "profissional"

  return <LoginPageClient initialPlan={initialPlan} />
}