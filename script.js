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
    canvas.getContext("2d");


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

/*
    maximum
    ↓
    normal
    ↓
    complete
*/


let calibrationDrawing = false;

let maximumPressure = 0;

let normalPressure = 0;

let calibrationPressures = [];


/* =========================================================
   実験用変数
========================================================= */

let drawing = false;

let lastX = 0;

let lastY = 0;

let lastTime = 0;

let lastSpeed = 0;

let lastPressure = 0;

let stopStart = null;


/* =========================================================
   75Hz設定
========================================================= */

/*
    1000 / 75
    = 約13.33ms
*/

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
   キャリブレーションCanvas
========================================================= */

const calibrationCtx =
    calibrationCanvas.getContext("2d");


let calibrationLastPressure = 0;


/* =========================================================
   キャリブレーション
========================================================= */

calibrationCanvas.addEventListener(
    "pointerdown",
    (e) => {

        calibrationDrawing = true;

        calibrationCanvas.setPointerCapture(
            e.pointerId
        );

        calibrationCtx.beginPath();

        calibrationCtx.moveTo(
            e.offsetX,
            e.offsetY
        );

        calibrationLastPressure =
            e.pressure;

        calibrationPressures.push(
            e.pressure
        );

    }
);


calibrationCanvas.addEventListener(
    "pointermove",
    (e) => {

        if (!calibrationDrawing) return;

        calibrationCtx.lineCap = "round";

        calibrationCtx.lineJoin = "round";

        calibrationCtx.strokeStyle = "black";

        calibrationCtx.lineWidth =
            e.pressure * 10 + 1;

        calibrationCtx.lineTo(
            e.offsetX,
            e.offsetY
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

            /*
                通常筆圧では平均値を取得
            */

            if (
                calibrationPressures.length > 0
            ) {

                const sum =
                    calibrationPressures.reduce(
                        (a, b) => a + b,
                        0
                    );

                normalPressure =
                    sum /
                    calibrationPressures.length;

            }

        }


        calibrationPressure.innerHTML =
            e.pressure.toFixed(3);

    }
);


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

    calibrationPressure.innerHTML = "0";

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


        calibrationMode = "normal";

        calibrationPressures = [];

        calibrationPressure.innerHTML = "0";


        calibrationTitle.innerHTML =
            "通常筆圧キャリブレーション";


        calibrationInstruction.innerHTML =
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
            最大筆圧より通常筆圧が
            大きくなることを防ぐ
        */

        if (
            normalPressure >
            maximumPressure
        ) {

            maximumPressure =
                normalPressure;

        }


        calibrationMode =
            "complete";


        calibration.style.display =
            "none";

        experimentArea.style.display =
            "block";


        shuffleQuestions();


        currentQuestion = 0;


        questionText.innerHTML =
            questionOrder[currentQuestion];


        experimentData = [];

        summaryData = [];


        experimentStart =
            performance.now();


        lastSampleTime = 0;

        lastPressure = 0;


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
   筆圧の正規化
========================================================= */

