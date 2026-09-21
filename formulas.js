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

function estimateShapedSectionStitches(startSt, endSt, rows) {
    const safeRows = Math.max(0, Number(rows) || 0);
    const safeStartSt = Math.max(0, Number(startSt) || 0);
    const safeEndSt = Math.max(0, Number(endSt) || 0);

    return ((safeStartSt + safeEndSt) / 2) * safeRows;
}

function convertSwatchYarnToMeters(length, unit) {
    const safeLength = Math.max(0, Number(length) || 0);

    if (unit === "cm") return safeLength / 100;
    if (unit === "yd") return safeLength * 0.9144;
    return safeLength;
}

function calculatePattern(inputs) {
    const bust = inputs.bust;
    const shoulder = inputs.shoulder;
    const armhole = inputs.armhole;
    const upperArm = inputs.upperArm;
    const finishedLengthCm = inputs.finishedLengthCm;
    const RIBBING_LENGTH_CM = 2.5;

    const stitchesPerCm = inputs.gaugeAcross;
    const rowsPerCm = inputs.gaugeDown;
    const neckPickupRatio = getSimpleRatio(stitchesPerCm / rowsPerCm);
    const neckPickupSt = neckPickupRatio.numerator;
    const neckPickupRows = neckPickupRatio.denominator;

    const shoulderSt = Math.round(shoulder * stitchesPerCm);
    const bustSt = Math.round(bust * stitchesPerCm);
    const halfArmholeRows = makeEven((armhole / 2) * rowsPerCm);
    const shoulderToUnderarmCm = armhole / 2;
    const requestedAfterJoinCm =
        finishedLengthCm - shoulderToUnderarmCm - RIBBING_LENGTH_CM;
    const joinedBodyRows = Math.max(
        1,
        makeOdd(Math.max(0, requestedAfterJoinCm) * rowsPerCm)
    );
    const joinedBodyLengthCm = Number(
        (joinedBodyRows / rowsPerCm).toFixed(1)
    );
    const minimumFinishedLengthCm = Number(
        (shoulderToUnderarmCm + RIBBING_LENGTH_CM).toFixed(1)
    );
    const hasValidFinishedLength = requestedAfterJoinCm >= 0;

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

    // Yarn-use estimate
    // The estimate scales the approximate number of stitches worked in the
    // garment against the stitches and yarn used in the entered gauge swatch.
    const backPanelAfterSlowIncSt = backCastOnSt + backIncRows / 2;
    const backPanelEndSt = backPanelAfterSlowIncSt + backFastIncRows;
    const singleBackPanelWorkSt =
        backCastOnSt * backStraightRows
        + estimateShapedSectionStitches(
            backCastOnSt,
            backPanelAfterSlowIncSt,
            backIncRows
        )
        + estimateShapedSectionStitches(
            backPanelAfterSlowIncSt,
            backPanelEndSt,
            backFastIncRows
        );

    const backJoinedStartSt =
        backPanelEndSt * 2 + backCenterCastOnSt + 2;
    const backAfterSlowIncSt = backJoinedStartSt + armholeIncRows;
    const backEndSt = backAfterSlowIncSt + armholeFastIncRows * 2;
    const backWorkSt =
        singleBackPanelWorkSt * 2
        + backJoinedStartSt
        + backJoinedStartSt * Math.max(0, backArmholeStraightRows)
        + estimateShapedSectionStitches(
            backJoinedStartSt,
            backAfterSlowIncSt,
            armholeIncRows
        )
        + estimateShapedSectionStitches(
            backAfterSlowIncSt,
            backEndSt,
            armholeFastIncRows
        );

    const frontPanelAfterSlowIncSt = backCastOnSt + frontIncRows / 2;
    const frontPanelNeckEndSt = frontPanelAfterSlowIncSt + frontFastIncRows;
    const frontPanelAfterCenterSt = frontPanelNeckEndSt + frontCenterCastOnSt;
    const frontPanelAfterArmholeSlowIncSt =
        frontPanelAfterCenterSt + armholeIncRows / 2;
    const frontPanelEndSt =
        frontPanelAfterArmholeSlowIncSt + armholeFastIncRows;
    const singleFrontPanelWorkSt =
        backCastOnSt * frontStraightRows
        + estimateShapedSectionStitches(
            backCastOnSt,
            frontPanelAfterSlowIncSt,
            frontIncRows
        )
        + estimateShapedSectionStitches(
            frontPanelAfterSlowIncSt,
            frontPanelNeckEndSt,
            frontFastIncRows
        )
        + frontPanelAfterCenterSt
        + frontPanelAfterCenterSt * Math.max(0, frontArmholeStraightRows)
        + estimateShapedSectionStitches(
            frontPanelAfterCenterSt,
            frontPanelAfterArmholeSlowIncSt,
            armholeIncRows
        )
        + estimateShapedSectionStitches(
            frontPanelAfterArmholeSlowIncSt,
            frontPanelEndSt,
            armholeFastIncRows
        );

    const joinedBodySt = backEndSt + frontPanelEndSt * 2;
    const ribbingRounds = Math.max(
        1,
        Math.round(RIBBING_LENGTH_CM * rowsPerCm)
    );
    // Keep the estimate safely high by treating the ribbing as if it were
    // worked across every joined-body stitch, including the front overlap.
    const ribbingSt = joinedBodySt;
    const lowerBodyWorkSt =
        joinedBodySt * joinedBodyRows + ribbingSt * ribbingRounds;

    const sleeveHalfSt = sleeveCastOnSt / 2;
    const sleeveExpansionPairs = Math.max(
        0,
        Math.ceil(
            (sleeveHalfSt - sleeveStBeforeMarker - sleeveFirstRSExtraSt)
            / Math.max(1, sleeveShortRowStepSt)
        )
    );
    const sleeveExpansionStartSt = Math.min(
        sleeveCastOnSt,
        sleeveFirstWSSt
    );
    const sleeveExpansionEndSt = Math.min(
        sleeveCastOnSt,
        sleeveExpansionStartSt
        + sleeveExpansionPairs * sleeveShortRowStepSt * 2
    );
    const sleeveExpansionWorkSt = estimateShapedSectionStitches(
        sleeveExpansionStartSt,
        sleeveExpansionEndSt,
        sleeveExpansionPairs * 2
    );
    const sleeveContractionEndSt = Math.max(
        1,
        sleeveExpansionEndSt - sleeveShortRowRepeats * sleeveShortRowStepSt
    );
    const singleSleeveWorkSt =
        sleeveCastOnSt * sleeveStraightRounds
        + sleeveHalfSt + sleeveFirstRSExtraSt
        + sleeveFirstWSSt
        + sleeveExpansionWorkSt
        + estimateShapedSectionStitches(
            sleeveExpansionEndSt,
            sleeveContractionEndSt,
            sleeveShortRowRepeats
        )
        + sleeveCastOnSt * 2
        + sleevePickupSt * 3;

    // Each front edge runs from the shoulder to the finished lower edge.
    // The extra row accounts for the row worked immediately after the Front
    // Center cast-on; the calculated joined-body rows and ribbing finish it.
    const frontVerticalEdgeRows =
        frontStraightRows
        + frontIncRows
        + frontFastIncRows
        + 1
        + frontArmholeStraightRows
        + armholeIncRows
        + armholeFastIncRows
        + joinedBodyRows
        + ribbingRounds;
    // The joining row completes one additional row along each shaped Back
    // neckline edge before the Back Center stitches are cast on.
    const backVerticalEdgeRows =
        backStraightRows + backIncRows + backFastIncRows + 1;
    const totalVerticalNeckEdgeRows =
        frontVerticalEdgeRows * 2 + backVerticalEdgeRows * 2;
    const verticalNeckPickupSt = Math.max(
        0,
        Math.round(
            totalVerticalNeckEdgeRows * neckPickupSt / neckPickupRows
        )
    );
    // Horizontal cast-on edges are picked up one stitch for every stitch.
    // Both overlapping Front Center edges remain exposed, while the Back has
    // one Center cast-on edge.
    const horizontalNeckPickupSt = Math.max(
        0,
        frontCenterCastOnSt * 2 + backCenterCastOnSt
    );
    const estimatedNeckPickupSt =
        verticalNeckPickupSt + horizontalNeckPickupSt;
    const edgingWorkSt = estimatedNeckPickupSt * 3;

    const estimatedProjectStitches = Math.max(
        0,
        Math.round(
            backWorkSt
            + singleFrontPanelWorkSt * 2
            + lowerBodyWorkSt
            + singleSleeveWorkSt * 2
            + edgingWorkSt
        )
    );
    const swatchStitches = Math.max(
        1,
        Number(inputs.gaugeAcrossSts) * Number(inputs.gaugeDownRows)
    );
    const swatchYarnMeters = convertSwatchYarnToMeters(
        inputs.swatchYarnLength,
        inputs.swatchYarnUnit
    );
    const YARN_ALLOWANCE = 1.15;
    const rawEstimatedYarnMeters =
        swatchYarnMeters > 0
            ? swatchYarnMeters * (estimatedProjectStitches / swatchStitches)
            : 0;
    const estimatedYarnMeters = rawEstimatedYarnMeters > 0
        ? Math.ceil(rawEstimatedYarnMeters * YARN_ALLOWANCE / 10) * 10
        : 0;
    const estimatedYarnYards = estimatedYarnMeters > 0
        ? Math.ceil(estimatedYarnMeters * 1.0936133 / 10) * 10
        : 0;
    const swatchYarnDisplay = swatchYarnMeters > 0
        ? `${inputs.swatchYarnLength} ${inputs.swatchYarnUnit}`
        : "Not entered";
    const estimatedYarnDisplay = !hasValidFinishedLength
        ? "Check your finished-length measurement"
        : estimatedYarnMeters > 0
            ? `approximately ${estimatedYarnMeters} m / ${estimatedYarnYards} yd`
            : "Enter your swatch yarn use in the generator";


    return {
        bust,
        shoulder,
        armhole,
        upperArm,
        finishedLengthCm,
        shoulderToUnderarmCm,
        requestedAfterJoinCm,
        joinedBodyRows,
        joinedBodyLengthCm,
        ribbingRounds,
        minimumFinishedLengthCm,
        hasValidFinishedLength,

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
        sleeveCastOnSt,
        swatchYarnLength: inputs.swatchYarnLength,
        swatchYarnUnit: inputs.swatchYarnUnit,
        swatchYarnDisplay,
        estimatedProjectStitches,
        frontVerticalEdgeRows,
        backVerticalEdgeRows,
        totalVerticalNeckEdgeRows,
        verticalNeckPickupSt,
        horizontalNeckPickupSt,
        estimatedNeckPickupSt,
        estimatedYarnMeters,
        estimatedYarnYards,
        estimatedYarnDisplay
    };
}
