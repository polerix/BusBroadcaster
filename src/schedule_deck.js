/**
 * SCHEDULE DECK - Visual 24/4 Timeline Manager
 */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const timeline = $('#timeline');
  const liveLine = $('#live-line');
  const timeDisplay = $('#current-time-display');
  const blocksContainer = $('#blocks-container');
  const timeMarks = $('#time-marks');
  const scroller = $('#scroller');

  const PX_PER_SEC = 2; // 1 hour = 7200px (120px per min)
  
  let playlist = [];

  function init() {
    renderTimeMarks();
    loadState();
    
    // Listen for updates from Media Deck
    StationBus.on('MEDIA_STATE_SYNC', (data) => {
        playlist = data.playlist;
        renderTimeline();
    });

    requestAnimationFrame(tick);
  }

  async function loadState() {
    const log = await MediaStore.get(MediaStore.STORES.PROGRAM_LOG, 'active_log');
    if (log) {
        playlist = log;
        renderTimeline();
    }
  }

  function renderTimeMarks() {
    timeMarks.innerHTML = '';
    // Map out 24 hours starting from midnight TODAY
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
    for (let i = 0; i < 48; i++) { // 48 half-hour marks
        const mark = document.createElement('div');
        mark.className = 'timeline-mark';
        const time = new Date(startOfDay.getTime() + (i * 30 * 60 * 1000));
        mark.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        mark.style.left = `${(i * 30 * 60) * PX_PER_SEC}px`;
        timeMarks.appendChild(mark);
    }
  }

  function renderTimeline() {
    blocksContainer.innerHTML = '';
    if (playlist.length === 0) return;

    // Anchor: Midnight Today
    const anchor = new Date();
    anchor.setHours(0,0,0,0);
    const anchorTime = anchor.getTime();

    playlist.forEach(item => {
        const div = document.createElement('div');
        div.className = `timeline-item ${item.isStationId ? 'station-id' : ''}`;
        
        const relativeStart = (item.startTime - anchorTime) / 1000;
        const width = item.duration;
        
        div.style.left = `${relativeStart * PX_PER_SEC}px`;
        div.style.width = `${width * PX_PER_SEC}px`;
        
        div.innerHTML = `
            <div class="item-title">${item.title}</div>
            <div class="item-duration">${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s</div>
        `;
        
        div.onclick = () => {
            // Tell Media Deck to target this item
            StationBus.emit('UI_TARGET_ITEM', { id: item.id });
        };

        blocksContainer.appendChild(div);
    });
  }

  function tick() {
    const now = Date.now();
    const date = new Date(now);
    timeDisplay.textContent = date.toLocaleTimeString([], { hour12: false });

    // Anchor: Midnight Today
    const anchor = new Date();
    anchor.setHours(0,0,0,0);
    const relativeNow = (now - anchor.getTime()) / 1000;
    
    const left = relativeNow * PX_PER_SEC;
    liveLine.style.left = `${left}px`;
    
    // Auto-scroll to keep live line in view (if not manually scrolling)
    // We can implement a "Lock to Playhead" toggle later
    
    requestAnimationFrame(tick);
  }

  init();

})();
