import { NostrContext } from '@/contexts/NostrContext'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
} from '@nostr-dev-kit/ndk'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import usePromise from 'react-use-promise'

type SubscribeResult = [NDKEvent[], () => Promise<void>]

export const useSubscribe = (
  filter: NDKFilter<NDKKind> = {},
  options?: {
    disabled?: boolean
    onStart?: (events: NDKEvent[]) => void
    onEvent?: (event: NDKEvent) => void
    onStop?: () => void
  },
) => {
  const { disabled, onStart, onEvent, onStop } = options || {}
  const { ndk } = useContext(NostrContext)
  const [sub, setSub] = useState<NDKSubscription>()
  const [items, setItems] = useState<NDKEvent[]>([])
  const eos = useRef(false)

  useEffect(() => {
    setItems([])
    if (!filter) {
      return setSub((prev) => {
        prev?.removeAllListeners()
        prev?.stop()
        return undefined
      })
    }
    eos.current = false
    const subscribe = ndk.subscribe(
      filter,
      { closeOnEose: false, cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
      undefined,
      false,
    )
    setSub((prev) => {
      prev?.removeAllListeners()
      prev?.stop()
      return subscribe
    })
  }, [ndk, filter])

  // useEffect(() => {
  //   if (sub && disabled) {
  //     sub.stop()
  //     onStop?.()
  //   }
  // }, [disabled, sub, onStop])

  useEffect(() => {
    if (disabled || !sub) return
    eos.current = false
    const items = new Map<string, NDKEvent>()
    const sortItems = (items: Map<string, NDKEvent>) => {
      return Array.from(items.values()).sort(
        (a, b) => b.created_at! - a.created_at!,
      )
    }
    const onEvent = (item: NDKEvent) => {
      const dedupKey = item.deduplicationKey()
      const existingEvent = items.get(dedupKey)
      if (existingEvent) {
        item = dedupEvent(existingEvent, item)
      }
      item.ndk = ndk
      items.set(dedupKey, item)
      if (eos.current) {
        setItems(sortItems(items))
      }
    }
    sub.on('event', onEvent)
    // sub.on('event:dup', onEvent)
    sub.once('eose', () => {
      eos.current = true
      console.log('on:eose', items)
      setItems(sortItems(items))
    })
    sub.start()
    return () => {
      sub.removeAllListeners()
      sub.stop()
      onStop?.()
    }
  }, [sub, disabled, onStart, onEvent, onStop, ndk])

  const oldestEvent = useMemo(() => items[items.length - 1], [items])

  const fetchMore = useCallback(async () => {
    if (!oldestEvent) return
    let until
    if (oldestEvent.kind !== 30311) {
      until = (oldestEvent.created_at || 0) - (oldestEvent.created_at || 0)
    } else {
      until = Number(oldestEvent.tagValue('starts') || oldestEvent.created_at)
    }
    const events = await ndk.fetchEvents({ ...filter, until })
    const items = Array.from(events).sort((a, b) => {
      if (b.kind !== 30311) {
        return (b.created_at || 0) - (a.created_at || 0)
      }
      const startsA = Number(a.tagValue('starts') || a.created_at)
      const startsB = Number(b.tagValue('starts') || b.created_at)
      return startsB - startsA
    })
    setItems(items)
  }, [ndk, filter, oldestEvent])

  return useMemo<SubscribeResult>(() => {
    return [items, fetchMore]
  }, [items, fetchMore])
}

export function dedupEvent(event1: NDKEvent, event2: NDKEvent) {
  // return the newest of the two
  if (event1.created_at! > event2.created_at!) {
    return event1
  }

  return event2
}
