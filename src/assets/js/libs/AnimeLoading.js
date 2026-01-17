import gsap from "gsap";
export default function animateLoading() {
    const logo = document.querySelector(".loading__logo__primary");
    const outline = document.querySelector(".loading__outline");
    const text = document.querySelector(".loading__text");
    const tl = gsap.timeline({});
    tl.to(text, { opacity: 1, duration: 0.5, delay: 0.5 })
      .to(text, { opacity: 0, duration: 0.5 }, "<")
      .to(outline, { opacity: 1, duration: 0.5 })
      .to(outline, { opacity: 0, duration: 0.5 })
      .to(logo, { opacity: 1, duration: 0.5 }, "<")
      .to(".loading__dot", { y: 0, duration: 1, ease: "power1.inout" })
      .to(".loading__dot", { opacity:1, duration: 1.4, ease: "sine.in" }, "<")
      .to(logo, { opacity: 0, duration: 0.5, filter: "blur(10px)", scale: 1.2 })
      .to(".loading", { autoAlpha: 0, duration: 1.2, ease: "sine.out" }, "+=0.5").to(".loading", { display: "none" });
  }
