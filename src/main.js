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

  const elBattery = $('#batteryValue');
  const elBatteryBar = $('#batteryBarFill');
  const elDiesel = $('#dieselValue');
  const elDieselBar = $('#dieselBarFill');
  const elMode = $('#modeValue');
  const elMoney = $('#moneyValue');
  const elGenerator = $('#btnGenerator');
  const elDrive = $('#btnDrive');

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

    // Phase 2
    battery: 100,
    diesel: 100,
    generatorOn: false,
    driving: false,
    money: 0,

    // rates (units per second)
    battDrainBase: 2.5,
    battDrainMax: 10.0,
    genChargeRate: 9.0,
    genDieselRate: 3.5,
    driveDieselRate: 2.2,
    donationRate: 0.04, // $ per viewership-second baseline
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
    if (on && state.battery <= 0.1) return; // can't transmit with dead battery

    state.broadcasting = !!on;
    elBroadcast.textContent = state.broadcasting ? 'Stop Broadcast' : 'Start Broadcast';
    elBroadcast.dataset.on = state.broadcasting ? '1' : '0';

    const mode = state.driving ? 'DRIVING' : 'PARKED';
    elStatus.textContent = state.broadcasting
      ? `TRANSMITTING… (${mode}) Police heat rising.`
      : 'OFF AIR. Cooling down.';
  }

  function reset() {
    state.broadcasting = false;
    state.generatorOn = false;
    state.driving = false;
    state.heat = 0;
    state.viewership = 0;
    state.battery = 100;
    state.diesel = 100;
    state.money = 0;
    state.gameOver = false;
    $('#gameOver').style.display = 'none';
    setBroadcasting(false);
    if (elGenerator) { elGenerator.dataset.on = '0'; }
    if (elDrive) { elDrive.dataset.on = '0'; }
  }

  elBroadcast.addEventListener('click', () => setBroadcasting(!state.broadcasting));
  $('#btnReset').addEventListener('click', reset);

  if (elGenerator) {
    elGenerator.addEventListener('click', () => {
      state.generatorOn = !state.generatorOn;
      elGenerator.dataset.on = state.generatorOn ? '1' : '0';
    });
  }
  if (elDrive) {
    elDrive.addEventListener('click', () => {
      state.driving = !state.driving;
      elDrive.dataset.on = state.driving ? '1' : '0';
      if (elMode) elMode.textContent = state.driving ? 'DRIVING' : 'PARKED';
    });
  }

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

      // Phase 2: battery/diesel/generator/driving dynamics
      // Generator burns diesel to charge battery, but adds signature pressure.
      if (state.generatorOn && state.diesel > 0) {
        const burn = state.genDieselRate * dt;
        state.diesel = Math.max(0, state.diesel - burn);
        const charge = state.genChargeRate * dt;
        state.battery = clamp(state.battery + charge, 0, 100);
        // generator adds some heat even if not broadcasting
        state.heat += 0.35 * dt;
        if (state.diesel <= 0.01) state.generatorOn = false;
      }

      // Driving drains diesel
      if (state.driving) {
        const burn = state.driveDieselRate * dt;
        state.diesel = Math.max(0, state.diesel - burn);
        if (state.diesel <= 0.01) state.driving = false;
      }

      const heatRate = state.heatRateBase + (state.heatRateMax - state.heatRateBase) * k;
      const viewGain = state.viewGainBase + (state.viewGainMax - state.viewGainBase) * k;
      const battDrain = state.battDrainBase + (state.battDrainMax - state.battDrainBase) * k;

      if (state.broadcasting) {
        // mobility penalty: broadcasting while driving increases signature (heat rate)
        const sig = state.driving ? 1.55 : 1.0;
        state.heat += heatRate * dt * sig;
        state.viewership += viewGain * dt;
        state.battery = Math.max(0, state.battery - battDrain * dt);

        // donations based on viewership
        state.money += state.viewership * state.donationRate * dt * (0.6 + 0.9 * k);

        if (state.battery <= 0.01) {
          state.broadcasting = false;
          elBroadcast.textContent = 'Start Broadcast';
          elBroadcast.dataset.on = '0';
          elStatus.textContent = 'BATTERY EMPTY. OFF AIR.';
        }
      } else {
        state.heat -= state.coolRate * dt;
        state.viewership -= state.viewDecay * dt;
      }

      state.heat = clamp(state.heat, 0, 100);
      state.viewership = clamp(state.viewership, 0, 9999);
      state.money = Math.max(0, state.money);

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

    if (elBattery) elBattery.textContent = `${Math.floor(state.battery)}`;
    if (elBatteryBar) elBatteryBar.style.width = `${state.battery.toFixed(1)}%`;

    if (elDiesel) elDiesel.textContent = `${Math.floor(state.diesel)}`;
    if (elDieselBar) elDieselBar.style.width = `${state.diesel.toFixed(1)}%`;

    if (elMode) elMode.textContent = state.driving ? 'DRIVING' : 'PARKED';
    if (elMoney) elMoney.textContent = `$${Math.floor(state.money)}`;
    if (elGenerator) elGenerator.dataset.on = state.generatorOn ? '1' : '0';
    if (elDrive) elDrive.dataset.on = state.driving ? '1' : '0';

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
