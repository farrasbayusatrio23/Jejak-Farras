import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PostInput, TravelPost } from "@/lib/types";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  location: string;
  trip_date: string;
  read_time: number;
  status: "draft" | "published";
  cover_key: string | null;
  cover_alt: string;
  author_id: string;
  created_at: string;
  updated_at: string;
};

function mapPost(row: PostRow): TravelPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    location: row.location,
    tripDate: row.trip_date,
    readTime: row.read_time,
    status: row.status,
    coverKey: row.cover_key,
    coverAlt: row.cover_alt,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: PostInput) {
  return {
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    location: input.location,
    trip_date: input.tripDate,
    read_time: input.readTime,
    status: input.status,
    cover_key: input.coverKey,
    cover_alt: input.coverAlt,
  };
}

export const starterPosts: TravelPost[] = [
  {
    id: "9605401f-3398-4a38-8971-3970065d8108",
    slug: "nandur-pari-960540",
    title: "Nandur Pari",
    excerpt: "Beras Adalah Inti",
    content: "Kadang Nandur tidak harus, tapi harus, piye jal",
    location: "Gendolan, Kutub Selatan",
    tripDate: "2026-09-05",
    readTime: 3,
    status: "published",
    coverKey: null,
    coverAlt: "Hamparan Sawah di pagi Hari",
    authorId: "xHsHLNbLFBy4rl2mjzZPjIxnSSgrUymi2ZCYRPXpfjEZMzPzeh6Nf4",
    createdAt: "2026-09-05T03:06:54.034Z",
    updatedAt: "2026-09-05T03:06:54.034Z",
  },
  {
    id: "starter-bromo",
    slug: "pagi-datang-pelan-di-bromo",
    title: "Pagi datang pelan di Bromo",
    excerpt:
      "Udara sebelum fajar, secangkir kopi yang lekas dingin, dan satu pengingat untuk tidak terburu-buru.",
    content:
      "Pukul empat pagi, udara menusuk sampai ke sela sarung tangan. Di kejauhan, garis tipis berwarna jingga mulai muncul di balik punggung gunung.\n\nTak ada aba-aba ketika langit berubah. Semua orang mendadak diam, seolah tahu bahwa beberapa pemandangan memang lebih baik disimpan tanpa banyak kata.\n\nSaya turun membawa sepatu penuh debu dan satu pengingat sederhana: terburu-buru sering membuat kita melewatkan bagian terbaik.",
    location: "Gunung Bromo, Jawa Timur",
    tripDate: "2026-08-18",
    readTime: 6,
    status: "published",
    coverKey: null,
    coverAlt: "Gunung Bromo dan lautan kabut saat matahari terbit",
    authorId: "starter",
    createdAt: "2026-08-18T04:30:00.000Z",
    updatedAt: "2026-08-18T04:30:00.000Z",
  },
  {
    id: "starter-penida",
    slug: "tebing-angin-dan-jalan-nusa-penida",
    title: "Tebing, angin, dan jalan yang tak ada di peta",
    excerpt:
      "Sehari di Nusa Penida mengajarkan bahwa jalan memutar sering menyimpan pemandangan terbaik.",
    content:
      "Pagi di pulau dimulai dengan suara motor dan angin asin. Saya mengikuti jalan yang makin kecil hingga peta berhenti memberi petunjuk.\n\nDi ujungnya, laut terbuka lebar dan semua rasa lelah mendadak masuk akal.",
    location: "Nusa Penida, Bali",
    tripDate: "2026-08-04",
    readTime: 5,
    status: "published",
    coverKey: null,
    coverAlt: "",
    authorId: "starter",
    createdAt: "2026-08-04T08:00:00.000Z",
    updatedAt: "2026-08-04T08:00:00.000Z",
  },
  {
    id: "starter-yogyakarta",
    slug: "sore-panjang-di-prawirotaman",
    title: "Sore yang panjang di gang-gang Prawirotaman",
    excerpt:
      "Tentang kota yang tidak meminta kita bergegas, percakapan singkat, dan aroma kopi setelah hujan.",
    content:
      "Hujan baru berhenti ketika saya keluar tanpa tujuan yang pasti. Aspal masih gelap dan lampu-lampu warung mulai menyala satu per satu.\n\nBeberapa kota terasa akrab bahkan sebelum kita mengenalnya. Yogyakarta adalah salah satunya.",
    location: "Yogyakarta",
    tripDate: "2026-07-21",
    readTime: 4,
    status: "published",
    coverKey: null,
    coverAlt: "",
    authorId: "starter",
    createdAt: "2026-07-21T16:00:00.000Z",
    updatedAt: "2026-07-21T16:00:00.000Z",
  },
];

export async function listPublishedPosts(): Promise<TravelPost[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("trip_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PostRow[]).map(mapPost);
}

export async function listAllPosts(): Promise<TravelPost[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as PostRow[]).map(mapPost);
}

export async function getPublishedPostBySlug(slug: string): Promise<TravelPost | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data ? mapPost(data as PostRow) : null;
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 64) || "catatan-perjalanan"
  );
}

export async function createPost(input: PostInput, authorId: string) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .insert({
      ...inputToRow(input),
      id,
      slug: `${slugify(input.title)}-${id.slice(0, 6)}`,
      author_id: authorId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapPost(data as PostRow);
}

export async function updatePost(id: string, input: PostInput) {
  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;

  const currentRow = current as PostRow;
  const { data, error } = await supabase
    .from("posts")
    .update({
      ...inputToRow(input),
      slug:
        currentRow.title === input.title
          ? currentRow.slug
          : `${slugify(input.title)}-${id.slice(0, 6)}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return {
    post: mapPost(data as PostRow),
    replacedCoverKey:
      currentRow.cover_key !== input.coverKey ? currentRow.cover_key : null,
  };
}

export async function deletePost(id: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .delete()
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapPost(data as PostRow) : null;
}
