/* =========================================================
   問題設定
========================================================= */

const questions = [

    "24 × 15 =",

    "「ありがとう」を英語で書きなさい。",

    "アンモニアの化学式を書きなさい。",

    "「戦く」の読み方を書きなさい。",

    "日本で一番面積が狭い都道府県を書きなさい。"

];

let questionOrder = [];

let currentQuestion = 0;


/* =========================================================
   問題をランダム化
========================================================= */

function shuffleQuestions() {

    questionOrder = [...questions];

    for (
        let i = questionOrder.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [
            questionOrder[i],
            questionOrder[j]
        ] =
        [
            questionOrder[j],
            questionOrder[i]
        ];

    }

}


/* =========================================================
   HTML要素
========================================================= */

const calibration =
    document.getElementById("calibration");

const experimentArea =
    document.getElementById("experimentArea");

const calibrationTitle =
    document.getElementById("calibrationTitle");

const calibrationInstruction =
    document.getElementById("calibrationInstruction");

const calibrationPressure =
    document.getElementById("calibrationPressure");

const calibrationCanvas =
    document.getElementById("calibrationCanvas");

const calibrationClear =
    document.getElementById("calibrationClear");

const calibrationNext =
    document.getElementById("calibrationNext");

const questionText =
    document.getElementById("questionText");

const canvas =
    document.getElementById("canvas");

const ctx =
    canvas.getContext("2d", {
        alpha: false
    });

const pressureText =
    document.getElementById("pressure");

const normalizedPressureText =
    document.getElementById("normalizedPressure");

const pressureChangeText =
    document.getElementById("pressureChange");

const speedText =
    document.getElementById("speed");

const accelerationText =
    document.getElementById("acceleration");

const stopText =
    document.getElementById("stopTime");


/* =========================================================
   キャリブレーション用変数
========================================================= */

let calibrationMode = "maximum";

let calibrationDrawing = false;

let maximumPressure = 0;

let normalPressure = 0;

let calibrationPressures = [];

const calibrationCtx =
    calibrationCanvas.getContext("2d");

let calibrationLastPressure = 0;


/* =========================================================
   実験用変数
========================================================= */

let drawing = false;

let lastX = 0;

let lastY = 0;

let lastTime = 0;

let lastSpeed = 0;

let lastPressure = 0;

let lastNormalizedPressure = 0;

let stopStart = null;


/* =========================================================
   75Hzサンプリング
=========================================================

   1000 / 75
   = 約13.33ms

========================================================= */

const SAMPLE_INTERVAL = 1000 / 75;

let lastSampleTime = 0;


/* =========================================================
   実験データ
========================================================= */

let experimentData = [];

let summaryData = [];


/* =========================================================
   実験開始時間
========================================================= */

let experimentStart = 0;


/* =========================================================
   被験者ID
========================================================= */

let participantID = "";


/* =========================================================
   描画用変数
========================================================= */

let drawX = 0;

let drawY = 0;

let hasPreviousDrawPoint = false;


/* =========================================================
   表示更新用
========================================================= */

let lastDisplayTime = 0;

const DISPLAY_INTERVAL = 100;


/* =========================================================
   筆圧の正規化
========================================================= */

function normalizePressure(pressure) {

    /*
        通常筆圧 = 0%

        最大筆圧 = 100%
    */

    if (
        maximumPressure <= normalPressure
    ) {

        return 0;

    }

    let normalized =

        (
            pressure -
            normalPressure
        )
        /
        (
            maximumPressure -
            normalPressure
        )
        * 100;


    /*
        0～100%に制限
    */

    normalized =
        Math.max(
            0,
            Math.min(
                100,
                normalized
            )
        );


    return normalized;

}


/* =========================================================
   Canvas座標取得
========================================================= */

let canvasRect = null;
let canvasScaleX = 1;
let canvasScaleY = 1;


function updateCanvasMetrics() {

    canvasRect =
        canvas.getBoundingClientRect();

    canvasScaleX =
        canvas.width /
        canvasRect.width;

    canvasScaleY =
        canvas.height /
        canvasRect.height;

}