function normalizePressure(
    pressure
) {

    /*
        通常筆圧を0%

        最大筆圧を100%

        とする。

        例：

        通常 = 0.30
        最大 = 0.80
        現在 = 0.55

        → 50%
    */


    if (
        maximumPressure <=
        normalPressure
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
   メインCanvas：筆圧開始
========================================================= */

canvas.addEventListener(
    "pointerdown",
    (e) => {

        drawing = true;

        canvas.setPointerCapture(
            e.pointerId
        );


        ctx.beginPath();

        ctx.moveTo(
            e.offsetX,
            e.offsetY
        );


        lastX =
            e.offsetX;

        lastY =
            e.offsetY;

        lastTime =
            performance.now();

        lastSpeed = 0;

        lastPressure =
            e.pressure;

    }
);


/* =========================================================
   メインCanvas：筆圧取得
========================================================= */

canvas.addEventListener(
    "pointermove",
    (e) => {

        if (!drawing) return;


        const now =
            performance.now();


        /* -----------------------------------------
           描画
        ----------------------------------------- */

        ctx.lineCap =
            "round";

        ctx.lineJoin =
            "round";

        ctx.strokeStyle =
            "black";


        /*
            描画には元の筆圧を使用
        */

        ctx.lineWidth =
            e.pressure * 10 + 1;


        ctx.lineTo(
            e.offsetX,
            e.offsetY
        );

        ctx.stroke();


        /* -----------------------------------------
           75Hzサンプリング
        ----------------------------------------- */

        if (
            now -
            lastSampleTime
            <
            SAMPLE_INTERVAL
        ) {

            return;

        }


        lastSampleTime =
            now;


        /* -----------------------------------------
           座標
        ----------------------------------------- */

        const dx =
            e.offsetX -
            lastX;

        const dy =
            e.offsetY -
            lastY;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        const dt =
            (
                now -
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
           筆圧変動量
        ----------------------------------------- */

        const pressureChange =
            e.pressure -
            lastPressure;


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
                    performance.now();

            }

        }
        else {

            if (
                stopStart !== null
            ) {

                const stop =
                    (
                        performance.now() -
                        stopStart
                    ) / 1000;


                stopText.innerHTML =
                    stop.toFixed(2);


                stopStart =
                    null;

            }

        }


        /* -----------------------------------------
           表示
        ----------------------------------------- */

        pressureText.innerHTML =
            e.pressure.toFixed(3);


        normalizedPressureText.innerHTML =
            normalizedPressure.toFixed(1);


        pressureChangeText.innerHTML =
            pressureChange.toFixed(3);


        speedText.innerHTML =
            speed.toFixed(1);


        accelerationText.innerHTML =
            acceleration.toFixed(1);


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
                now,

            elapsedTime:
                now -
                experimentStart,

            x:
                e.offsetX,

            y:
                e.offsetY,

            pressure:
                e.pressure,

            normalizedPressure:
                normalizedPressure,

            pressureChange:
                pressureChange,

            speed:
                speed,

            acceleration:
                acceleration,

            stopTime:
                Number(
                    stopText.innerHTML
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

        lastSpeed =
            speed;

        lastPressure =
            e.pressure;

        lastX =
            e.offsetX;

        lastY =
            e.offsetY;

        lastTime =
            now;

    }
);


/* =========================================================
   筆を離した
========================================================= */

canvas.addEventListener(
    "pointerup",
    (e) => {

        drawing = false;

        if (
            canvas.hasPointerCapture(
                e.pointerId
            )
        ) {
            canvas.releasePointerCapture(
                e.pointerId
            );
        }
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
            データは消さない。

            現在の問題を
            書き直すためのリセット。
        */


        pressureText.innerHTML =
            "0";


        normalizedPressureText.innerHTML =
            "0";


        pressureChangeText.innerHTML =
            "0";


        speedText.innerHTML =
            "0";


        accelerationText.innerHTML =
            "0";


        stopText.innerHTML =
            "0";


        stopStart =
            null;


        lastSpeed =
            0;


        lastPressure =
            0;


        lastSampleTime =
            0;


        experimentStart =
            performance.now();

    };


/* =========================================================
   回答確定
========================================================= */

document.getElementById("submit").onclick = () => {

    console.log("回答確定ボタンが押されました");

    // 現在の問題のデータだけ取得
    const currentData = experimentData.filter(
        d => d.question === currentQuestion + 1
    );

    // データがない場合
    if (currentData.length === 0) {

        alert("まだ描画データがありません。");

        return;
    }

    // 平均筆圧
    const avgPressure =
        currentData.reduce(
            (sum, d) => sum + d.pressure, 0
        ) / currentData.length;

    // 最大筆圧
    const maxPressure =
        Math.max(
            ...currentData.map(d => d.pressure)
        );

    // 平均速度
    const avgSpeed =
        currentData.reduce(
            (sum, d) => sum + d.speed, 0
        ) / currentData.length;

    // 平均加速度
    const avgAcceleration =
        currentData.reduce(
            (sum, d) => sum + d.acceleration, 0
        ) / currentData.length;

    // 停止時間
    const totalStop =
        currentData.reduce(
            (sum, d) => sum + d.stopTime, 0
        );

    // 妨害イベントは現在使用していないので0
    const interruptCount = 0;

    // 回答時間
    const answerTime =
        performance.now() - experimentStart;

    // 集計データを保存
    summaryData.push({

        question: currentQuestion + 1,

        answerTime: answerTime,

        averagePressure: avgPressure,

        maximumPressure: maxPressure,

        averageSpeed: avgSpeed,

        averageAcceleration: avgAcceleration,

        totalStopTime: totalStop,

        interruptCount: interruptCount

    });

    console.log("集計データ:", summaryData);

    // -------------------------
    // 描画だけリセット
    // -------------------------

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // 表示を0に戻す
    pressureText.innerHTML = "0";

    speedText.innerHTML = "0";

    accelerationText.innerHTML = "0";

    stopText.innerHTML = "0";

    // -------------------------
    // 次の問題へ
    // -------------------------

    currentQuestion++;

    if (currentQuestion < questionOrder.length) {

        questionText.innerHTML =
            questionOrder[currentQuestion];

        // 次の問題の計測開始
        experimentStart = performance.now();

        // 初期値もリセット
        lastSpeed = 0;
        lastTime = performance.now();
        stopStart = null;

        console.log(
            "次の問題:",
            questionOrder[currentQuestion]
        );

    } else {

        alert("全ての問題が終了しました。");

        console.log(
            "最終集計データ:",
            summaryData
        );

    }

};


/* =========================================================
   詳細CSV
========================================================= */

function downloadCSV() {

    let csv = "\uFEFF";
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
        "Speed," +
        "Acceleration," +
        "StopTime," +
        "PointerType," +
        "Buttons," +
        "PenDown\n";


    experimentData.forEach(
        d => {

            csv +=

                d.participant + "," +

                d.question + "," +

                `"${d.questionText}",` +

                d.time + "," +

                d.elapsedTime + "," +

                d.x + "," +

                d.y + "," +

                d.pressure + "," +

                d.normalizedPressure + "," +

                d.pressureChange + "," +

                d.speed + "," +

                d.acceleration + "," +

                d.stopTime + "," +

                d.pointerType + "," +

                d.buttons + "," +

                d.penDown + "\n";

        }
    );

    const bom = "\uFEFF";
    const blob = new Blob(
            [bom +csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "experiment.csv";

    a.click();

    URL.revokeObjectURL(url);
}


/* =========================================================
   集計CSV
========================================================= */

function downloadSummaryCSV(){

    let csv = "\uFEFF";

    // ヘッダー
    csv +=
        "Question,QuestionText,AnswerTime,AveragePressure,MaximumPressure,AverageNormalizedPressure,PressureStability,AverageSpeed,AverageAcceleration\n";

    summaryData.forEach(d => {

        csv +=
            d.question + "," +
            "\"" + d.questionText.replace(/"/g, '""') + "\"," +
            d.answerTime + "," +
            d.averagePressure + "," +
            d.maximumPressure + "," +
            d.averageNormalizedPressure + "," +
            d.pressureStability + "," +
            d.averageSpeed + "," +
            d.averageAcceleration + "\n";

    });

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "experiment_summary.csv";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

document.getElementById("download").onclick = downloadCSV;

document.getElementById("downloadSummary").onclick = downloadSummaryCSV;