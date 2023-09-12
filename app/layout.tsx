import './globals.css'
import { DefaultTheme } from '@/themes'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <DefaultTheme>{children}</DefaultTheme>
      </body>
    </html>
  )
}
