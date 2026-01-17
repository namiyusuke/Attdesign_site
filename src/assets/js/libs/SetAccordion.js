import gsap from "gsap";

export default class Accordion {
  constructor(target) {
    this.IS_OPENED_CLASS = "is-opened";
    this.details = document.querySelectorAll(target);
    // this.details = document.querySelectorAll(".js-details");
    this.init();
  }

  init() {
    this.details.forEach((element) => {
      const summary = element.querySelector(".js-summary");
      const content = element.querySelector(".js-content");
      summary.addEventListener("click", (event) => this.handleClick(event, element, content));
    });
  }

  handleClick(event, element, content) {
    event.preventDefault();

    if (element.classList.contains(this.IS_OPENED_CLASS)) {
      element.classList.toggle(this.IS_OPENED_CLASS);
      this.closingAnim(content, element).restart();
    } else {
      element.classList.toggle(this.IS_OPENED_CLASS);
      element.setAttribute("open", "true");
      this.openingAnim(content).restart();
    }
  }

  closingAnim(content, element) {
    return gsap.to(content, {
      height: 0,
      opacity: 0,
      duration: 0.4,
      ease: "power3.out",
      overwrite: true,
      onComplete: () => {
        element.removeAttribute("open");
      },
    });
  }

  openingAnim(content) {
    return gsap.fromTo(
      content,
      {
        height: 0,
        opacity: 0,
      },
      {
        height: "auto",
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
        overwrite: true,
      }
    );
  }
}
