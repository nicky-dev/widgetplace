import { MessagePayload } from '@/interfaces/MessagePayload'
import { ElectricBolt } from '@mui/icons-material'
import { Avatar, Box, Paper, Typography } from '@mui/material'
import classNames from 'classnames'
import numeral from 'numeral'
import { useMemo } from 'react'
import Content from './TextNote'

export function ZapContent({ message }: { message?: MessagePayload }) {
  const zapAmount = useMemo(() => {
    if (!message?.zapAmount) return
    return numeral((message?.zapAmount || 0) / 1000).format('0,0.[0]a')
  }, [message?.zapAmount])

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
            src={message?.image}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'secondary.dark',
              color: 'white',
            }}
          >
            {message?.displayName.toUpperCase().slice(0, 1)}
          </Avatar>
          <Typography className="text-secondary-light !font-bold" mx={1}>
            {message?.displayName}
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
      {message?.content && (
        <Box className="flex -mt-1 mx-6 max-h-[6.5rem]">
          <Paper
            className="overflow-hidden !rounded-b-full !rounded-tr-full py-4 px-10"
            variant="elevation"
            elevation={4}
          >
            <Content content={message?.content} tags={message.tags} />
          </Paper>
        </Box>
      )}
    </>
  )
}
