export function frameIsStrike(frame) {
  return frame.roll1 === 10;
}

export function frameIsSpare(frame) {
  return frame.roll1 !== 10 && (frame.roll1 || 0) + (frame.roll2 || 0) === 10;
}

export function frameTenFirstRollIsStrike(frame) {
  return frame.roll1 === 10;
}

export function frameTenSecondRollIsStrike(frame) {
  return frame.roll2 === 10;
}

export function frameTenThirdRollIsStrike(frame) {
  return frame.roll3 === 10;
}

export function frameTenSecondRollIsSpare(frame) {
  return frame.roll1 !== 10 && (frame.roll1 || 0) + (frame.roll2 || 0) === 10;
}

export function laneLeftBoundary(lane) {
  return lane.x + lane.gutterWidth;
}

export function laneRightBoundary(lane) {
  return lane.x + lane.width + lane.gutterWidth;
}