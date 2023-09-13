'use client'

import Content from '@/components/TextNote'
import { ElectricBolt } from '@mui/icons-material'
import { Avatar, Box, Grow, Paper, Typography } from '@mui/material'
import { NDKTag } from '@nostr-dev-kit/ndk'
import classNames from 'classnames'
import _ from 'lodash'
import numeral from 'numeral'
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface MessagePayload {
  id: string
  content: string
  displayName: string
  tags?: NDKTag[]
  zapAmount?: number
  image?: string
}

let timeoutHandler: NodeJS.Timeout

export default function Page() {
  const [message, setMessage] = useState<MessagePayload>()
  const [show, setShow] = useState(false)

  const storageHandler = useCallback(async (ev: StorageEvent) => {
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
      in={show}
      style={{ transformOrigin: '0 0 0' }}
      unmountOnExit
      mountOnEnter
    >
      <Box className="absolute bottom-3 left-3 grid grid-cols-1">
        {isZapContent ? (
          <ZapContent message={message} />
        ) : (
          <ChatContent message={message} />
        )}
      </Box>
    </Grow>
  )
}

function ZapContent({ message }: { message?: MessagePayload }) {
  const zapAmount = useMemo(() => {
    if (!message?.zapAmount) return
    return numeral((message?.zapAmount || 0) / 1000).format('0,0.[0]a')
  }, [message?.zapAmount])

  return (
    <>
      <Box className="flex z-10">
        <Paper
          className={classNames(
            'inline-flex w-auto items-center !rounded-full bg-primary-light',
          )}
          variant="elevation"
          elevation={4}
        >
          <Avatar
            src={message?.image}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'secondary.dark',
              color: 'white',
            }}
          >
            {message?.displayName.toUpperCase().slice(0, 1)}
          </Avatar>
          <Box mx={0.5} />
          <Typography className="text-secondary-light !font-bold">
            {message?.displayName}
          </Typography>
          <Box mx={0.5} />
          <ElectricBolt className="text-primary-light" />
          <Box mx={0.5} />
          <Typography className="text-primary-light !font-bold">
            {zapAmount}
          </Typography>
          <Box mx={0.5} />
          sats
          <Box mx={1} />
        </Paper>
      </Box>
      {message?.content && (
        <Box className="flex -mt-1 mx-6 overflow-hidden max-h-[6.5rem]">
          <Paper
            className="overflow-hidden !rounded-b-full !rounded-tr-full py-4 px-10"
            variant="elevation"
            elevation={4}
          >
            <Content content={message?.content} tags={message.tags} />
            {/* <Typography className="overflow-hidden text-ellipsis !max-h-full !max-w-full">
              {message?.content}
            </Typography> */}
          </Paper>
        </Box>
      )}
    </>
  )
}

function ChatContent({ message }: { message?: MessagePayload }) {
  return (
    <>
      <Box className="flex z-10">
        <Paper
          className={classNames({
            'inline-flex w-auto items-center !rounded-full': true,
          })}
          variant="elevation"
          elevation={4}
        >
          <Avatar
            src={message?.image}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'secondary.dark',
              color: 'white',
            }}
          >
            {message?.displayName.toUpperCase().slice(0, 1)}
          </Avatar>
          <Box mx={0.5} />
          <Typography className="text-secondary-light !font-bold">
            {message?.displayName}
          </Typography>
          <Box mx={1} />
        </Paper>
      </Box>
      {message?.content && (
        <Box className="flex -mt-1 mx-6 overflow-hidden max-h-[6.5rem]">
          <Paper
            className="overflow-hidden !rounded-b-full !rounded-tr-full py-4 px-10"
            variant="elevation"
            elevation={4}
          >
            <Content content={message?.content} tags={message.tags} />
            {/* <Typography className="overflow-hidden text-ellipsis !max-h-full !max-w-full">
              {message?.content}
            </Typography> */}
          </Paper>
        </Box>
      )}
    </>
  )
}
