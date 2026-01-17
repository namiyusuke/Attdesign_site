import Swup from "swup";
import SwupJsPlugin from "@swup/js-plugin";
import SwupHeadPlugin from "@swup/head-plugin";
import SwupScriptsPlugin from "@swup/scripts-plugin";

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
              const container = document.querySelector("#swup");
              await container.animate([{ opacity: 0 }, { opacity: 1 }], 250).finished;
            },
            out: async () => {
              const container = document.querySelector("#swup");
              await container.animate([{ opacity: 1 }, { opacity: 0 }], 250).finished;
            },
          },
        ],
      }),
    ],
  });

  // グローバルに公開（WebGLなどからナビゲーションに使用）
  window.swup = swup;
}
