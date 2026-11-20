"use strict";

/*
 * hituatu2 実験用 v2
 * 時間単位は performance.now() に基づく ms。
 * 75Hzの間引きを撤廃。pointermoveで利用可能な coalesced events も記録。
 * 「接触中の停止」はイベント間隔からの推定であり、思考停止の直接測定ではない。
 */
const questions = [
  "「しゅうかん」を漢字で書きなさい。",
  "「かんばん」を漢字で書きなさい。",
  "「きょうりょく」を漢字で書きなさい。",
  "「はんだん」を漢字で書きなさい。",
  "「かんしゃ」を漢字で書きなさい。",
  "「けんちく」を漢字で書きなさい。",
  "「きょうちょう」を漢字で書きなさい。",
  "「かんしょう」を漢字で書きなさい。",
  "「どとう」を漢字で書きなさい。",
  "「けいさつ」を漢字で書きなさい。"
];

const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const calibrationCanvas = $("calibrationCanvas");
const calibrationCtx = calibrationCanvas.getContext("2d");
const STOP_THRESHOLD_MS = 500; // 接触中の無イベント区間を「推定停止」とする閾値
const LOW_SPEED_THRESHOLD = 5; // px/s（補助的な低速停止判定）
const INPUT_MODE = "pen"; // 本実験ではペンのみ。touch/mouseは記録しない

let participantID = "";
let questionOrder = [];
let currentQuestion = 0;
let orderMode = "sequential";
let questionStart = 0;
let experimentEnded = false;
let calibrationMode = "normal";
let maximumPressure = 0;
let normalPressure = 0;
let calibrationPressures = [];
let calibrationDrawing = false;
let drawing = false;
let activePointerId = null;
let strokeId = 0;
let lastPoint = null;
let lastSampleTime = null;
let lastSpeed = 0;
let lastPressure = 0;
let lastNormalizedPressure = 0;
let firstDownTime = null;
let lastUpTime = null;
let clearCount = 0;
let stopStart = null;
let lowSpeedStart = null;
let experimentData = [];
let eventData = [];
let stopData = [];
let summaryData = [];
let lastDisplayTime = 0;

function elapsed(t) { return t - questionStart; }
function nowMs() { return performance.now(); }
function normalizePressure(p) {
  // 通常筆圧を0、最大筆圧を100とする。通常以下は負、最大超は100超を保持する。
  // キャリブレーションが無効な場合は0と区別するためNaNを返す。
  if (maximumPressure <= normalPressure) return NaN;
  return (p - normalPressure) / (maximumPressure - normalPressure) * 100;
}
function position(e, target) {
  const r = target.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * target.width / r.width,
    y: (e.clientY - r.top) * target.height / r.height
  };
}
function questionMeta() {
  const item = questionOrder[currentQuestion];
  return {
    participant: participantID,
    question: currentQuestion + 1,
    questionId: item.id,
    questionText: item.text,
    orderMode
  };
}
function recordEvent(type, t, extra = {}) {
  eventData.push({
    ...questionMeta(), eventType: type, time: t,
    elapsedTime: elapsed(t), strokeId, pointerType: INPUT_MODE, ...extra
  });
}
function closeStop(end, reason = "movement") {
  if (stopStart === null) return;
  if (end > stopStart) {
    const duration = end - stopStart;
    stopData.push({
      ...questionMeta(), strokeId,
      stopType: "contact_inferred",
      startTime: stopStart, endTime: end,
      startElapsedTime: elapsed(stopStart),
      endElapsedTime: elapsed(end),
      durationMs: duration, reason
    });
    recordEvent("stop_end", end, { durationMs: duration, reason });
  }
  stopStart = null;
}
function resetQuestionState() {
  drawing = false;
  activePointerId = null;
  strokeId = 0;
  lastPoint = null;
  lastSampleTime = null;
  lastSpeed = 0;
  lastPressure = 0;
  lastNormalizedPressure = 0;
  firstDownTime = null;
  lastUpTime = null;
  clearCount = 0;
  stopStart = null;
  lowSpeedStart = null;
  ["pressure", "normalizedPressure", "pressureChange", "speed",
   "acceleration", "stopTime"].forEach(id => { if ($(id)) $(id).textContent = "0"; });
}
function displayQuestion() {
  $("questionText").textContent = questionOrder[currentQuestion].text;
  $("questionProgress").textContent =
    (currentQuestion + 1) + " / " + questionOrder.length + " 問";
  questionStart = nowMs();
  resetQuestionState();
  recordEvent("question_shown", questionStart);
}
function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function startExperiment() {
  participantID = $("participantId").value.trim();
  if (!participantID) { alert("被験者IDを入力してください。"); return; }
  orderMode = $("questionOrderMode").value;
  questionOrder = questions.map((text, i) => ({ id: i + 1, text }));
  if (orderMode === "random") questionOrder = shuffled(questionOrder);
  currentQuestion = 0;
  experimentEnded = false;
  experimentData = [];
  eventData = [];
  stopData = [];
  summaryData = [];
  $("setup").hidden = true;
  $("calibration").hidden = false;
  calibrationMode = "normal";
  calibrationPressures = [];
  maximumPressure = 0;
  normalPressure = 0;
  $("calibrationTitle").textContent = "通常筆圧キャリブレーション";
  $("calibrationInstruction").textContent = "普段通りの力で、名前を書いてください。";
}
$("startExperiment").addEventListener("click", startExperiment);

