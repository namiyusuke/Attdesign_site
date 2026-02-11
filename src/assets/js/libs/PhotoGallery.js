import gsap from "gsap";

export function initPhotoGallery() {
    // カテゴリフィルタリング
    const urlParams = new URLSearchParams(window.location.search);
    const filterCategory = urlParams.get('category');
    // カテゴリ表示を更新
    var categoryLabel = document.querySelector('.category');
    if (filterCategory && categoryLabel) {
      categoryLabel.textContent = filterCategory;
    }

    if (filterCategory) {
      document.querySelectorAll('.thumbnail-wrapper').forEach(function(thumb) {
        if (thumb.dataset.category !== filterCategory) {
          thumb.style.display = 'none';
        }
      });
    }

    const mainImage = document.querySelector('.main-image');
    const thumbnailTrack = document.querySelector('.thumbnail-track');
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const thumbnails = document.querySelectorAll('.thumbnail-wrapper:not([style*="display: none"])');


    if (!mainImage || !thumbnailTrack || !thumbnailContainer || thumbnails.length === 0) return;

    // フィルタ後のインデックス再割り当て
    thumbnails.forEach(function(thumb, i) {
      thumb.dataset.index = String(i);
    });

    // 既存のactive状態をリセットし、最初の画像をメインに設定
    document.querySelectorAll('.thumbnail-wrapper.active').forEach(function(el) {
      el.classList.remove('active');
    });
    if (thumbnails.length > 0) {
      var firstVisible = thumbnails[0];
      mainImage.src = firstVisible.dataset.src;
      firstVisible.classList.add('active');
    }

    let currentIndex = 0;
    let scrollPosition = 0;
    let targetScrollPosition = 0;
    let containerWidth = thumbnailContainer.offsetWidth;
    let maxScroll = 0;
    let thumbnailPositions = [];
    let animationId = null;

    function calculatePositions() {
      containerWidth = thumbnailContainer.offsetWidth;

      const firstThumbWidth = thumbnails[0].offsetWidth;
      const initialPadding = containerWidth / 2 - firstThumbWidth / 2;
      thumbnailTrack.style.paddingLeft = initialPadding + 'px';

      const lastThumbWidth = thumbnails[thumbnails.length - 1].offsetWidth;
      const endPadding = containerWidth / 2 - lastThumbWidth / 2;
      thumbnailTrack.style.paddingRight = endPadding + 'px';

      // 強制的にレイアウトを再計算
      void thumbnailTrack.offsetWidth;

      thumbnailPositions = [];
      thumbnails.forEach((thumb, index) => {
        const left = thumb.offsetLeft;
        const width = thumb.offsetWidth;

        thumbnailPositions.push({
          left,
          width,
          center: left + width / 2,
          index
        });
      });

      // 最後のサムネイルが中央に来るまでスクロールできるように計算
      const lastPos = thumbnailPositions[thumbnailPositions.length - 1];
      maxScroll = lastPos.center - containerWidth / 2;
      if (maxScroll < 0) maxScroll = 0;
    }

    function findActiveIndex() {
      const centerPoint = scrollPosition + containerWidth / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      thumbnailPositions.forEach((pos, index) => {
        const distance = Math.abs(pos.center - centerPoint);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    function updateActive(newIndex) {
      if (newIndex === currentIndex) return;

      thumbnails.forEach((t, i) => {
        t.classList.toggle('active', i === newIndex);
      });

      gsap.killTweensOf(mainImage);

      const newSrc = thumbnails[newIndex].dataset.src;
      mainImage.src = newSrc;
      gsap.fromTo(mainImage,
        { opacity: 0.3, scale: 1.02 },
        {
          opacity: 1,
          scale: 1,
          duration: 0,
          ease: 'power2.out',
          overwrite: true
        }
      );

      currentIndex = newIndex;
    }

    function animate() {
      scrollPosition += (targetScrollPosition - scrollPosition) * 0.15;

      gsap.set(thumbnailTrack, {
        x: -scrollPosition
      });

      const activeIndex = findActiveIndex();
      updateActive(activeIndex);

      animationId = requestAnimationFrame(animate);
    }

    function scrollToPhotoById(photoId) {
      const targetThumb = document.getElementById(photoId);
      if (targetThumb) {
        const index = parseInt(targetThumb.dataset.index || '0');
        const pos = thumbnailPositions[index];
        if (pos) {
          // 即座に位置を設定（スムーズスクロールではなく初期位置として）
          scrollPosition = pos.center - containerWidth / 2;
          scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
          targetScrollPosition = scrollPosition;
          updateActive(index);
        }
      }
    }

    function init() {
      thumbnails.forEach((wrapper) => {
        wrapper.addEventListener('click', () => {
          const index = parseInt(wrapper.dataset.index || '0');
          const pos = thumbnailPositions[index];
          if (pos) {
            targetScrollPosition = pos.center - containerWidth / 2;
            targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
          }
        });
      });

      mainImage.addEventListener('click', () => {
        const id = thumbnails[currentIndex].dataset.id;
        if (id) {
          window.location.href = '/photo/' + id;
        }
      });

      // サムネイル画像の読み込みを待ってからポジションを計算
      const thumbImages = thumbnailTrack.querySelectorAll('img');
      const imagePromises = Array.from(thumbImages).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      });

      Promise.all(imagePromises).then(() => {
        calculatePositions();
        // URLハッシュがあれば該当写真に移動、なければ最初のサムネイルを中央に配置
        const hash = window.location.hash.substring(1);
        if (hash) {
          scrollToPhotoById(hash);
        } else if (thumbnailPositions.length > 0) {
          // 最初のサムネイルを中央に配置
          const pos = thumbnailPositions[0];
          scrollPosition = pos.center - containerWidth / 2;
          scrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
          targetScrollPosition = scrollPosition;
          currentIndex = 0;
        }
      });

      document.addEventListener('wheel', (e) => {
        e.preventDefault();
        targetScrollPosition += e.deltaY * 0.8;
        targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
      }, { passive: false });

      let touchStartX = 0;
      let touchStartScroll = 0;

      document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartScroll = targetScrollPosition;
      }, { passive: false });

      document.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const diff = touchStartX - touchX;
        targetScrollPosition = touchStartScroll + diff;
        targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
      }, { passive: false });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          targetScrollPosition += 150;
        } else if (e.key === 'ArrowLeft') {
          targetScrollPosition -= 150;
        }
        targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));
      });
      animate();
      window.addEventListener('resize', () => {
        containerWidth = thumbnailContainer.offsetWidth;
        calculatePositions();
      });
    }
    init();
}
