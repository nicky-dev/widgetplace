import _ from 'lodash'
import { Box, Grow } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ZapContent } from './ZapContent'
import { ChatContent } from './ChatContent'
import { NDKKind, NostrEvent } from '@nostr-dev-kit/ndk'
import { useUserProfile } from '@/hooks/useUserProfile'

let timeoutHandler: NodeJS.Timeout

export default function ChatAlert() {
  const [ev, setEvent] = useState<NostrEvent>()
  const [show, setShow] = useState(false)
  const profile = useUserProfile(ev)

  const storageHandler = useCallback((ev: StorageEvent) => {
    if (ev.key !== 'message-alert') return
    if (!ev.newValue) {
      return setShow(false)
    }
    const payload = JSON.parse(ev.newValue) as NostrEvent
    setShow(false)
    clearTimeout(timeoutHandler)
    timeoutHandler = setTimeout(() => {
      setEvent(payload)
      setShow(true)
    }, 300)
  }, [])

  useEffect(() => {
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
    }
  }, [storageHandler])

  const isZapContent = useMemo(() => ev?.kind === NDKKind.Zap, [ev])

  return (
    <Grow
      in={show && !!profile}
      style={{ transformOrigin: '0 0 0' }}
      mountOnEnter
      unmountOnExit
    >
      <Box className="absolute bottom-0 left-0 mb-3 ml-3 grid grid-cols-1">
        {isZapContent ? (
          <ZapContent ev={ev} profile={profile} />
        ) : (
          <ChatContent ev={ev} profile={profile} />
        )}
      </Box>
    </Grow>
  )
}
