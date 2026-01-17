import Swiper from "swiper";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
export default function swiper() {
    const mySwiper = new Swiper(".swiper", {
      // Optional parameters
      loop: true,
      width: 300,
      virtual: {
        enabled: true, // バーチャルスライドを有効にします。
        addSlidesAfter: 3, // 事前にレンダリングする枚数。スライドの枚数が入ります。
      },
      // If we need pagination
      pagination: {
        el: ".swiper-pagination",
      },

      // Navigation arrows
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },

      // And if we need scrollbar
      scrollbar: {
        el: ".swiper-scrollbar",
      },
    });
  }
