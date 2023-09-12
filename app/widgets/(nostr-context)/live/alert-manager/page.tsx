'use client'

import { NostrContext } from '@/contexts/NostrContext'
import { ElectricBolt } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import {
  NDKEvent,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
  zapInvoiceFromEvent,
} from '@nostr-dev-kit/ndk'
import numeral from 'numeral'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import usePromise from 'react-use-promise'
import { MessagePayload } from '@/app/widgets/live/alert/page'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import PQueue from 'p-queue'

export default function Page() {
  const { ndk } = useContext(NostrContext)

  const router = useRouter()
  const pathname = usePathname()
  const searhParams = useSearchParams()
  const naddr = searhParams.get('naddr')

  const [controllers, setControllers] = useState<
    { id: string; controller: AbortController }[]
  >([])
  const [items, setItems] = useState<NDKEvent[]>([])
  const [selecteds, setSelecteds] = useState<string[]>([])
  const [sub, setSub] = useState<NDKSubscription>()
  const [started, setStarted] = useState(false)
  const queue = useMemo(() => new PQueue({ concurrency: 1 }), [])

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

  useEffect(() => {
    if (!liveEventId) {
      setItems([])
      return setSub((prev) => {
        prev?.stop()
        return undefined
      })
    }
    const subscribe = ndk.subscribe(
      {
        kinds: [1311 as NDKKind, NDKKind.Zap],
        '#a': [liveEventId],
        limit: 50,
      },
      { closeOnEose: false, cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
      undefined,
      false,
    )
    setSub((prev) => {
      prev?.stop()
      return subscribe
    })
  }, [ndk, liveEventId])

  useEffect(() => {
    if (!sub || !liveEvent) return
    const authorId = liveEvent.author.hexpubkey()
    const hostId = liveEvent.tagValue('p')
    const events = new Set<NDKEvent>()
    sub.on('event', (item: NDKEvent) => {
      //if (item.pubkey === hostId) return
      //if (item.pubkey === authorId) return
      if (events.has(item)) return
      events.add(item)
      setItems((prev) =>
        [...prev, item].sort(
          (a, b) => (a.created_at || 0) - (b.created_at || 0),
        ),
      )
    })
    sub.start()
    return () => {
      sub.stop()
    }
  }, [sub, liveEvent])

  const messageAlert = useCallback(
    (signal?: AbortSignal) => (payload: MessagePayload) => {
      return new Promise((resolve, reject) => {
        localStorage.setItem('message-alert', JSON.stringify(payload))
        let timeout = setTimeout(() => {
          setControllers((prevControllers) => {
            return prevControllers.filter((con) => payload.id !== con.id)
          })
          resolve('OK')
        }, 5000)
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout)
          resolve('ABORT')
        })
      })
    },
    [],
  )

  const clearMessage = useCallback(() => {
    localStorage.removeItem('message-alert')
    setControllers([])
    queue.clear()
  }, [queue])

  const handleSelect = useCallback(
    (payload: MessagePayload) => {
      setSelecteds((prev) => {
        if (!prev.includes(payload.id)) {
          const controller = new AbortController()
          // setControllers((prevControllers) => {
          //   return [...prevControllers, { id: payload.id, controller }]
          // })
          setControllers((prevControllers) => {
            prevControllers.forEach((con) => con.controller.abort())
            return [{ id: payload.id, controller }]
          })
          queue.add(({ signal }) => messageAlert(signal)(payload), {
            signal: controller.signal,
          })
          return [payload.id]
        } else {
          setControllers((prevControllers) => {
            return prevControllers.filter((con) => {
              if (payload.id !== con.id) return true
              con.controller.abort()
            })
          })
          return []
        }
      })
    },
    [queue, messageAlert],
  )

  const handleAutoPlay = useCallback(
    (payload: MessagePayload) => {
      setControllers((prev) => {
        const con = prev.find((con) => con.id === payload.id)
        if (con) {
          con.controller.abort()
        }
        const controller = new AbortController()
        queue.add(({ signal }) => messageAlert(signal)(payload), {
          signal: controller.signal,
        })
        return [
          ...prev.filter((p) => p.id !== payload.id),
          { id: payload.id, controller },
        ]
      })
    },
    [queue, messageAlert],
  )

  const list = useMemo(() => {
    let autoplayIndex = selecteds.length > 0 ? items.length : -1
    return items.map((item, i) => {
      const selected = selecteds.includes(item.id)
      if (selecteds.length > 0 && selected) {
        autoplayIndex = i
      }
      if (item.kind === 1311) {
        return (
          <ChatItem
            key={item.id}
            ev={item}
            autoplay={started && i >= autoplayIndex}
            selected={selected}
            onClick={handleSelect}
            onAutoPlay={handleAutoPlay}
          />
        )
      } else if (item.kind === 9735) {
        return (
          <ZapItem
            key={item.id}
            ev={item}
            autoplay={started && i >= autoplayIndex}
            selected={selected}
            onClick={handleSelect}
            onAutoPlay={handleAutoPlay}
          />
        )
      }
    })
  }, [selecteds, items, handleSelect, handleAutoPlay, started])

  useEffect(() => {
    queue.on('empty', () => {
      clearMessage()
    })
    queue.on('error', (...args) => {
      console.log('error', args)
    })
    queue.on('next', (...args) => {
      console.log('next', args)
    })
  }, [queue, clearMessage])

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
          className="self-center !rounded-3xl"
          color={started ? 'error' : 'secondary'}
          onClick={() => {
            //clearMessage()
            queue.clear()
            setControllers([])
            setStarted((prev) => !prev)
          }}
        >
          {started ? 'Stop' : 'Start'}
        </Button>
        <Box mx={0.5} />
      </Box>
      <List>{list}</List>
    </>
  )
}

