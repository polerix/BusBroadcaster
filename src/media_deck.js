(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  
  let playlist = []; // Array of { id, type, file?, videoId?, title, startTime, duration }
  let activeId = null;
  let stationIdFiles = []; // Pool of station ID files
  
  const playlistContainer = $('#playlist-container');
  const playlistScroller = $('#playlist-scroller');
  const liveLine = $('#live-line');
  const currentClock = $('#current-clock');
  const statusDisplay = $('#playback-status');
  const saveStatus = $('#save-status');
  const reauthOverlay = $('#reauth-overlay');
  const { STORES } = window.MediaStore;

  function init() {
    setupEventListeners();
    initCrates();
    initBusListeners();
    loadState().then(() => {
      requestAnimationFrame(tick);
    });
  }

  function initBusListeners() {
    StationBus.on('HOOK_SKIP', () => {
        if (playlist.length > 1) {
            console.log("📡 HOOK: Skipping current track");
            const item = playlist.shift(); // Remove current
            recalculateSchedule();
            renderPlaylist();
            broadcastSync();
            saveState();
        }
    });

    StationBus.on('UI_TARGET_ITEM', (data) => {
        activeId = data.id;
        renderPlaylist();
        centerOnActive();
        broadcastSync();
    });
  }

  async function initCrates() {
    const defaults = ["MOVIES", "MUSIC VIDEOS", "TV SHOWS", "ADS", "INTERLUDES"];
    for (const name of defaults) {
        const existing = await MediaStore.get(STORES.CRATES, name);
        if (!existing) {
            await MediaStore.put(STORES.CRATES, name, { name, handle: null });
        }
    }
    renderCrates();
    renderPlaylists();
  }

  function setupEventListeners() {
    $('#file-input').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const f of files) {
        const duration = await getMediaDuration(f);
        addItem({ type: 'local', file: f, title: f.name, duration });
      }
      e.target.value = '';
    });

    $('#btn-yt-add').addEventListener('click', () => {
      const url = $('#yt-input').value.trim();
      if (!url) return;
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (match && match[1]) {
        // We assume 10 minutes for YT if duration is unknown, or we could fetch it via API
        addItem({ type: 'youtube', videoId: match[1], title: `YouTube: ${match[1]}`, duration: 600 });
        $('#yt-input').value = '';
      } else {
        alert("Invalid YouTube URL");
      }
    });

    $('#btn-target').addEventListener('click', centerOnActive);
    
    // Drag and Drop
    const scroller = $('#playlist-scroller');
    const overlay = $('#drop-overlay');

    scroller.addEventListener('dragover', (e) => {
      e.preventDefault();
      overlay.style.display = 'flex';
    });
    
    overlay.addEventListener('dragleave', (e) => {
      // Only hide if we are truly leaving the overlay (not entering one of its children)
      if (e.relatedTarget && (overlay.contains(e.relatedTarget))) return;
      overlay.style.display = 'none';
    });

    // We must prevent default on these to allow "dropping"
    $('#drop-replace').addEventListener('dragover', (e) => e.preventDefault());
    $('#drop-append').addEventListener('dragover', (e) => e.preventDefault());

    $('#drop-replace').addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
      if (files.length > 0) addItemsBatch(files, true);
      overlay.style.display = 'none';
    });

    $('#drop-append').addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      let files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
      
      // Check if it's a drag from our own library
      if (files.length === 0 && window._lastLibraryDrag) {
          files = [window._lastLibraryDrag];
          window._lastLibraryDrag = null;
      }

      if (files.length > 0) addItemsBatch(files, false);
      overlay.style.display = 'none';
    });

    // Also support dropping library items onto specific indices in the playlist

    // Folder Scanning
    $('#btn-folder-scan').addEventListener('click', handleFolderScan);
    $('#btn-id-scan').addEventListener('click', handleIdScan);
    $('#btn-reauth').addEventListener('click', handleReauth);
    $('#btn-relink-fallback').addEventListener('click', handleManualRelink);

    // Library Drawer
    $('#btn-library-toggle').addEventListener('click', () => {
      libraryDrawer.classList.toggle('open');
      if (libraryDrawer.classList.contains('open')) {
          refreshLibraryTree();
          renderCrates();
          renderPlaylists();
      }
    });
    $('#btn-tree-refresh').addEventListener('click', () => {
        refreshLibraryTree();
        renderCrates();
    });

    $('#library-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.tree-file').forEach(el => {
            const visible = el.textContent.toLowerCase().includes(term);
            el.parentElement.style.display = visible ? 'block' : 'none';
        });
    });

    window.addEventListener('mousedown', (e) => {
        if (!contextMenu.contains(e.target)) contextMenu.style.display = 'none';
    });

    // Watch for rule changes to trigger save
    $('#scan-rule').onchange = saveState;
    $('#interleave-count').oninput = saveState;
    $('#interleave-hour').oninput = saveState;
  }

  async function handleReauth() {
    try {
      const mainHandle = await MediaStore.get(STORES.HANDLES, 'main_folder');
      const idHandle = await MediaStore.get(STORES.HANDLES, 'ids_folder');
      
      console.log("Attempting re-auth with handles", { mainHandle, idHandle });

      if (mainHandle) {
        const perm = await mainHandle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') {
            alert("Permission for Main Library was not granted. Please try again or re-scan the folder.");
            return;
        }
      }
      if (idHandle) {
        const perm = await idHandle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') {
            alert("Permission for Station IDs was not granted.");
            return;
        }
      }
      
      await restoreLibraries(mainHandle, idHandle);
      reauthOverlay.style.display = 'none';
      saveStatus.textContent = 'LIBRARIES RESTORED';
      saveState();
    } catch (err) {
      console.error("Re-auth failed", err);
      alert(`Re-authorization failed: ${err.message}. You may need to use the 'RE-LINK MANUALLY' button.`);
    }
  }

  async function handleManualRelink() {
    alert("Please re-select your Main Media folder.");
    await handleFolderScan();
    alert("Please re-select your Station ID folder (if you were using one).");
    await handleIdScan();
    reauthOverlay.style.display = 'none';
  }

  async function restoreLibraries(mainHandle, idHandle) {
    statusDisplay.textContent = 'RESTORING...';
    
    const allFiles = [];
    if (mainHandle) await readDirectory(mainHandle, allFiles);
    
    const idFiles = [];
    if (idHandle) {
      await readDirectory(idHandle, idFiles);
      stationIdFiles = idFiles;
    }

    // Match files back to playlist items
    for (const item of playlist) {
        if (item.type === 'local') {
            const match = (item.isStationId ? idFiles : allFiles).find(f => f.name === item.title);
            if (match) item.file = match;
        }
    }
    
    renderPlaylist();
    broadcastSync();
    statusDisplay.textContent = 'SYNCED';
    refreshLibraryTree();
  }

  async function refreshLibraryTree() {
    const mainHandle = await MediaStore.get(STORES.HANDLES, 'main_folder');
    if (!mainHandle) return;
    
    treeLibrary.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'tree-node expanded';
    root.innerHTML = `
        <div class="tree-item tree-folder">
            <div class="tree-triangle"></div>
            <span>MAIN LIBRARY</span>
        </div>
    `;
    const children = document.createElement('div');
    children.className = 'tree-children';
    await renderDirectoryTree(mainHandle, children);
    root.appendChild(children);
    treeLibrary.appendChild(root);
    
    // Add toggle for root
    root.querySelector('.tree-item').onclick = () => root.classList.toggle('expanded');
  }

  async function renderCrates() {
    const crates = await MediaStore.getAll(STORES.CRATES);
    treeCrates.innerHTML = '';
    
    for (const crate of crates) {
        const div = document.createElement('div');
        div.className = 'tree-node';
        const isLinked = !!crate.handle;
        
        div.innerHTML = `
            <div class="tree-item tree-folder">
                <div class="tree-triangle" style="${isLinked ? '' : 'visibility:hidden'}"></div>
                <span style="flex:1">${crate.name}</span>
                <span class="crate-link-btn">${isLinked ? 'REFRESH' : 'LINK'}</span>
            </div>
        `;
        
        const children = document.createElement('div');
        children.className = 'tree-children';
        div.appendChild(children);
        
        const btn = div.querySelector('.crate-link-btn');
        btn.onclick = async (e) => {
            e.stopPropagation();
            const handle = await window.showDirectoryPicker();
            await MediaStore.put(STORES.HANDLES, `crate_${crate.name}`, handle);
            await MediaStore.put(STORES.CRATES, crate.name, { ...crate, handle: true });
            renderCrates();
        };

        if (isLinked) {
            const handle = await MediaStore.get(STORES.HANDLES, `crate_${crate.name}`);
            if (handle) {
                // Check permission
                if (await handle.queryPermission() === 'granted') {
                    await renderDirectoryTree(handle, children);
                } else {
                    btn.textContent = 'RE-AUTH';
                }
            }
            div.querySelector('.tree-item').onclick = () => div.classList.toggle('expanded');
        }
        
        treeCrates.appendChild(div);
    }
  }

  async function renderPlaylists() {
    const playlists = await MediaStore.getAll(STORES.SAVED_PLAYLISTS);
    treePlaylists.innerHTML = '';
    if (playlists.length === 0) {
        treePlaylists.innerHTML = '<div style="opacity:0.2; padding:10px; font-size:8px;">No saved playlists</div>';
        return;
    }
    // ... logic for rendering saved playlists
  }

  async function renderDirectoryTree(dirHandle, container) {
    for await (const entry of dirHandle.values()) {
        const div = document.createElement('div');
        div.className = 'tree-node';
        
        if (entry.kind === 'directory') {
            div.innerHTML = `
                <div class="tree-item tree-folder">
                    <div class="tree-triangle"></div>
                    <span>${entry.name}</span>
                </div>
            `;
            const children = document.createElement('div');
            children.className = 'tree-children';
            div.appendChild(children);
            
            div.querySelector('.tree-item').onclick = (e) => {
                e.stopPropagation();
                div.classList.toggle('expanded');
            };
            
            renderDirectoryTree(entry, children);
        } else {
            const file = await entry.getFile();
            if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
                div.innerHTML = `
                    <div class="tree-item tree-file" draggable="true">
                        <div style="width:10px"></div>
                        <span style="flex:1">${entry.name}</span>
                    </div>
                `;
                const label = div.querySelector('.tree-item');
                label.ondragstart = (e) => {
                    window._lastLibraryDrag = file;
                    e.dataTransfer.setData('text/media-library', file.name);
                };
                label.onclick = () => addItemsBatch([file], false);
                label.oncontextmenu = (e) => handleContextMenu(e, { ...file, title: file.name, type: 'local' }, 'library');
            }
        }
        container.appendChild(div);
    }
  }

  function handleContextMenu(e, item, source) {
    e.preventDefault();
    contextMenu.innerHTML = '';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.display = 'block';

    if (source === 'playlist') {
        addMenuItem('📜 SHOW PROPERTIES', () => showProperties(item));
        addMenuItem('🎯 TARGET ITEM', () => { activeId = item.id; renderPlaylist(); centerOnActive(); broadcastSync(); });
        addMenuSep();
        addMenuItem('❌ REMOVE FROM SCHEDULE', () => removeItem(item.id), true);
    } else if (source === 'library') {
        addMenuItem('📜 SHOW PROPERTIES', () => showProperties(item));
        addMenuItem('＋ ADD TO SCHEDULE', () => addItemsBatch([item], false));
    }
  }

  function addMenuItem(text, action, isDanger = false) {
    const div = document.createElement('div');
    div.className = `menu-item ${isDanger ? 'danger' : ''}`;
    div.textContent = text;
    div.onclick = () => { action(); contextMenu.style.display = 'none'; };
    contextMenu.appendChild(div);
  }

  function addMenuSep() {
    const div = document.createElement('div');
    div.className = 'menu-sep';
    contextMenu.appendChild(div);
  }

  function removeItem(itemId) {
    const idx = playlist.findIndex(i => i.id === itemId);
    if (idx > -1) {
        playlist.splice(idx, 1);
        recalculateSchedule();
        renderPlaylist();
        broadcastSync();
        saveState();
    }
  }

  function showProperties(item) {
    propertiesList.innerHTML = `
        <div class="prop-row"><span class="prop-label">TITLE:</span><span class="prop-val">${item.title}</span></div>
        <div class="prop-row"><span class="prop-label">TYPE:</span><span class="prop-val">${item.type.toUpperCase()}</span></div>
        <div class="prop-row"><span class="prop-label">DURATION:</span><span class="prop-val">${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s</span></div>
        ${item.startTime ? `<div class="prop-row"><span class="prop-label">START TIME:</span><span class="prop-val">${new Date(item.startTime).toLocaleTimeString()}</span></div>` : ''}
        ${item.videoId ? `<div class="prop-row"><span class="prop-label">YOUTUBE ID:</span><span class="prop-val">${item.videoId}</span></div>` : ''}
    `;
    propertiesModal.style.display = 'flex';
  }

  async function handleIdScan() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await MediaStore.put(STORES.HANDLES, 'ids_folder', dirHandle);
      stationIdFiles = [];
      $('#id-path').textContent = `SYNCED ID POOL: ${dirHandle.name}`;
      await readDirectory(dirHandle, stationIdFiles);
      
      if (stationIdFiles.length === 0) {
        alert("No media files found in Station ID folder.");
      } else {
        statusDisplay.textContent = `LOADED ${stationIdFiles.length} STATION IDs`;
        saveState();
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  }

  async function handleFolderScan() {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await MediaStore.put(STORES.HANDLES, 'main_folder', dirHandle);
      const files = [];
      const rule = $('#scan-rule').value;
      
      statusDisplay.textContent = 'SCANNING FOLDER...';
      $('#sync-path').textContent = `SYNCED: ${dirHandle.name}`;
      
      await readDirectory(dirHandle, files);
      
      if (files.length === 0) {
        alert("No supported media files found in selected folder.");
        return;
      }
      
      applyBroadcasterRule(files, rule);
      
      // Batch add (Replace existing for a fresh scan)
      await addItemsBatch(files, true);
      saveState();
      
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
      statusDisplay.textContent = 'READY';
    }
  }

  async function readDirectory(dirHandle, fileList) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          fileList.push(file);
        }
      } else if (entry.kind === 'directory') {
        await readDirectory(entry, fileList);
      }
    }
  }

  function applyBroadcasterRule(files, rule) {
    if (rule === 'sequential') {
      files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    } else if (rule === 'shuffle') {
      for (let i = files.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [files[i], files[j]] = [files[j], files[i]];
      }
    }
  }

  async function addItemsBatch(files, replaceExisting) {
    if (replaceExisting) {
      playlist = [];
      activeId = null;
    }

    const interleaveInterval = parseInt($('#interleave-count').value) || 0;
    const hourInterval = parseInt($('#interleave-hour').value) || 0;
    
    // If we have Station IDs and rules, inject them into the set before processing
    let finalFileSet = [...files];
    if (stationIdFiles.length > 0 && (interleaveInterval > 0 || hourInterval > 0)) {
        finalFileSet = injectStationIds(files, stationIdFiles, { interleaveInterval, hourInterval });
    }
    
    let count = 0;
    for (const f of finalFileSet) {
      count++;
      statusDisplay.textContent = `SCHEDULING (${count}/${finalFileSet.length})...`;
      const duration = await getMediaDuration(f);
      addItem({ type: 'local', file: f, title: f.name, duration, isStationId: f.hasOwnProperty('_isId') });
    }
    statusDisplay.textContent = 'READY';
    saveState();
  }

  async function saveState() {
    const settings = {
        scanRule: $('#scan-rule').value,
        interleaveCount: $('#interleave-count').value,
        interleaveHour: $('#interleave-hour').value,
        syncPath: $('#sync-path').textContent,
        idPath: $('#id-path').textContent
    };
    
    // Program log is its own store (might be very large)
    const log = playlist.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        startTime: item.startTime,
        duration: item.duration,
        isStationId: item.isStationId || false
    }));

    await MediaStore.put(STORES.SETTINGS, 'media_deck_settings', settings);
    await MediaStore.put(STORES.PROGRAM_LOG, 'active_log', log);
    
    saveStatus.textContent = 'DATABASE UPDATED';
    saveStatus.style.opacity = '1';
    setTimeout(() => saveStatus.style.opacity = '0.4', 1000);
  }

  async function loadState() {
    try {
        const settings = await MediaStore.get(STORES.SETTINGS, 'media_deck_settings');
        const log = await MediaStore.get(STORES.PROGRAM_LOG, 'active_log');

        if (settings) {
            $('#scan-rule').value = settings.scanRule;
            $('#interleave-count').value = settings.interleaveCount;
            $('#interleave-hour').value = settings.interleaveHour;
            $('#sync-path').textContent = settings.syncPath;
            $('#id-path').textContent = settings.idPath;
        }

        if (log) {
            playlist = log;
        }
        
        // Check if we need re-auth
        const mainHandle = await MediaStore.get(STORES.HANDLES, 'main_folder');
        const idHandle = await MediaStore.get(STORES.HANDLES, 'ids_folder');
        if (mainHandle || idHandle) {
            reauthOverlay.style.display = 'flex';
            if (!window.isSecureContext) {
                $('#reauth-diag').innerHTML = `
                    <span style="color:var(--danger)">⚠️ INSECURE CONTEXT:</span><br>
                    You are loading this as a file (file://). advanced features might be disabled.<br>
                    Run via <b>localhost</b> for best results.
                `;
            }
        }
        
        renderPlaylist();
    } catch (e) {
        console.error("Failed to load state", e);
    }
  }

  function injectStationIds(files, idFiles, { interleaveInterval, hourInterval }) {
    let result = [];
    let itemCount = 0;
    let nextHourTarget = 0;
    
    // Reference time for hour-based breaks
    let currentTime = Date.now();
    if (playlist.length > 0) {
      const last = playlist[playlist.length - 1];
      currentTime = last.startTime + (last.duration * 1000);
    }
    
    // Set first hour target if rule is active
    if (hourInterval > 0) {
      const date = new Date(currentTime);
      date.setHours(date.getHours() + hourInterval, 0, 0, 0);
      nextHourTarget = date.getTime();
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Time-based rule (Highest priority)
        if (hourInterval > 0 && currentTime >= nextHourTarget) {
            const id = idFiles[Math.floor(Math.random() * idFiles.length)];
            const clonedId = new File([id], id.name, { type: id.type });
            clonedId._isId = true;
            result.push(clonedId);
            
            // Note: We don't have duration here yet, so we assume a reasonable 10s for scheduling math
            // Accurate startTimes will be set in the main addItem loop later.
            currentTime += 10000; 
            
            const date = new Date(nextHourTarget);
            date.setHours(date.getHours() + hourInterval);
            nextHourTarget = date.getTime();
            itemCount = 0; // Reset item count when time break occurs
        }

        // 2. Item-based rule
        if (interleaveInterval > 0 && itemCount >= interleaveInterval) {
            const id = idFiles[Math.floor(Math.random() * idFiles.length)];
            const clonedId = new File([id], id.name, { type: id.type });
            clonedId._isId = true;
            result.push(clonedId);
            
            currentTime += 10000;
            itemCount = 0;
        }

        result.push(file);
        itemCount++;
        // Rough estimate increment for time calculation
        currentTime += 60000; 
    }
    return result;
  }

  function addItem(itemData) {
    let startTime = Date.now();
    if (playlist.length > 0) {
      const last = playlist[playlist.length - 1];
      startTime = last.startTime + (last.duration * 1000);
    }
    
    const item = {
      id: Math.random().toString(36).substr(2, 9),
      ...itemData,
      startTime
    };
    
    playlist.push(item);
    renderPlaylist();
    broadcastSync();
    saveState();
  }

  async function getMediaDuration(file) {
    // Check Database Cache first
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    const cached = await MediaStore.get(STORES.MEDIA_LIBRARY, cacheKey);
    if (cached && cached.duration) {
        return cached.duration;
    }

    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const dur = v.duration || 60;
        // Save to cache
        MediaStore.put(STORES.MEDIA_LIBRARY, cacheKey, {
            name: file.name,
            size: file.size,
            duration: dur,
            scannedAt: Date.now()
        });
        resolve(dur);
      };
      v.onerror = () => resolve(60);
      v.src = URL.createObjectURL(file);
    });
  }

  function tick() {
    const now = Date.now();
    const date = new Date(now);
    currentClock.textContent = date.toLocaleTimeString([], { hour12: false });

    updateLiveLine(now);
    
    // Every 1 second, broadcast sync to ensure Play Deck is aligned
    if (Math.floor(now / 1000) % 2 === 0) {
      broadcastSync();
    }

    requestAnimationFrame(tick);
  }

  function updateLiveLine(now) {
    if (playlist.length === 0) {
      liveLine.style.top = '0px';
      return;
    }

    // Find if something is playing or where we are in the schedule
    // Let's map pixels. Each item is 40px in the UI. 1 second = 40px / duration? 
    // No, easier: find the item where now is within bounds.
    let foundActive = false;
    for (let i = 0; i < playlist.length; i++) {
      const item = playlist[i];
      const endTime = item.startTime + (item.duration * 1000);
      
      if (now >= item.startTime && now < endTime) {
        const elapsed = (now - item.startTime) / 1000;
        const percent = elapsed / item.duration;
        const top = (i * 40) + (percent * 40);
        liveLine.style.top = top + 'px';
        
        if (activeId !== item.id) {
          activeId = item.id;
          statusDisplay.textContent = `LIVE: ${item.title}`;
          renderPlaylist(); // Highlight active
        }
        foundActive = true;
        break;
      }
    }
    
    if (!foundActive) {
      if (now < playlist[0].startTime) {
        // We are before the first item
        liveLine.style.top = '0px';
        statusDisplay.textContent = 'WAITING FOR START';
      } else {
        // We are after the last item
        const top = playlist.length * 40;
        liveLine.style.top = top + 'px';
        statusDisplay.textContent = 'PROGRAM ENDED';
      }
      if (activeId !== null) {
        activeId = null;
        renderPlaylist();
      }
    }
  }

  function renderPlaylist() {
    if (playlist.length === 0) {
      playlistContainer.innerHTML = '<div style="opacity:0.4; font-size:10px; text-align:center; padding:40px;">No program scheduled</div>';
      return;
    }
    
    playlistContainer.innerHTML = '';
    playlist.forEach((item, idx) => {
      const startTimeStr = new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const isLive = item.id === activeId;
      
      const div = document.createElement('div');
      div.className = 'playlist-item' + (isLive ? ' active' : '');
      div.draggable = true;
      div.dataset.index = idx;

      // Handle Reorder
      div.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', idx);
        div.classList.add('dragging');
        if (isLive) div.classList.add('drag-warning');
      };
      div.oncontextmenu = (e) => handleContextMenu(e, item, 'playlist');
      div.ondragend = () => {
        div.classList.remove('dragging', 'drag-warning');
        document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('drag-over'));
      };
      div.ondragover = (e) => {
        e.preventDefault();
        div.classList.add('drag-over');
      };
      div.ondragleave = () => {
        div.classList.remove('drag-over');
      };
      div.ondrop = (e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = parseInt(div.dataset.index);
        if (fromIdx !== toIdx) {
            reorderItem(fromIdx, toIdx);
        }
      };

      const isOffline = item.type === 'local' && !item.file;
      
      if (item.isStationId) div.style.borderLeft = '2px solid var(--accent)';
      if (item.isStationId) div.style.background = 'rgba(255, 159, 69, 0.05)';
      if (isOffline) div.style.opacity = '0.4';
      
      div.innerHTML = `
        <span class="item-time">${startTimeStr}</span>
        <span class="item-title">${item.isStationId ? '🆔 ' : ''}${item.title} ${isOffline ? '[OFFLINE]' : ''}</span>
        <span class="item-duration">${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s</span>
      `;
      
      div.onclick = () => {
        // Manual jump: shift the schedule so THIS item starts exactly NOW
        const shift = Date.now() - item.startTime;
        playlist.forEach(p => p.startTime += shift);
        renderPlaylist();
        broadcastSync();
      };
      
      playlistContainer.appendChild(div);
    });
  }

  function reorderItem(from, to) {
    const item = playlist.splice(from, 1)[0];
    playlist.splice(to, 0, item);
    recalculateSchedule();
    renderPlaylist();
    broadcastSync();
    saveState();
  }

  function recalculateSchedule() {
    if (playlist.length === 0) return;
    
    // We base the entire schedule starting from the very first item's startTime
    // if it was set to a fixed historical time, or "Now" if we're starting fresh.
    // To be safe, we'll keep the index 0 startTime as ground truth anchor.
    
    let nextStart = playlist[0].startTime;
    for (const item of playlist) {
        item.startTime = nextStart;
        nextStart += (item.duration * 1000);
    }
  }

  function centerOnActive() {
    const top = parseFloat(liveLine.style.top);
    const scrollHalf = playlistScroller.clientHeight / 2;
    playlistScroller.scrollTo({
      top: top - scrollHalf,
      behavior: 'smooth'
    });
  }

  function broadcastSync() {
    StationBus.emit('MEDIA_STATE_SYNC', {
      playlist: playlist.map(item => ({
        id: item.id,
        type: item.type,
        videoId: item.videoId,
        file: item.file,
        title: item.title,
        startTime: item.startTime,
        duration: item.duration,
        isStationId: item.isStationId
      }))
    });
  }

  init();

})();
