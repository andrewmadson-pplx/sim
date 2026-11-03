import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { getActiveOrganizationId } from '@/lib/auth/session-response'
import { getNewTabOrigins } from '@/lib/core/security/extension'
import {
  getOrganizationSurfaceContext,
  resolveOrganizationLanding,
} from '@/lib/organizations/surface'
import ExtensionLoading from '@/app/extension/loading'
import { ExtensionOrganization } from '@/app/extension/o/[organizationId]/organization'
import { ExtensionShell } from '@/app/extension/shell'
import { ExtensionWorkspaces } from '@/app/extension/workspaces'

export const metadata = { title: 'Sim Home', robots: { index: false, follow: false } }

export default function NewTabPage() {
  return (
    <ExtensionShell origins={getNewTabOrigins()}>
      <Suspense fallback={<ExtensionLoading />}>
        <Home />
      </Suspense>
    </ExtensionShell>
  )
}

async function Home() {
  const session = await getSession()
  if (!session?.user) return null
  const organizationId = await resolveOrganizationLanding(
    session.user.id,
    getActiveOrganizationId(session)
  )
  const context = organizationId
    ? await getOrganizationSurfaceContext(organizationId, session.user.id)
    : null
  if (context?.mothershipAvailable && (context.canBuild || context.searchAccess.memberScoped)) {
    return (
      <div className='flex h-dvh min-w-0 flex-col overflow-hidden'>
        <ExtensionOrganization
          key={organizationId}
          context={context}
          newTab={{ userName: session.user.name }}
        />
      </div>
    )
  }
  return <ExtensionWorkspaces openInApp />
}
