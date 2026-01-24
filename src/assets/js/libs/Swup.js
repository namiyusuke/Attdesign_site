import Swup from "swup";
import SwupJsPlugin from "@swup/js-plugin";
import SwupHeadPlugin from "@swup/head-plugin";
import SwupScriptsPlugin from "@swup/scripts-plugin";
import { BulgeImage } from "./BulgeImage";

// グローバルにインスタンスを保持
let bulgeInstance = null;

function initBulgeImage() {
  requestAnimationFrame(() => {
    const container = document.getElementById("bulge-container");
    if (!container) return;

    const imageUrl = container.dataset.imageUrl;
    if (!imageUrl) return;

    // 既存のインスタンスがあれば破棄
    if (bulgeInstance) {
      bulgeInstance.destroy();
      bulgeInstance = null;
    }

    bulgeInstance = new BulgeImage(container, imageUrl);
  });
}

export default function swupFunc() {
  const swup = new Swup({
    plugins: [
      new SwupHeadPlugin({
        persistAssets: true,
      }),
      new SwupScriptsPlugin(),
      new SwupJsPlugin({
        animations: [
          {
            from: "(.*)",
            to: "(.*)",
            in: async () => {
              // シャッターアニメーション後はシャッターをリセット
              const shutterOverlay = document.getElementById("shutter-overlay");
              if (shutterOverlay && shutterOverlay.classList.contains("-is-active")) {
                shutterOverlay.classList.remove("-is-active");
                shutterOverlay.style.opacity = "";
              }
              const container = document.querySelector("#swup");
              await container.animate([{ opacity: 0 }, { opacity: 1 }], 250).finished;
            },
            out: async () => {
              // シャッターアニメーション中はoutアニメーションをスキップ
              const shutterOverlay = document.getElementById("shutter-overlay");
              if (shutterOverlay && shutterOverlay.classList.contains("-is-active")) {
                return;
              }
              const container = document.querySelector("#swup");
              await container.animate([{ opacity: 1 }, { opacity: 0 }], 250).finished;
            },
          },
        ],
      }),
    ],
  });

  // ページ遷移完了後にBulgeImage初期化
  swup.hooks.on("page:view", () => {
    initBulgeImage();
  });

  // 初回ロード時もチェック
  initBulgeImage();

  // グローバルに公開（WebGLなどからナビゲーションに使用）
  window.swup = swup;
}
