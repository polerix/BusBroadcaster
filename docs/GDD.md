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
   - Choose content:
     - **News** (spiky attention, steady donors)
     - **Music** (fast audience growth)
     - **Movies** (high donations, high heat/risk)

3) **Monitor**
   - Watch the **Police Radar**.
   - More power = more reach = **faster detection**.
   - Heat/noise/stability are secondary pressures that force decisions.

4) **Profit / Flee**
   - Collect **donations** while the signal is live.
   - Cut the feed before the cops arrive.
   - Relocate.

5) **Manage**
   - Spend donations on:
     - **Diesel**
     - **Content licenses** (unlock/boost News/Music/Movies)
     - **Equipment upgrades** (power efficiency, cooling, stealth)

## Systems (high level)
### Resources
- **Diesel**: movement + generator runtime.
- **Battery**: buffer; drains under load.
- **Heat**: rises with power; forces cooldown or failure.
- **Noise**: affects detection in close range.
- **Attention / Detection**: the "police clock".

### Threat model
- **Police radar** is a proxy for triangulation progress.
- Detection accelerates with:
  - transmit power
  - time on-air
  - (optionally) repeated broadcasts in same area

### Economy
- Donations scale with:
  - audience size
  - content type
  - quality (upgrades, licenses)
- Spending choices determine build strategy:
  - stealthy low-power long sessions vs loud short bursts.

## Aesthetic & presentation
- Chunky UI panels
- CRT scanlines + static bursts
- Diesel hum + fan noise + intermittent interference
- Lo-fi gritty palette: navy, sickly green, sodium yellow

## MVP scope (first playable)
- One simple map with a few parking nodes
- Bus interior HUD + radar
- Content choice (News/Music/Movies)
- One pursuer type (signal van) + escalating response
- Basic shop: diesel + one upgrade path
