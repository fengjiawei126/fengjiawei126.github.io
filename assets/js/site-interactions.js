(() => {
  async function copyText(text) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) {
        // Embedded previews may deny clipboard permission; retain a user-gesture fallback.
      }
    }
    const focused = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.className = 'copy-fallback';
    field.readOnly = true;
    document.body.append(field);
    let copied = false;
    try {
      field.select();
      copied = document.execCommand('copy');
    } finally {
      field.remove();
      focused?.focus({ preventScroll: true });
    }
    if (!copied) throw new Error('Clipboard unavailable');
  }

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-copy-text]');
    if (!trigger) return;
    const text = trigger.dataset.copyText;
    if (!text) return;
    event.preventDefault();
    try {
      await copyText(text);
    } catch (error) {
      console.warn('Copy failed:', error);
    }
  });
})();
