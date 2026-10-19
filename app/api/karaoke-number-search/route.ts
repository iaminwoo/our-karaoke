import { createClient } from "@supabase/supabase-js";

import type {
  KaraokeNumberCandidate,
  KaraokeNumberProviderResult,
  KaraokeNumberSearchResponse,
  KaraokeProvider,
} from "@/types/karaoke-number-search";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 5;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const CHANNEL_IDS: Record<KaraokeProvider, string> = {
  tj: "UCZUhx8ClCv6paFW7qi3qljg",
  ky: "UCDqaUIUSJP5EVMEI178Zfag",
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function includesNormalized(haystack: string, needle: string) {
  const normalizedNeedle = normalize(needle);
  return normalizedNeedle.length > 0 && normalize(haystack).includes(normalizedNeedle);
}

function extractNumber(provider: KaraokeProvider, title: string, description: string) {
  const source = provider === "tj" ? description : title;
  const pattern = provider === "tj"
    ? /(?:(?:tj\s*(?:노래방\s*)?)?곡\s*번호\s*[.:：-]?|(?:tj\s*)?no\s*[.:：]\s*)(\d{3,6})(?!\d)/i
    : /\bky\s*[.:：-]?\s*(\d{3,6})(?!\d)/i;

  return source.match(pattern)?.[1] ?? null;
}

function serviceError(provider: KaraokeProvider, error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return `${provider === "tj" ? "TJ" : "금영"} 검색 시간이 초과되었습니다.`;
  }

  return `${provider === "tj" ? "TJ" : "금영"} 번호를 찾지 못했습니다. 잠시 후 다시 시도해주세요.`;
}

async function verifyAuthenticatedRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl || !publishableKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);

  return !error && Boolean(data.user);
}

async function searchProvider(
  provider: KaraokeProvider,
  title: string,
  artist: string,
  apiKey: string,
): Promise<KaraokeNumberCandidate[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    channelId: CHANNEL_IDS[provider],
    maxResults: String(MAX_RESULTS),
    q: `${title} ${artist}`,
    key: apiKey,
  }).toString();

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`YouTube API responded with ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error("Unexpected YouTube response");
  }

  const firstItem = payload.items[0];

  return [firstItem].flatMap((item): KaraokeNumberCandidate[] => {
    if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) {
      return [];
    }

    const videoId = asNonEmptyString(item.id.videoId);
    const videoTitle = asNonEmptyString(item.snippet.title);
    const description = asNonEmptyString(item.snippet.description) ?? "";
    const channelId = asNonEmptyString(item.snippet.channelId);
    const number = videoTitle && extractNumber(provider, videoTitle, description);

    if (!videoId || !videoTitle || !number || channelId !== CHANNEL_IDS[provider]) {
      return [];
    }

    return [{
      provider,
      number,
      videoTitle,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      titleMatches: includesNormalized(videoTitle, title),
      artistMatches: includesNormalized(videoTitle, artist),
    }];
  });
}

export async function POST(request: Request) {
  if (!(await verifyAuthenticatedRequest(request))) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "YouTube API 키가 설정되지 않았습니다." }, { status: 503, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const title = isRecord(body) ? asNonEmptyString(body.title) : null;
  const artist = isRecord(body) ? asNonEmptyString(body.artist) : null;
  if (!title || !artist || title.length > MAX_QUERY_LENGTH || artist.length > MAX_QUERY_LENGTH) {
    return Response.json({ error: "곡명과 가수명은 각각 100자 이내로 입력해주세요." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const results = await Promise.allSettled([
    searchProvider("tj", title, artist, apiKey),
    searchProvider("ky", title, artist, apiKey),
  ]);
  const toProviderResult = (provider: KaraokeProvider, result: PromiseSettledResult<KaraokeNumberCandidate[]>): KaraokeNumberProviderResult => result.status === "fulfilled"
    ? { candidates: result.value, error: null }
    : { candidates: [], error: serviceError(provider, result.reason) };
  const response: KaraokeNumberSearchResponse = {
    tj: toProviderResult("tj", results[0]),
    ky: toProviderResult("ky", results[1]),
  };

  return Response.json(response, { headers: NO_STORE_HEADERS });
}
