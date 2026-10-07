# Authoring helper: lays out the 8 rooms with rectangle ops and writes the
# ASCII maps into src/world/rooms.js. Edit here, run, then run the solver.
W, H = 40, 22
rooms = []

class Room:
    def __init__(self, id, name, teach):
        self.id, self.name, self.teach = id, name, teach
        self.g = [['.'] * W for _ in range(H)]
        self.platforms = []
        self.goal = None
        self.dashes = None
    def R(self, x0, y0, x1, y1, ch='#'):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.g[y][x] = ch
        return self
    def P(self, x, y, ch):
        self.g[y][x] = ch
        return self
    def plat(self, x, y, w, x2, y2, speed, pause=0.3):
        self.platforms.append(dict(x=x, y=y, w=w, x2=x2, y2=y2, speed=speed, pause=pause))

def new(id, name, teach):
    r = Room(id, name, teach)
    rooms.append(r)
    return r

T = 16

# 1 ---------------------------------------------------------------- jumping
r = new('trailhead', 'Trailhead', 'running and jumping: hold jump to go higher')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 13)
r.R(0, 18, 7, 21)              # start
r.R(11, 17, 13, 21)            # step up 1
r.R(17, 16, 22, 21)            # step up 2
r.R(27, 15, 30, 21)            # step up 3
r.R(31, 18, 39, 21)            # exit floor
r.R(12, 13, 14, 13)            # hidden ledges up to the berry
r.R(5, 10, 8, 10)
r.P(6, 9, 'S')
r.P(3, 17, 'P')
r.goal = (40 * T, 16 * T)
r.dashes = 0

# 2 ------------------------------------------------------------ wall climb
r = new('cliffside', 'Cliffside', 'hold grab to climb; jump off walls')
r.R(0, 0, 39, 0).R(0, 0, 0, 21)
r.R(20, 0, 23, 0, '.')         # exit up through the chimney
r.R(0, 19, 9, 21)              # start floor
r.R(10, 10, 39, 21)            # cliff
r.R(18, 1, 19, 7)              # chimney left wall
r.R(24, 0, 39, 9)              # chimney right side (solid mass)
r.R(24, 4, 30, 5, '.')         # side cave
r.P(30, 5, 'S')
r.P(3, 18, 'P')
r.goal = (21.5 * T, -2 * T)
r.dashes = 0

# 3 --------------------------------------------------------------- dashing
r = new('gap', 'The Gap', 'X dashes in 8 directions; one dash until you land')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 6)
r.R(0, 17, 8, 21)              # start
r.R(21, 17, 26, 21)            # middle landing
r.R(31, 11, 39, 21)            # high ledge (exit)
r.R(2, 9, 4, 9)                # berry perch
r.P(3, 8, 'S')
r.P(4, 16, 'P')
r.goal = (40 * T, 9 * T)

# 4 ------------------------------------------------------------- crystals
r = new('crystals', 'Glass Garden', 'crystals refill your dash in mid-air')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 8)
r.R(0, 15, 5, 21)              # start
r.R(34, 13, 39, 21)            # far landing
r.P(11, 13, 'C')
r.P(17, 11, 'C')
r.P(23, 13, 'C')
r.P(29, 11, 'C')
r.P(20, 6, 'C')                # detour up to the berry
r.R(23, 4, 25, 4)
r.P(24, 3, 'S')
r.P(2, 14, 'P')
r.goal = (40 * T, 11 * T)

# 5 ------------------------------------------------------ moving platforms
r = new('lift', 'Old Lift', 'ride platforms; jumping keeps their speed')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 2)
r.R(0, 16, 4, 21)              # start
r.plat(5, 16, 3, 15, 16, 70)   # ferry across
r.R(19, 14, 22, 21)            # tower
r.plat(24, 17, 3, 24, 6, 60, 0.5)  # elevator
r.R(29, 7, 39, 21)             # high ledge (exit)
r.R(28, 9, 28, 21, '<')        # thorny face: take the elevator
r.R(13, 4, 16, 4)              # berry ledge (jump left off the top of the elevator)
r.P(14, 3, 'S')
r.P(2, 15, 'P')
r.goal = (40 * T, 5 * T)

