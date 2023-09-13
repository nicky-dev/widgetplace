import {
  NDKEvent,
  NDKKind,
  NDKUser,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import { useMemo } from 'react'

export const useMessagePayload = (ev: NDKEvent, user?: NDKUser) => {
  const displayName = useMemo(
    () =>
      user?.profile
        ? user?.profile?.displayName ||
          user?.profile?.name ||
          ev.author.npub.substring(0, 12)
        : '',
    [ev, user],
  )
  const image = useMemo(() => user?.profile?.image, [user])
  const zapInvoice = useMemo(
    () => (ev.kind === NDKKind.Zap ? zapInvoiceFromEvent(ev) : undefined),
    [ev],
  )

  const payload = useMemo(() => {
    if (!displayName) return
    return {
      id: ev.id,
      image,
      displayName,
      zapAmount: zapInvoice?.amount,
      content: zapInvoice?.comment || ev.content,
      tags: ev.tags,
    }
  }, [ev, displayName, image, zapInvoice])

  return payload
}
