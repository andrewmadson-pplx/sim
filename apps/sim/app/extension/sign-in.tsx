'use client'

import { Chip, ChipLink } from '@sim/emcn'
import { usePathname } from 'next/navigation'
import { SIM_NEW_TAB_PATH } from '@/lib/navigation/browser-extension'

export function ExtensionSignIn() {
  const callbackPath = usePathname() === SIM_NEW_TAB_PATH ? '/home' : '/extension'
  return (
    <main className='flex h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)] p-6 text-center text-[var(--text-body)] text-small'>
      <h1 className='text-lg'>Sign in to Sim</h1>
      <p className='text-[var(--text-muted)] text-caption'>Sign in to your account, then reload.</p>
      <ChipLink
        href={`/login?callbackUrl=${encodeURIComponent(callbackPath)}`}
        target='_blank'
        rel='noopener noreferrer'
        variant='primary'
      >
        Sign in
      </ChipLink>
      <Chip onClick={() => window.location.reload()}>Reload</Chip>
    </main>
  )
}
