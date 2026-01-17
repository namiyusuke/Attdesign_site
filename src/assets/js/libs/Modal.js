export default class Modal {
  constructor() {
    this.dialogElement = document.querySelectorAll('.js-dialog-content');
    this.dialogElem = document.querySelectorAll('.baseDialog_content');
    this.openElems = document.querySelectorAll('.js-dialog-open');
    this.closeElem = document.querySelectorAll('.js-dialog-close');
    this.dialogArray1 = Array.from(this.dialogElem);
    this.dialogArray = Array.from(this.dialogElement);
    this._init();
  }

  closeModal(dialog) {
    // アニメーションが無効な場合は直接closeを呼び出す
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
    } else {
      dialog.addEventListener('transitionend', () => dialog.close(), { once: true });
      dialog.classList.add('-closing');
    }
  }

  _init() {
    this.openElems.forEach((elem, index) => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.dialogArray[index].hasAttribute('open')) {
          this.dialogArray[index].showModal();
          requestAnimationFrame(() => this.dialogArray[index].classList.remove('-closing'));
        }
      });
    });

    this.closeElem.forEach((elem, index) => {
      elem.addEventListener('click', () => {
        this.closeModal(this.dialogArray[index]);
      });
    });

    document.querySelectorAll('.baseDialog').forEach((dialogElement, index) => {
      dialogElement.addEventListener('click', (e) => {
        const elRect = this.dialogArray1[index].getBoundingClientRect();
        const isInDialog =
          elRect.top <= e.clientY &&
          e.clientY <= elRect.bottom &&
          elRect.left <= e.clientX &&
          e.clientX <= elRect.right;

        if (isInDialog) return;
        this.closeModal(dialogElement);
      });
    });
  }
}