function drawCalibration(e, down = false) {
  if (e.pointerType !== INPUT_MODE) return;
  e.preventDefault();
  const p = position(e, calibrationCanvas);
  if (down) {
    calibrationDrawing = true;
    calibrationCanvas.setPointerCapture(e.pointerId);
    calibrationCtx.beginPath();
    calibrationCtx.moveTo(p.x, p.y);
  }
  if (!calibrationDrawing) return;
  calibrationCtx.lineWidth = 3;
  calibrationCtx.lineCap = "round";
  calibrationCtx.lineTo(p.x, p.y);
  calibrationCtx.stroke();
  calibrationPressures.push(e.pressure);
  if (calibrationMode === "maximum") maximumPressure = Math.max(maximumPressure, e.pressure);
  $("calibrationPressure").textContent = e.pressure.toFixed(3);
}
calibrationCanvas.addEventListener("pointerdown", e => drawCalibration(e, true));
calibrationCanvas.addEventListener("pointermove", e => drawCalibration(e));
for (const name of ["pointerup", "pointercancel"]) {
  calibrationCanvas.addEventListener(name, e => {
    if (e.pointerType !== INPUT_MODE) return;
    calibrationDrawing = false;
    if (calibrationCanvas.hasPointerCapture(e.pointerId)) {
      calibrationCanvas.releasePointerCapture(e.pointerId);
    }
  });
}
$("calibrationClear").addEventListener("click", () => {
  calibrationCtx.clearRect(0, 0, calibrationCanvas.width, calibrationCanvas.height);
  calibrationPressures = [];
  $("calibrationPressure").textContent = "0";
  if (calibrationMode === "maximum") maximumPressure = 0;
  else normalPressure = 0;
});
$("calibrationNext").addEventListener("click", () => {
  if (calibrationMode === "normal") {
    if (!calibrationPressures.length) { alert("ペンで名前を書いてください。"); return; }
    normalPressure = calibrationPressures.reduce((a, b) => a + b, 0) /
      calibrationPressures.length;
    calibrationMode = "maximum";
    calibrationPressures = [];
    $("calibrationTitle").textContent = "最大筆圧キャリブレーション";
    $("calibrationInstruction").textContent = "できるだけ強い力で線を書いてください。";
    calibrationCtx.clearRect(0, 0, calibrationCanvas.width, calibrationCanvas.height);
    $("calibrationPressure").textContent = "0";
    return;
  }
  if (maximumPressure <= 0) { alert("ペンで線を書いてください。"); return; }
  if (normalPressure >= maximumPressure) {
    alert("最大筆圧が通常筆圧以下です。最大筆圧を測り直してください。");
    return;
  }
  $("calibration").hidden = true;
  $("experimentArea").hidden = false;
  displayQuestion();
});

