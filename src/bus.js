/**
 * STATION BUS - The central nervous system of Bus Broadcaster.
 * Handles inter-deck syncing and inbound automation hooks.
 */
(() => {
  'use strict';

  const BUS_NAME = 'bus_broadcaster_event_bus';
  const channel = new BroadcastChannel(BUS_NAME);

  window.StationBus = {
    // --- Outbound Events ---
    emit(type, payload = {}) {
      channel.postMessage({ type, ...payload, timestamp: Date.now() });
    },

    // --- Inbound Listeners ---
    on(type, callback) {
      channel.addEventListener('message', (e) => {
        if (e.data && e.data.type === type) {
          callback(e.data);
        }
      });
    },

    // --- Hook Engine ---
    // Listens for external triggers (via Browser URL parameters or PostMessage)
    initHooks() {
      // 1. URL Parameter Hooks: e.g. http://localhost:5173/media_deck.html?hook=skip
      const params = new URLSearchParams(window.location.search);
      const hook = params.get('hook');
      if (hook) {
        console.log(`📡 HOOK TRIGGERED: ${hook}`);
        this.emit(`HOOK_${hook.toUpperCase()}`);
        // Clean URL after firing
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      // 2. PostMessage Hooks (from external toolbars or Stream Decks)
      window.addEventListener('message', (e) => {
          if (e.data && e.data.type && e.data.type.startsWith('HOOK_')) {
              this.emit(e.data.type, e.data.payload || {});
          }
      });
    }
  };

  // Auto-init hooks on all decks
  window.StationBus.initHooks();

})();
