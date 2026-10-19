export type ItunesSearchResult = {
  artworkUrl: string | null;
  artist: string;
  id: string;
  source: "itunes";
  title: string;
};

export type ItunesSearchResponse = {
  itunes: {
    error: string | null;
    results: ItunesSearchResult[];
  };
  query: string;
};
