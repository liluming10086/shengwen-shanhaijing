// Prototype rule based on the project notes: gentle style tends toward higher
// pitch, lower level, and a smoother signal. ZCR is only a rough texture proxy;
// these cutoffs are heuristic and have not been validated with a speaker set.
const LIMITS = { highPitchHz: 180, lowRms: 0.045, smoothZcr: 0.13 };

export function classifyVoiceStyle(sample) {
  if (!sample || !Number.isFinite(sample.pitch) || sample.pitch <= 0 ||
      !Number.isFinite(sample.rms) || !Number.isFinite(sample.zcr)) return null;

  const evidence = {
    highPitch: sample.pitch >= LIMITS.highPitchHz,
    lowVolume: sample.rms <= LIMITS.lowRms,
    smoothTexture: sample.zcr <= LIMITS.smoothZcr
  };
  const gentleVotes = Object.values(evidence).filter(Boolean).length;
  return {
    style: gentleVotes >= 2 ? 'gentle' : 'rough',
    evidence,
    gentleVotes,
    sample: { pitch: sample.pitch, rms: sample.rms, zcr: sample.zcr },
    limits: LIMITS
  };
}

export function voiceStyleLabel(style) {
  return style === 'gentle' ? '柔缓倾向' : style === 'rough' ? '粗犷倾向' : '暂未判断';
}
