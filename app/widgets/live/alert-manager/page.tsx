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

export default function Page() {
  const { ndk } = useContext(NostrContext)
  const [items, setItems] = useState<NDKEvent[]>([])
  const [selected, setSelected] = useState<string>()
  const pathname = usePathname()
  const naddr = useSearchParams().get('naddr')
  const router = useRouter()
  const [sub, setSub] = useState<NDKSubscription>()

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
      if (item.pubkey === hostId) return
      if (item.pubkey === authorId) return
      if (events.has(item)) return
      events.add(item)
      setItems((prev) =>
        [...prev, item].sort(
          (a, b) => (b.created_at || 0) - (a.created_at || 0),
        ),
      )
    })
    sub.start()
    return () => {
      sub.stop()
    }
  }, [sub, liveEvent])

  const selectHandler = useCallback((payload: MessagePayload) => {
    localStorage.setItem('message-alert', JSON.stringify(payload))
  }, [])

  const list = useMemo(() => {
    return items.map((item) => {
      if (item.kind === 1311) {
        return <ChatItem key={item.id} ev={item} onClick={selectHandler} />
      } else if (item.kind === 9735) {
        return <ZapItem key={item.id} ev={item} onClick={selectHandler} />
      }
    })
  }, [items, selectHandler])

  return (
    <>
      <Box
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
      </Box>
      <List>{list}</List>
    </>
  )
}

function ZapItem({
  ev,
  onClick,
}: {
  ev: NDKEvent
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
          size="small"
          variant="outlined"
          onClick={() =>
            onClick?.({
              image,
              displayName,
              zapAmount: zapInvoice?.amount,
              content: zapInvoice?.comment || '',
              tags: ev.tags,
            })
          }
        >
          Select
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}

function ChatItem({
  ev,
  onClick,
}: {
  ev: NDKEvent
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
          size="small"
          variant="outlined"
          onClick={() =>
            onClick?.({
              image,
              displayName,
              content: ev.content,
              tags: ev.tags,
            })
          }
        >
          Select
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}
