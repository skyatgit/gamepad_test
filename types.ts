export interface GamepadState {
  id: string;
  connected: boolean;
  timestamp: number;
  buttons: {
    pressed: boolean;
    value: number; // 0.0 - 1.0 (useful for triggers)
  }[];
  axes: number[]; // Typically 4 axes for dual analog sticks
}

// Standard Gamepad Mapping (xinput standard)
export enum ButtonIndex {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LB = 4,
  RB = 5,
  LT = 6, // Analog trigger button often registers as a button too
  RT = 7,
  Back = 8, // View
  Start = 9, // Menu
  LS = 10, // Left Stick Click
  RS = 11, // Right Stick Click
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
  Home = 16 // Guide button (availability varies by OS/Browser)
}

export enum AxisIndex {
  LX = 0,
  LY = 1,
  RX = 2,
  RY = 3
}