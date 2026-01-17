import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
export default function createParallaxEffect(selector, yPercentage, scale = 1.2) {
  const triggers = document.querySelectorAll(selector);
  if (triggers.length === 0) return;

  triggers.forEach((trigger) => {
    const target = trigger.querySelector("img");
    if (!target) return;

    gsap.to(target, {
      yPercent: yPercentage,
      scale: scale,
      ease: "none",
      scrollTrigger: {
        trigger: trigger,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });
}
