(() => {
  const status = document.getElementById('copy-status');
  if (!status) return;
  const statusLabel = status.querySelector('.copy-status-label');
  let hideTimer;

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

  function hideStatus() {
    clearTimeout(hideTimer);
    status.classList.remove('is-visible');
  }

  function showStatus(message, failed = false) {
    clearTimeout(hideTimer);
    status.classList.remove('is-visible');
    statusLabel.textContent = message;
    status.classList.toggle('is-error', failed);
    // Restart the one-shot animation when copying again before dismissal.
    void status.offsetWidth;
    status.classList.add('is-visible');
    hideTimer = setTimeout(hideStatus, failed ? 2800 : 1800);
  }

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-copy-text]');
    if (!trigger) return;
    const text = trigger.dataset.copyText;
    if (!text) return;
    event.preventDefault();
    try {
      await copyText(text);
      const messages = { name: status.dataset.nameSuccess, email: status.dataset.emailSuccess, citation: status.dataset.citationSuccess };
      showStatus(messages[trigger.dataset.copyKind] || status.dataset.emailSuccess);
    } catch (_) {
      showStatus(status.dataset.failure, true);
    }
  });
})();
