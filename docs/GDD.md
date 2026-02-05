# Bus Broadcaster — Game Design Doc (Draft)

## Elevator pitch
A stealth + resource-management sim set inside a gritty, lo-fi UHF broadcast bus.

You broadcast. They hunt. You keep the rig alive.

## Core loops
1. **Broadcast loop**
   - Choose transmit mode / power
   - Monitor signal/noise/heat
   - Perform quick-fix tasks to keep the rig stable

2. **Stealth loop**
   - Actions raise "attention"
   - Higher attention increases risk of being triangulated
   - Respond with countermeasures (go dark, relocate, decoy bursts)

3. **Maintenance loop**
   - Components degrade
   - Scavenge parts/fuel
   - Manage downtime

## Aesthetic
- Chunky UI
- CRT scanlines
- Static bursts
- Diesel hum + fan noise

## MVP scope
- One map / one bus interior screen
- Simple meters: power, heat, noise, attention
- One hunter type (signal van) + simple escalation
