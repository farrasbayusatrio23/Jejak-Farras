import { getSupabaseAdmin, storageBucketName } from "@/lib/supabase/admin";

type StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
};

type StoredObjectMetadata = {
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
};

type ObjectBucket = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get(
    key: string,
    options?: { range?: { offset: number; length: number } },
  ): Promise<StoredObject | null>;
  head(key: string): Promise<StoredObjectMetadata | null>;
  delete(key: string | string[]): Promise<void>;
};

function publicObjectUrl(key: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL belum diatur.");
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(storageBucketName())}/${encodedKey}`;
}

function cacheSeconds(cacheControl?: string) {
  const match = /max-age=(\d+)/i.exec(cacheControl || "");
  return match?.[1] || "31536000";
}

export function getBucket(): ObjectBucket {
  return {
    async put(key, value, options) {
      const { error } = await getSupabaseAdmin()
        .storage
        .from(storageBucketName())
        .upload(key, value, {
          upsert: true,
          contentType: options?.httpMetadata?.contentType,
          cacheControl: cacheSeconds(options?.httpMetadata?.cacheControl),
        });
      if (error) throw error;
      return { key };
    },

    async get(key, options) {
      const headers = new Headers();
      const range = options?.range;
      if (range) {
        headers.set(
          "Range",
          `bytes=${range.offset}-${range.offset + range.length - 1}`,
        );
      }
      const response = await fetch(publicObjectUrl(key), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (response.status === 404) return null;
      if (!response.ok || !response.body) {
        throw new Error(`Supabase Storage gagal membaca ${key}: ${response.status}`);
      }
      return {
        body: response.body,
        size: Number(response.headers.get("content-length") || 0),
        httpEtag: response.headers.get("etag") || "",
        httpMetadata: {
          contentType: response.headers.get("content-type") || undefined,
          cacheControl: response.headers.get("cache-control") || undefined,
        },
      };
    },

    async head(key) {
      const response = await fetch(publicObjectUrl(key), {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Supabase Storage gagal membaca metadata ${key}: ${response.status}`);
      }
      return {
        size: Number(response.headers.get("content-length") || 0),
        httpEtag: response.headers.get("etag") || "",
        httpMetadata: {
          contentType: response.headers.get("content-type") || undefined,
          cacheControl: response.headers.get("cache-control") || undefined,
        },
      };
    },

    async delete(keyOrKeys) {
      const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
      if (!keys.length) return;
      const { error } = await getSupabaseAdmin()
        .storage
        .from(storageBucketName())
        .remove(keys);
      if (error) throw error;
    },
  };
}