function getCanvasPosition(e) {

    const rect =
        canvas.getBoundingClientRect();

    const scaleX =
        canvas.width / rect.width;

    const scaleY =
        canvas.height / rect.height;

    return {

        x:
            (e.clientX - rect.left) * scaleX,

        y:
            (e.clientY - rect.top) * scaleY

    };

}

window.addEventListener(
    "resize",
    updateCanvasMetrics
);


/* =========================================================
   キャリブレーションCanvas座標
========================================================= */

function getCalibrationPosition(e) {

    const rect =
        calibrationCanvas.getBoundingClientRect();

    const scaleX =
        calibrationCanvas.width / rect.width;

    const scaleY =
        calibrationCanvas.height / rect.height;

    return {

        x:
            (e.clientX - rect.left) * scaleX,

        y:
            (e.clientY - rect.top) * scaleY

    };

}


/* =========================================================
   キャリブレーション
========================================================= */

calibrationCanvas.addEventListener(
    "pointerdown",
    (e) => {

        e.preventDefault();

        calibrationDrawing = true;

        calibrationCanvas.setPointerCapture(
            e.pointerId
        );

        const pos =
            getCalibrationPosition(e);

        calibrationCtx.beginPath();

        calibrationCtx.moveTo(
            pos.x,
            pos.y
        );

        calibrationLastPressure =
            e.pressure;

        calibrationPressures.push(
            e.pressure
        );

        if (
            e.pressure >
            maximumPressure &&
            calibrationMode === "maximum"
        ) {

            maximumPressure =
                e.pressure;

        }

    }
);


/* =========================================================
   キャリブレーション入力
========================================================= */

calibrationCanvas.addEventListener(
    "pointermove",
    (e) => {

        if (!calibrationDrawing) return;

        e.preventDefault();

        const pos =
            getCalibrationPosition(e);

        calibrationCtx.lineCap =
            "round";

        calibrationCtx.lineJoin =
            "round";

        calibrationCtx.strokeStyle =
            "black";

        calibrationCtx.lineWidth =
            Math.max(
                1,
                e.pressure * 10 + 1
            );

        calibrationCtx.lineTo(
            pos.x,
            pos.y
        );

        calibrationCtx.stroke();

        calibrationPressures.push(
            e.pressure
        );


        if (
            calibrationMode === "maximum"
        ) {

            if (
                e.pressure >
                maximumPressure
            ) {

                maximumPressure =
                    e.pressure;

            }

        }


        if (
            calibrationMode === "normal"
        ) {

            if (
                calibrationPressures.length > 0
            ) {

                const sum =
                    calibrationPressures.reduce(
                        (a, b) =>
                            a + b,
                        0
                    );

                normalPressure =
                    sum /
                    calibrationPressures.length;

            }

        }


        calibrationPressure.textContent =
            e.pressure.toFixed(3);

    }
);


/* =========================================================
   キャリブレーション終了
========================================================= */

calibrationCanvas.addEventListener(
    "pointerup",
    (e) => {

        calibrationDrawing = false;

        if (
            calibrationCanvas.hasPointerCapture(
                e.pointerId
            )
        ) {

            calibrationCanvas.releasePointerCapture(
                e.pointerId
            );

        }

    }
);


calibrationCanvas.addEventListener(
    "pointercancel",
    (e) => {

        calibrationDrawing = false;

        if (
            calibrationCanvas.hasPointerCapture(
                e.pointerId
            )
        ) {

            calibrationCanvas.releasePointerCapture(
                e.pointerId
            );

        }

    }
);


/* =========================================================
   キャリブレーション：書き直す
========================================================= */

calibrationClear.onclick = () => {

    calibrationCtx.clearRect(
        0,
        0,
        calibrationCanvas.width,
        calibrationCanvas.height
    );

    calibrationPressures = [];

    calibrationPressure.textContent =
        "0";


    if (
        calibrationMode === "maximum"
    ) {

        maximumPressure = 0;

    }


    if (
        calibrationMode === "normal"
    ) {

        normalPressure = 0;

    }

};


