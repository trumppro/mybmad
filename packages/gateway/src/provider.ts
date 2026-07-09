/**
 * @oahs/gateway — provider abstraction (Phase 6, roadmap §2.5).
 *
 * A Provider is the model-agnostic seam: it turns a normalized completion
 * request into a normalized {content, usage} result, hiding the wire dialect
 * of whatever endpoint sits behind it. The first concrete provider speaks the
 * OpenAI-compatible /chat/completions dialect (9router, vLLM, Bedrock proxies,
 * Anthropic-via-compat, …). New providers are new classes, never edits here.
 *
 * INVARIANT (§0.1): this file — and this whole package — imports no spine
 * package (core/db/contracts/spine-api). The gateway is the runtime layer; the
 * spine is never its client. Keys and URLs are always injected, never
 * hardcoded (per-tenant key vault lives above this seam).
 */

/** One turn of a chat: a role and its text content. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Token accounting for one completion — the billing unit (§2.5 metering). */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Normalized completion request handed to a Provider. */
export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** Normalized completion result — content plus the token ledger entry. */
export interface CompletionResult {
  content: string;
  usage: Usage;
  model: string;
}

/** Model-agnostic provider seam. */
export interface Provider {
  complete(req: CompletionRequest): Promise<CompletionResult>;
  listModels(): Promise<string[]>;
}

/** The fetch shape the provider depends on — injectable so tests never touch the network. */
export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * A gateway/provider failure that carries the wire context (HTTP status +
 * response body head) so a caller can log/route on it without re-parsing.
 */
export class GatewayError extends Error {
  override readonly name = 'GatewayError';
  readonly status: number | undefined;
  readonly body: string | undefined;

  constructor(message: string, options: { status?: number; body?: string } = {}) {
    super(message);
    this.status = options.status;
    this.body = options.body;
  }
}

/** Response bodies over this length are truncated in GatewayError.body. */
const ERROR_BODY_HEAD = 2000;

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
}

interface OpenAIModelsResponse {
  data?: Array<{ id?: unknown }>;
}

function toInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * OpenAI-compatible provider: POST {baseUrl}/chat/completions (stream:false)
 * and GET {baseUrl}/models. Auth is a Bearer key. Both key and base URL are
 * constructor-injected — the caller (loadGatewayFromEnv, or a per-tenant vault)
 * decides where they come from.
 */
export class OpenAICompatibleProvider implements Provider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: FetchImpl;

  constructor(config: { baseUrl: string; apiKey: string; fetchImpl?: FetchImpl }) {
    // Normalize a single trailing slash so `${base}/chat/completions` never doubles.
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.apiKey}`,
    };
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
      stream: false,
    };
    if (req.maxTokens !== undefined) payload['max_tokens'] = req.maxTokens;
    if (req.temperature !== undefined) payload['temperature'] = req.temperature;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new GatewayError(
        `chat/completions request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      const body = await this.readBody(response);
      throw new GatewayError(`chat/completions returned HTTP ${response.status}`, {
        status: response.status,
        body,
      });
    }

    let json: OpenAIChatResponse;
    try {
      json = (await response.json()) as OpenAIChatResponse;
    } catch (error) {
      throw new GatewayError(
        `chat/completions returned unparseable JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { status: response.status },
      );
    }

    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new GatewayError('chat/completions response carried no message content', {
        status: response.status,
        body: JSON.stringify(json).slice(0, ERROR_BODY_HEAD),
      });
    }

    const usage: Usage = {
      promptTokens: toInt(json.usage?.prompt_tokens),
      completionTokens: toInt(json.usage?.completion_tokens),
      totalTokens: toInt(json.usage?.total_tokens),
    };

    return { content, usage, model: req.model };
  }

  async listModels(): Promise<string[]> {
    const url = `${this.baseUrl}/models`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, { method: 'GET', headers: this.headers() });
    } catch (error) {
      throw new GatewayError(
        `models request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      const body = await this.readBody(response);
      throw new GatewayError(`models returned HTTP ${response.status}`, {
        status: response.status,
        body,
      });
    }
    let json: OpenAIModelsResponse;
    try {
      json = (await response.json()) as OpenAIModelsResponse;
    } catch (error) {
      throw new GatewayError(
        `models returned unparseable JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { status: response.status },
      );
    }
    return (json.data ?? [])
      .map((entry) => entry.id)
      .filter((id): id is string => typeof id === 'string');
  }

  private async readBody(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, ERROR_BODY_HEAD);
    } catch {
      return '';
    }
  }
}
