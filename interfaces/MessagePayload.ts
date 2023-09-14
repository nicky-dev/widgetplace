import { NDKTag } from '@nostr-dev-kit/ndk'

export interface MessagePayload {
  id: string
  content: string
  displayName: string
  tags?: NDKTag[]
  zapAmount?: number
  image?: string
}
