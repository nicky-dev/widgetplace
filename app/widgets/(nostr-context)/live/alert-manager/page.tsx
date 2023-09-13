'use client'

import { NostrContext } from '@/contexts/NostrContext'
import { Box, Button, List, Slider, TextField, Typography } from '@mui/material'
import {
  NDKEvent,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import usePromise from 'react-use-promise'
import { MessagePayload } from '@/app/widgets/live/alert/page'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import _ from 'lodash'
import { useUserStore } from '@/hooks/useUserStore'
import { ZapItem } from '@/components/ZapItem'
import { ChatItem } from '@/components/ChatItem'

let timeout: NodeJS.Timeout
export default function Page() {
  const { ndk } = useContext(NostrContext)

  const router = useRouter()
  const pathname = usePathname()
  const searhParams = useSearchParams()
  const naddr = searhParams.get('naddr')

  const [items, setItems] = useState<NDKEvent[]>([])
  const [selecteds, setSelecteds] = useState<string[]>([])
  const [sub, setSub] = useState<NDKSubscription>()
  const [started, setStarted] = useState(true)
  const [messages, setMessages] = useState<MessagePayload[]>([])
  const [sliderValue, setSliderValue] = useState(5)
  const [autoPlayDuration, setAutoPlayDuration] = useState(5)
  const [startId, setStartId] = useState<string>()

  const [liveEvent, _le, liveEventState] = usePromise(async () => {
    if (!naddr) return
    return ndk.fetchEvent(naddr)
  }, [naddr, ndk])

  const liveEventId = useMemo(
    () =>
      liveEvent
        ? `${liveEvent.kind}:${liveEvent.pubkey}:${liveEvent.tagValue('d')}`
        : undefined,
    [liveEvent],
  )

  const [events, eventError, eventState] = usePromise(async () => {
    if (!liveEvent || !liveEventId) return [] as NDKEvent[]
    const items = await ndk.fetchEvents({
      kinds: [1311 as NDKKind, NDKKind.Zap],
      '#a': [liveEventId],
    })
    const authorId = liveEvent.author.hexpubkey()
    const hostId = liveEvent.tagValue('p')
    return Array.from(items)
      .filter((item) => {
        if (item.kind === NDKKind.Zap) {
          const zapInvoice = zapInvoiceFromEvent(item)
          if (hostId === zapInvoice!.zappee) return true
        } else if (item.pubkey !== hostId && item.pubkey !== authorId) {
          return true
        }
      })
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  }, [ndk, liveEvent, liveEventId])

  useEffect(() => {
    if (!liveEventId || eventState !== 'resolved') {
      setItems([])
      return setSub((prev) => {
        prev?.stop()
        return undefined
      })
    }
    setStartId(events[0]?.id)
    setItems(events)
    const subscribe = ndk.subscribe(
      {
        kinds: [1311 as NDKKind, NDKKind.Zap],
        '#a': [liveEventId],
        since: Math.round(Date.now() / 1000),
      },
      { closeOnEose: false, cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
      undefined,
      false,
    )
    setSub((prev) => {
      prev?.stop()
      return subscribe
    })
  }, [ndk, eventState, events, liveEventId])

  useEffect(() => {
    if (!sub || !liveEvent || eventState !== 'resolved') return
    const authorId = liveEvent.author.hexpubkey()
    const hostId = liveEvent.tagValue('p')
    const items = new Set<NDKEvent>(events)
    sub.on('event', (item: NDKEvent) => {
      if (item.pubkey === hostId) return
      if (item.pubkey === authorId) return
      if (item.kind === NDKKind.Zap) {
        const zapInvoice = zapInvoiceFromEvent(item)
        if (hostId === zapInvoice!.zappee) return
      }
      if (items.has(item)) return
      items.add(item)
      setItems((prev) =>
        [...prev, item]
          .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
          .slice(0, 100),
      )
    })
    sub.start()
    return () => {
      sub.stop()
    }
  }, [sub, liveEvent, eventState, events])

  const messageAlert = useCallback((payload: MessagePayload) => {
    localStorage.setItem('message-alert', JSON.stringify(payload))
  }, [])

  const clearMessage = useCallback(() => {
    localStorage.removeItem('message-alert')
  }, [])

  const handleSelect = useCallback(
    (payload: MessagePayload) => {
      clearTimeout(timeout)
      setStartId(payload.id)
      setSelecteds((prev) => {
        if (!prev.includes(payload.id)) {
          messageAlert(payload)
          return [payload.id]
        } else {
          clearMessage()
          return []
        }
      })
    },
    [messageAlert, clearMessage],
  )

  const [users, usersError, usersState] = useUserStore(items)

  const list = useMemo(() => {
    return items.map((item, i) => {
      const selected = selecteds.includes(item.id)
      if (item.kind === 1311) {
        return (
          <ChatItem
            key={item.id}
            ev={item}
            user={users?.[item.pubkey]}
            selected={selected}
            onClick={handleSelect}
          />
        )
      } else if (item.kind === NDKKind.Zap) {
        const zapInvoice = zapInvoiceFromEvent(item)
        const pubkey = zapInvoice!.zappee
        return (
          <ZapItem
            key={item.id}
            ev={item}
            user={users?.[pubkey]}
            selected={selected}
            onClick={handleSelect}
          />
        )
      }
    })
  }, [selecteds, items, users, handleSelect])

  useEffect(() => {
    if (!started || !items.length || usersState !== 'resolved') return
    const messages = items.map((_, i, all) => {
      const ev = all[all.length - i - 1]
      let user = users[ev.pubkey]
      if (ev.kind === NDKKind.Zap) {
        const zapInvoice = zapInvoiceFromEvent(ev)
        const pubkey = zapInvoice!.zappee
        user = users[pubkey]
      }
      const displayName = user?.profile
        ? user?.profile?.displayName ||
          user?.profile?.name ||
          ev.author.npub.substring(0, 12)
        : ''
      const image = user?.profile?.image
      const zapInvoice =
        ev.kind === NDKKind.Zap ? zapInvoiceFromEvent(ev) : undefined
      return {
        id: ev.id,
        image,
        displayName,
        zapAmount: zapInvoice?.amount,
        content: zapInvoice?.comment || ev.content,
        tags: ev.tags,
      }
    })
    setMessages(messages)
  }, [items, started, users, usersState])

  useEffect(() => {
    clearInterval(timeout)
    if (!started || !messages.length) return
    let index = startId ? messages.findIndex((msg) => msg.id === startId) : 0
    if (!messages[index]) return
    messageAlert(messages[index])
    setSelecteds([messages[index].id])
    timeout = setInterval(() => {
      index += 1
      if (!messages[index]) {
        clearInterval(timeout)
        setStartId(messages[messages.length - 1].id)
        return
      }
      messageAlert(messages[index])
      setSelecteds([messages[index].id])
    }, autoPlayDuration * 1000)
  }, [autoPlayDuration, startId, started, messages, messageAlert])

  const handleSetAutoplayDuration = useMemo(
    () =>
      _.debounce((value: number) => {
        setAutoPlayDuration(value)
      }, 300),
    [],
  )
  return (
    <>
      <Box
        display="flex"
        component={'form'}
        onSubmit={(evt) => {
          evt.preventDefault()
          const naddr = evt.currentTarget['naddr'].value
          if (!naddr) return
          router.push(`${pathname}?naddr=${naddr}`)
        }}
      >
        <TextField
          fullWidth
          defaultValue={naddr}
          name="naddr"
          placeholder="naddr..."
          margin="dense"
          size="small"
        />
        <Box mx={0.5} />
        <Button
          variant="contained"
          className="self-center !rounded-3xl !min-w-[128px]"
          color={started ? 'error' : 'secondary'}
          disabled={!items.length}
          onClick={() => {
            setStarted((prev) => {
              setSelecteds([])
              clearMessage()
              return !prev
            })
          }}
        >
          {started ? 'Stop' : 'Start Autoplay'}
        </Button>
        <Box mx={0.5} />
      </Box>
      <Box mx={2} mt={2}>
        <Box display="flex">
          <Typography>Alert duration</Typography>
          <Box flex={1} />
          <Typography>{sliderValue} seconds</Typography>
        </Box>
        <Box mx={2}>
          <Slider
            defaultValue={5}
            max={15}
            min={3}
            onChange={(_e, value) => {
              if (typeof value !== 'number') return
              setSliderValue(value)
              handleSetAutoplayDuration(value)
            }}
          />
        </Box>
      </Box>
      <List>{list}</List>
    </>
  )
}
