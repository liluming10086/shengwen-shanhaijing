// The supplied prototype contains four hand-entered reference profiles, not a trained model.
// Keep the source formula for a transparent similarity demo and label results accordingly.
export const dialectProfiles = {
  '粤语': {
    pitch: 196.3,
    pitchStd: 104.9,
    zcr: 0.094,
    mfcc: [72.28, 38.57, 3.94, -0.06, -0.76, 4.25, -1.09, -8.66, -7.14, -2.70, 0.81, 0.29, -1.03]
  },
  '上海话': {
    pitch: 235.3,
    pitchStd: 55.0,
    zcr: 0.132,
    mfcc: [48.43, 25.53, -7.62, -0.76, 3.74, 2.40, -3.24, -1.55, -1.46, -3.05, -1.20, -2.42, -2.46]
  },
  '四川话': {
    pitch: 119.6,
    pitchStd: 44.2,
    zcr: 0.122,
    mfcc: [66.81, 31.85, -3.39, -2.82, 1.73, 4.97, -1.59, -2.43, 1.92, -0.59, -2.77, -1.68, 0.68]
  },
  '闽南语': {
    pitch: 245.0,
    pitchStd: 64.7,
    zcr: 0.126,
    mfcc: [66.29, 25.04, -11.06, 0.81, 5.21, -1.15, -8.43, -5.89, -3.17, -4.25, 0.29, -0.10, -2.39]
  }
};

// This cutoff is a prototype boundary based on distances between the supplied
// reference centers. It is not an empirically validated dialect-recognition threshold.
export const UNKNOWN_DISTANCE_LIMIT = 6.5;

function distance(sample, profile) {
  const pitchDiff = Math.abs(sample.pitch - profile.pitch) / 100;
  const pitchStdDiff = Math.abs(sample.pitchStd - profile.pitchStd) / 50;
  const zcrDiff = Math.abs(sample.zcr - profile.zcr) * 20;
  const mfccDiff = Math.sqrt(sample.mfcc.reduce((sum, value, index) => sum + (value - profile.mfcc[index]) ** 2, 0)) / 100;
  return (pitchDiff * 2) + (pitchStdDiff * 3) + (zcrDiff * 1.5) + (mfccDiff * 2.5);
}

export function matchDialect(sample) {
  if (!sample || !Number.isFinite(sample.pitch) || !Number.isFinite(sample.pitchStd) ||
      !Number.isFinite(sample.zcr) || !Array.isArray(sample.mfcc) || sample.mfcc.length !== 13 ||
      sample.mfcc.some((value) => !Number.isFinite(value))) {
    return { isUnknown: true, noSample: true, dialect: null, distance: null };
  }

  const matches = Object.entries(dialectProfiles)
    .map(([dialect, profile]) => ({ dialect, distance: distance(sample, profile) }))
    .sort((left, right) => left.distance - right.distance);
  const best = matches[0];
  return {
    isUnknown: best.distance > UNKNOWN_DISTANCE_LIMIT,
    dialect: best.distance <= UNKNOWN_DISTANCE_LIMIT ? best.dialect : null,
    nearestDialect: best.dialect,
    distance: best.distance,
    candidates: matches.map(({ dialect, distance: score }) => ({ dialect, distance: score }))
  };
}