# 6 ---------------------------------------------------------------- spikes
r = new('thorns', 'Thorns', 'spikes kill; dash between them')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 9)
r.R(0, 18, 4, 21)              # start
r.R(5, 19, 38, 21)             # spike floor base
r.R(5, 18, 12, 18, '^')
r.R(13, 16, 15, 18)            # safe block
r.R(16, 0, 21, 13)             # low ceiling over the dash corridor
r.R(16, 14, 21, 14, 'v')
r.R(16, 18, 21, 18, '^')
r.R(22, 16, 24, 18)            # landing block
r.R(25, 18, 29, 18, '^')
r.R(25, 0, 29, 9)
r.R(25, 10, 29, 10, 'v')
r.R(30, 14, 39, 21)            # exit ledge
r.R(30, 13, 31, 13, '^')
r.R(9, 9, 11, 9)               # berry nook over the first field
r.R(9, 8, 11, 8, '^')
r.R(8, 9, 8, 9, '<')
r.P(10, 11, 'S')
r.P(2, 17, 'P')
r.goal = (40 * T, 12 * T)

# 7 ------------------------------------------------------------ crumbling
r = new('rotten', 'Rotten Ledge', 'old blocks fall soon after you touch them')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 3)
r.R(0, 17, 4, 21)              # start
r.R(7, 17, 9, 17, 'X')
r.R(13, 17, 15, 17, 'X')
r.R(19, 15, 21, 15, 'X')
r.R(25, 13, 26, 13, 'X')
r.R(28, 6, 28, 13, 'X')        # crumbling wall to climb
r.R(31, 8, 39, 21)             # exit ledge
r.R(12, 20, 13, 20, 'X')       # low berry perch
r.P(12, 19, 'S')
r.P(2, 16, 'P')
r.goal = (40 * T, 6 * T)

# 8 ---------------------------------------------------------------- summit
r = new('summit', 'Summit', 'everything at once')
r.R(0, 0, 39, 0).R(0, 0, 0, 21).R(39, 0, 39, 21)
r.R(0, 19, 3, 21)              # start
r.R(4, 10, 6, 21)              # climb
r.R(7, 21, 13, 21)
r.R(7, 20, 13, 20, '^')
r.P(10, 8, 'C')
r.R(14, 9, 16, 9, 'X')
r.plat(18, 9, 3, 25, 9, 60)
r.R(18, 13, 30, 13)            # spike shelf under the crossing
r.R(18, 12, 30, 12, '^')
r.P(30, 7, 'C')
r.R(33, 4, 38, 21)             # summit block
r.R(32, 6, 32, 18, '<')
r.P(36, 3, 'F')
r.R(28, 17, 31, 17)            # berry cave under the shelf
r.P(30, 16, 'S')
r.R(17, 14, 17, 18)
r.P(1, 18, 'P')
r.goal = (36.5 * T, 2.5 * T)

out = ["// Generated by tools/build_rooms.py — 40x22 ASCII maps.",
       "// # solid  P spawn  ^ v < > spikes  C crystal  S berry  X crumble  F flag",
       "// Moving platforms are listed separately (tile units, ping-pong between ends).",
       "export const ROOMS = ["]
for r in rooms:
    out.append("  {")
    out.append(f"    id: '{r.id}',")
    out.append(f"    name: '{r.name}',")
    out.append(f"    teach: '{r.teach}',")
    out.append(f"    goal: {{ x: {r.goal[0]:g}, y: {r.goal[1]:g} }},")
    if r.dashes is not None:
        out.append(f"    dashes: {r.dashes},")
    if r.platforms:
        out.append("    platforms: [")
        for p in r.platforms:
            out.append(f"      {{ x: {p['x']}, y: {p['y']}, w: {p['w']}, x2: {p['x2']}, y2: {p['y2']}, speed: {p['speed']}, pause: {p['pause']} }},")
        out.append("    ],")
    out.append("    map: [")
    for row in r.g:
        out.append(f"      '{''.join(row)}',")
    out.append("    ],")
    out.append("  },")
out.append("];")
open('src/world/rooms.js', 'w').write('\n'.join(out) + '\n')
print('\n\n'.join(r.name + '\n' + '\n'.join(''.join(row) for row in r.g) for r in rooms))
