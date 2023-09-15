import _ from 'lodash'
import { Box, Grow } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ZapContent } from './ZapContent'
import { ChatContent } from './ChatContent'
import { NDKKind, NDKUserProfile, NostrEvent } from '@nostr-dev-kit/ndk'

let timeoutHandler: NodeJS.Timeout

interface Payload {
  event: NostrEvent
  profile: NDKUserProfile
}
export default function ChatAlert() {
  const [payload, setPayload] = useState<Payload>()
  const [show, setShow] = useState(false)

  const storageHandler = useCallback((ev: StorageEvent) => {
    if (ev.key !== 'message-alert') return
    if (!ev.newValue) {
      return setShow(false)
    }
    const payload = JSON.parse(ev.newValue) as Payload
    setShow(false)
    clearTimeout(timeoutHandler)
    timeoutHandler = setTimeout(() => {
      setPayload(payload)
      setShow(true)
    }, 300)
  }, [])

  useEffect(() => {
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
    }
  }, [storageHandler])

  const isZapContent = useMemo(
    () => payload?.event?.kind === NDKKind.Zap,
    [payload?.event],
  )

  return (
    <Grow
      in={show}
      style={{ transformOrigin: '0 0 0' }}
      mountOnEnter
      unmountOnExit
    >
      <Box className="absolute bottom-0 left-0 mb-3 ml-3 grid grid-cols-1">
        {isZapContent ? (
          <ZapContent event={payload?.event} profile={payload?.profile} />
        ) : (
          <ChatContent event={payload?.event} profile={payload?.profile} />
        )}
      </Box>
    </Grow>
  )
}
