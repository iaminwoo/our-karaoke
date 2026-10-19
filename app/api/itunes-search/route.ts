import type { ItunesSearchResponse, ItunesSearchResult } from "@/types/music-search";

const REQUEST_TIMEOUT_MS = 8_000;
// The KR storefront currently returns empty music results for common queries.
const ITUNES_COUNTRY = "US";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "iTunes 응답 시간이 초과되었습니다.";
  }

  return "iTunes 검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`iTunes API responded with ${response.status}`);
  }

  return response.json();
}

async function searchItunes(query: string, limit: number): Promise<ItunesSearchResult[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    country: ITUNES_COUNTRY,
    limit: String(limit),
  }).toString();

  const payload = await fetchJson(url);
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new Error("Unexpected iTunes response");
  }

  return payload.results.flatMap((item): ItunesSearchResult[] => {
    if (!isRecord(item) || typeof item.trackId !== "number") {
      return [];
    }

    const title = asNonEmptyString(item.trackName);
    const artist = asNonEmptyString(item.artistName);
    if (!title || !artist) {
      return [];
    }

    return [{
      source: "itunes",
      id: `itunes:${item.trackId}`,
      title,
      artist,
      artworkUrl: asNonEmptyString(item.artworkUrl100),
    }];
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limit = url.searchParams.get("limit") === "5" ? 5 : 20;

  if (!query) {
    return Response.json({ error: "검색어를 입력해주세요." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (query.length > 100) {
    return Response.json({ error: "검색어는 100자 이내로 입력해주세요." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const results = await searchItunes(query, limit);
    const response: ItunesSearchResponse = {
      query,
      itunes: { results, error: null },
    };
    return Response.json(response, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const response: ItunesSearchResponse = {
      query,
      itunes: { results: [], error: getErrorMessage(error) },
    };
    return Response.json(response, { headers: NO_STORE_HEADERS });
  }
}
