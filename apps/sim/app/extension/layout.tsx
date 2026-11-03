import type { ReactNode } from 'react'
import { getBrowserExtensionOrigins } from '@/lib/core/security/extension'
import { ExtensionShell } from '@/app/extension/shell'

interface ExtensionLayoutProps {
  children: ReactNode
}
export const metadata = { title: 'Sim', robots: { index: false, follow: false } }
export default function ExtensionLayout({ children }: ExtensionLayoutProps) {
  return <ExtensionShell origins={getBrowserExtensionOrigins()}>{children}</ExtensionShell>
}
