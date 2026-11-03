'use client'

import { useState } from 'react'
import { generateId } from '@sim/utils/id'
import { useQueryState } from 'nuqs'
import { isApiClientError } from '@/lib/api/client/errors'
import { SIM_NEW_TAB_PATH } from '@/lib/navigation/browser-extension'
import { organizationRoutes } from '@/lib/navigation/paths'
import type { OrganizationSurfaceContext } from '@/lib/organizations/surface'
import { ExtensionHeader } from '@/app/extension/[workspaceId]/header'
import { extensionChatParam } from '@/app/extension/[workspaceId]/search-params'
import { useExtensionComposer } from '@/app/extension/hooks/use-composer'
import ExtensionLoading from '@/app/extension/loading'
import { ExtensionSignIn } from '@/app/extension/sign-in'
import { ExtensionUnavailable } from '@/app/extension/unavailable'
import { OrganizationConversation } from '@/app/o/[organizationId]/components/organization-conversation'
import { OrganizationProvider } from '@/app/o/[organizationId]/providers/organization-provider'
import { resourceParam, resourceUrlKeys } from '@/app/workspace/[workspaceId]/home/search-params'
import type { ChatRequestMode } from '@/app/workspace/[workspaceId]/home/types'
import { SettingsLoader } from '@/app/workspace/[workspaceId]/providers/settings-loader'
import { useOrganizationMothershipChats } from '@/hooks/queries/mothership-chats'
import { useOrganizationSummary } from '@/hooks/queries/organization'

interface ExtensionOrganizationProps {
  context: OrganizationSurfaceContext
  newTab?: { userName: string }
}

export function ExtensionOrganization({ context, newTab }: ExtensionOrganizationProps) {
  const access = useOrganizationSummary(context.organization.id)
  const [selectedChatId, setSelectedChatId] = useQueryState(
    extensionChatParam.key,
    extensionChatParam.parser
  )
  const needsHistory = !newTab || Boolean(selectedChatId)
  const history = useOrganizationMothershipChats(context.organization.id, 'active', needsHistory)
  const denied = [access.error, needsHistory ? history.error : null].find(
    (error) => isApiClientError(error) && [401, 403, 404].includes(error.status)
  )
  if (isApiClientError(denied) && denied.status === 401) return <ExtensionSignIn />
  if (access.isPending) return <ExtensionLoading />
  if (denied || !access.data?.chatAccess)
    return (
      <ExtensionUnavailable
        scope='organization'
        backHref={newTab ? SIM_NEW_TAB_PATH : undefined}
        onRetry={() => {
          void access.refetch()
          if (needsHistory) void history.refetch()
        }}
      />
    )
  const refreshedContext = { ...context, ...access.data.chatAccess }
  return (
    <OrganizationProvider context={refreshedContext}>
      <SettingsLoader />
      <ExtensionOrganizationChat
        context={refreshedContext}
        history={history}
        newTab={newTab}
        selectedChatId={selectedChatId}
        setSelectedChatId={setSelectedChatId}
      />
    </OrganizationProvider>
  )
}

interface ExtensionOrganizationChatProps extends ExtensionOrganizationProps {
  history: ReturnType<typeof useOrganizationMothershipChats>
  selectedChatId: string | null
  setSelectedChatId: (id: string | null) => void
}

