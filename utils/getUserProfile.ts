import NDK, { NDKEvent, zapInvoiceFromEvent } from '@nostr-dev-kit/ndk'

export const getUserProfile = async (ndk: NDK, ev: NDKEvent) => {
  const zapInvoice = zapInvoiceFromEvent(ev)
  const pubkey = zapInvoice?.zappee || ev.pubkey
  const user = ndk.getUser({ hexpubkey: pubkey })
  if (!user.profile) {
    await user.fetchProfile()
  }
  const profile = user.profile
  const displayName =
    profile?.displayName || profile?.name || user?.npub.substring(0, 12)

  return {
    ...user.profile,
    displayName,
  }
}
