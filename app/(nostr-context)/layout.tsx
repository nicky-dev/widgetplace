import { NostrContextProvider } from '@/contexts/NostrContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <NostrContextProvider>{children}</NostrContextProvider>
}
