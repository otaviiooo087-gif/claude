function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('instagram.com')) return 'Instagram';
  if (host.includes('tiktok.com')) return 'TikTok';
  if (host.includes('youtube.com')) return 'YouTube';
  return 'Unknown';
}

function getVideoInfo() {
  const video = document.querySelector('video');
  if (!video) return null;

  return {
    platform: detectPlatform(),
    duration: video.duration || 0,
    currentTime: video.currentTime || 0,
    paused: video.paused,
    hasAudio: video.mozHasAudio !== undefined
      ? video.mozHasAudio
      : Boolean(video.webkitAudioDecodedByteCount),
    url: window.location.href
  };
}

function ensureVideoPlaying() {
  const video = document.querySelector('video');
  if (video && video.paused) {
    video.play().catch(() => {});
    return true;
  }
  return false;
}

function seekVideoToStart() {
  const video = document.querySelector('video');
  if (video) {
    video.currentTime = 0;
    video.play().catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_VIDEO_INFO') {
    sendResponse(getVideoInfo());
  }

  if (message.type === 'PLAY_FROM_START') {
    seekVideoToStart();
    sendResponse({ success: true });
  }

  if (message.type === 'ENSURE_PLAYING') {
    const started = ensureVideoPlaying();
    sendResponse({ started });
  }
});
