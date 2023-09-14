import _ from 'lodash'
import { MessagePayload } from '@/interfaces/MessagePayload'
import { Box, Grow } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ZapContent } from './ZapContent'
import { ChatContent } from './ChatContent'

let timeoutHandler: NodeJS.Timeout

export default function ChatAlert({ alwaysShow }: { alwaysShow?: boolean }) {
  const [message, setMessage] = useState<MessagePayload>()
  const [show, setShow] = useState(false)

  const storageHandler = useCallback((ev: StorageEvent) => {
    if (ev.key !== 'message-alert') return
    if (!ev.newValue) {
      return setShow(false)
    }
    const payload = JSON.parse(ev.newValue) as MessagePayload
    setShow(false)
    clearTimeout(timeoutHandler)
    timeoutHandler = setTimeout(() => {
      setMessage(payload)
      setShow(true)
    }, 300)
  }, [])

  useEffect(() => {
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
    }
  }, [storageHandler])

  const isZapContent = useMemo(() => !!message?.zapAmount, [message])

  return (
    <Grow
      in={alwaysShow || show}
      style={{ transformOrigin: '0 0 0' }}
      mountOnEnter
      unmountOnExit
    >
      <Box className="absolute bottom-0 left-0 mb-3 ml-3 grid grid-cols-1">
        {isZapContent ? (
          <ZapContent message={message} />
        ) : (
          <ChatContent message={message} />
        )}
      </Box>
    </Grow>
  )
}
