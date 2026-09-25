const GAP = 380;

function geometry(n) {
  const trackW = 44 + n * GAP + 460;
  const vw = window.innerWidth;
  const centerX = vw / 2 - 60;
  const shift = Math.max(0, centerX - 44);
  const travel = Math.max(0, trackW - (vw - 120) + shift);
  return { centerX, shift, travel };
}

export function initStory(root = document) {
  const section = root.querySelector('[data-story]');
  if (!section) return;

  const track = section.querySelector('[data-story-track]');
  const rail = section.querySelector('[data-story-rail]');
  const baseLine = section.querySelector('[data-story-base-line]');
  const progressLine = section.querySelector('[data-story-progress-line]');
  const progressFill = section.querySelector('[data-story-progress-fill]');
  const end = section.querySelector('[data-story-end]');
  const endTitle = section.querySelector('[data-story-end-title]');

  const items = Array.from(section.querySelectorAll('[data-story-item]')).map((item, i) => {
    item.style.left = `${44 + i * GAP}px`;
    return {
      el: item,
      above: i % 2 === 0,
      x: 44 + i * GAP,
      halo: item.querySelector('[data-story-halo]'),
      dot: item.querySelector('[data-story-dot]'),
      stem: item.querySelector('[data-story-stem]'),
      card: item.querySelector('[data-story-card]'),
      year: item.querySelector('[data-story-year]'),
      title: item.querySelector('[data-story-title]'),
      desc: item.querySelector('[data-story-desc]'),
      tag: item.querySelector('[data-story-tag]'),
    };
  });

  const n = items.length;
  baseLine.style.width = `${n * GAP + 6}px`;
  end.style.left = `${44 + n * GAP}px`;

  let progress = 0;
  let eased = 0;

  const onScroll = () => {
    const rect = track.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const p = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
    if (Math.abs(p - progress) > 0.0008) progress = p;
  };

  const render = () => {
    const { centerX, shift, travel } = geometry(n);
    const p = eased;

    rail.style.transform = `translateX(${shift - p * travel}px)`;
    progressLine.style.width = `${Math.max(6, Math.min((n - 1) * GAP + 6, centerX + 60 - shift + p * travel - 44 + 6))}px`;

    items.forEach(({ above, x, halo, dot, stem, card, year, title, desc, tag }) => {
      const sx = x + shift - p * travel;
      const lit = sx <= centerX + 60;
      const d = Math.abs(sx - centerX);
      const fo = Math.max(0, 1 - d / (GAP * 0.75));
      const ty = lit ? 0 : (above ? -10 : 10);

      card.style.top = `${above ? 194 : 272}px`;
      card.style.transform = above ? `translateY(calc(-100% + ${ty}px))` : `translateY(${ty}px)`;
      card.style.opacity = String(lit ? 0.6 + 0.4 * fo : 0.24 + 0.3 * fo);

      stem.style.top = `${above ? 196 : 236}px`;
      stem.style.background = lit ? 'rgba(79,214,122,0.5)' : 'rgba(244,241,234,0.14)';

      dot.style.background = lit ? '#4fd67a' : '#0a0a0c';
      dot.style.borderColor = lit ? '#4fd67a' : 'rgba(244,241,234,0.3)';
      dot.style.boxShadow = lit ? '0 0 12px 2px rgba(79,214,122,0.55)' : 'none';
      dot.style.transform = `scale(${1 + 0.5 * (lit ? fo : 0)})`;

      halo.style.borderColor = lit ? 'rgba(79,214,122,0.45)' : 'rgba(244,241,234,0.12)';
      halo.style.opacity = String(lit ? 0.7 * fo : 0);
      halo.style.transform = `scale(${0.7 + 0.3 * fo})`;

      year.style.color = lit ? '#4fd67a' : '#55504a';
      title.style.color = lit ? '#f4f1ea' : '#9a958c';
      desc.style.color = lit ? (fo > 0.5 ? '#a7a29a' : '#8a857c') : '#6b665d';

      const tagLit = lit && fo > 0.5;
      tag.style.color = tagLit ? '#4fd67a' : '#55504a';
      tag.style.borderColor = tagLit ? 'rgba(79,214,122,0.3)' : 'rgba(244,241,234,0.1)';
    });

    const endIn = p > 0.9;
    end.style.opacity = endIn ? '1' : '0.25';
    endTitle.style.transform = `translateY(${endIn ? 0 : 12}px)`;

    progressFill.style.width = `${Math.round(p * 100)}%`;
  };

  const tick = () => {
    const next = eased + (progress - eased) * 0.22;
    eased = Math.abs(progress - next) < 0.0004 ? progress : next;
    render();
    requestAnimationFrame(tick);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(onScroll));
  tick();
}
