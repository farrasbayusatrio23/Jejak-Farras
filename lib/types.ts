export type PostStatus = "draft" | "published";

export type TravelPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  location: string;
  tripDate: string;
  readTime: number;
  status: PostStatus;
  coverKey: string | null;
  coverAlt: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

export type PostInput = Pick<
  TravelPost,
  | "title"
  | "excerpt"
  | "content"
  | "location"
  | "tripDate"
  | "readTime"
  | "status"
  | "coverKey"
  | "coverAlt"
>;

export function mediaUrl(key: string | null): string | null {
  if (!key) return null;
  return `/api/media/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
