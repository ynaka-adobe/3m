export default function decorate(block) {
  const rows = [...block.children];

  // Background row (first row) — may contain video link or image
  if (rows.length > 0) {
    const bgRow = rows[0];
    const videoLink = bgRow.querySelector('a[href*=".mp4"]');

    if (videoLink) {
      const poster = videoLink.querySelector('img');
      const video = document.createElement('video');
      video.src = videoLink.href;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      if (poster) video.poster = poster.src;
      videoLink.replaceWith(video);
      video.play().catch(() => {});
    }
  }
}
