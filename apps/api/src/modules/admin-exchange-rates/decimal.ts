interface DecimalValue {
  coefficient: bigint;
  scale: number;
}

function parseDecimal(value: string): DecimalValue | null {
  const [integerPart, fractionPart = ""] = value.split(".");

  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return null;
  }

  return {
    coefficient: BigInt(`${integerPart}${fractionPart}`),
    scale: fractionPart.length,
  };
}

function toCommonScale(left: DecimalValue, right: DecimalValue): [bigint, bigint, bigint] {
  const scale = Math.max(left.scale, right.scale);
  return [
    left.coefficient * 10n ** BigInt(scale - left.scale),
    right.coefficient * 10n ** BigInt(scale - right.scale),
    10n ** BigInt(scale),
  ];
}

/** Returns a signed percentage rounded to two decimal places without float arithmetic. */
export function calculatePercentageDifference(localRate: string, referenceRate: string): number | null {
  const local = parseDecimal(localRate);
  const reference = parseDecimal(referenceRate);

  if (!local || !reference || reference.coefficient <= 0n) {
    return null;
  }

  const [localCoefficient, referenceCoefficient] = toCommonScale(local, reference);
  const numerator = (localCoefficient - referenceCoefficient) * 10_000n;
  const sign = numerator < 0n ? -1n : 1n;
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const roundedBasisPoints = ((absoluteNumerator * 1n + referenceCoefficient / 2n) / referenceCoefficient) * sign;
  const whole = roundedBasisPoints / 100n;
  const fraction = (roundedBasisPoints < 0n ? -roundedBasisPoints : roundedBasisPoints) % 100n;
  const result = Number(
    `${roundedBasisPoints < 0n ? "-" : ""}${whole < 0n ? -whole : whole}.${fraction.toString().padStart(2, "0")}`,
  );

  return Number.isFinite(result) ? result : null;
}
