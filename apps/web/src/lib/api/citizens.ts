import type { CitizenAskResponse } from "@/lib/types/citizens";

export async function askCitizen(
  slug: string,
  params: { question: string; context?: string }
): Promise<CitizenAskResponse> {
  const res = await fetch(
    `/api/public/citizens/${encodeURIComponent(slug)}/ask`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.error || data?.detail || "Не вдалося отримати відповідь від агента."
    );
  }

  return data as CitizenAskResponse;
}


