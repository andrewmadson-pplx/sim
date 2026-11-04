import { describe, expect, it } from 'vitest'
import { PerplexityBlock } from '@/blocks/blocks/perplexity'
import { agentTool } from '@/tools/perplexity/agent'

const API_KEY = 'test-key'

function agentBody(params: Record<string, unknown>) {
  return agentTool.request.body?.({
    content: 'q',
    model: 'perplexity/sonar',
    apiKey: API_KEY,
    ...params,
  } as never) as Record<string, any>
}

function agentResult(data: Record<string, unknown>) {
  return agentTool.transformResponse?.(Response.json(data), {} as never)
}

describe('perplexity_agent request body', () => {
  it('enables web search unless it is switched off', () => {
    expect(agentBody({}).tools).toEqual([{ type: 'web_search' }])
    expect(agentBody({ web_search: false }).tools).toBeUndefined()
  })

  it('adds URL fetch and maps the prompt and limits onto Agent API fields', () => {
    const body = agentBody({
      fetch_url: true,
      systemPrompt: 'Be brief.',
      max_steps: 3,
      max_tokens: 500,
    })
    expect(body).toEqual({
      model: 'perplexity/sonar',
      input: 'q',
      tools: [{ type: 'web_search' }, { type: 'fetch_url' }],
      instructions: 'Be brief.',
      max_steps: 3,
      max_output_tokens: 500,
    })
  })
})

describe('perplexity_agent response', () => {
  it('maps message text, search results, usage and cost', async () => {
    const result = await agentResult({
      model: 'perplexity/sonar',
      status: 'completed',
      output: [
        {
          type: 'search_results',
          queries: ['q'],
          results: [{ title: 'T', url: 'https://example.com', snippet: 'S', date: '2026-01-01' }],
        },
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'the answer', annotations: [] }],
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, cost: { total_cost: 0.004 } },
    })
    expect(result?.success).toBe(true)
    expect(result?.output).toEqual({
      content: 'the answer',
      model: 'perplexity/sonar',
      status: 'completed',
      sources: [
        {
          title: 'T',
          url: 'https://example.com',
          snippet: 'S',
          date: '2026-01-01',
          last_updated: null,
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      __cost: { total_cost: 0.004 },
    })
  })

  it('reports a failed run as a failure', async () => {
    const result = await agentResult({ status: 'failed', error: { message: 'boom' }, output: [] })
    expect(result?.success).toBe(false)
    expect(result?.error).toMatch(/failed: boom/)
  })

  it('bills hosted runs at the cost the Agent API reports', () => {
    const pricing = agentTool.hosting?.pricing
    if (pricing?.type !== 'custom') throw new Error('expected custom pricing')
    expect(pricing.getCost({} as never, { __cost: { total_cost: 0.004 } })).toMatchObject({
      cost: 0.004,
    })
    expect(() => pricing.getCost({} as never, {})).toThrow(/total_cost/)
  })
})

describe('perplexity block', () => {
  it('routes the agent operation and passes the agent model as model', () => {
    expect(PerplexityBlock.tools.config?.tool?.({ operation: 'perplexity_agent' })).toBe(
      'perplexity_agent'
    )
    const params = PerplexityBlock.tools.config?.params?.({
      operation: 'perplexity_agent',
      agentModel: 'openai/gpt-5.5',
      model: 'sonar',
      content: 'q',
      max_steps: '2',
    }) as Record<string, unknown>
    expect(params.model).toBe('openai/gpt-5.5')
    expect(params.max_steps).toBe(2)
  })
})
