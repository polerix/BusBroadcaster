(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  
  let ytPlayer = null;
  let ytReady = false;
  let currentPlayingId = null;
  
  const videoElement = $('#local-video');
  const ytWrapper = $('#youtube-player-wrapper');
  const fallback = $('#fallback-ui');

  // --- YouTube API Setup ---
  window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      playerVars: { 
        'autoplay': 1, 
        'controls': 0, 
        'modestbranding': 1, 
        'rel': 0, 
        'showinfo': 0, 
        'disablekb': 1 
      },
      events: {
        'onReady': () => { ytReady = true; },
        'onStateChange': onPlayerStateChange
      }
    });
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PAUSED) {
      // Logic for enforced play if we're behind schedule?
    }
  }

  // --- State Sync ---
  StationBus.on('MEDIA_STATE_SYNC', (data) => {
    updatePlayback(data.playlist);
  });
  
  StationBus.on('MEDIA_SET_MUTE', (data) => {
    setMuted(data.muted);
  });

  function setMuted(isMuted) {
    videoElement.muted = isMuted;
    if (ytReady && ytPlayer && ytPlayer.mute) {
      if (isMuted) ytPlayer.mute();
      else ytPlayer.unMute();
    }
  }

  function updatePlayback(playlist) {
    if (!playlist || playlist.length === 0) {
      stopAll();
      return;
    }

    const now = Date.now();
    let activeItem = null;

    // Find the item that should be playing based on its startTime and duration
    // Actually, Media Deck should keep it simple: the active item is the one where `now` is between `startTime` and `startTime + duration`
    for (const item of playlist) {
      if (item.startTime <= now && now < (item.startTime + item.duration * 1000)) {
        activeItem = item;
        break;
      }
    }

    if (!activeItem) {
      stopAll();
      return;
    }

    // Determine current playhead position
    const offset = (now - activeItem.startTime) / 1000;

    if (activeItem.id === currentPlayingId) {
      // Sync clock if drifted more than 1 second
      syncClock(activeItem, offset);
      return;
    }

    // New item to play
    playItem(activeItem, offset);
  }

  function playItem(item, offset) {
    console.log(`Playing ${item.title} at ${offset}s`);
    currentPlayingId = item.id;
    fallback.style.display = 'none';

    if (item.type === 'local') {
      ytWrapper.style.display = 'none';
      if (ytReady && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      
      videoElement.style.display = 'block';
      // We need the File object. But a BroadcastChannel can only pass it if it was sent.
      // If item.file is missing (e.g. sent across sessions), this fails.
      // Play Deck needs to be open in the same "session" as Media Deck picker.
      if (item.file) {
        videoElement.src = URL.createObjectURL(item.file);
        videoElement.currentTime = offset;
        videoElement.play().catch(e => console.error("Playback block:", e));
      } else {
        console.warn("Lost File reference for local media.");
        stopAll();
      }
    } else if (item.type === 'youtube') {
      videoElement.style.display = 'none';
      videoElement.pause();
      
      ytWrapper.style.display = 'block';
      if (ytReady && ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById({
          videoId: item.videoId,
          startSeconds: offset
        });
        ytPlayer.playVideo();
      }
    }
  }

  function syncClock(item, offset) {
    if (item.type === 'local') {
      if (Math.abs(videoElement.currentTime - offset) > 1.5) {
        videoElement.currentTime = offset;
      }
    } else if (item.type === 'youtube' && ytReady && ytPlayer) {
      const ytTime = ytPlayer.getCurrentTime();
      if (Math.abs(ytTime - offset) > 2) {
        ytPlayer.seekTo(offset, true);
      }
    }
  }

  function stopAll() {
    currentPlayingId = null;
    videoElement.style.display = 'none';
    videoElement.pause();
    ytWrapper.style.display = 'none';
    if (ytReady && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    fallback.style.display = 'block';
  }

})();
