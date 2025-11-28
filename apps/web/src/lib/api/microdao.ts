import type {
  AgentMicrodaoMembership,
  MicrodaoOption,
} from "@/lib/microdao";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data && (data.error || data.detail || data.message)) ||
      "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export async function fetchMicrodaoOptions(): Promise<MicrodaoOption[]> {
  const data = await request<{ items?: MicrodaoOption[] }>(
    "/api/microdao/options"
  );
  return data.items ?? [];
}

export async function assignAgentToMicrodao(
  agentId: string,
  payload: { microdao_id: string; role?: string; is_core?: boolean }
): Promise<AgentMicrodaoMembership> {
  return request<AgentMicrodaoMembership>(
    `/api/agents/${encodeURIComponent(agentId)}/microdao-membership`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function removeAgentFromMicrodao(
  agentId: string,
  microdaoId: string
): Promise<void> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(
      agentId
    )}/microdao-membership/${encodeURIComponent(microdaoId)}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      (data && (data.error || data.detail || data.message)) ||
      "Failed to remove MicroDAO membership";
    throw new Error(message);
  }
}


