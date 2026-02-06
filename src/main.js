// Bus Broadcaster — Phase 1 MVP
// - Basic top-down bus
// - Toggle Broadcast on/off
// - Police Heat increases while broadcasting
// - Game Over at Heat >= 100%

(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const canvas = $('#game');
  const ctx = canvas.getContext('2d');

  // UI
  const elHeat = $('#heatValue');
  const elHeatBar = $('#heatBarFill');
  const elBroadcast = $('#btnBroadcast');
  const elStatus = $('#statusLine');
  const elView = $('#viewershipValue');
  const elStrength = $('#strength');
  const elStrengthValue = $('#strengthValue');

  // State
  const state = {
    broadcasting: false,
    heat: 0,
    heatRateBase: 4.5,  // %/s baseline at 0 strength
    heatRateMax: 10.0,  // %/s at 100 strength
    coolRate: 3.0,      // % per second while not broadcasting
    gameOver: false,
    tLast: 0,

    strength: 50, // 0..100
    viewership: 0,
    viewGainBase: 0.8,
    viewGainMax: 6.0,
    viewDecay: 1.2,
  };

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);

  function setBroadcasting(on) {
    if (state.gameOver) return;
    state.broadcasting = !!on;
    elBroadcast.textContent = state.broadcasting ? 'Stop Broadcast' : 'Start Broadcast';
    elBroadcast.dataset.on = state.broadcasting ? '1' : '0';
    elStatus.textContent = state.broadcasting
      ? 'TRANSMITTING… Police heat rising.'
      : 'OFF AIR. Cooling down.';
  }

  function reset() {
    state.broadcasting = false;
    state.heat = 0;
    state.viewership = 0;
    state.gameOver = false;
    $('#gameOver').style.display = 'none';
    setBroadcasting(false);
  }

  elBroadcast.addEventListener('click', () => setBroadcasting(!state.broadcasting));
  $('#btnReset').addEventListener('click', reset);

  function setStrength(v) {
    state.strength = clamp(v | 0, 0, 100);
    if (elStrengthValue) elStrengthValue.textContent = String(state.strength);
  }
  if (elStrength) {
    elStrength.addEventListener('input', () => setStrength(parseInt(elStrength.value || '0', 10)));
    setStrength(parseInt(elStrength.value || '50', 10));
  }

  function drawBusTopDown(cx0, cy0) {
    // Simple lo-fi sprite: bus body + windows
    const w = 140;
    const h = 70;

    ctx.save();
    ctx.translate(cx0, cy0);

    // shadow-ish outline (not a blur)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);

    // body
    ctx.fillStyle = '#2b2f38';
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // roof stripe
    ctx.fillStyle = '#3a4150';
    ctx.fillRect(-w / 2, -h / 2, w, 10);

    // windows
    ctx.fillStyle = '#0e1420';
    for (let i = -3; i <= 3; i++) {
      ctx.fillRect(i * 18 - 8, -h / 2 + 16, 14, 20);
    }

    // antenna mast
    ctx.strokeStyle = '#c8d2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, -h / 2);
    ctx.lineTo(30, -h / 2 - 18);
    ctx.stroke();

    // headlights
    ctx.fillStyle = '#ffd25f';
    ctx.fillRect(-w / 2 + 8, h / 2 - 14, 10, 6);
    ctx.fillRect(w / 2 - 18, h / 2 - 14, 10, 6);

    ctx.restore();
  }

  function draw(t) {
    const dt = state.tLast ? Math.min(0.05, (t - state.tLast) / 1000) : 0;
    state.tLast = t;

    // update heat + viewership
    if (!state.gameOver) {
      const k = state.strength / 100;
      const heatRate = state.heatRateBase + (state.heatRateMax - state.heatRateBase) * k;
      const viewGain = state.viewGainBase + (state.viewGainMax - state.viewGainBase) * k;

      if (state.broadcasting) {
        state.heat += heatRate * dt;
        state.viewership += viewGain * dt;
      } else {
        state.heat -= state.coolRate * dt;
        state.viewership -= state.viewDecay * dt;
      }

      state.heat = clamp(state.heat, 0, 100);
      state.viewership = clamp(state.viewership, 0, 9999);

      if (state.heat >= 100) {
        state.gameOver = true;
        state.broadcasting = false;
        $('#gameOver').style.display = 'block';
        elStatus.textContent = 'SIGNAL PINPOINTED. Cut the feed next time.';
        elBroadcast.textContent = 'Broadcast Locked';
        elBroadcast.dataset.on = '0';
      }
    }

    // UI
    elHeat.textContent = `${state.heat.toFixed(0)}%`;
    elHeatBarFill.style.width = `${state.heat.toFixed(1)}%`;
    if (elView) elView.textContent = `${Math.floor(state.viewership)}`;

    // render
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // background
    ctx.fillStyle = '#070912';
    ctx.fillRect(0, 0, w, h);

    // subtle scanline
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

    // interior panel
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(14, 14, w - 28, h - 28);

    // bus
    drawBusTopDown(w / 2, h / 2 + 10);

    // broadcast indicator
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = state.broadcasting ? '#ffd25f' : 'rgba(232,236,255,0.75)';
    ctx.fillText(state.broadcasting ? 'UHF: LIVE' : 'UHF: OFF', 22, 36);

    // heat label
    ctx.fillStyle = 'rgba(232,236,255,0.75)';
    ctx.fillText('POLICE HEAT', 22, 54);

    requestAnimationFrame(draw);
  }

  // boot
  resize();
  reset();
  requestAnimationFrame(draw);
})();
