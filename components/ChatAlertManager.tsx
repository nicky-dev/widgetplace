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
import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import usePromise from 'react-use-promise'
import _ from 'lodash'
import { ZapItem } from '@/components/ZapItem'
import { ChatItem } from '@/components/ChatItem'
import PQueue from 'p-queue'
import { getUserProfile } from '@/utils/getUserProfile'
import { useSubscribe } from '@/hooks/useSubscribe'
import { ViewportList } from 'react-viewport-list'

let timeout: NodeJS.Timeout
export default function ChatAlertManager({
  naddr = '',
  onChange,
}: {
  naddr?: string
  onChange?: (naddr: string) => void
}) {
  const { ndk } = useContext(NostrContext)

  // const [items, setItems] = useState<NDKEvent[]>([])
  const [selected, setSelected] = useState<string>()
  // const [sub, setSub] = useState<NDKSubscription>()
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

  const filter = useMemo(() => {
    if (!liveEvent || !liveEventId) return
    const since = Number(liveEvent.tagValue('starts')) || undefined
    const until = Number(liveEvent.tagValue('ends')) || undefined
    console.log('since', since, until)
    return {
      kinds: [1311 as NDKKind, NDKKind.Zap],
      '#a': [liveEventId],
      since,
      until,
    } as NDKFilter
  }, [liveEventId, liveEvent])

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

  const onStart = useCallback(
    (events: NDKEvent[]) => {
      queue.addAll(
        events.map((ev, i, all) => () => {
          const item = all[all.length - i - 1]
          return pushMessage(item)
        }),
      )
    },
    [queue, pushMessage],
  )

  const onEvent = useCallback(
    (event: NDKEvent) => queue.add(() => pushMessage(event)),
    [queue, pushMessage],
  )

  const [items] = useSubscribe(filter, {
    disabled: !filter,
    onStart,
    onEvent,
  })

  const initQueue = useCallback(
    (id: string) => {
      queue.clear()
      const reverseItems = items.slice(0).reverse()
      let index = id ? reverseItems.findIndex((item) => item.id === id) : 0
      if (index < reverseItems.length - 1) {
        index += 1
      }
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

  const renderListItem = useCallback(
    (item: NDKEvent) => {
      const isSelected = selected === item.id
      if (item.kind === 1311) {
        return (
          <ChatItem
            key={item.id}
            ev={item}
            selected={isSelected}
            onClick={handleSelect}
          />
        )
      } else if (item.kind === NDKKind.Zap) {
        return (
          <ZapItem
            key={item.id}
            ev={item}
            selected={isSelected}
            onClick={handleSelect}
          />
        )
      }
    },
    [selected, handleSelect],
  )

  useEffect(() => {
    queue.off('next')
    queue.off('empty')

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

    return () => {
      queue.off('next')
      queue.off('empty')
    }
  }, [autoPlayDuration, queue, clearMessage])

  const handleSetAutoplayDuration = useMemo(
    () =>
      _.debounce((value: number) => {
        setAutoPlayDuration(value)
      }, 300),
    [],
  )
  const ref = useRef<HTMLUListElement | null>(null)

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
      {!!items.length && (
        <List ref={ref} className="overflow-auto">
          <ViewportList viewportRef={ref} items={items}>
            {renderListItem}
          </ViewportList>
        </List>
      )}
    </>
  )
}
