export function initAbout(root = document) {
  const about = root.querySelector('[data-about]');
  if (!about) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      about.classList.add('is-in');
      observer.disconnect();
    }
  }, { threshold: 0.15 });

  observer.observe(about);
}
