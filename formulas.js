function makeEven(number) {
    return Math.round(number / 2) * 2;
}

function makeOdd(number) {
    const rounded = Math.round(number);
    return rounded % 2 !== 0 ? rounded : rounded + 1;
}

function calculatePattern(inputs) {
    const bust = inputs.bust;
    const shoulder = inputs.shoulder;
    const armhole = inputs.armhole;
    const upperArm = inputs.upperArm;

    const stitchesPerCm = inputs.gaugeAcross;
    const rowsPerCm = inputs.gaugeDown;

    const shoulderSt = Math.round(shoulder * stitchesPerCm);
    const bustSt = Math.round(bust * stitchesPerCm);
    const armholeRow = Math.round(armhole / 2 * rowsPerCm);

    const A = Math.round((shoulderSt - 30) / 2);

    const B = makeEven(rowsPerCm * 2); // 2cm straight
    const C = makeEven(Math.ceil(rowsPerCm * 1.5)); // 1.5cm inc
    const D = makeOdd(rowsPerCm * 1); // 1cm fast inc
    const DPlusOne = D + 1;
    const E = shoulderSt - (2 * A) - C - (DPlusOne * 2);


    // front
    const B_f = makeEven(rowsPerCm * 3); // 3cm straight
    const C_f = makeEven(rowsPerCm * 1); // 1cm inc
    const D_f = makeOdd(rowsPerCm * 1); // 1cm fast inc
    const DPlusOne_f = D_f + 1;
    // E_f, shoulder stitch - 2 strap - C_f k increase - 2 k&p increase
    const E_f = shoulderSt - (2 * A) - C_f - (DPlusOne_f * 2) + 4;



    const armholeStInc = Math.round((bustSt / 2 - shoulderSt) / 2);
    const G = makeEven(armholeStInc / 1.5) + 4;  // armhole inc
    const H = makeEven(armholeStInc / 1.5) - 2;  // armhole fast inc
    console.log("Armhole shaping:", { armholeStInc, G, H });
    const F_f = armholeRow - B_f - C_f - D_f - G - H; // armholedepth/2 - yoke - armholeshaping


    const S = makeEven(upperArm * stitchesPerCm);

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

        A,
        B,
        C,
        D,
        DPlusOne,
        E,
        B_f,
        C_f,
        D_f,
        DPlusOne_f,
        E_f,
        F_f,
        armholeStInc,
        G,
        H,
        S
    };
}
