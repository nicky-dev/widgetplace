import { NostrContext } from '@/contexts/NostrContext'
import {
  NDKEvent,
  NDKKind,
  NostrEvent,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import { useContext, useMemo } from 'react'

export const useZapInvoice = (ev?: NostrEvent) => {
  const { ndk } = useContext(NostrContext)
  return useMemo(
    () =>
      ev?.kind === NDKKind.Zap
        ? zapInvoiceFromEvent(new NDKEvent(ndk, ev))
        : undefined,
    [ndk, ev],
  )
}
