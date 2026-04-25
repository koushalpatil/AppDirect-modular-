/**
 * Parse common video hosts for embed / thumbnail URLs (public product pages).
 */

export function getYoutubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const raw = url.trim();
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'www.youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.split('/')[2];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      const v = u.searchParams.get('v');
      return v && /^[\w-]{11}$/.test(v) ? v : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function getVimeoId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    if (!u.hostname.replace(/^www\./, '').includes('vimeo.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getVideoEmbedSrc(url) {
  const yt = getYoutubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0`;
  const vm = getVimeoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return null;
}

export function getVideoPosterThumb(url) {
  const yt = getYoutubeId(url);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

export function isDirectVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().split('?')[0].toLowerCase();
  return ['.mp4', '.webm', '.ogg', '.mov', '.m3u8'].some((ext) => lower.endsWith(ext));
}
