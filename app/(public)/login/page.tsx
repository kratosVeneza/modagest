import LoginPageClient from "./LoginPageClient"

type LoginPageProps = {
  searchParams?: {
    plan?: string
  }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const plano =
    searchParams?.plan && ["essencial", "profissional", "premium"].includes(searchParams.plan)
      ? searchParams.plan
      : null

  return <LoginPageClient initialPlan={plano} />
}