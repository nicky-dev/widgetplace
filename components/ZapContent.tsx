import { ElectricBolt } from '@mui/icons-material'
import { Avatar, Box, Paper, Typography } from '@mui/material'
import numeral from 'numeral'
import { useMemo } from 'react'
import Content from './TextNote'
import { NDKUserProfile, NostrEvent } from '@nostr-dev-kit/ndk'
import { useZapInvoice } from '@/hooks/useZapInvoice'

export function ZapContent({
  event,
  profile,
}: {
  event?: NostrEvent
  profile?: NDKUserProfile
}) {
  const zapInvoice = useZapInvoice(event)

  const zapAmount = useMemo(() => {
    if (!zapInvoice?.amount) return
    return numeral((zapInvoice?.amount || 0) / 1000).format('0,0.[0]a')
  }, [zapInvoice])

  return (
    <>
      <Box className="flex z-10">
        <Paper
          className={
            'inline-flex w-auto items-center !rounded-full bg-primary-light pr-4'
          }
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
          <ElectricBolt className="text-primary-light" />
          <Typography className="text-primary-light !font-bold">
            {zapAmount}
          </Typography>
          <Typography fontWeight="bold" mx={0.5}>
            sats
          </Typography>
        </Paper>
      </Box>
      {zapInvoice?.comment && (
        <Box className="flex -mt-1 mx-6 max-h-[6.5rem]">
          <Paper
            className="overflow-hidden !rounded-b-full !rounded-tr-full py-4 px-10"
            variant="elevation"
            elevation={4}
          >
            <Content content={zapInvoice?.comment} />
          </Paper>
        </Box>
      )}
    </>
  )
}
