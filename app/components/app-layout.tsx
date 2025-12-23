type AppLayoutProps = {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  )
}
