export function initConnect(root = document) {
  const section = root.querySelector('[data-connect]');
  if (!section) return;

  const copyBtn = section.querySelector('[data-connect-copy]');
  if (copyBtn) {
    let copyTimer = null;
    copyBtn.addEventListener('click', () => {
      const email = 'himanshusekharmohanty1@gmail.com';
      if (navigator.clipboard) navigator.clipboard.writeText(email);
      copyBtn.textContent = 'Copied';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });
  }

  const timeEl = section.querySelector('[data-connect-time]');
  if (timeEl) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
    const updateTime = () => {
      timeEl.textContent = `${formatter.format(new Date())} IST`;
    };
    updateTime();
    setInterval(updateTime, 20000);
  }
}
