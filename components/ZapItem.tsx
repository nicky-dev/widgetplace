import { MessagePayload } from '@/app/widgets/live/alert'
import { useMessagePayload } from '@/hooks/useMessagePayload'
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
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk'
import numeral from 'numeral'

export function ZapItem({
  ev,
  user,
  selected,
  onClick,
}: {
  ev: NDKEvent
  user?: NDKUser
  selected?: boolean
  onClick?: (payload: MessagePayload) => void
}) {
  const payload = useMessagePayload(ev, user)

  return (
    <ListItem key={ev.id} dense divider>
      <ListItemAvatar>
        <Avatar src={payload?.image} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{
          className: '!flex items-center',
        }}
        primary={
          <>
            <Typography className="text-secondary-light !font-bold">
              {payload?.displayName}
            </Typography>
            <ElectricBolt className="text-primary-light mx-1" />
            <Typography className="text-primary-light !font-bold" mx={0.5}>
              {numeral((payload?.zapAmount || 0) / 1000).format('0,0.[0]a')}
            </Typography>
            <Box className="mx-1" />
            <Typography>sats</Typography>
          </>
        }
        secondary={<>{payload?.content}</>}
      />
      <ListItemAvatar>
        <Button
          disabled={!user}
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
