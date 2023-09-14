import { MessagePayload } from '@/interfaces/MessagePayload'
import { useMessagePayload } from '@/hooks/useMessagePayload'
import {
  Avatar,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import { NDKEvent, NDKUser, NostrEvent } from '@nostr-dev-kit/ndk'

export function ChatItem({
  ev,
  user,
  selected,
  onClick,
}: {
  ev: NDKEvent
  user?: NDKUser
  selected?: boolean
  onClick?: (payload: NDKEvent) => void
}) {
  const payload = useMessagePayload(ev, user)

  return (
    <ListItem key={ev.id} dense divider>
      <ListItemAvatar>
        <Avatar src={payload?.image} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{
          className: '!font-bold max-w-[464px] overflow-hidden text-ellipsis',
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
          size="small"
          color={selected ? 'error' : 'secondary'}
          variant={selected ? 'contained' : 'outlined'}
          onClick={() => onClick?.(ev)}
        >
          {selected ? 'Unselect' : 'Select'}
        </Button>
      </ListItemAvatar>
    </ListItem>
  )
}
