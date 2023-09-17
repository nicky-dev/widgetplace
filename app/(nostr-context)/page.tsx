'use client'
import ChatAlert from '@/components/ChatAlert'
import ChatAlertManager from '@/components/ChatAlertManager'
import WidgetCard from '@/components/WidgetCard'
import { Box, Divider, Typography } from '@mui/material'

export default function Page() {
  return (
    <Box m={4}>
      <Typography variant="h5">Live Stream Widgets</Typography>
      <Divider />
      <Box className="grid grid-cols-2 gap-4 m-4">
        <WidgetCard title="Chat Alert Manager" url="/live/alert-manager.html">
          <ChatAlertManager naddr="naddr1qqjrzepkxgerzce595mrwvmy956rjvf595urwwp495uxyv3jxejrvefjx5mrgq3qeaz6dwsnvwkha5sn5puwwyxjgy26uusundrm684lg3vw4ma5c2jsxpqqqpmxw528lgq" />
        </WidgetCard>
        <WidgetCard title="Chat Alert" url="/live/alert.html">
          <ChatAlert />
        </WidgetCard>
      </Box>
    </Box>
  )
}
