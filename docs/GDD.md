# Bus Broadcaster — Game Design Doc (Draft)

## Elevator pitch
A stealth + resource-management sim set inside a gritty, lo-fi **UHF broadcast bus**.

You broadcast. They hunt. You keep the rig alive.

## Player fantasy
You’re a pirate broadcaster with a battered bus, a loud transmitter, and a short window to make money before you get triangulated.

## The core loop (moment-to-moment)
1) **Park & Prep**
   - Pick a spot (risk/reward).
   - Check **diesel / battery**.
   - Decide how hard you can push the rig.

2) **Broadcast**
   - Start transmitting.
   - Choose content: **News / Music / Movies** (each impacts viewership, cost, and heat).

3) **Monitor**
   - Watch the **Police Radar**.
   - More power = more reach = **faster detection**.

4) **Profit / Flee**
   - Collect **donations** while the signal is live.
   - Cut the feed before the cops arrive.
   - Relocate.

5) **Manage**
   - Spend donations on:
     - **Diesel**
     - **Content licenses**
     - **Equipment upgrades**
     - **Staff**

## UI layout — “Console View”
Because the game is top-down, the UI should feel like a physical dashboard.

### Top panel
- **Viewership** (real-time)
  - Drives donation rate
- **Broadcast Strength** (slider)
  - Higher range = more viewers
  - Higher range = faster detection

### Center view
- **Bus Interior (top-down)**
  - Shows staff positions, generator, broadcast gear

### Bottom panel
- **Police Radar**
  - Visual “heat” meter showing police proximity / triangulation pressure
- **Power / Fuel**
  - Progress bars for **Battery**, **Diesel**, and **Generator** status
- **Money**
  - Current budget for upgrades and fuel

## Key mechanics & constraints

### Resource interdependence
- **The Generator Dilemma**
  - Generator consumes **Diesel** to charge **Batteries**
  - But creates **electrical noise/heat**
  - You must choose:
    - Charge and stay dark, or
    - Broadcast and drain the battery

- **The Mobility Penalty**
  - Broadcasting while driving increases your **Signature**
  - Safer to transmit while stationary, but you are a sitting duck

### Staff & content
- **Staff hires**
  - **DJ**: boosts viewership
  - **Engineer**: slows battery drain
  - **Lookout**: improves radar accuracy

- **Programming**
  - **Movies**: high viewership, high cost
  - **News**: lower viewership, but can lower Police Heat if you report on them
  - **Music**: baseline / flexible option (good growth, moderate heat)

## Systems (high level)
### Resources
- **Diesel**: movement + generator runtime
- **Battery**: buffer; drains under broadcast load
- **Heat / Noise**: rises with power & generator use; increases risk / forces downtime
- **Attention / Detection**: the “police clock” (shown on radar)

### Threat model
- Police response is driven by your signal:
  - transmit power
  - time on-air
  - signature penalties (broadcasting while driving)
  - repeated use of the same area (optional)

### Economy
- Donations scale with:
  - viewership
  - content type
  - quality (upgrades, licenses, staff)
- Strategy split:
  - stealthy low-power long sessions vs loud short bursts

## Aesthetic & presentation
- Chunky UI panels
- CRT scanlines + static bursts
- Diesel hum + fan noise + intermittent interference
- Lo-fi gritty palette: navy, sickly green, sodium yellow

## MVP scope (first playable)
- One simple map with a few parking nodes
- Bus interior HUD + police radar
- Content choice (News/Music/Movies)
- Broadcast strength slider
- One pursuer type (signal van) + escalating response
- Basic shop: diesel + one upgrade path + one staff hire
