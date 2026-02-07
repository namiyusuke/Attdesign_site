import { initMenuController } from './MenuController';

export function MenuFilter() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initMenuController());
  } else {
    initMenuController();
  }
  // フィルターメニューのcurrentクラス付与
  const currentCategory = new URLSearchParams(window.location.search).get('category');
  const filterLinks = document.querySelectorAll('.menu-filter-inner a');
  filterLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkCategory = new URLSearchParams(href.split('?')[1] || '').get('category');
    if (currentCategory && linkCategory === currentCategory) {
      link.classList.add('current');
    } else if (!currentCategory && href === '/photo/') {
      link.classList.add('current');
    }
  });
}
