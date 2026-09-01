/**
 * Bulletproof Print Helper:
 * 1. Tags body with `is-printing-document`
 * 2. Tags target element with `printable-document-target`
 * 3. Triggers window.print()
 * 4. Cleans up on print finish or timeout
 */

export function printElement(elementId, title = 'طباعة مستند رسمي') {
  let element = document.getElementById(elementId);
  
  if (!element) {
    window.print();
    return;
  }

  // Ensure element has the target class
  element.classList.add('printable-document-target');
  document.body.classList.add('is-printing-document');

  // Change page title temporarily for printer filename
  const originalTitle = document.title;
  if (title) document.title = title;

  const cleanup = () => {
    document.body.classList.remove('is-printing-document');
    if (element) element.classList.remove('printable-document-target');
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Trigger print
  setTimeout(() => {
    window.print();
    // Fallback cleanup in case afterprint does not fire
    setTimeout(cleanup, 2500);
  }, 100);
}
