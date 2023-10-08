import { NostrContext } from '@/contexts/NostrContext'
import {
  NDKEvent,
  NDKSubscriptionCacheUsage,
  NDKUser,
  NDKUserProfile,
  NostrEvent,
} from '@nostr-dev-kit/ndk'
import { useContext, useMemo } from 'react'
import usePromise from 'react-use-promise'
import { useZapInvoice } from './useZapInvoice'

const users: Record<string, NDKUser> = {}
export const useUserProfile = (ev?: NDKEvent | NostrEvent) => {
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
    if (!users[user.npub]) {
      users[user.npub] = user
    }
    if (users[user.npub].profile?.name) {
      return users[user.npub].profile
    }
    await users[user.npub].fetchProfile({
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    })
    return users[user.npub].profile
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
