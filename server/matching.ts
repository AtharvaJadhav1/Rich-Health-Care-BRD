export type MatchingInput = {
  carryLeft: number;
  carryRight: number;
  newLeft: number;
  newRight: number;
  pairValue: number;
  dailyCap: number;
  gstPercent: number;
  adminCutPercent: number;
};

export type MatchingResult = {
  totalLeft: number;
  totalRight: number;
  pairsMatched: number;
  leftoverLeft: number;
  leftoverRight: number;
  grossPayout: number;
  gstCut: number;
  adminCut: number;
  netPayout: number;
};

export function leftoverFromSnapshot(volume: {
  carryLeft: number;
  carryRight: number;
  leftCount: number;
  rightCount: number;
  pairsMatched: number;
}) {
  return {
    leftoverLeft: volume.carryLeft + volume.leftCount - volume.pairsMatched,
    leftoverRight: volume.carryRight + volume.rightCount - volume.pairsMatched,
  };
}

export function computeMatching(input: MatchingInput): MatchingResult {
  const totalLeft = input.carryLeft + input.newLeft;
  const totalRight = input.carryRight + input.newRight;
  const pairsMatched = Math.min(totalLeft, totalRight, input.dailyCap);
  const grossPayout = pairsMatched * input.pairValue;
  const netPayout = Math.round(
    (grossPayout * (100 - input.gstPercent - input.adminCutPercent)) / 100,
  );
  const gstCut = Math.floor((grossPayout * input.gstPercent) / 100);
  const adminCut = grossPayout - netPayout - gstCut;
  return {
    totalLeft,
    totalRight,
    pairsMatched,
    leftoverLeft: totalLeft - pairsMatched,
    leftoverRight: totalRight - pairsMatched,
    grossPayout,
    gstCut,
    adminCut,
    netPayout,
  };
}
