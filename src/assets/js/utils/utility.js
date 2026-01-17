import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
export function handleBudgetInput() {
    const budgetInputs = document.querySelectorAll('input[name="budget"]');
  const otherInput = document.querySelector(".other-input");
    if (otherInput) {
        budgetInputs.forEach((input) => {
        input.addEventListener("change", () => {
          if (input.value === "other" && input.checked) {
            otherInput.removeAttribute("disabled");
          } else {
            otherInput.setAttribute("disabled", "disabled");
          }
        });
      });
    }
  }
 export function initScrollProgress() {
      const scrollProgress = document.querySelector("body");
      const scrollProgressTarget = document.querySelector(".article__button");
   gsap.registerPlugin(ScrollTrigger);
   if(!scrollProgress || !scrollProgressTarget) return;
      gsap.fromTo(
      scrollProgressTarget,
      {
        "--progress": 0,
      },
      {
        "--progress": 1,
        scrollTrigger: {
        trigger: scrollProgress,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        },
      },
      );
    }
export function setRandomImages() {
    const img_target = document.querySelectorAll(".js-randam-image");
    const images = ["/ninjin.webp", "/shiitake.webp", "/tikyu.webp", "/nihonsyu.webp"];

    img_target.forEach((img) => {
        const randomIndex = Math.floor(Math.random() * images.length);
        const newImage = new Image();
        newImage.src = images[randomIndex];
        newImage.onload = () => {
            img.src = newImage.src;
        };
    });
}
