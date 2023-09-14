'use client'

import ChatAlertManager from '@/components/ChatAlertManager'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  const pathname = usePathname()
  const searhParams = useSearchParams()
  const naddr = searhParams.get('naddr') || ''

  return (
    <ChatAlertManager
      naddr={naddr}
      onChange={(val) => router.push(`${pathname}?naddr=${val}`)}
    />
  )
}
