import { Avatar, Box, Paper, Typography } from '@mui/material'
import Content from './TextNote'
import { NDKUserProfile, NostrEvent } from '@nostr-dev-kit/ndk'

export function ChatContent({
  ev,
  profile,
}: {
  ev?: NostrEvent
  profile?: NDKUserProfile
}) {
  return (
    <>
      <Box className="flex z-10">
        <Paper
          className={'inline-flex w-auto items-center !rounded-full pr-2'}
          variant="elevation"
          elevation={4}
        >
          <Avatar
            src={profile?.image}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'secondary.dark',
              color: 'white',
            }}
          >
            {profile?.displayName?.slice(0, 1)}
          </Avatar>
          <Typography
            className="text-secondary-light !font-bold max-w-[464px] overflow-hidden text-ellipsis"
            mx={1}
          >
            {profile?.displayName}
          </Typography>
        </Paper>
      </Box>
      {ev?.content && (
        <Box className="flex -mt-1 mx-6 max-h-[6.5rem]">
          <Paper
            className="overflow-hidden !rounded-b-full !rounded-tr-full py-4 px-10"
            variant="elevation"
            elevation={4}
          >
            <Content content={ev?.content} tags={ev.tags} />
          </Paper>
        </Box>
      )}
    </>
  )
}
