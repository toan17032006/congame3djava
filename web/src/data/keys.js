// Key bindings - rebindable at runtime via Settings.
export const ACTIONS = {
  forward: { label: 'Tiến', default: 'KeyW' },
  back: { label: 'Lùi', default: 'KeyS' },
  left: { label: 'Trái', default: 'KeyA' },
  right: { label: 'Phải', default: 'KeyD' },
  lightAttack: { label: 'Đòn nhanh', default: 'KeyJ' },
  heavyAttack: { label: 'Đòn mạnh', default: 'KeyK' },
  block: { label: 'Đỡ / Parry', default: 'KeyL' },
  dodge: { label: 'Né / Lăn', default: 'KeyI' },
  skill: { label: 'Kỹ năng', default: 'KeyU' },
  lockOn: { label: 'Khóa mục tiêu', default: 'KeyC' },
  sprint: { label: 'Chạy nhanh', default: 'ShiftLeft' },
  jump: { label: 'Nhảy', default: 'Space' },
  interact: { label: 'Tương tác', default: 'KeyE' },
  cameraToggle: { label: 'Đổi góc nhìn', default: 'KeyV' },
  inventory: { label: 'Túi đồ', default: 'Tab' },
  skillTree: { label: 'Kỹ năng', default: 'KeyT' },
  questLog: { label: 'Nhiệm vụ', default: 'KeyQ' },
  map: { label: 'Bản đồ', default: 'KeyM' },
  pause: { label: 'Tạm dừng', default: 'Escape' },
};

export const MOUSE_ACTIONS = {
  look: 'mouse', // drag/pointer-lock look
  zoom: 'wheel',
};
