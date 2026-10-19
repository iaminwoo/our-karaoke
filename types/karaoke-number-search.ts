export type KaraokeProvider = "tj" | "ky";

export type KaraokeNumberCandidate = {
  artistMatches: boolean;
  number: string;
  provider: KaraokeProvider;
  titleMatches: boolean;
  videoTitle: string;
  videoUrl: string;
};

export type KaraokeNumberProviderResult = {
  candidates: KaraokeNumberCandidate[];
  error: string | null;
};

export type KaraokeNumberSearchResponse = {
  ky: KaraokeNumberProviderResult;
  tj: KaraokeNumberProviderResult;
};