function appendSample(e, t) {
  if (!drawing) return;
  const p = position(e, canvas);
  const dtMs = lastSampleTime === null ? 0 : t - lastSampleTime;
  if (dtMs < 0) return; // ブラウザのイベント時刻が逆転した場合
  const distance = lastPoint ? Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) : 0;
  const dt = dtMs / 1000;
  const speed = dt > 0 ? distance / dt : 0;
  const acceleration = dt > 0 ? (speed - lastSpeed) / dt : 0;
  const normalizedPressure = normalizePressure(e.pressure);

  // 0.5秒以上イベントが来なかった区間を接触中の推定停止として保存。
  // 実際の思考停止ではなく、ブラウザのイベント欠落を含み得る。
  if (lastSampleTime !== null && dtMs >= STOP_THRESHOLD_MS) {
    lowSpeedStart = null;
    closeStop(lastSampleTime, "previous_stop");
    stopStart = lastSampleTime;
    recordEvent("stop_start", stopStart, { reason: "sample_gap" });
    closeStop(t, "sample_gap");
  }
  // 連続する低速サンプルも停止候補とする。
  if (speed < LOW_SPEED_THRESHOLD && dtMs > 0 && dtMs < STOP_THRESHOLD_MS) {
    if (lowSpeedStart === null) lowSpeedStart = lastSampleTime;
  } else {
    if (lowSpeedStart !== null && lastSampleTime - lowSpeedStart >= STOP_THRESHOLD_MS) {
      stopStart = lowSpeedStart;
      recordEvent("stop_start", stopStart, { reason: "low_speed" });
      closeStop(lastSampleTime, "low_speed");
    }
    lowSpeedStart = null;
  }

  experimentData.push({
    ...questionMeta(), strokeId, time: t, elapsedTime: elapsed(t),
    x: p.x, y: p.y, pressure: e.pressure,
    normalizedPressure, pressureChange: e.pressure - lastPressure,
    normalizedPressureChange: normalizedPressure - lastNormalizedPressure,
    speed, acceleration, stopTime: 0,
    pointerType: e.pointerType, buttons: e.buttons, penDown: true
  });
  if (lastPoint) {
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(p.x, p.y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111";
    ctx.stroke();
  }
  if (t - lastDisplayTime >= 100) {
    $("pressure").textContent = e.pressure.toFixed(3);
    $("normalizedPressure").textContent = normalizedPressure.toFixed(1);
    $("pressureChange").textContent = (e.pressure - lastPressure).toFixed(3);
    $("speed").textContent = speed.toFixed(1);
    $("acceleration").textContent = acceleration.toFixed(1);
    lastDisplayTime = t;
  }
  lastPoint = p;
  lastSampleTime = t;
  lastSpeed = speed;
  lastPressure = e.pressure;
  lastNormalizedPressure = normalizedPressure;
}
canvas.addEventListener("pointerdown", e => {
  if (experimentEnded || e.pointerType !== INPUT_MODE || drawing) return;
  e.preventDefault();
  const t = nowMs();
  drawing = true;
  activePointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  strokeId++;
  if (firstDownTime === null) firstDownTime = t;
  lastPoint = null;
  lastSampleTime = null;
  lastSpeed = 0;
  lastPressure = e.pressure;
  lastNormalizedPressure = normalizePressure(e.pressure);
  lowSpeedStart = null;
  const p = position(e, canvas);
  recordEvent("pointerdown", t, { x: p.x, y: p.y, pressure: e.pressure });
  appendSample(e, t);
});
canvas.addEventListener("pointermove", e => {
  if (!drawing || e.pointerId !== activePointerId || e.pointerType !== INPUT_MODE) return;
  e.preventDefault();
  const events = typeof e.getCoalescedEvents === "function"
    ? e.getCoalescedEvents() : [];
  const batch = events.length ? events : [e];
  for (const sample of batch) {
    // performance.now() と同じ time origin を持つ PointerEvent.timeStamp
    const t = Number.isFinite(sample.timeStamp) && sample.timeStamp > 0
      ? sample.timeStamp : nowMs();
    appendSample(sample, t);
  }
});
function finishStroke(e, type) {
  if (!drawing || e.pointerId !== activePointerId) return;
  e.preventDefault();
  const t = nowMs();
  if (lastSampleTime !== null && t - lastSampleTime >= STOP_THRESHOLD_MS) {
    stopStart = lastSampleTime;
    recordEvent("stop_start", stopStart, { reason: "stroke_end_gap" });
    closeStop(t, "stroke_end_gap");
  }
  if (lowSpeedStart !== null && t - lowSpeedStart >= STOP_THRESHOLD_MS && stopStart === null) {
    stopStart = lowSpeedStart;
    recordEvent("stop_start", stopStart, { reason: "low_speed" });
    closeStop(t, "stroke_end");
  }
  const p = position(e, canvas);
  recordEvent(type, t, { x: p.x, y: p.y, pressure: e.pressure });
  lastUpTime = t;
  drawing = false;
  activePointerId = null;
  lowSpeedStart = null;
  lastPoint = null;
  lastSampleTime = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener("pointerup", e => finishStroke(e, "pointerup"));
canvas.addEventListener("pointercancel", e => finishStroke(e, "pointercancel"));
canvas.addEventListener("lostpointercapture", e => {
  if (drawing && e.pointerId === activePointerId) finishStroke(e, "pointercancel");
});

$("clear").addEventListener("click", () => {
  if (experimentEnded) return;
  if (drawing) { alert("ペンを離してから書き直してください。"); return; }
  const t = nowMs();
  clearCount++;
  recordEvent("clear", t, { clearCount });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 書き直す前のデータは履歴として残す。
  lastPoint = null;
  lastSampleTime = null;
});
$("submit").addEventListener("click", () => {
  if (experimentEnded) return;
  if (drawing) { alert("ペンを離してから確定してください。"); return; }
  if (firstDownTime === null) { alert("ペンで解答を書いてください。"); return; }
  const t = nowMs();
  recordEvent("submit", t);
  const samples = experimentData.filter(d => d.question === currentQuestion + 1);
  const stops = stopData.filter(d => d.question === currentQuestion + 1);
  const events = eventData.filter(d => d.question === currentQuestion + 1);
  const downs = events.filter(d => d.eventType === "pointerdown");
  const ups = events.filter(d => d.eventType === "pointerup" || d.eventType === "pointercancel");
  const clears = events.filter(d => d.eventType === "clear");
  const avg = fn => samples.reduce((s, d) => s + fn(d), 0) / (samples.length || 1);
  const max = fn => samples.length ? Math.max(...samples.map(fn)) : 0;
  const absChange = avg(d => Math.abs(d.normalizedPressureChange));
  const airTimes = [];
  for (let i = 1; i < downs.length; i++) {
    const prev = ups.filter(u => u.time <= downs[i].time).at(-1);
    if (prev) airTimes.push(downs[i].time - prev.time);
  }
  summaryData.push({
    ...questionMeta(), answerTime: t - questionStart,
    writingStartTime: firstDownTime - questionStart,
    writingEndToSubmitTime: lastUpTime === null ? null : t - lastUpTime,
    firstDownTime, lastUpTime, submitTime: t,
    averagePressure: avg(d => d.pressure),
    maximumPressure: max(d => d.pressure),
    averageNormalizedPressure: avg(d => d.normalizedPressure),
    maximumNormalizedPressure: max(d => d.normalizedPressure),
    pressureStability: absChange,
    averageSpeed: avg(d => d.speed),
    averageAcceleration: avg(d => d.acceleration),
    totalStopTime: stops.reduce((s, d) => s + d.durationMs, 0),
    stopCount: stops.length,
    penLiftCount: Math.max(0, downs.length - 1),
    totalPenUpTime: airTimes.reduce((a, b) => a + b, 0),
    clearCount,
    clearTimes: clears.map(d => d.elapsedTime).join(";"),
    pointerType: INPUT_MODE,
    calibrationMaximumPressure: maximumPressure,
    calibrationNormalPressure: normalPressure
  });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  currentQuestion++;
  if (currentQuestion < questionOrder.length) displayQuestion();
  else {
    experimentEnded = true;
    $("questionText").textContent = "実験終了。CSVを3種類保存してください。";
    $("questionProgress").textContent = "終了";
    $("submit").disabled = true;
    $("clear").disabled = true;
    alert("全問終了しました。詳細・イベント・集計CSVを保存してください。");
  }
});
function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  return '"' + String(value).replace(/"/g, '""') + '"';
}
function exportCSV(filename, rows, keys) {
  if (!rows.length) { alert("保存するデータがありません。"); return; }
  const csv = "\uFEFF" + keys.join(",") + "\n" +
    rows.map(row => keys.map(key => escapeCSV(row[key])).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const detailKeys = ["participant","question","questionId","questionText","orderMode",
  "strokeId","time","elapsedTime","x","y","pressure","normalizedPressure",
  "pressureChange","normalizedPressureChange","speed","acceleration",
  "stopTime","pointerType","buttons","penDown"];
const eventKeys = ["participant","question","questionId","questionText","orderMode",
  "eventType","time","elapsedTime","strokeId","pointerType","x","y","pressure",
  "clearCount","durationMs","reason"];
const stopKeys = ["participant","question","questionId","questionText","orderMode",
  "strokeId","stopType","startTime","endTime","startElapsedTime",
  "endElapsedTime","durationMs","reason"];
const summaryKeys = ["participant","question","questionId","questionText","orderMode",
  "answerTime","writingStartTime","writingEndToSubmitTime","firstDownTime",
  "lastUpTime","submitTime","averagePressure","maximumPressure",
  "averageNormalizedPressure","maximumNormalizedPressure","pressureStability",
  "averageSpeed","averageAcceleration","totalStopTime","stopCount","penLiftCount",
  "totalPenUpTime","clearCount","clearTimes","pointerType",
  "calibrationMaximumPressure","calibrationNormalPressure"];
$("download").addEventListener("click", () => exportCSV("experiment.csv", experimentData, detailKeys));
$("downloadEvents").addEventListener("click", () => exportCSV("experiment_events.csv", eventData, eventKeys));
$("downloadStops").addEventListener("click", () => exportCSV("experiment_stops.csv", stopData, stopKeys));
$("downloadSummary").addEventListener("click", () => exportCSV("experiment_summary.csv", summaryData, summaryKeys));
