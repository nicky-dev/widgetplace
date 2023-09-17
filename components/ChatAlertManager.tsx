'use client'

import { NostrContext } from '@/contexts/NostrContext'
import {
  Box,
  Button,
  List,
  Paper,
  Slider,
  TextField,
  Typography,
} from '@mui/material'
import {
  NDKEvent,
  NDKKind,
  NDKSubscription,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import usePromise from 'react-use-promise'
import _ from 'lodash'
import { useUserStore } from '@/hooks/useUserStore'
import { ZapItem } from '@/components/ZapItem'
import { ChatItem } from '@/components/ChatItem'
import PQueue from 'p-queue'
import { getUserProfile } from '@/utils/getUserProfile'

let timeout: NodeJS.Timeout
export default function ChatAlertManager({
  naddr = '',
  onChange,
}: {
  naddr?: string
  onChange?: (naddr: string) => void
}) {
  const { ndk } = useContext(NostrContext)

  const [items, setItems] = useState<NDKEvent[]>([])
  const [selected, setSelected] = useState<string>()
  const [sub, setSub] = useState<NDKSubscription>()
  const [started, setStarted] = useState(false)
  const [sliderValue, setSliderValue] = useState(5)
  const [autoPlayDuration, setAutoPlayDuration] = useState(5)
  const [naddrText, setNaddrText] = useState(naddr)

  const queue = useMemo(
    () => new PQueue({ concurrency: 1, autoStart: false }),
    [],
  )

  const handleToggleAutoplay = useCallback(
    (force?: boolean) => {
      clearTimeout(timeout)
      setStarted((prev) => {
        const started = force ?? !prev
        if (started) {
          queue.start()
        } else if (!queue.isPaused) {
          queue.pause()
        }
        return started
      })
    },
    [queue],
  )

  const [liveEvent, _le, liveEventState] = usePromise(async () => {
    if (!naddrText) return
    const event = await ndk.fetchEvent(naddrText)
    return event
  }, [naddrText, ndk])

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
    // const authorId = liveEvent.author.hexpubkey()
    // const hostId = liveEvent.tagValue('p')
    return (
      Array.from(items)
        // .filter((item) => {
        //   // if (item.kind === NDKKind.Zap) {
        //   //   const zapInvoice = zapInvoiceFromEvent(item)
        //   //   if (hostId !== zapInvoice!.zappee) {
        //   //     return true
        //   //   }
        //   // } else
        //   if (item.pubkey !== hostId && item.pubkey !== authorId) {
        //     return true
        //   }
        // })
        .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    )
  }, [ndk, liveEvent, liveEventId])

  useEffect(() => {
    if (!liveEventId || eventState !== 'resolved') {
      handleToggleAutoplay(false)
      queue.clear()
      setItems([])
      return setSub((prev) => {
        prev?.stop()
        return undefined
      })
    }
    setItems(events)
    const subscribe = ndk.subscribe(
      {
        kinds: [1311 as NDKKind, NDKKind.Zap],
        '#a': [liveEventId],
        since: Math.round(Date.now() / 1000),
      },
      { closeOnEose: false },
      undefined,
      false,
    )
    setSub((prev) => {
      prev?.stop()
      return subscribe
    })
  }, [ndk, eventState, events, liveEventId, handleToggleAutoplay, queue])

  const pushMessage = useCallback(
    async (ev: NDKEvent) => {
      setSelected(ev.id)
      const profile = await getUserProfile(ndk, ev)
      const newValue = JSON.stringify({
        event: ev.rawEvent(),
        profile,
      })
      const oldValue = localStorage.getItem('message-alert')
      localStorage.setItem('message-alert', newValue)
      const e = new StorageEvent('storage', {
        storageArea: window.localStorage,
        key: 'message-alert',
        oldValue,
        newValue: newValue,
        url: window.location.href,
      })
      window.dispatchEvent(e)
      queue.pause()
    },
    [queue, ndk],
  )

  useEffect(() => {
    if (!sub || !liveEvent || eventState !== 'resolved') return
    // const authorId = liveEvent.author.hexpubkey()
    // const hostId = liveEvent.tagValue('p')
    const items = new Set<NDKEvent>(events)
    queue.addAll(
      events.map((ev, i, all) => () => {
        const item = all[all.length - i - 1]
        return pushMessage(item)
      }),
    )
    sub.on('event', (item: NDKEvent) => {
      // if (item.pubkey === hostId) return
      // if (item.pubkey === authorId) return
      // // if (item.kind === NDKKind.Zap) {
      // //   const zapInvoice = zapInvoiceFromEvent(item)
      // //   if (hostId === zapInvoice!.zappee) return
      // // }
      if (items.has(item)) return
      items.add(item)
      queue.add(() => pushMessage(item))
      setItems((prev) => [item, ...prev].slice(0, 10000))
    })
    sub.start()
    return () => {
      sub.stop()
    }
  }, [sub, liveEvent, eventState, events, queue, pushMessage])

  const initQueue = useCallback(
    (id: string) => {
      queue.clear()
      const reverseItems = items.slice(0).reverse()
      const index = id ? reverseItems.findIndex((item) => item.id === id) : 0
      queue.addAll(
        reverseItems.slice(index).map((ev, i, all) => () => pushMessage(ev)),
      )
    },
    [queue, items, pushMessage],
  )

  const clearMessage = useCallback(() => {
    setSelected(undefined)
    const oldValue = localStorage.getItem('message-alert')
    localStorage.removeItem('message-alert')
    const e = new StorageEvent('storage', {
      storageArea: window.localStorage,
      key: 'message-alert',
      oldValue,
      newValue: null,
      url: window.location.href,
    })
    window.dispatchEvent(e)
  }, [])

  const users = useUserStore(items)

  const handleSelect = useCallback(
    (ev: NDKEvent) => {
      clearTimeout(timeout)
      setStarted(false)
      if (selected !== ev.id) {
        pushMessage(ev)
      } else {
        clearMessage()
      }
      initQueue(ev.id)
    },
    [initQueue, selected, pushMessage, clearMessage],
  )

  const list = useMemo(() => {
    return items.map((item, i) => {
      const isSelected = selected === item.id
      if (item.kind === 1311) {
        return (
          <ChatItem
            key={item.id}
            ev={item}
            profile={users?.[item.pubkey]}
            selected={isSelected}
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
            profile={users?.[pubkey]}
            selected={isSelected}
            onClick={handleSelect}
          />
        )
      }
    })
  }, [selected, items, users, handleSelect])

  useEffect(() => {
    queue.on('next', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        queue.start()
      }, autoPlayDuration * 1000)
    })
    queue.on('empty', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        clearMessage()
      }, autoPlayDuration * 1000)
    })
  }, [autoPlayDuration, queue, clearMessage])

  const handleSetAutoplayDuration = useMemo(
    () =>
      _.debounce((value: number) => {
        setAutoPlayDuration(value)
      }, 300),
    [],
  )
  return (
    <>
      <Paper
        square
        component="form"
        onSubmit={(evt) => {
          evt.preventDefault()
          const val = evt.currentTarget['naddr'].value
          onChange?.(val)
          setNaddrText(val)
        }}
        className="sticky top-0 z-10 pt-4"
        elevation={2}
      >
        <Box display="flex" mx={2.5}>
          <TextField
            fullWidth
            defaultValue={naddr}
            label="Nostr Address"
            name="naddr"
            placeholder="naddr..."
            margin="dense"
            size="small"
            autoComplete="off"
          />
          <Box mx={0.5} />
          <Button
            variant="contained"
            className="self-center !rounded-3xl !min-w-[128px]"
            color={started ? 'error' : 'secondary'}
            disabled={!liveEvent}
            onClick={() => handleToggleAutoplay()}
          >
            {started ? 'Stop' : 'Start Autoplay'}
          </Button>
        </Box>
        <Box mx={3} mt={2} display="flex" flexDirection="column">
          <Box display="flex">
            <Typography>Alert duration</Typography>
            <Box flex={1} />
            <Typography>{sliderValue} seconds</Typography>
          </Box>
          <Box>
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
      </Paper>
      <List>{list}</List>
    </>
  )
}
