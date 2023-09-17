import { NDKEvent, zapInvoiceFromEvent } from '@nostr-dev-kit/ndk'

export const getPubkeyFromEvent = (ev: NDKEvent) => {
  const zapInvoice = zapInvoiceFromEvent(ev)
  return zapInvoice?.zappee || ev.pubkey
}
