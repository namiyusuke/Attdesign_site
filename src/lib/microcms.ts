import { createClient, type MicroCMSQueries } from "microcms-js-sdk";

export const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: import.meta.env.MICROCMS_API_KEY,
});

/**
 * microCMSから全件取得（100件制限をページネーションで回避）
 */
export async function getAllContents<T>(
  endpoint: string,
  queries?: Omit<MicroCMSQueries, 'limit' | 'offset'>
): Promise<T[]> {
  const limit = 100;
  const first = await client.getList<T>({
    endpoint,
    queries: { ...queries, limit, offset: 0 },
  });

  if (first.totalCount <= limit) {
    return first.contents;
  }

  const allContents = [...first.contents];
  const remaining = Math.ceil((first.totalCount - limit) / limit);

  const requests = Array.from({ length: remaining }, (_, i) =>
    client.getList<T>({
      endpoint,
      queries: { ...queries, limit, offset: limit * (i + 1) },
    })
  );
  const responses = await Promise.all(requests);
  for (const res of responses) {
    allContents.push(...res.contents);
  }

  return allContents;
}

// 型定義
export type Photo = {
  id: string;
  text: string;
  camera: string;
  date: string;
  category: string;
  image: {
    url: string;
    width: number;
    height: number;
  };
};
// 型
export type Category = {
  data: string;
};