function ZapItem({
  ev,
  selected,
  autoplay,
  onAutoPlay,
  onClick,
}: {
  ev: NDKEvent
  selected?: boolean
  autoplay?: boolean
  onAutoPlay?: (payload: MessagePayload) => void
  onClick?: (payload: MessagePayload) => void
}) {
  const { ndk } = useContext(NostrContext)
  const [profile, error, state] = usePromise(async () => {
    let pubkey = ev.pubkey
    if (ev.kind === NDKKind.Zap) {
      const zapInvoice = zapInvoiceFromEvent(ev)
      pubkey = zapInvoice!.zappee
    }
    const user = ndk.getUser({
      hexpubkey: pubkey,
    })
    await user.fetchProfile({
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    })
    return user.profile
  }, [ndk, ev])

  const displayName = useMemo(
    () =>
      profile
        ? profile?.displayName ||
          profile?.name ||
          ev.author.npub.substring(0, 12)
        : '',
    [ev, profile],
  )
  const image = useMemo(() => profile?.image, [profile])
  const zapInvoice = useMemo(() => zapInvoiceFromEvent(ev), [ev])

  const payload = useMemo(
    () =>
      displayName
        ? {
            id: ev.id,
            image,
            displayName,
            zapAmount: zapInvoice?.amount,
            content: zapInvoice?.comment || '',
            tags: ev.tags,
          }
        : undefined,
    [ev, displayName, image, zapInvoice],
  )

  useEffect(() => {
    if (!autoplay || !payload) return
    onAutoPlay?.(payload)
  }, [onAutoPlay, autoplay, payload])

  return (
    <ListItem key={ev.id} dense divider className="bg-primary-dark">
      <ListItemAvatar>
        <Avatar src={image} />
      </ListItemAvatar>
      <ElectricBolt className="" />
      <ListItemText
        primaryTypographyProps={{
          className: '!flex items-center',
        }}
        primary={
          <>
            <Typography className="text-primary-light !font-bold">
              {displayName}
            </Typography>
            <Box mx={0.5} />
            zapped
            <Typography className="text-primary-light !font-bold" mx={0.5}>
              {numeral((zapInvoice?.amount || 0) / 1000).format('0,0.[0]a')}
            </Typography>
            sats
          </>
        }
        secondary={<>{zapInvoice?.comment}</>}
      />
      <ListItemAvatar>
        <Button
          disabled={state !== 'resolved'}
          size="small"
          color={selected ? 'error' : 'primary'}
          variant={selected ? 'contained' : 'outlined'}
          onClick={() => payload && onClick?.(payload)}
        >
          {selected ? 'Unselect' : 'Select'}
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}

function ChatItem({
  ev,
  selected,
  autoplay,
  onAutoPlay,
  onClick,
}: {
  ev: NDKEvent
  selected?: boolean
  autoplay?: boolean
  onAutoPlay?: (payload: MessagePayload) => void
  onClick?: (payload: MessagePayload) => void
}) {
  const { ndk } = useContext(NostrContext)
  const [user, error, state] = usePromise(async () => {
    const user = ndk.getUser({
      hexpubkey: ev.pubkey,
    })
    await user.fetchProfile({
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    })
    return user
  }, [ndk, ev])

  const displayName = useMemo(
    () =>
      user?.profile
        ? user?.profile?.displayName ||
          user?.profile?.name ||
          ev.author.npub.substring(0, 12)
        : '',
    [ev, user],
  )
  const image = useMemo(() => user?.profile?.image, [user])
  const payload = useMemo(
    () =>
      displayName
        ? {
            id: ev.id,
            image,
            displayName,
            content: ev.content,
            tags: ev.tags,
          }
        : undefined,
    [ev, displayName, image],
  )

  useEffect(() => {
    if (!autoplay || !payload) return
    onAutoPlay?.(payload)
  }, [onAutoPlay, autoplay, payload])

  return (
    <ListItem key={ev.id} dense divider>
      <ListItemAvatar>
        <Avatar src={image} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{
          className: '!font-bold',
        }}
        secondaryTypographyProps={{
          className: 'overflow-hidden text-ellipsis',
        }}
        className="text-secondary-light"
        primary={displayName}
        secondary={ev.content}
      />
      <ListItemAvatar>
        <Button
          disabled={state !== 'resolved'}
          size="small"
          color={selected ? 'error' : 'primary'}
          variant={selected ? 'contained' : 'outlined'}
          onClick={() => payload && onClick?.(payload)}
        >
          {selected ? 'Unselect' : 'Select'}
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}
