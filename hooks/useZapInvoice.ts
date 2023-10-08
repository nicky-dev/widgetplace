import { NostrContext } from '@/contexts/NostrContext'
import {
  NDKEvent,
  NDKKind,
  NostrEvent,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import { useContext, useMemo } from 'react'

export const useZapInvoice = (ev?: NDKEvent | NostrEvent) => {
  const { ndk } = useContext(NostrContext)

  const zapInvoice = useMemo(
    () =>
      zapInvoiceFromEvent(ev instanceof NDKEvent ? ev : new NDKEvent(ndk, ev)),
    [ev, ndk],
  )
  return useMemo(
    () => (ev?.kind === NDKKind.Zap ? zapInvoice : undefined),
    [ev, zapInvoice],
  )
}