function ExtensionOrganizationChat({
  context,
  history,
  newTab,
  selectedChatId,
  setSelectedChatId,
}: ExtensionOrganizationChatProps) {
  const [, setResource] = useQueryState(resourceParam.key, {
    ...resourceParam.parser,
    ...resourceUrlKeys,
  })
  const [captureChatId, setCaptureChatId] = useState(selectedChatId)
  const [initialChatId, setInitialChatId] = useState(selectedChatId)
  const [submittedMode, setSubmittedMode] = useState<ChatRequestMode | null>(null)
  const [composerKey, setComposerKey] = useState(generateId)
  if (captureChatId !== selectedChatId) {
    setCaptureChatId(selectedChatId)
    setInitialChatId(selectedChatId)
    setSubmittedMode(null)
    setComposerKey(generateId())
  }
  const selectChat = (chatId: string | null) => {
    if (chatId === selectedChatId) {
      setInitialChatId(chatId)
      setSubmittedMode(null)
      setComposerKey(generateId())
    }
    void setResource(null)
    void setSelectedChatId(chatId)
  }
  const selectedChat = initialChatId
    ? history.data?.find((chat) => chat.id === initialChatId)
    : undefined
  if (initialChatId && !history.data && history.isPending) return <ExtensionLoading />
  if (initialChatId && !selectedChat)
    return (
      <ExtensionUnavailable
        scope='chat'
        backHref={newTab ? SIM_NEW_TAB_PATH : undefined}
        onRetry={() => void history.refetch()}
      />
    )
  const requestMode = initialChatId
    ? selectedChat?.mode
    : (submittedMode ?? (context.canBuild ? 'agent' : 'assistant'))
  if (!requestMode)
    return history.isFetching ? (
      <ExtensionLoading />
    ) : (
      <ExtensionUnavailable
        scope='chat'
        backHref={newTab ? SIM_NEW_TAB_PATH : undefined}
        onRetry={() => void history.refetch()}
      />
    )
  if (
    !context.mothershipAvailable ||
    (requestMode === 'assistant' ? !context.searchAccess.memberScoped : !context.canBuild)
  )
    return (
      <ExtensionUnavailable
        scope='chat'
        backHref={newTab ? SIM_NEW_TAB_PATH : undefined}
        onBackToChat={
          context.mothershipAvailable && (context.canBuild || context.searchAccess.memberScoped)
            ? () => selectChat(null)
            : undefined
        }
      />
    )
  const onChatIdResolved = (chatId: string) => {
    setCaptureChatId(chatId)
    void setSelectedChatId(chatId)
  }
  if (newTab) {
    return (
      <OrganizationConversation
        key={composerKey}
        userName={newTab.userName}
        chatId={initialChatId ?? undefined}
        requestMode={requestMode}
        panelOptions={{
          homeLayout: true,
          draftNamespace: 'new-tab',
          onChatIdResolved,
          onNavigateToChat: selectChat,
          onSubmitted: () => setSubmittedMode(requestMode),
        }}
      />
    )
  }
  return (
    <ExtensionOrganizationConversation
      key={composerKey}
      context={context}
      history={history}
      scopeKey={composerKey}
      initialChatId={initialChatId ?? undefined}
      selectedChatId={selectedChatId ?? undefined}
      requestMode={requestMode}
      onSelectChat={selectChat}
      onCommitMode={() => setSubmittedMode(requestMode)}
      onChatIdResolved={onChatIdResolved}
    />
  )
}

interface ExtensionOrganizationConversationProps
  extends Omit<ExtensionOrganizationChatProps, 'selectedChatId' | 'setSelectedChatId'> {
  scopeKey: string
  initialChatId?: string
  selectedChatId?: string
  requestMode: ChatRequestMode
  onSelectChat: (chatId: string | null) => void
  onCommitMode: () => void
  onChatIdResolved: (chatId: string) => void
}

function ExtensionOrganizationConversation({
  context,
  history,
  scopeKey,
  initialChatId,
  selectedChatId,
  requestMode,
  onSelectChat,
  onCommitMode,
  onChatIdResolved,
}: ExtensionOrganizationConversationProps) {
  const composer = useExtensionComposer(scopeKey)
  const routes = organizationRoutes(context.organization.id)
  const appHref = selectedChatId
    ? requestMode === 'assistant'
      ? routes.searchChat(selectedChatId)
      : routes.chat(selectedChatId)
    : requestMode === 'assistant'
      ? routes.search
      : routes.home
  return (
    <OrganizationConversation
      chatId={initialChatId}
      requestMode={requestMode}
      panelOptions={{
        ...composer,
        prepareSubmission: (message, contexts) => {
          const submission = composer.prepareSubmission(message, contexts)
          if (submission !== false) onCommitMode()
          return submission
        },
        draftNamespace: 'extension',
        onChatIdResolved,
        onNavigateToChat: onSelectChat,
        header: (
          <>
            <ExtensionHeader
              scopeName={context.organization.name}
              history={history}
              chatId={selectedChatId}
              onSelectChat={onSelectChat}
              appHref={appHref}
            />
            {composer.captureError && (
              <p role='alert' className='px-3 py-2 text-[var(--text-error)] text-caption'>
                {composer.captureError}
              </p>
            )}
          </>
        ),
      }}
    />
  )
}
