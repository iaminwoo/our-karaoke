import { SongForm } from "@/components/SongForm";

export const instant = false;

export default async function NewSongPage({
  searchParams,
}: PageProps<"/songs/new">) {
  const { entry } = await searchParams;
  const formKey = typeof entry === "string" ? entry : "new-song";

  return <SongForm key={formKey} />;
}
