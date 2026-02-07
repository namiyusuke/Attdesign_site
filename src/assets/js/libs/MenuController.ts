/**
 * MenuController
 * メニュー・フィルターメニューの開閉・ドラッグ処理を共通化
 */
export function initMenuController(): void {
  const headerIcon = document.querySelector('.header-icon') as HTMLElement | null;
  const menu = document.querySelector('.menu') as HTMLElement | null;
  const menuClose = menu?.querySelector('.menu-close') as HTMLElement | null;

  if (!headerIcon || !menu) return;

  let isMenuOpen = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;
  let currentX = 0;
  let currentY = 0;

  const closeMenu = () => {
    isMenuOpen = false;
    menu.style.transform = 'translate(200px, -300%) rotate(-15deg)';
    menu.classList.remove('is-active');
  };

  // ランダム背景画像の切り替え
  const menuBack = menu.querySelector('.menu-back') as HTMLImageElement | null;
  const menuBackImages: string[] = menuBack?.dataset.images ? JSON.parse(menuBack.dataset.images) : [];

  const changeRandomBackground = () => {
    if (menuBack && menuBackImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * menuBackImages.length);
      menuBack.src = menuBackImages[randomIndex];
    }
  };

  // header-iconクリックでメニュー開閉
  headerIcon.addEventListener('click', () => {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      changeRandomBackground();
      menu.style.left = '';
      menu.style.top = '';
      menu.style.right = '48px';
      menu.classList.add('is-active');
      menu.style.transform = 'translate(0, 0) rotate(3deg)';
    }
  });

  // menu-closeクリックでアニメーションなしで即座に閉じる
  if (menuClose) {
    menuClose.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      menu.style.transition = 'none';
      closeMenu();
      requestAnimationFrame(() => {
        menu.style.transition = '';
      });
    });
  }

  // --- メニュードラッグ ---
  menu.addEventListener('mousedown', (e: MouseEvent) => {
    if (!isMenuOpen) return;
    isDragging = true;
    menu.classList.add('is-dragging');
    startX = e.clientX;
    startY = e.clientY;
    const rect = menu.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    currentX = initialX + deltaX;
    currentY = initialY + deltaY;
    menu.style.left = `${currentX}px`;
    menu.style.top = `${currentY}px`;
    menu.style.right = 'auto';
    menu.style.transform = 'translate(0, 0) rotate(3deg)';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      menu.classList.remove('is-dragging');
    }
  });

  // タッチデバイス対応
  menu.addEventListener('touchstart', (e: TouchEvent) => {
    if (!isMenuOpen) return;
    isDragging = true;
    menu.classList.add('is-dragging');
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    const rect = menu.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
  });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    currentX = initialX + deltaX;
    currentY = initialY + deltaY;
    menu.style.left = `${currentX}px`;
    menu.style.top = `${currentY}px`;
    menu.style.right = 'auto';
    menu.style.transform = 'translate(0, 0) rotate(3deg)';
  });

  document.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      menu.classList.remove('is-dragging');
    }
  });

  // --- menu-filter の開閉・ドラッグ ---
  const headerIconFilter = document.querySelector('.header-icon-filter') as HTMLElement | null;
  const menuFilter = document.querySelector('.menu-filter') as HTMLElement | null;
  const menuFilterClose = menuFilter?.querySelector('.menu-close') as HTMLElement | null;

  if (headerIconFilter && menuFilter) {
    let isFilterOpen = false;
    let isFilterDragging = false;
    let filterStartX = 0;
    let filterStartY = 0;
    let filterInitialX = 0;
    let filterInitialY = 0;

    const closeFilter = () => {
      isFilterOpen = false;
      menuFilter.style.transform = 'translate(200px, -300%) rotate(-15deg)';
      menuFilter.classList.remove('is-active');
    };

    headerIconFilter.addEventListener('click', () => {
      isFilterOpen = !isFilterOpen;
      if (isFilterOpen) {
        closeMenu();
        menuFilter.style.left = '';
        menuFilter.style.top = '';
        menuFilter.style.right = '10%';
        menuFilter.classList.add('is-active');
        menuFilter.style.transform = 'translate(0, 0) rotate(3deg)';
      }
    });

    if (menuFilterClose) {
      menuFilterClose.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        menuFilter.style.transition = 'none';
        closeFilter();
        requestAnimationFrame(() => {
          menuFilter.style.transition = '';
        });
      });
    }

    // フィルタードラッグ
    menuFilter.addEventListener('mousedown', (e: MouseEvent) => {
      if (!isFilterOpen) return;
      isFilterDragging = true;
      menuFilter.classList.add('is-dragging');
      filterStartX = e.clientX;
      filterStartY = e.clientY;
      const rect = menuFilter.getBoundingClientRect();
      filterInitialX = rect.left;
      filterInitialY = rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isFilterDragging) return;
      const deltaX = e.clientX - filterStartX;
      const deltaY = e.clientY - filterStartY;
      menuFilter.style.left = `${filterInitialX + deltaX}px`;
      menuFilter.style.top = `${filterInitialY + deltaY}px`;
      menuFilter.style.right = 'auto';
      menuFilter.style.transform = 'translate(0, 0) rotate(3deg)';
    });

    document.addEventListener('mouseup', () => {
      if (isFilterDragging) {
        isFilterDragging = false;
        menuFilter.classList.remove('is-dragging');
      }
    });

    // タッチ対応
    menuFilter.addEventListener('touchstart', (e: TouchEvent) => {
      if (!isFilterOpen) return;
      isFilterDragging = true;
      menuFilter.classList.add('is-dragging');
      const touch = e.touches[0];
      filterStartX = touch.clientX;
      filterStartY = touch.clientY;
      const rect = menuFilter.getBoundingClientRect();
      filterInitialX = rect.left;
      filterInitialY = rect.top;
    });

    document.addEventListener('touchmove', (e: TouchEvent) => {
      if (!isFilterDragging) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - filterStartX;
      const deltaY = touch.clientY - filterStartY;
      menuFilter.style.left = `${filterInitialX + deltaX}px`;
      menuFilter.style.top = `${filterInitialY + deltaY}px`;
      menuFilter.style.right = 'auto';
      menuFilter.style.transform = 'translate(0, 0) rotate(3deg)';
    });

    document.addEventListener('touchend', () => {
      if (isFilterDragging) {
        isFilterDragging = false;
        menuFilter.classList.remove('is-dragging');
      }
    });
  }

}
