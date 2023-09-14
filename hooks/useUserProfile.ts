import { NostrContext } from '@/contexts/NostrContext'
import {
  NDKEvent,
  NDKKind,
  NDKSubscriptionCacheUsage,
  NDKUserProfile,
  NostrEvent,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import { useContext, useMemo } from 'react'
import usePromise from 'react-use-promise'
import { useZapInvoice } from './useZapInvoice'

export const useUserProfile = (ev?: NostrEvent) => {
  const { ndk } = useContext(NostrContext)
  const zapInvoice = useZapInvoice(ev)

  const user = useMemo(
    () =>
      ev
        ? ndk.getUser({ hexpubkey: zapInvoice?.zappee || ev.pubkey })
        : undefined,
    [ev, ndk, zapInvoice?.zappee],
  )
  const [profile] = usePromise(async () => {
    if (!ev || !user) return
    await user.fetchProfile({
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    })
    return user.profile
  }, [ev, zapInvoice, user])

  return useMemo(() => {
    if (!profile) return
    const displayName =
      profile?.displayName || profile?.name || user?.npub.substring(0, 12)
    return {
      ...profile,
      displayName,
    } as NDKUserProfile
  }, [user, profile])
}
