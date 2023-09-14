import { MessagePayload } from '@/app/widgets/live/alert'
import { useMessagePayload } from '@/hooks/useMessagePayload'
import {
  Avatar,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk'

export function ChatItem({
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
          className: '!font-bold',
        }}
        secondaryTypographyProps={{
          className: 'overflow-hidden text-ellipsis',
        }}
        className="text-secondary-light"
        primary={payload?.displayName}
        secondary={ev.content}
      />
      <ListItemAvatar>
        <Button
          disabled={!user}
          size="small"
          color={selected ? 'error' : 'secondary'}
          variant={selected ? 'contained' : 'outlined'}
          onClick={() => payload && onClick?.(payload)}
        >
          {selected ? 'Unselect' : 'Select'}
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}
