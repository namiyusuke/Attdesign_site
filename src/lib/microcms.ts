import { createClient } from "microcms-js-sdk";

export const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: import.meta.env.MICROCMS_API_KEY,
});

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
