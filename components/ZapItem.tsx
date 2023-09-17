import { ElectricBolt } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'
import { NDKEvent, NDKUserProfile } from '@nostr-dev-kit/ndk'
import numeral from 'numeral'
import { useZapInvoice } from '@/hooks/useZapInvoice'
import { useMemo } from 'react'

export function ZapItem({
  ev,
  profile,
  selected,
  onClick,
}: {
  ev: NDKEvent
  profile?: NDKUserProfile
  selected?: boolean
  onClick?: (ev: NDKEvent) => void
}) {
  const rawEvent = useMemo(() => ev.rawEvent(), [ev])
  const zapInvoice = useZapInvoice(rawEvent)

  const zapAmount = useMemo(() => {
    if (!zapInvoice?.amount) return
    return numeral((zapInvoice?.amount || 0) / 1000).format('0,0.[0]a')
  }, [zapInvoice])

  return (
    <ListItem key={ev.id} dense divider>
      <ListItemAvatar>
        <Avatar src={profile?.image} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{
          className: '!flex items-center',
        }}
        primary={
          <>
            <Typography className="text-secondary-light !font-bold max-w-[320px] overflow-hidden text-ellipsis">
              {profile?.displayName}
            </Typography>
            <ElectricBolt className="text-primary-light mx-1" />
            <Typography className="text-primary-light !font-bold" mx={0.5}>
              {zapAmount}
            </Typography>
            <Box className="mx-1" />
            <Typography>sats</Typography>
          </>
        }
        secondary={<>{zapInvoice?.comment}</>}
      />
      <ListItemAvatar>
        <Button
          size="small"
          color={selected ? 'error' : 'primary'}
          variant={selected ? 'contained' : 'outlined'}
          onClick={() => onClick?.(ev)}
        >
          {selected ? 'Unselect' : 'Select'}
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}
