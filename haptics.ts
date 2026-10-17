export function vibrateSuccess(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([25, 40, 25]);
    } catch {}
  }
}

export function vibrateNotice(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(35);
    } catch {}
  }
}
