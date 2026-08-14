async function go() {
  const mod = await import('https://esm.run/obs-websocket-js@5.0.5');
  console.log(Object.keys(mod));
  console.log('default keys:', Object.keys(mod.default || {}));
}
go();
