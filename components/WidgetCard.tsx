import { ContentCopy } from '@mui/icons-material'
import { Box, Card, CardHeader, IconButton, Tooltip } from '@mui/material'
import { ReactNode, useMemo } from 'react'
import ContentCopyButton from './ContentCopyButton'

export interface WidgetCardProps {
  title: string
  url: string
  children: ReactNode
}

export default function WidgetCard(props: WidgetCardProps) {
  const baseUrl = useMemo(() => {
    return typeof location !== 'undefined'
      ? `${location.protocol}//${location.host}`
      : ''
  }, [])
  return (
    <Card className="flex-1">
      <CardHeader
        title={props.title}
        action={
          <ContentCopyButton title="Copy URL" content={baseUrl + props.url} />
        }
      />
      <Box
        minHeight={480}
        maxHeight={480}
        position={'relative'}
        overflow={'auto'}
      >
        {props.children}
      </Box>
    </Card>
  )
}
