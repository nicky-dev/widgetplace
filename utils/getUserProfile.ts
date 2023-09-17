import NDK, {
  NDKEvent,
  NDKSubscriptionCacheUsage,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'

export const getUserProfile = async (ndk: NDK, ev: NDKEvent) => {
  const zapInvoice = zapInvoiceFromEvent(ev)
  const pubkey = zapInvoice?.zappee || ev.pubkey
  const user = ndk.getUser({ hexpubkey: pubkey })
  if (!user.profile) {
    await user.fetchProfile({
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    })
  }
  const profile = user.profile
  const displayName =
    profile?.displayName || profile?.name || user?.npub.substring(0, 12)

  return {
    ...user.profile,
    displayName,
  }
}
