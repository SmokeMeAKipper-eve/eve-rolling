
## Eve wormhole rolling planner and game

I would like a html/javascript based website, simple so that it can run in github pages, to plan out and track rolling wormholes in eve online.


# wormhole mass types
100
500
750
1000
2000
3000
3300
5000


# variance in wormhole starting mass
+ or - 10%

# max permitted ship sizes for wormholes
up to Destroyer
up to Battlecruiser
up to Battleship
up to Freighter
up to Capital

# ships mass
Rolling BS - Hot  300
Rolling BS - Cold 200
Rolling HIC - Cold 0
Rolling HIC - Hot 65
Rolling Carrier - Hot 1750
Rolling Carrier - Cold 1250

# wormhole info
a wormhole can show 3 states (4 including gone)
1. more than 50% mass remaining
2. less than or equal to 50% mass remaining
3. less than or equal to 10% mass remaining
4. gone


# 🌀 Wormhole Rolling in EVE Online

Wormhole rolling is the strategic process of collapsing a wormhole to force a respawn, typically used to control system access, refresh PvE content, or hunt for PvP targets.

---

## ⚙️ Core Mechanics

- **Total Mass Limit**: Each wormhole has a maximum mass it can allow before collapsing (e.g., 2,000,000,000 kg). This value varies slightly (~±10%).
- **Per-Jump Mass Limit**: Restricts the mass of a single ship transit (e.g., 300,000,000 kg). Ships exceeding this cannot jump.
- **Shrink States**:
  - **Unshrunken**: 50–100% mass remaining.
  - **Shrink**: 10–50% mass remaining.  
    _In-game text: "stability reduced but not critical."_
  - **Critical (Crit)**: <10% mass remaining.  
    _In-game text: "stability critically disrupted."_

---

## 🚪 Rolling Strategy

- Use **high-mass ships** (e.g., battleships with 100MN prop mods) to push mass through the hole.
- Alternate jumps between sides to avoid stranding ships.
- Monitor shrink/crit states via wormhole info text.
- Final jump should ideally collapse the hole with no ships stranded.

---

## 🧠 Edge Cases & Timing

- Collapse is triggered **immediately** when the total mass threshold is exceeded.
- Simultaneous jumps may result in one ship being rejected if the hole collapses mid-tick.
- Server-side message ordering means "jumping at the same time" is never truly simultaneous.

---

## 📈 Use Cases

- **PvP Hunting**: Roll to find active chains and targets.
- **PvE Farming**: Refresh sites in new systems.
- **Logistics**: Roll for favorable K-space exits.
- **Security**: Collapse unwanted connections to isolate your system.

---

## 🛠️ Tooling Suggestions (for site implementation)

- Wormhole type database with mass limits and lifetimes.
- Shrink/crit tracking based on jump logs.
- Rolling ship presets with mass calculators.
- Alerts for EOL (end-of-life) and crit states.



# description of the website and functionality I would like.

1. a simple javascript html website (so it can host in github pages)
2. first you pick the wormhole size
3. second you pick the current state (>50 <50 <10)
4. third you pick the passed mass (fresh, small stuff, totally unknown)
5. then it needs to come up with a plan to safely roll the hole.

the site should abstract business logic in nice javascript classes.



<< Incoming          BS            Outgoing  >>
                 Cold / Hot
<< Incoming          Hic           Outgoing  >>
                 Cold / Hot