/* =========================================================
   キャリブレーション：次へ
========================================================= */

calibrationNext.onclick = () => {


    /* -----------------------------------------
       最大筆圧
    ----------------------------------------- */

    if (
        calibrationMode === "maximum"
    ) {

        if (
            maximumPressure <= 0
        ) {

            alert(
                "まず線を書いてください。"
            );

            return;

        }


        calibrationMode =
            "normal";

        calibrationPressures = [];

        calibrationPressure.textContent =
            "0";


        calibrationTitle.textContent =
            "通常筆圧キャリブレーション";


        calibrationInstruction.textContent =
            "普段通りの力で線を書いてください。";


        calibrationCtx.clearRect(
            0,
            0,
            calibrationCanvas.width,
            calibrationCanvas.height
        );


        return;

    }


    /* -----------------------------------------
       通常筆圧
    ----------------------------------------- */

    if (
        calibrationMode === "normal"
    ) {

        if (
            normalPressure <= 0
        ) {

            alert(
                "まず普段通りの力で線を書いてください。"
            );

            return;

        }


        /*
            通常筆圧が最大筆圧を
            超えないようにする
        */

        if (
            normalPressure >= maximumPressure
        ) {

            alert(
                "最大筆圧と通常筆圧の差が小さすぎます。\nもう一度キャリブレーションしてください。"
            );

            return;

        }


        calibrationMode =
            "complete";


        calibration.style.display =
            "none";

        experimentArea.style.display =
            "block";

        updateCanvasMetrics();

        shuffleQuestions();

        currentQuestion = 0;


        questionText.textContent =
            questionOrder[currentQuestion];


        experimentData = [];

        summaryData = [];


        /*
            最初の問題の開始時間
        */

        experimentStart =
            performance.now();


        resetMeasurementVariables();


        console.log(
            "最大筆圧:",
            maximumPressure
        );

        console.log(
            "通常筆圧:",
            normalPressure
        );

    }

};


/* =========================================================
   測定変数リセット
========================================================= */

function resetMeasurementVariables() {

    drawing = false;

    lastX = 0;

    lastY = 0;

    lastTime = 0;

    lastSpeed = 0;

    lastPressure = 0;

    lastNormalizedPressure = 0;

    lastSampleTime = 0;

    stopStart = null;

    hasPreviousDrawPoint =false;

    drawQueue.length = 0;

    drawFramePending = false;

    previousDrawX = 0;
    previousDrawY = 0;

    hasPreviousDrawPoint = false;


    pressureText.textContent =
        "0";

    normalizedPressureText.textContent =
        "0";

    pressureChangeText.textContent =
        "0";

    speedText.textContent =
        "0";

    accelerationText.textContent =
        "0";

    stopText.textContent =
        "0";

}


/* =========================================================
   Canvas描画設定
========================================================= */

ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";
ctx.lineWidth = 3;


/* =========================================================
   描画キュー
========================================================= */

/*let drawQueue = [];
let drawFramePending = false;*/

/*let previousDrawX = 0;
let previousDrawY = 0;*/

let previousDrawX = null;
let previousDrawY = null;



/* =========================================================
   描画をキューに追加
========================================================= */

