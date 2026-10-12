/* Progressive enhancements. Content, links and native video work without JS. */
'use strict';

// Compact mobile navigation, with an accessible no-JS fallback.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-links');
if (menuButton && navigation) {
  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? '−' : '+';
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.documentElement.classList.add('nav-ready');
}

// A short entrance only; reduced motion and keyboard focus reveal immediately.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !motionPreference.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-pending');
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold: 0.05});
  document.querySelectorAll('.reveal').forEach((element) => {
    element.classList.add('is-pending');
    revealObserver.observe(element);
    element.addEventListener('focusin', () => {
      element.classList.remove('is-pending');
      revealObserver.unobserve(element);
    });
  });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      document.querySelectorAll('.is-pending').forEach(el => el.classList.remove('is-pending'));
      revealObserver.disconnect();
    }
  });
}

// Measure the actual pins, including each card's rotation and subtle movement.
const board = document.querySelector('.hero-board');
if (board) {
  const lines = [...board.querySelectorAll('.board-connections line')];
  let frame = 0, animateUntil = 0;
  const draw = () => {
    frame = 0;
    const bounds = board.getBoundingClientRect();
    lines.forEach(line => {
      [line.dataset.from, line.dataset.to].forEach((id, index) => {
        const pin = document.getElementById(id).getBoundingClientRect();
        line.setAttribute(`x${index + 1}`, pin.left + pin.width / 2 - bounds.left);
        line.setAttribute(`y${index + 1}`, pin.top + pin.height / 2 - bounds.top);
      });
    });
    if (performance.now() < animateUntil) frame = requestAnimationFrame(draw);
  };
  const sync = () => {
    animateUntil = performance.now() + 300;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  new ResizeObserver(sync).observe(board);
  window.addEventListener('resize', sync, {passive:true});
  document.fonts.ready.then(sync);
  board.querySelectorAll('.board-card').forEach(card => {
    new ResizeObserver(sync).observe(card);
    ['pointerenter','pointerleave','focusin','focusout'].forEach(type => card.addEventListener(type,sync));
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      card.addEventListener('pointermove', event => {
        if (motionPreference.matches) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.translate = `${x * 3}px ${y * 3}px`;
        sync();
      });
      card.addEventListener('pointerleave', () => {card.style.translate = '';sync();});
    }
  });
  sync();
}

// Scroll-snap carousels keep their full content accessible without JavaScript.
document.querySelectorAll('.carousel').forEach((carousel) => {
  const track = carousel.querySelector('.carousel-track');
  const slides = [...track.children];
  const previous = carousel.querySelector('[data-previous]');
  const next = carousel.querySelector('[data-next]');
  const status = carousel.querySelector('.carousel-status');
  const currentIndex = () => track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
  const sync = () => {
    const index = currentIndex();
    previous.disabled = index === 0;
    next.disabled = index >= slides.length - 1;
    status.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  };
  const move = (offset) => {
    const index = Math.max(0, Math.min(slides.length - 1, currentIndex() + offset));
    track.scrollTo({left: index * track.clientWidth, behavior: motionPreference.matches ? 'instant' : 'smooth'});
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', sync, {passive: true});
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  window.addEventListener('resize', sync, {passive:true});
  carousel.classList.add('is-enhanced');
  sync();
});

// Native dialog provides keyboard focus containment and Escape dismissal.
const dialog = document.querySelector('.media-dialog');
if (dialog && typeof dialog.showModal === 'function') {
  const image = dialog.querySelector('img');
  const title = dialog.querySelector('#media-title');
  let trigger;
  document.querySelectorAll('a[data-viewer]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      title.textContent = link.dataset.viewer;
      dialog.showModal();
      document.body.classList.add('dialog-open');
    });
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    trigger?.focus();
  });
}

// Avoid simultaneous audio when exploring the films.
document.querySelectorAll('video').forEach((video) => {
  video.addEventListener('play', () => {
    document.querySelectorAll('video').forEach((other) => { if (other !== video) other.pause(); });
  });
});
