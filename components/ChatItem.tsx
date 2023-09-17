import {
  Avatar,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import { NDKEvent, NDKUserProfile } from '@nostr-dev-kit/ndk'

export function ChatItem({
  ev,
  profile,
  selected,
  onClick,
}: {
  ev: NDKEvent
  profile?: NDKUserProfile
  selected?: boolean
  onClick?: (payload: NDKEvent) => void
}) {
  return (
    <ListItem key={ev.id} dense divider>
      <ListItemAvatar>
        <Avatar src={profile?.image} />
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{
          className: '!font-bold max-w-[464px] overflow-hidden text-ellipsis',
        }}
        secondaryTypographyProps={{
          className: 'overflow-hidden text-ellipsis',
        }}
        className="text-secondary-light"
        primary={profile?.displayName}
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