function queueCanvasPoint(x, y) {

    // 最初の1点
    if (!hasPreviousDrawPoint) {
        previousDrawX = x;
        previousDrawY = y;
        hasPreviousDrawPoint = true;
        return;
    }

    // 前回の位置から今回の位置まで線を描く
    ctx.beginPath();
    ctx.moveTo(previousDrawX, previousDrawY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // 今回の位置を次回の始点にする
    previousDrawX = x;
    previousDrawY = y;
}


/* =========================================================
   requestAnimationFrameで描画
========================================================= */

/*function drawCanvasFrame() {

    drawFramePending = false;


    if (drawQueue.length === 0) {
        return;
    }


    ctx.beginPath();



    if (!hasPreviousDrawPoint) {

        const first =
            drawQueue.shift();

        previousDrawX =
            first.x;

        previousDrawY =
            first.y;

        hasPreviousDrawPoint =
            true;

    }



    ctx.moveTo(
        previousDrawX,
        previousDrawY
    );


    while (
        drawQueue.length > 0
    ) {

        const point =
            drawQueue.shift();


        ctx.lineTo(
            point.x,
            point.y
        );


        previousDrawX =
            point.x;

        previousDrawY =
            point.y;

    }


    ctx.stroke();

}*/


/* =========================================================
   メインCanvas：筆圧開始
========================================================= */

canvas.addEventListener(
    "pointerdown",
    (e) => {

        e.preventDefault();

        if (
            e.pointerType !== "pen"
        ) {

            return;

        }


        drawing = true;


        canvas.setPointerCapture(
            e.pointerId
        );


        const pos =
            getCanvasPosition(e);


        lastX =
            pos.x;

        lastY =
            pos.y;


        lastTime =
            performance.now();


        lastSpeed =
            0;


        lastPressure =
            e.pressure;


        lastNormalizedPressure =
            normalizePressure(
                e.pressure
            );


        lastSampleTime =
            performance.now();


        stopStart =
            null;


        hasPreviousDrawPoint =
            false;


        /*
            最初の点を即座に描画
        */

        queueCanvasPoint(
            pos.x,
            pos.y
        );

    }
);


/* =========================================================
   メインCanvas：筆圧取得
========================================================= */

canvas.addEventListener("pointermove",(e) => {

        if (!drawing) return;

        if (e.pointerType !== "pen") {return;
        }

        e.preventDefault();


        const now =
            performance.now();


        const pos =
            getCanvasPosition(e);


        /*
            ------------------------------------------------
            描画
            ------------------------------------------------
        */

        queueCanvasPoint(pos.x, pos.y);


        /*
            ------------------------------------------------
            75Hzサンプリング
            ------------------------------------------------
        */

        if (
            now -
            lastSampleTime
            <
            SAMPLE_INTERVAL
        ) {

            return;

        }


        /*
            実際のサンプル時間
        */

        const sampleTime =
            now;


        const dx =
            pos.x -
            lastX;


        const dy =
            pos.y -
            lastY;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        const dt =
            (
                sampleTime -
                lastTime
            ) / 1000;


        if (
            dt <= 0
        ) {

            return;

        }


        /* -----------------------------------------
           速度
        ----------------------------------------- */

        const speed =
            distance / dt;


        /* -----------------------------------------
           加速度
        ----------------------------------------- */

        const acceleration =
            (
                speed -
                lastSpeed
            ) / dt;


        /* -----------------------------------------
           正規化筆圧
        ----------------------------------------- */

        const normalizedPressure =
            normalizePressure(
                e.pressure
            );


        /* -----------------------------------------
           Raw筆圧変動
        ----------------------------------------- */

        const pressureChange =
            e.pressure -
            lastPressure;


        /* -----------------------------------------
           正規化筆圧変動
        ----------------------------------------- */

        const normalizedPressureChange =
            normalizedPressure -
            lastNormalizedPressure;


        /* -----------------------------------------
           停止時間
        ----------------------------------------- */

        if (
            speed < 5
        ) {

            if (
                stopStart === null
            ) {

                stopStart =
                    sampleTime;

            }

        }
        else {

            if (
                stopStart !== null
            ) {

                const stop =
                    (
                        sampleTime -
                        stopStart
                    ) / 1000;


                stopText.textContent =
                    stop.toFixed(2);


                stopStart =
                    null;

            }

        }


        /* -----------------------------------------
           画面表示
        ----------------------------------------- */

        if (
            sampleTime -
            lastDisplayTime
            >=
            DISPLAY_INTERVAL
        ) {

            pressureText.textContent =
                e.pressure.toFixed(3);

            normalizedPressureText.textContent =
                normalizedPressure.toFixed(1);

            pressureChangeText.textContent =
                pressureChange.toFixed(3);

            speedText.textContent =
                speed.toFixed(1);

            accelerationText.textContent =
                acceleration.toFixed(1);


            lastDisplayTime =
                sampleTime;

        }


        /* -----------------------------------------
           データ保存
        ----------------------------------------- */

        experimentData.push({

            participant:
                participantID,

            question:
                currentQuestion + 1,

            questionText:
                questionOrder[
                    currentQuestion
                ],

            time:
                sampleTime,

            elapsedTime:
                sampleTime -
                experimentStart,

            x:
                pos.x,

            y:
                pos.y,

            pressure:
                e.pressure,

            normalizedPressure:
                normalizedPressure,

            pressureChange:
                pressureChange,

            normalizedPressureChange:
                normalizedPressureChange,

            speed:
                speed,

            acceleration:
                acceleration,

            stopTime:
                stopText.textContent === ""
                    ? 0
                    : Number(
                        stopText.textContent
                    ),

            pointerType:
                e.pointerType,

            buttons:
                e.buttons,

            penDown:
                drawing

        });


        /* -----------------------------------------
           次のデータ用
        ----------------------------------------- */

        lastSampleTime =
            sampleTime;

        lastSpeed =
            speed;

        lastPressure =
            e.pressure;

        lastNormalizedPressure =
            normalizedPressure;

        lastX =
            pos.x;

        lastY =
            pos.y;

        lastTime =
            sampleTime;

    }
);


/* =========================================================
   筆を離した
========================================================= */

function finishDrawing(e) {

    drawing = false;
    hasPreviousDrawPoint = false;

    /*
        停止中だった場合
        最後の停止時間を確定
    */

    if (
        stopStart !== null
    ) {

        const stop =
            (
                performance.now() -
                stopStart
            ) / 1000;


        stopText.textContent =
            stop.toFixed(2);


        stopStart =
            null;

    }


    if (
        e &&
        canvas.hasPointerCapture(
            e.pointerId
        )
    ) {

        canvas.releasePointerCapture(
            e.pointerId
        );

    }

}


canvas.addEventListener(
    "pointerup",
    (e) => {

        e.preventDefault();

        finishDrawing(e);

    }
);


canvas.addEventListener(
    "pointercancel",
    (e) => {

        finishDrawing(e);

    }
);


canvas.addEventListener(
    "lostpointercapture",
    () => {

        drawing = false;

    }
);


/* =========================================================
   リセット
========================================================= */

document
    .getElementById("clear")
    .onclick = () => {


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
        現在の問題のデータは削除しない。

        「書き直す」だけ。
    */


    pressureText.textContent =
        "0";

    normalizedPressureText.textContent =
        "0";

    pressureChangeText.textContent =
        "0";

    speedText.textContent =
        "0";

    accelerationText.textContent =
        "0";

    stopText.textContent =
        "0";


    drawing =
        false;

    stopStart =
        null;

    lastSpeed =
        0;

    lastPressure =
        0;

    lastNormalizedPressure =
        0;

    lastSampleTime =
        0;

    hasPreviousDrawPoint =false;

    drawQueue.length =0;

    drawFramePending =false;

};


/* =========================================================
   回答確定
========================================================= */

document
    .getElementById("submit")
    .onclick = () => {

    console.log(
        "回答確定ボタンが押されました"
    );


    /*
        現在の問題のデータだけ取得
    */

    const currentData =
        experimentData.filter(
            d =>
                d.question ===
                currentQuestion + 1
        );


    /*
        データがない場合
    */

    if (
        currentData.length === 0
    ) {

        alert(
            "まだ描画データがありません。"
        );

        return;

    }


    /* -----------------------------------------
       正規化筆圧変動
    ----------------------------------------- */

    const changeData =
        currentData.filter(
            d =>
                d.normalizedPressureChange !== null &&
                d.normalizedPressureChange !== undefined
        );


    const pressureVariability =
        changeData.length > 0

            ?

            changeData.reduce(
                (sum, d) =>
                    sum +
                    Math.abs(
                        d.normalizedPressureChange
                    ),
                0
            )
            /
            changeData.length

            :

            0;


    /* -----------------------------------------
       平均Raw筆圧
    ----------------------------------------- */

    const avgPressure =
        currentData.reduce(
            (sum, d) =>
                sum + d.pressure,
            0
        )
        /
        currentData.length;


    /* -----------------------------------------
       最大Raw筆圧
    ----------------------------------------- */

    const maxPressure =
        Math.max(
            ...currentData.map(
                d => d.pressure
            )
        );


    /* -----------------------------------------
       平均正規化筆圧
    ----------------------------------------- */

    const avgNormalizedPressure =
        currentData.reduce(
            (sum, d) =>
                sum +
                d.normalizedPressure,
            0
        )
        /
        currentData.length;


    /* -----------------------------------------
       最大正規化筆圧
    ----------------------------------------- */

    const maxNormalizedPressure =
        Math.max(
            ...currentData.map(
                d =>
                    d.normalizedPressure
            )
        );


    /* -----------------------------------------
       平均速度
    ----------------------------------------- */

    const avgSpeed =
        currentData.reduce(
            (sum, d) =>
                sum + d.speed,
            0
        )
        /
        currentData.length;


    /* -----------------------------------------
       平均加速度
    ----------------------------------------- */

    const avgAcceleration =
        currentData.reduce(
            (sum, d) =>
                sum + d.acceleration,
            0
        )
        /
        currentData.length;


    /* -----------------------------------------
       停止時間
    ----------------------------------------- */

    const totalStop =
        currentData.reduce(
            (sum, d) =>
                sum + d.stopTime,
            0
        );


    /* -----------------------------------------
       妨害イベント
    ----------------------------------------- */

    const interruptCount =
        0;


    /* -----------------------------------------
       回答時間
    -----------------------------------------

       問題を表示した時点から
       「回答確定」を押すまで。

    ----------------------------------------- */

    const answerTime =
        performance.now() -
        experimentStart;


    /* -----------------------------------------
       集計データ
    ----------------------------------------- */

    summaryData.push({

        participant:
            participantID,

        question:
            currentQuestion + 1,

        questionText:
            questionOrder[
                currentQuestion
            ],

        answerTime:
            answerTime,

        averagePressure:
            avgPressure,

        maximumPressure:
            maxPressure,

        averageNormalizedPressure:
            avgNormalizedPressure,

        maximumNormalizedPressure:
            maxNormalizedPressure,

        pressureStability:
            pressureVariability,

        averageSpeed:
            avgSpeed,

        averageAcceleration:
            avgAcceleration,

        totalStopTime:
            totalStop,

        interruptCount:
            interruptCount

    });


    console.log(
        "集計データ:",
        summaryData
    );


    /* -----------------------------------------
       Canvasリセット
    ----------------------------------------- */

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /* -----------------------------------------
       次の問題へ
    ----------------------------------------- */

    currentQuestion++;


    if (
        currentQuestion <
        questionOrder.length
    ) {

        questionText.textContent =
            questionOrder[
                currentQuestion
            ];


        /*
            次の問題の開始時間
        */

        experimentStart =
            performance.now();


        /*
            測定値を初期化
        */

        resetMeasurementVariables();


        console.log(
            "次の問題:",
            questionOrder[
                currentQuestion
            ]
        );

    }

    else {

        alert(
            "全ての問題が終了しました。"
        );


        console.log(
            "最終集計データ:",
            summaryData
        );

    }

};


/* =========================================================
   CSV用文字列エスケープ
========================================================= */

function escapeCSV(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    const str =
        String(value);

    return '"' +
        str.replace(
            /"/g,
            '""'
        ) +
        '"';

}


/* =========================================================
   詳細CSV
========================================================= */

function downloadCSV() {

    let csv =
        "\uFEFF";


    /* -----------------------------------------
       ヘッダー
    ----------------------------------------- */

    csv +=

        "Participant," +
        "Question," +
        "QuestionText," +
        "Time," +
        "ElapsedTime," +
        "X," +
        "Y," +
        "RawPressure," +
        "NormalizedPressure," +
        "PressureChange," +
        "NormalizedPressureChange," +
        "Speed," +
        "Acceleration," +
        "StopTime," +
        "PointerType," +
        "Buttons," +
        "PenDown\n";


    /* -----------------------------------------
       データ
    ----------------------------------------- */

    experimentData.forEach(
        d => {

            csv +=

                escapeCSV(
                    d.participant
                ) + "," +

                escapeCSV(
                    d.question
                ) + "," +

                escapeCSV(
                    d.questionText
                ) + "," +

                escapeCSV(
                    d.time
                ) + "," +

                escapeCSV(
                    d.elapsedTime
                ) + "," +

                escapeCSV(
                    d.x
                ) + "," +

                escapeCSV(
                    d.y
                ) + "," +

                escapeCSV(
                    d.pressure
                ) + "," +

                escapeCSV(
                    d.normalizedPressure
                ) + "," +

                escapeCSV(
                    d.pressureChange
                ) + "," +

                escapeCSV(
                    d.normalizedPressureChange
                ) + "," +

                escapeCSV(
                    d.speed
                ) + "," +

                escapeCSV(
                    d.acceleration
                ) + "," +

                escapeCSV(
                    d.stopTime
                ) + "," +

                escapeCSV(
                    d.pointerType
                ) + "," +

                escapeCSV(
                    d.buttons
                ) + "," +

                escapeCSV(
                    d.penDown
                ) +

                "\n";

        }
    );


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;

    a.download =
        "experiment.csv";


    document.body.appendChild(
        a
    );


    a.click();


    document.body.removeChild(
        a
    );


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   集計CSV
========================================================= */

function downloadSummaryCSV() {

    let csv =
        "\uFEFF";


    /* -----------------------------------------
       ヘッダー
    ----------------------------------------- */

    csv +=

        "Participant," +
        "Question," +
        "QuestionText," +
        "AnswerTime," +
        "AveragePressure," +
        "MaximumPressure," +
        "AverageNormalizedPressure," +
        "MaximumNormalizedPressure," +
        "PressureStability," +
        "AverageSpeed," +
        "AverageAcceleration," +
        "TotalStopTime," +
        "InterruptCount\n";


    /* -----------------------------------------
       データ
    ----------------------------------------- */

    summaryData.forEach(
        d => {

            csv +=

                escapeCSV(
                    d.participant
                ) + "," +

                escapeCSV(
                    d.question
                ) + "," +

                escapeCSV(
                    d.questionText
                ) + "," +

                escapeCSV(
                    d.answerTime
                ) + "," +

                escapeCSV(
                    d.averagePressure
                ) + "," +

                escapeCSV(
                    d.maximumPressure
                ) + "," +

                escapeCSV(
                    d.averageNormalizedPressure
                ) + "," +

                escapeCSV(
                    d.maximumNormalizedPressure
                ) + "," +

                escapeCSV(
                    d.pressureStability
                ) + "," +

                escapeCSV(
                    d.averageSpeed
                ) + "," +

                escapeCSV(
                    d.averageAcceleration
                ) + "," +

                escapeCSV(
                    d.totalStopTime
                ) + "," +

                escapeCSV(
                    d.interruptCount
                ) +

                "\n";

        }
    );


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;


    a.download =
        "experiment_summary.csv";


    document.body.appendChild(
        a
    );


    a.click();


    document.body.removeChild(
        a
    );


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   CSVボタン
========================================================= */

document
    .getElementById("download")
    .onclick =
    downloadCSV;


document
    .getElementById("downloadSummary")
    .onclick =
    downloadSummaryCSV;
