'use client'
import { useSubscribe } from '@/hooks/useSubscribe'
import { useUserStore } from '@/hooks/useUserStore'
import {
  Avatar,
  Box,
  Card,
  CardHeader,
  CardMedia,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKUserProfile,
} from '@nostr-dev-kit/ndk'
import { FC, useMemo, useRef } from 'react'
import ReactTimeago from 'react-timeago'
import { NostrPrefix, createNostrLink } from '@snort/system'

const MILLISECONDS = 1000
const DAY_IN_MILLISECONDS = MILLISECONDS * 60 * 60 * 24
const DAY_IN_SECONDS = 60 * 60 * 24
export default function Page() {
  const liveFilter = useMemo(() => {
    return {
      kinds: [30311 as NDKKind],
      since: Math.floor(Date.now() / MILLISECONDS - 10 * DAY_IN_SECONDS),
    } as NDKFilter
  }, [])
  const endedFilter = useMemo(() => {
    return {
      kinds: [30311 as NDKKind],
      until: Math.floor(Date.now() / MILLISECONDS),
    } as NDKFilter
  }, [])
  const [liveEvent] = useSubscribe(liveFilter)
  const [endedEvent] = useSubscribe(endedFilter)

  const liveItems = useMemo(() => {
    const sorted = liveEvent
      .slice(0)
      .sort(
        (a, b) => Number(b.tagValue('starts')) - Number(a.tagValue('starts')),
      )

    const filtered = sorted.filter(
      (item, index) =>
        item.tagValue('status') === 'live' &&
        sorted.findIndex((e) => e.pubkey === item.pubkey) === index,
    )
    console.log('filtered', filtered)
    return filtered
  }, [liveEvent])

  const endedItems = useMemo(() => {
    return endedEvent
      .slice(0)
      .sort((a, b) => Number(b.tagValue('ends')) - Number(a.tagValue('ends')))
      .filter(
        (item) =>
          item.tagValue('status') === 'ended' && !!item.tagValue('recording'),
      )
      .slice(0, 500)
  }, [endedEvent])

  // const events = useMemo(() => {
  //   if (liveItems.length === 0 || endedItems.length === 0) return
  //   return liveItems.concat(endedItems)
  // }, [liveItems, endedItems])

  const users = useUserStore(liveEvent)

  const ref = useRef<HTMLDivElement | null>(null)

  return (
    <Box p={2} ref={ref} overflow={'auto'} flex={1}>
      <Typography variant="h4">Live</Typography>
      <Divider />
      {/* <Box className="grid grid-cols-4 gap-8 m-8">
        <ViewportList<NDKEvent> viewportRef={ref} items={liveItems}>
          {(item) => <CardEvent key={item.id} ev={item} users={users} />}
        </ViewportList>
      </Box> */}

      <Box className="grid grid-cols-4 gap-8 m-8">
        {liveItems.map((item) => (
          <CardEvent key={item.deduplicationKey()} ev={item} users={users} />
        ))}
      </Box>
      <Box my={8} />
      <Typography variant="h4">Ended</Typography>
      <Divider />
      {/* <ViewportList<NDKEvent> viewportRef={ref} items={endedItems}>
        {(item) => renderItem(item)}
      </ViewportList> */}

      <Box className="grid grid-cols-4 gap-8 m-8">
        {endedItems.map((item) => (
          <CardEvent key={item.deduplicationKey()} ev={item} users={users} />
        ))}
      </Box>
    </Box>
  )
}

const CardEvent: FC<{
  ev: NDKEvent
  users?: Record<string, NDKUserProfile>
}> = ({ ev, users }) => {
  const id = ev.tagValue('d') || ''
  const pubkey = ev.tagValue('p') || ev.pubkey
  const title = ev.tagValue('title')
  const summary = ev.tagValue('summary')
  const image = ev.tagValue('image')
  const starts = Number(ev.tagValue('starts') || ev.created_at)
  const isLive = ev.tagValue('status') === 'live'
  const viewers = ev.tagValue('current_participants')
  const nostrLink = useMemo(
    () =>
      createNostrLink(
        NostrPrefix.Address,
        id,
        undefined,
        ev.kind,
        ev.pubkey,
      ).encode(),
    [ev.kind, ev.pubkey, id],
  )
  const profile = users?.[pubkey]
  return (
    <Card key={id}>
      <CardMedia
        component="a"
        href={`/${nostrLink}`}
        sx={{
          backgroundImage: `url(${image})`,
          aspectRatio: '16/10',
          position: 'relative',
        }}
      >
        {isLive ? (
          <Box
            position="absolute"
            right={8}
            top={8}
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
          >
            <Paper sx={{ bgcolor: 'primary.main', px: 1, py: 0.5 }}>
              <Typography variant="body2" fontWeight="bold">
                Live
              </Typography>
            </Paper>
            {typeof viewers !== 'undefined' ? (
              <>
                <Box my={0.5} />
                <Paper sx={{ bgcolor: 'rgba(0,0,0,0.8)', px: 1, py: 0.5 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {viewers} viewers
                  </Typography>
                </Paper>
              </>
            ) : null}
          </Box>
        ) : null}
      </CardMedia>
      <CardHeader
        avatar={
          <Avatar src={profile?.image}>
            {profile?.displayName?.substring(0, 1)}
          </Avatar>
        }
        title={title}
        subheader={
          <Box component="span" display="flex" flexDirection="column">
            <Typography variant="caption">{profile?.displayName}</Typography>
            <ReactTimeago date={new Date(starts * 1000)} />
          </Box>
        }
        titleTypographyProps={{
          noWrap: true,
        }}
        subheaderTypographyProps={{
          variant: 'caption',
          noWrap: true,
        }}
        classes={{
          content: 'overflow-hidden',
        }}
      />
    </Card>
  )
}
