export const VIEWPORT = { width: 960, height: 540 };
export const WORLD_HEIGHT = 760;

export const POWER_COPY = {
  doubleJump: "Echo Boots: double jump",
  dash: "Pulse Core: air dash",
  wallGrip: "Grip Gloves: wall jump",
  drift: "Drift Cloak: hold jump to fall slower"
};

const layer = (name, short, color, accent, solids, pickups = [], options = {}) => ({
  name,
  short,
  color,
  accent,
  solids,
  movingSolids: [],
  pickups,
  ...options
});

export const LEVELS = [
  {
    id: "split-dock",
    title: "Screen 1: Split Dock",
    width: 1220,
    height: WORLD_HEIGHT,
    start: { x: 96, y: 584, layer: 0 },
    checkpoints: [{ id: "dock-mid", x: 548, y: 564, layer: 0 }],
    goal: { x: 1118, y: 504, width: 54, height: 96 },
    hint: "Two layers. Shift with Up and Down to find a solid route.",
    layers: [
      layer("Near Dock", "NEAR", 0x48c7e8, 0xffd166, [
        [0, 636, 430, 54],
        [510, 606, 250, 42],
        [850, 566, 230, 40],
        [1120, 636, 140, 54]
      ]),
      layer("Far Dock", "FAR", 0xf15bb5, 0xffffff, [
        [0, 660, 250, 52],
        [330, 620, 300, 44],
        [710, 596, 250, 40],
        [1030, 548, 170, 38]
      ])
    ]
  },
  {
    id: "echo-step",
    title: "Screen 2: Echo Step",
    width: 1540,
    height: WORLD_HEIGHT,
    start: { x: 88, y: 582, layer: 1 },
    checkpoints: [{ id: "echo-boots", x: 648, y: 548, layer: 1 }],
    goal: { x: 1452, y: 488, width: 54, height: 108 },
    hint: "Collect Echo Boots. Double jump opens the high exit.",
    layers: [
      layer("Glass Run", "NEAR", 0x7bd88f, 0xe9ff70, [
        [0, 636, 360, 54],
        [470, 604, 230, 42],
        [840, 540, 180, 38],
        [1180, 596, 220, 42]
      ]),
      layer(
        "Service Line",
        "FAR",
        0x48c7e8,
        0xffd166,
        [
          [0, 646, 500, 54],
          [620, 590, 280, 42],
          [1010, 538, 210, 38],
          [1360, 600, 200, 44]
        ],
        [{ type: "doubleJump", x: 666, y: 534 }]
      )
    ]
  },
  {
    id: "pulse-crossing",
    title: "Screen 3: Pulse Crossing",
    width: 1900,
    height: WORLD_HEIGHT,
    start: { x: 96, y: 570, layer: 1 },
    checkpoints: [{ id: "pulse-core", x: 820, y: 582, layer: 1 }],
    goal: { x: 1810, y: 496, width: 54, height: 106 },
    hint: "The Pulse Core adds dash and a dash-jump window.",
    layers: [
      layer("Canopy Rail", "FRONT", 0x7bd88f, 0xe9ff70, [
        [0, 640, 320, 52],
        [470, 594, 250, 42],
        [900, 560, 260, 38],
        [1510, 604, 260, 44]
      ]),
      layer(
        "Middle Relay",
        "MID",
        0xf15bb5,
        0xffffff,
        [
          [0, 626, 560, 54],
          [720, 622, 240, 44],
          [1180, 566, 220, 40],
          [1680, 610, 220, 48]
        ],
        [{ type: "dash", x: 792, y: 566 }]
      ),
      layer("Back Span", "BACK", 0xff6b35, 0x00f5d4, [
        [0, 668, 260, 52],
        [380, 620, 260, 42],
        [1040, 618, 300, 44],
        [1450, 538, 250, 38]
      ])
    ]
  },
  {
    id: "grip-reservoir",
    title: "Screen 4: Grip Reservoir",
    width: 2380,
    height: WORLD_HEIGHT,
    start: { x: 98, y: 582, layer: 2 },
    checkpoints: [{ id: "reservoir-shaft", x: 1308, y: 580, layer: 2 }],
    goal: { x: 2288, y: 458, width: 54, height: 110 },
    hint: "Wall grip and drift make the layered shaft manageable.",
    layers: [
      layer("Mist Front", "FRONT", 0xa8dadc, 0xffca3a, [
        [0, 654, 320, 54],
        [450, 610, 230, 42],
        [790, 552, 140, 38],
        [1430, 610, 240, 42],
        [2050, 548, 250, 40]
      ]),
      layer(
        "Grip Tower",
        "NEAR",
        0x7bd88f,
        0xe9ff70,
        [
          [0, 636, 430, 54],
          [540, 590, 260, 42],
          [960, 514, 170, 38],
          [1180, 430, 90, 240],
          [1600, 556, 240, 40],
          [2160, 504, 190, 38]
        ],
        [{ type: "wallGrip", x: 1018, y: 458 }]
      ),
      layer(
        "Reservoir",
        "MID",
        0x48c7e8,
        0xffd166,
        [
          [0, 650, 520, 54],
          [680, 610, 250, 42],
          [1300, 620, 300, 44],
          [1770, 566, 260, 40],
          [2210, 514, 170, 38]
        ],
        [{ type: "drift", x: 1818, y: 510 }]
      ),
      layer("Deep Pipe", "BACK", 0xff6b35, 0x00f5d4, [
        [0, 668, 280, 52],
        [410, 618, 260, 42],
        [870, 566, 240, 40],
        [1370, 522, 220, 38],
        [1880, 610, 260, 44]
      ])
    ]
  },
  {
    id: "layered-foundry",
    title: "Screen 5: Layered Foundry",
    width: 3600,
    height: WORLD_HEIGHT,
    start: { x: 112, y: 548, layer: 2 },
    checkpoints: [
      { id: "foundry-entry", x: 720, y: 428, layer: 2 },
      { id: "foundry-mid", x: 1838, y: 586, layer: 2 },
      { id: "foundry-deep", x: 2220, y: 490, layer: 4 }
    ],
    goal: { x: 3508, y: 468, width: 54, height: 110 },
    hint: "Full five-layer test screen. The current layer is the only collision layer.",
    layers: [
      layer(
        "Canopy",
        "FRONT",
        0x7bd88f,
        0xe9ff70,
        [
          [0, 636, 380, 50],
          [520, 592, 260, 42],
          [920, 548, 230, 38],
          [1260, 612, 360, 46],
          [1710, 538, 210, 38],
          [2080, 608, 360, 46],
          [2530, 558, 210, 38],
          [2880, 628, 430, 48],
          [3380, 586, 190, 40]
        ],
        [{ type: "wallGrip", x: 1790, y: 484 }]
      ),
      layer("Conduit", "NEAR", 0x48c7e8, 0xffd166, [
        [0, 626, 520, 50],
        [650, 608, 310, 42],
        [1110, 560, 260, 38],
        [1480, 494, 170, 38],
        [1740, 616, 340, 48],
        [2200, 560, 220, 38],
        [2570, 620, 420, 48],
        [3140, 572, 260, 42],
        [3450, 520, 120, 38]
      ]),
      layer(
        "Foundry",
        "ACTIVE",
        0xf15bb5,
        0xffffff,
        [
          [0, 632, 730, 54],
          [850, 604, 270, 44],
          [1230, 556, 210, 38],
          [1540, 628, 420, 54],
          [2080, 578, 260, 42],
          [2470, 528, 200, 38],
          [2790, 618, 420, 52],
          [3330, 590, 270, 44],
          [420, 520, 150, 34],
          [640, 470, 120, 34]
        ],
        [{ type: "doubleJump", x: 696, y: 414 }]
      ),
      layer(
        "Reservoir",
        "BACK",
        0xff6b35,
        0x00f5d4,
        [
          [0, 650, 460, 52],
          [560, 614, 360, 46],
          [1090, 612, 290, 44],
          [1510, 556, 260, 38],
          [1880, 494, 180, 38],
          [2170, 626, 450, 50],
          [2780, 586, 330, 42],
          [3240, 540, 240, 40]
        ],
        [{ type: "dash", x: 1210, y: 558 }]
      ),
      layer(
        "Rootworks",
        "DEEP",
        0xa8dadc,
        0xffca3a,
        [
          [0, 666, 340, 50],
          [470, 614, 250, 42],
          [850, 556, 220, 38],
          [1190, 616, 430, 48],
          [1750, 594, 280, 42],
          [2140, 532, 210, 38],
          [2490, 622, 380, 48],
          [3020, 568, 250, 40],
          [3420, 628, 180, 48]
        ],
        [{ type: "drift", x: 2220, y: 476 }]
      )
    ]
  },
  {
    id: "relay-hub",
    title: "Hub: Relay Atrium",
    isHub: true,
    width: 2380,
    height: WORLD_HEIGHT,
    start: { x: 112, y: 574, layer: 0 },
    checkpoints: [{ id: "hub-start", x: 112, y: 574, layer: 0 }],
    goal: null,
    trophy: { id: "hub-trophy", x: 2148, y: 392, width: 40, height: 38 },
    hint: "Claim the trophy, then jump into an unlocked door to replay a completed route.",
    doors: [
      { levelId: "split-dock", label: "1", x: 250, y: 548, width: 58, height: 86 },
      { levelId: "echo-step", label: "2", x: 410, y: 548, width: 58, height: 86 },
      { levelId: "pulse-crossing", label: "3", x: 570, y: 548, width: 58, height: 86 },
      { levelId: "grip-reservoir", label: "4", x: 730, y: 548, width: 58, height: 86 },
      { levelId: "layered-foundry", label: "5", x: 890, y: 548, width: 58, height: 86 },
      {
        levelId: "future-east",
        label: "EAST",
        future: true,
        requiredPower: "phase hook",
        x: 1320,
        y: 468,
        width: 58,
        height: 86
      },
      {
        levelId: "future-deep",
        label: "DEEP",
        future: true,
        requiredPower: "sink boots",
        x: 1660,
        y: 372,
        width: 58,
        height: 86
      },
      {
        levelId: "future-sky",
        label: "SKY",
        future: true,
        requiredPower: "triple jump",
        x: 2220,
        y: 250,
        width: 58,
        height: 86
      }
    ],
    layers: [
      layer(
        "Atrium",
        "HUB",
        0x48c7e8,
        0xffd166,
        [
          [0, 636, 1040, 54],
          [1170, 556, 280, 42],
          [1560, 460, 260, 40],
          [2070, 442, 280, 42]
        ],
        [],
        {
          movingSolids: [
            { id: "lift-a", x: 1080, y: 610, width: 170, height: 34, axis: "x", distance: 260, speed: 0.55 },
            { id: "lift-b", x: 1475, y: 536, width: 150, height: 34, axis: "y", distance: 96, speed: 0.8, phase: 0.35 },
            { id: "lift-c", x: 1850, y: 428, width: 170, height: 34, axis: "x", distance: 220, speed: 0.7, phase: 0.68 }
          ]
        }
      ),
      layer("Future Backline", "BACK", 0xff6b35, 0x00f5d4, [
        [0, 666, 420, 48],
        [560, 616, 260, 40],
        [1220, 506, 220, 38],
        [1600, 410, 220, 38],
        [2140, 292, 200, 38]
      ])
    ]
  }
];
