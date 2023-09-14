'use client'
import ChatAlert from '@/components/ChatAlert'
import ChatAlertManager from '@/components/ChatAlertManager'
import WidgetCard from '@/components/WidgetCard'
import { Box, Divider, Typography } from '@mui/material'

export default function Page() {
  return (
    <Box m={4}>
      <Typography variant="h5">Live Stream Widgets (for ZapStream) </Typography>
      <Divider />
      <Box className="grid grid-cols-2 gap-4 m-4">
        <WidgetCard title="Chat Alert Manager" url="/live/alert-manager.html">
          <ChatAlertManager naddr="naddr1qqjrzepkxgerzce595mrwvmy956rjvf595urwwp495uxyv3jxejrvefjx5mrgqgswaehxw309ahx7um5wgh8w6twv5q3gamnwvaz7tmjv4kxz7fwv3sk6atn9e5k7q3qeaz6dwsnvwkha5sn5puwwyxjgy26uusundrm684lg3vw4ma5c2jsxpqqqpmxw5ta69x" />
        </WidgetCard>
        <WidgetCard title="Chat Alert" url="/live/alert.html">
          <ChatAlert />
        </WidgetCard>
      </Box>
    </Box>
  )
}
