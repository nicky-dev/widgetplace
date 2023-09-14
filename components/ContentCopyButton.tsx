import { ContentCopy } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import copy from 'copy-to-clipboard'

export interface ContentCopyButtonProps {
  title: string
  content: string
}

export default function ContentCopyButton(props: ContentCopyButtonProps) {
  return (
    <Tooltip title={props.title || 'Copy'}>
      <IconButton onClick={() => copy(props.content)}>
        <ContentCopy />
      </IconButton>
    </Tooltip>
  )
}
