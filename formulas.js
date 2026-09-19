function makeEven(number) {
    return Math.round(number / 2) * 2;
}

function makeOdd(number) {
    const rounded = Math.round(number);
    return rounded % 2 !== 0 ? rounded : rounded + 1;
}

function greatestCommonDivisor(first, second) {
    let a = Math.abs(Math.round(first));
    let b = Math.abs(Math.round(second));

    while (b !== 0) {
        [a, b] = [b, a % b];
    }

    return a || 1;
}

function getSimpleRatio(value, maxDenominator = 6) {
    let bestNumerator = 1;
    let bestDenominator = 1;
    let smallestDifference = Math.abs(value - 1);

    for (let denominator = 2; denominator <= maxDenominator; denominator += 1) {
        const numerator = Math.max(1, Math.round(value * denominator));
        const difference = Math.abs(value - numerator / denominator);

        if (difference < smallestDifference) {
            bestNumerator = numerator;
            bestDenominator = denominator;
            smallestDifference = difference;
        }
    }

    const divisor = greatestCommonDivisor(bestNumerator, bestDenominator);

    return {
        numerator: bestNumerator / divisor,
        denominator: bestDenominator / divisor
    };
}

function calculatePattern(inputs) {
    const bust = inputs.bust;
    const shoulder = inputs.shoulder;
    const armhole = inputs.armhole;
    const upperArm = inputs.upperArm;

    const stitchesPerCm = inputs.gaugeAcross;
    const rowsPerCm = inputs.gaugeDown;
    const neckPickupRatio = getSimpleRatio(stitchesPerCm / rowsPerCm);
    const neckPickupSt = neckPickupRatio.numerator;
    const neckPickupRows = neckPickupRatio.denominator;

    const shoulderSt = Math.round(shoulder * stitchesPerCm);
    const bustSt = Math.round(bust * stitchesPerCm);
    const halfArmholeRows = makeEven((armhole / 2) * rowsPerCm);

    // Back neck and shoulder shaping
    const BACK_SHAPING_ST = 13 * stitchesPerCm; // 13 cm of shaping across the back neck and shoulders
    const backCastOnSt = Math.round(
        (shoulderSt - BACK_SHAPING_ST) / 2
    );
    const backStraightRows = makeEven(rowsPerCm * 2); // 2 cm
    const backIncRows = makeEven(Math.ceil(rowsPerCm * 1.5)); // 1.5 cm
    const backFastIncRows = makeOdd(rowsPerCm); // 1 cm

    // Across both back panels, the single-increase section adds one stitch
    // every two rows per panel, while the double-increase section adds one
    // stitch every row per panel.
    const backCenterCastOnSt =
        shoulderSt
        - 2 *
        (backCastOnSt + backIncRows / 2 + backFastIncRows);

    const armholeStToAdd = Math.round(
        (bustSt / 2 - shoulderSt) / 2
    );
    const armholeIncRows = makeEven(armholeStToAdd / 1.5) + 4;
    const armholeFastIncRows = makeEven(armholeStToAdd / 1.5) - 2 - 1;
    const backArmholeStraightRows =
        halfArmholeRows
        - backStraightRows
        - backIncRows
        - backFastIncRows
        - armholeIncRows
        - armholeFastIncRows;


    // Front neck shaping
    const FRONT_CENTER_ADJUST_ST = 4;
    const frontStraightRows = makeEven(rowsPerCm * 3); // 3 cm
    const frontIncRows = makeEven(rowsPerCm); // 1 cm
    const frontFastIncRows = makeOdd(rowsPerCm); // 1 cm
    const frontFastIncWorkRows = frontFastIncRows + 1; // even; finish on RS
    const frontCenterCastOnSt =
        shoulderSt
        - 2 * (backCastOnSt
            + frontIncRows / 2
            + frontFastIncRows)
        + FRONT_CENTER_ADJUST_ST;

    // Front armhole shaping
    const frontArmholeStraightRows =
        halfArmholeRows
        - frontStraightRows
        - frontIncRows
        - frontFastIncRows
        - armholeIncRows
        - armholeFastIncRows;
    const frontRightArmholeStraightRows = frontArmholeStraightRows - 2;

    // Buttonhole placement on the Front Right panel
    const buttonBandSt = 6;
    const frontCenterBeforeBandSt = frontCenterCastOnSt - buttonBandSt;
    const totalFrontArmholeRows =
        frontArmholeStraightRows + armholeIncRows + armholeFastIncRows;
    const firstButtonholeGapRows = makeEven(totalFrontArmholeRows / 5);
    const secondButtonholeGapRows = makeEven(totalFrontArmholeRows / 2);
    const firstButtonholeRow = firstButtonholeGapRows;
    const secondButtonholeRow =
        firstButtonholeGapRows + secondButtonholeGapRows;

    // Ribbing setup
    const leftFrontHoldSt =
        backCastOnSt
        + frontCenterCastOnSt
        + frontIncRows / 2
        + frontFastIncRows
        + FRONT_CENTER_ADJUST_ST
        + armholeIncRows / 2
        + armholeFastIncRows;


    const puffNess = 7;
    const sleeveCastOnSt = makeEven(upperArm * stitchesPerCm * (1 + puffNess / 10));

    const sleeveStraightRounds = Math.round(5 * rowsPerCm); // 5 cm
    const sleeveFirstRSExtraSt = Math.round(5 / 10 * puffNess * stitchesPerCm * 3); // 5 mm * puffNess
    const sleeveFirstWSSt = sleeveFirstRSExtraSt * 2;
    const sleeveStBeforeMarker = sleeveCastOnSt / 8;
    const sleeveShortRowStepSt = 1;
    const sleeveShortRowRepeats = makeEven(puffNess / 2);
    // Each side of the box pleat combines three equal stitch groups into one.
    const sleevePleatGroupSt = Math.max(
        1,
        Math.round(0.25 * puffNess * stitchesPerCm)
    );
    const sleevePleatSt = sleevePleatGroupSt * 3;
    const sleevePickupSt = sleeveCastOnSt / 2;

    // Round the actual sleeve/armhole counts to the nearest 10, then simplify.
    // This keeps the sewing ratio easy to follow (for example, 91:116 becomes 3:4).
    const sleeveSeamEdgeSt = Math.round(
        sleeveCastOnSt - sleevePleatGroupSt * 4
    );
    const armholeEdgeRows = halfArmholeRows * 2;
    const roundedSleeveSeamSt = Math.max(
        10,
        Math.round(sleeveSeamEdgeSt / 10) * 10
    );
    const roundedArmholeRows = Math.max(
        10,
        Math.round(armholeEdgeRows / 10) * 10
    );
    const easySeamRatioDivisor = greatestCommonDivisor(
        roundedSleeveSeamSt,
        roundedArmholeRows
    );
    const easySleeveSeamSt = roundedSleeveSeamSt / easySeamRatioDivisor;
    const easyArmholeRows = roundedArmholeRows / easySeamRatioDivisor;
    const easyArmholeSkipRows = Math.max(0, easyArmholeRows - easySleeveSeamSt);


    return {
        bust,
        shoulder,
        armhole,
        upperArm,

        gaugeAcrossSts: inputs.gaugeAcrossSts,
        gaugeAcrossCm: inputs.gaugeAcrossCm,
        gaugeDownRows: inputs.gaugeDownRows,
        gaugeDownCm: inputs.gaugeDownCm,

        gaugeAcross: stitchesPerCm.toFixed(2),
        gaugeDown: rowsPerCm.toFixed(2),
        neckPickupSt,
        neckPickupRows,

        shoulderSt,
        bustSt,
        halfArmholeRows,
        backCastOnSt,
        backStraightRows,
        backIncRows,
        backFastIncRows,
        backCenterCastOnSt,
        frontStraightRows,
        frontIncRows,
        frontFastIncRows,
        frontFastIncWorkRows,
        frontCenterCastOnSt,
        backArmholeStraightRows,
        frontArmholeStraightRows,
        frontRightArmholeStraightRows,
        armholeStToAdd,
        armholeIncRows,
        armholeFastIncRows,
        buttonBandSt,
        frontCenterBeforeBandSt,
        totalFrontArmholeRows,
        firstButtonholeGapRows,
        secondButtonholeGapRows,
        firstButtonholeRow,
        secondButtonholeRow,
        leftFrontHoldSt,
        sleeveStraightRounds,
        sleeveFirstRSExtraSt,
        sleeveFirstWSSt,
        sleeveStBeforeMarker,
        sleeveShortRowStepSt,
        sleeveShortRowRepeats,
        sleevePleatSt,
        sleevePleatGroupSt,
        sleevePickupSt,
        sleeveSeamEdgeSt,
        armholeEdgeRows,
        roundedSleeveSeamSt,
        roundedArmholeRows,
        easySleeveSeamSt,
        easyArmholeRows,
        easyArmholeSkipRows,
        sleeveCastOnSt
    };
}
