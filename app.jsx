const { useState, useMemo } = React;

const formatNumber = (value) => {
  if (value === null || value === undefined) return "?";
  if (typeof value !== "number") return value;
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(2).replace(/\.?0+$/, "");
};

const isClose = (a, b, eps = 1e-6) => {
  if (a === null || b === null || a === undefined || b === undefined) return false;
  return Math.abs(a - b) < eps;
};

const keyFor = (prefix, i, j) => `${prefix}-${i}-${j}`;
const toColumn = (arr) => arr.map((v) => [v]);
const toRow = (arr) => [arr];
const buildEditableMask = (data) => data.map((row) => row.map((val) => val === null));
const layoutY = (index, count, height, top = 20, bottom = 20) => {
  const span = height - top - bottom;
  if (count <= 1) return top + span / 2;
  return top + (span * index) / (count - 1);
};
const multiplyMatrices = (a, b) => {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += a[i][k] * b[k][j];
      }
      return sum;
    })
  );
};
const computeLayerZ = (weights, biases, inputs) => {
  if (!inputs || inputs.some((v) => v === null || v === undefined)) {
    return biases.map(() => null);
  }
  return weights.map((row, i) => row.reduce((sum, w, j) => sum + w * inputs[j], 0) + biases[i]);
};
const fillData = (data, prefix, answers) =>
  data.map((row, i) =>
    row.map((val, j) => (val === null ? (answers[keyFor(prefix, i, j)] ?? null) : val))
  );
const cellSizeFor = (rows, cols) => (rows > 4 || cols > 4 ? "small" : "normal");
const workbookImagePath = (folder, id) => `assets/${folder}/ex-${String(id).padStart(2, "0")}.png`;
const flattenAnswer = (value) => (Array.isArray(value) ? value.flat() : [value]);
const valuesFromAnswerMap = (answers) => Object.values(answers || {});
const normalizeWorkbookAnswer = (value) => {
  if (typeof value !== "string") return value;
  const lower = value.trim().toLowerCase();
  if (lower.startsWith("sigmoid")) return "sigmoid";
  if (lower.startsWith("relu")) return "relu";
  return value;
};

const matchesAnswer = (userValue, expectedValue) => {
  if (expectedValue === null || expectedValue === undefined) return false;
  if (typeof expectedValue === "string") {
    const expectedNorm = expectedValue.trim().toLowerCase();
    const userNorm = String(userValue ?? "").trim().toLowerCase();
    if (expectedNorm === "sigmoid") return userNorm.startsWith("sigmoid");
    if (expectedNorm === "relu") return userNorm.startsWith("relu");
    return userNorm === expectedNorm;
  }
  if (userValue === null || userValue === undefined || userValue === "") return false;
  return isClose(Number(userValue), expectedValue);
};

const DOT_EXERCISES = [{"id": 1, "a": [5.0], "b": [3.0], "result": 15.0, "type": "find_result"}, {"id": 2, "a": [2.0], "b": [4.0], "result": 8.0, "type": "find_result"}, {"id": 3, "a": [2.0], "b": [-3.0], "result": -6.0, "type": "find_result"}, {"id": 4, "a": [2.0], "b": [null], "result": 6.0, "type": "find_b", "answer": 3.0}, {"id": 5, "a": [null], "b": [-3.0], "result": 9.0, "type": "find_a", "answer": -3.0}, {"id": 6, "a": [1.0, 1.0], "b": [1.0, 2.0], "result": 3.0, "type": "find_result"}, {"id": 7, "a": [1.0, 2.0], "b": [1.0, 2.0], "result": 5.0, "type": "find_result"}, {"id": 8, "a": [4.0, 1.0], "b": [1.0, 3.0], "result": 7.0, "type": "find_result"}, {"id": 9, "a": [4.0, 1.0], "b": [1.0, -1.0], "result": 3.0, "type": "find_result"}, {"id": 10, "a": [4.0, 1.0], "b": [0.0, -1.0], "result": -1.0, "type": "find_result"}, {"id": 11, "a": [-4.0, 2.0], "b": [0.0, -3.0], "result": -6.0, "type": "find_result"}, {"id": 12, "a": [-4.0, 0.0], "b": [0.0, -3.0], "result": 0.0, "type": "find_result"}, {"id": 13, "a": [2.0, 3.0], "b": [1.0, null], "result": 5.0, "type": "find_b", "answer": 1.0}, {"id": 14, "a": [2.0, 3.0], "b": [1.0, null], "result": 2.0, "type": "find_b", "answer": 0.0}, {"id": 15, "a": [4.0, 3.0], "b": [1.0, null], "result": 1.0, "type": "find_b", "answer": -1.0}, {"id": 16, "a": [2.0, 3.0], "b": [1.0, null], "result": 8.0, "type": "find_b", "answer": 2.0}, {"id": 17, "a": [1.0, 2.0, 3.0], "b": [1.0, 1.0, 1.0], "result": 6.0, "type": "find_result"}, {"id": 18, "a": [4.0, 9.0, 3.0], "b": [1.0, 0.0, -1.0], "result": 1.0, "type": "find_result"}, {"id": 19, "a": [0.0, 1.0, 0.0], "b": [1.0, 0.0, -1.0], "result": 0.0, "type": "find_result"}, {"id": 20, "a": [8.0, 4.0, 5.0], "b": [1.0, 0.0, null], "result": 3.0, "type": "find_b", "answer": -1.0}, {"id": 21, "a": [4.0, 2.0, 9.0], "b": [null, 1.0, 0.0], "result": 6.0, "type": "find_b", "answer": 1.0}, {"id": 22, "a": [4.0, 2.0, 9.0], "b": [null, 1.0, 0.0], "result": -2.0, "type": "find_b", "answer": -1.0}, {"id": 23, "a": [1.0, 1.0, null], "b": [3.0, 1.0, -2.0], "result": 6.0, "type": "find_a", "answer": -1.0}, {"id": 24, "a": [1.0, 4.0, null], "b": [3.0, 1.0, -2.0], "result": 7.0, "type": "find_a", "answer": 0.0}, {"id": 25, "a": [1.0, 3.0, 0.0], "b": [2.0, null, -9.0], "result": -1.0, "type": "find_b", "answer": -1.0}];

const MATMUL_EXERCISES = [{"id": 1, "a": [[3.0]], "b": [[5.0, 2.0]], "type": "element", "target": [0, 1], "answer": 6.0}, {"id": 2, "a": [[3.0], [2.0]], "b": [[4.0]], "type": "element", "target": [1, 0], "answer": 8.0}, {"id": 3, "a": [[1.0], [-1.0]], "b": [[1.0, -1.0]], "type": "element", "target": [1, 1], "answer": 1.0}, {"id": 4, "a": [[3.0], [2.0]], "b": [[2.0, -2.0]], "type": "element", "target": [1, 1], "answer": -4.0}, {"id": 5, "a": [[1.0], [null]], "b": [[3.0, -5.0]], "type": "inputs", "answer": 0.0, "inputAnswers": {"A-1-0": 0.0}, "result": [[3.0, -5.0], [0.0, 0.0]]}, {"id": 6, "a": [[1.0], [null]], "b": [[4.0, -2.0]], "type": "inputs", "answer": -1.0, "inputAnswers": {"A-1-0": -1.0}, "result": [[4.0, -2.0], [-4.0, 2.0]]}, {"id": 7, "a": [[1.0, 1.0], [1.0, -1.0]], "b": [[1.0, 3.0], [3.0, 2.0]], "type": "element", "target": [0, 1], "answer": 5.0}, {"id": 8, "a": [[1.0, 1.0], [1.0, -1.0]], "b": [[2.0, 5.0], [4.0, 3.0]], "type": "element", "target": [1, 0], "answer": -2.0}, {"id": 9, "a": [[3.0, 2.0], [4.0, 5.0]], "b": [[1.0, 1.0], [-1.0, 1.0]], "type": "element", "target": [1, 0], "answer": -1.0}, {"id": 10, "a": [[5.0, 5.0], [-2.0, 2.0]], "b": [[1.0, 1.0], [-1.0, 1.0]], "type": "element", "target": [1, 0], "answer": -4.0}, {"id": 11, "a": [[3.0, 1.0], [2.0, 4.0]], "b": [[1.0, 1.0, -1.0, -1.0], [-1.0, 1.0, 1.0, -1.0]], "type": "element", "target": [0, 2], "answer": -2.0}, {"id": 12, "a": [[1.0, 1.0], [1.0, -1.0], [1.0, 0.0]], "b": [[4.0, 3.0, 2.0, 1.0], [1.0, 2.0, 1.0, 2.0]], "type": "element", "target": [1, 2], "answer": 1.0}, {"id": 13, "a": [[1.0, 0.0, 1.0], [0.0, 1.0, 1.0]], "b": [[2.0, 1.0], [3.0, 5.0], [4.0, -1.0]], "type": "element", "target": [1, 1], "answer": 4.0}, {"id": 14, "a": [[3.0, 3.0, -1.0], [2.0, 1.0, 3.0]], "b": [[1.0, 1.0], [1.0, 0.0], [0.0, 1.0]], "type": "element", "target": [0, 0], "answer": 6.0}, {"id": 15, "a": [[1.0, 1.0], [1.0, 0.0], [0.0, 1.0]], "b": [[3.0, 3.0, -1.0], [2.0, 1.0, 3.0]], "type": "element", "target": [2, 1], "answer": 1.0}, {"id": 16, "a": [[0.0, 1.0, null], [1.0, 1.0, 0.0]], "b": [[3.0, 2.0], [2.0, 1.0], [1.0, -2.0]], "type": "inputs", "answer": 1.0, "inputAnswers": {"A-0-2": 1.0}, "result": [[3.0, -1.0], [5.0, 3.0]]}, {"id": 17, "a": [[1.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "b": [[-2.0, null], [4.0, 4.0], [3.0, 1.0]], "type": "inputs", "answer": 2.0, "inputAnswers": {"B-0-1": 2.0}, "result": [[1.0, 3.0], [2.0, 6.0]]}, {"id": 18, "a": [[1.0, 1.0, 0.0, 1.0], [1.0, 0.0, 1.0, -1.0]], "b": [[3.0, 2.0], [2.0, 0.0], [1.0, 2.0], [4.0, 3.0]], "type": "element", "target": [0, 1], "answer": 5.0}, {"id": 19, "a": [[3.0, 2.0], [2.0, 0.0], [1.0, 2.0], [4.0, 3.0]], "b": [[1.0, 1.0, 0.0, 1.0], [1.0, 0.0, 1.0, -1.0]], "type": "element", "answer": 2.0, "target": [2, 2], "labels": {"left": "B", "right": "A", "result": "B×A"}}, {"id": 20, "a": [[1.0, 1.0, 0.0, 0.0], [0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0], [1.0, 0.0, 0.0, 1.0]], "b": [[3.0, 2.0], [2.0, 1.0], [1.0, 1.0], [4.0, 3.0]], "type": "element", "target": [1, 1], "answer": 2.0}, {"id": 21, "a": [[1.0, -1.0, 0.0, 0.0], [0.0, 1.0, -1.0, 0.0], [0.0, 0.0, 1.0, -1.0], [-1.0, 0.0, 0.0, 1.0]], "b": [[3.0, 2.0], [2.0, 1.0], [1.0, 1.0], [4.0, 3.0]], "type": "element", "target": [2, 0], "answer": -3.0}, {"id": 22, "a": [[9.0, -2.0, 0.0, 5.0], [13.0, 3.0, 1.0, 4.0]], "b": [[1.0, 0.0, 0.0, 0.0, 1.0], [0.0, 1.0, 0.0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 0.0, 1.0, 0.0]], "type": "element", "target": [0, 1], "answer": -2.0}, {"id": 23, "a": [[2.0, -1.0, 1.0, 0.0], [3.0, 2.0, 4.0, 1.0]], "b": [[0.0, 0.0, 0.0, 1.0, 1.0], [1.0, 0.0, 1.0, 0.0, 1.0], [0.0, 1.0, 1.0, 0.0, 1.0], [0.0, null, 0.0, 1.0, 0.0]], "type": "inputs", "answer": 1.0, "inputAnswers": {"B-3-1": 1.0}, "result": [[-1.0, 1.0, 0.0, 2.0, 0.0], [2.0, 5.0, 6.0, 4.0, 9.0]]}, {"id": 24, "a": [[-1.0, 1.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [null, 0.0, 1.0, 0.0], [1.0, 0.0, 0.0, 1.0]], "b": [[3.0, 2.0], [2.0, 1.0], [1.0, 1.0], [4.0, 3.0]], "type": "inputs", "answer": -1.0, "inputAnswers": {"A-2-0": -1.0}, "result": [[-1.0, -1.0], [2.0, 1.0], [-2.0, -1.0], [7.0, 5.0]]}, {"id": 25, "a": [[1.0, 1.0, 1.0, 0.0], [0.0, 1.0, 1.0, 1.0], [1.0, 0.0, 1.0, 1.0], [1.0, 1.0, 0.0, 1.0], [1.0, 1.0, -1.0, 1.0]], "b": [[0.0, 0.0, 0.0, 1.0, 1.0], [1.0, 0.0, 1.0, 0.0, 1.0], [0.0, 1.0, 1.0, 0.0, 1.0], [0.0, 0.0, 0.0, 1.0, 0.0]], "type": "element", "target": [1, 2], "answer": 2.0}];

const LINEAR_EXERCISES = [{"id": 1, "W": [[3.0]], "x": [4.0], "b": [0.0], "type": "output", "answer": [12.0]}, {"id": 2, "W": [[3.0]], "x": [4.0], "b": [2.0], "type": "output", "answer": [14.0]}, {"id": 3, "W": [[3.0]], "x": [4.0], "b": [-1.0], "type": "output", "answer": [11.0]}, {"id": 4, "W": [[3.0], [3.0]], "x": [4.0], "b": [2.0, -2.0], "type": "output", "answer": [14.0, 10.0]}, {"id": 5, "W": [[3.0], [3.0], [3.0]], "x": [2.0], "b": [2.0, -2.0, -4.0], "type": "output", "answer": [8.0, 4.0, 2.0]}, {"id": 6, "W": [[1.0, -1.0]], "x": [2.0, 1.0], "b": [0.0], "type": "output", "answer": [1.0]}, {"id": 7, "W": [[2.0, 1.0]], "x": [2.0, 3.0], "b": [2.0], "type": "output", "answer": [9.0]}, {"id": 8, "W": [[1.0, 1.0], [1.0, -1.0]], "x": [2.0, -1.0], "b": [0.0, 0.0], "type": "output", "answer": [1.0, 3.0]}, {"id": 9, "W": [[1.0, 1.0], [1.0, -1.0]], "x": [2.0, 1.0], "b": [2.0, 2.0], "type": "output", "answer": [5.0, 3.0]}, {"id": 10, "W": [[1.0, 1.0], [0.0, 1.0], [1.0, -1.0]], "x": [3.0, 2.0], "b": [0.0, 0.0, 0.0], "type": "output", "answer": [5.0, 2.0, 1.0]}, {"id": 11, "W": [[1.0, 1.0], [1.0, -1.0], [-1.0, 1.0]], "x": [4.0, 7.0], "b": [0.0, 0.0, 0.0], "type": "output", "answer": [11.0, -3.0, 3.0]}, {"id": 12, "W": [[1.0, -1.0, 1.0], [1.0, 1.0, 1.0]], "x": [1.0, -2.0, 3.0], "b": [0.0, 0.0], "type": "output", "answer": [6.0, 2.0]}, {"id": 13, "W": [[1.0, 1.0, 0.0], [1.0, 0.0, 1.0]], "x": [3.0, 1.0, 2.0], "b": [-1.0, -1.0], "type": "output", "answer": [3.0, 4.0]}, {"id": 14, "W": [[1.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 0.0, 1.0]], "x": [3.0, 1.0, 2.0], "b": [0.0, 0.0, 0.0], "type": "output", "answer": [4.0, 3.0, 5.0]}, {"id": 15, "W": [[1.0, 1.0]], "x": [2.0, 3.0], "b": [0.0], "type": "output", "answer": [5.0]}, {"id": 16, "W": [[1.0, 0.0]], "x": [2.0, 3.0], "b": [0.0], "type": "output", "answer": [2.0]}, {"id": 17, "W": [[1.0, 1.0]], "x": [2.0, 1.0], "b": [2.0], "type": "output", "answer": [5.0]}, {"id": 18, "W": [[1.0, 1.0]], "x": [2.0, 1.0], "b": [-2.0], "type": "output", "answer": [1.0]}, {"id": 19, "W": [[-1.0, 1.0], [1.0, -1.0]], "x": [3.0, 5.0], "b": [0.0, 0.0], "type": "output", "answer": [2.0, -2.0]}, {"id": 20, "W": [[1.0, 2.0], [1.0, 3.0]], "x": [4.0, 2.0], "b": [0.0, 0.0], "type": "output", "answer": [8.0, 10.0]}, {"id": 21, "W": [[1.0, 2.0], [1.0, 2.0]], "x": [3.0, 2.0], "b": [1.0, 5.0], "type": "output", "answer": [8.0, 12.0]}, {"id": 22, "W": [[1.0, 1.0], [2.0, 1.0], [3.0, 0.0]], "x": [3.0, 2.0], "b": [0.0, 0.0, 0.0], "type": "output", "answer": [5.0, 8.0, 9.0]}, {"id": 23, "W": [[1.0, 1.0], [2.0, 1.0], [3.0, 1.0]], "x": [2.0, 1.0], "b": [0.0, 0.0, 0.0], "type": "output", "answer": [3.0, 5.0, 7.0]}, {"id": 24, "W": [[1.0, 1.0, 0.0], [1.0, 1.0, -1.0], [1.0, 1.0, 1.0]], "x": [2.0, 1.0, 2.0], "b": [0.0, 0.0, 0.0], "type": "output", "answer": [3.0, 1.0, 5.0]}, {"id": 25, "W": [[1.0, 1.0, 0.0], [1.0, 1.0, 0.0], [1.0, 1.0, 0.0]], "x": [2.0, 5.0, 1.0], "b": [0.0, -2.0, -4.0], "type": "output", "answer": [7.0, 5.0, 3.0]}];

const ACTIVATION_EXERCISES = [
  { id: 1, mode: "linear", activation: "relu", W: [[1, -1], [1, -2], [1, -3]], b: [0, 0, 0], x: [3, 2], output: [1, 0, null], answer: 0 },
  { id: 2, mode: "linear", activation: "relu", W: [[1, 1], [1, 1], [1, 1]], b: [-2, -4, -6], x: [3, 2], output: [3, null, 0], answer: 1 },
  { id: 3, mode: "vector", activation: "relu", input: [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5], output: [null, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0], answer: 5 },
  { id: 4, mode: "vector", activation: "relu", input: [2, 0, -2], output: [2, 0, null], answer: 0 },
  { id: 5, mode: "vector", activation: "sigmoid3", input: [2, 0, -2], output: [1, null, 0], answer: 0.5 },
  { id: 6, mode: "vector", activation: "sigmoid3", input: [-3, 1, -1], output: [0, null, 0.5], answer: 0.5 },
  { id: 7, mode: "vector", activation: "sigmoid3", input: [-9, -5, -4], output: [0, null, 0], answer: 0 },
  { id: 8, mode: "vector", activation: "sigmoid3", input: [11, 7, 4], output: [1, null, 1], answer: 1 },
  { id: 9, mode: "linear", activation: "sigmoid3", W: [[1, -1], [1, -2], [1, -3]], b: [0, 0, 0], x: [3, 2], output: [0.5, null, 0], answer: 0.5 },
  { id: 10, mode: "linear", activation: "sigmoid3", W: [[1, -1], [1, -2], [1, -3]], b: [3, 3, 3], x: [3, 2], output: [null, 1, 0.5], answer: 1 },
  { id: 11, mode: "linear", activation: "sigmoid3", W: [[1, -1], [1, -2], [1, -3]], b: [-2, -2, -2], x: [3, 2], output: [0.5, null, 0], answer: 0 },
  { id: 12, mode: "vector", activation: "tanh3", input: [2, 0, -2], output: [1, null, -1], answer: 0 },
  { id: 13, mode: "vector", activation: "tanh3", input: [-9, -5, -4], output: [-1, null, -1], answer: -1 },
  { id: 14, mode: "vector", activation: "tanh3", input: [11, 7, 4], output: [1, null, 1], answer: 1 },
  { id: 15, mode: "linear", activation: "tanh3", W: [[1, -1], [1, -2], [1, -3]], b: [0, 0, 0], x: [3, 2], output: [0, null, -1], answer: 0 },
  { id: 16, mode: "linear", activation: "tanh3", W: [[1, -1], [1, -2], [1, -3]], b: [3, 3, 3], x: [3, 2], output: [null, 1, 0], answer: 1 },
  { id: 17, mode: "linear", activation: "tanh3", W: [[1, -1], [1, -2], [1, -3]], b: [-2, -2, -2], x: [3, 2], output: [0, null, -1], answer: -1 },
  { id: 18, mode: "chain", chain: ["tanh3", "sigmoid3"], input: [1, 2, -3], output: [0.5, null, 0.5], answer: 0.5 },
  { id: 19, mode: "chain", chain: ["relu", "sigmoid3"], input: [1, 2, -3], output: [0.5, 1, null], answer: 0.5 },
  { id: 20, mode: "vector", activation: "sigmoid5", input: [0, 1, -1], output: [0.5, null, 0.3], answer: 0.7 },
  { id: 21, mode: "linear", activation: "sigmoid5", W: [[1, 1], [1, 1], [1, 1]], b: [-2, -4, -6], x: [3, 2], output: [1, 0.7, null], answer: 0.3 },
  { id: 22, mode: "vector", activation: "tanh5", input: [0, 1, -1], output: [0, null, -0.8], answer: 0.8 },
  { id: 23, mode: "linear", activation: "tanh5", W: [[1, 1], [1, 1], [1, 1]], b: [-2, -4, -6], x: [3, 2], output: [1, 0.8, null], answer: -0.8 },
  { id: 24, mode: "linear", activation: "sigmoid5", W: [[1, 0], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1], [-1, 0], [0, -1], [0, 0]], b: [0, 0, 0, 0, 0, 0, 0, 0, 0], x: [3, 2], output: [1, 1, 1, 0, 0.7, null, 0, 0, 0.5], answer: 0.3 },
  { id: 25, mode: "linear", activation: "tanh5", W: [[1, 0], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1], [-1, 0], [0, -1], [0, 0]], b: [0, 0, 0, 0, 0, 0, 0, 0, 0], x: [3, 2], output: [1, 1, 1, -1, 0.8, null, -1, -1, 0], answer: -0.8 },
];

const ARTIFICIAL_EXERCISES = [
  { id: 1, x: [3, 1], W: [[1, 1]], b: [-5], activation: "relu", z: [null], y: [0], answers: { "z-0-0": -1 } },
  { id: 2, x: [3, 1], W: [[1, -1]], b: [0], activation: "relu", z: [2], y: [null], answers: { "y-0-0": 2 } },
  { id: 3, x: [2, -1], W: [[2, 1]], b: [1], activation: "relu", z: [null], y: [null], answers: { "z-0-0": 4, "y-0-0": 4 } },
  { id: 4, x: [2, -1], W: [[2, 1]], b: [-5], activation: "relu", z: [null], y: [null], answers: { "z-0-0": -2, "y-0-0": 0 } },
  { id: 5, x: [4, 2], W: [[1, -1]], b: [-1], activation: "sigmoid3", z: [1], y: [null], answers: { "y-0-0": 0.5 } },
  { id: 6, x: [3, 4], W: [[2, -1]], b: [0], activation: "sigmoid3", z: [null], y: [null], answers: { "z-0-0": 2, "y-0-0": 1 } },
  { id: 7, x: [2, 5, 1], W: [[1, 0, 1]], b: [-2], activation: "relu", z: [null], y: [null], answers: { "z-0-0": 1, "y-0-0": 1 } },
  { id: 8, x: [2, 5, 1], W: [[1, -1, 0]], b: [2], activation: "relu", z: [null], y: [null], answers: { "z-0-0": -1, "y-0-0": 0 } },
  { id: 9, x: [2, 5, 1], W: [[1, -1, 0]], b: [2], activation: "sigmoid3", z: [null], y: [null], answers: { "z-0-0": -1, "y-0-0": 0.5 } },
  { id: 10, x: [4, 6], W: [[0, 1], [1, 0], [1, 0]], b: [-1, 0, -1], activation: "relu", z: [null, 4, 3], y: [null, 4, 3], answers: { "z-0-0": 5, "y-0-0": 5 } },
  { id: 11, x: [5, 2], W: [[1, 1], [1, -1], [0, -1]], b: [-2, -2, -2], activation: "relu", z: [5, null, -4], y: [5, null, 0], answers: { "z-1-0": 1, "y-1-0": 1 } },
  { id: 12, x: [3, 2], W: [[1, -1], [1, -2], [1, -3]], b: [0, 0, 0], activation: "relu", z: [1, -1, null], y: [1, 0, null], answers: { "z-2-0": -3, "y-2-0": 0 } },
  { id: 13, x: [3, 1, 2], W: [[1, 1, 1], [1, 1, 0], [1, 0, 0]], b: [0, 0, 0], activation: "relu", z: [null, 4, 3], y: [null, 4, 3], answers: { "z-0-0": 6, "y-0-0": 6 } },
  { id: 14, x: [2, 3, 4], W: [[1, 1, 0], [1, 0, -1], [1, -1, 0]], b: [0, 0, 0], activation: "relu", z: [5, null, -1], y: [5, null, 0], answers: { "z-1-0": -2, "y-1-0": 0 } },
  { id: 15, x: [5, 2, -3], W: [[0, 1, 0], [1, 0, -1], [1, -1, 0]], b: [-3, 0, 0], activation: "relu", z: [-1, 8, null], y: [0, 8, null], answers: { "z-2-0": 3, "y-2-0": 3 } },
  { id: 16, x: [null, 2], W: [[1, 1]], b: [0], activation: "relu", z: [5], y: [5], answers: { "x-0-0": 3 } },
  { id: 17, x: [4, null], W: [[1, -1]], b: [0], activation: "relu", z: [-1], y: [0], answers: { "x-1-0": 5 } },
  { id: 18, x: [3, 5], W: [[null, 1]], b: [0], activation: "relu", z: [2], y: [2], answers: { "W-0-0": -1 } },
  { id: 19, x: [3, 2], W: [[1, null]], b: [0], activation: "relu", z: [-1], y: [0], answers: { "W-0-1": -2 } },
  { id: 20, x: [3, 2], W: [[1, -1]], b: [null], activation: "relu", z: [-1], y: [0], answers: { "b-0-0": -2 } },
  { id: 21, x: [null, 2, 3], W: [[1, 1, 1]], b: [0], activation: "relu", z: [1], y: [1], answers: { "x-0-0": -4 } },
  { id: 22, x: [2, null, 1], W: [[1, -1, 1]], b: [0], activation: "relu", z: [0], y: [0], answers: { "x-1-0": 3 } },
  { id: 23, x: [4, 1, 3], W: [[1, 1, null]], b: [0], activation: "relu", z: [-1], y: [0], answers: { "W-0-2": -2 } },
  { id: 24, x: [2, 4, 3], W: [[1, -1, 0], [1, 0, -1], [1, 0, 0]], b: [0, 0, 0], activation: null, z: [-2, -1, 2], y: [0, 0, 2], answers: { activation: "relu" } },
  { id: 25, x: [2, 4, 3], W: [[1, -1, 0], [1, 0, -1], [1, 0, 0]], b: [0, 0, 0], activation: null, z: [-2, -1, 2], y: [0, 0.5, 1], answers: { activation: "sigmoid3" } },
];

const BATCH_EXERCISES = [
  { id: 1, type: "linear_relu", W: [[2, 1]], b: [0], X: [[1, 2], [3, 0]], z: [[null, 4]], y: [[null, 4]], answers: { "z-0-0": 5, "y-0-0": 5 } },
  { id: 2, type: "linear_relu", W: [[1, 1]], b: [-5], X: [[3, 2], [1, 1]], z: [[-1, null]], y: [[0, null]], answers: { "z-0-1": -2, "y-0-1": 0 } },
  { id: 3, type: "linear_relu", W: [[1, 2]], b: [-1], X: [[1, 2, 1], [2, 1, 1]], z: [[null, 3, 2]], y: [[null, 3, 2]], answers: { "z-0-0": 4, "y-0-0": 4 } },
  { id: 4, type: "linear_relu", W: [[1, 2]], b: [-1], X: [[1, 2, 1], [1, -2, 1]], z: [[2, null, 2]], y: [[2, null, 2]], answers: { "z-0-1": -3, "y-0-1": 0 } },
  { id: 5, type: "linear_relu", W: [[1, 2]], b: [-2], X: [[3, 1, 0], [1, -2, 2]], z: [[3, -5, null]], y: [[2, 0, null]], answers: { "z-0-2": 2, "y-0-2": 2 } },
  { id: 6, type: "linear_relu", W: [[1, 0], [0, 1]], b: [2, -1], X: [[3, -4], [1, 2]], z: [[5, null], [0, 1]], y: [[5, null], [0, 1]], answers: { "z-0-1": -2, "y-0-1": 0 } },
  { id: 7, type: "linear_relu", W: [[1, 0], [0, 1]], b: [1, -2], X: [[3, 2], [1, 3]], z: [[4, 3], [0, null]], y: [[4, 3], [0, null]], answers: { "z-1-1": 1, "y-1-1": 1 } },
  { id: 8, type: "linear_relu", W: [[1, 0], [1, -1], [0, 1]], b: [1, 0, -1], X: [[3, -3], [2, 2]], z: [[4, null], [1, -5], [1, 1]], y: [[4, null], [1, 0], [1, 1]], answers: { "z-0-1": -2, "y-0-1": 0 } },
  { id: 9, type: "linear_relu", W: [[1, 1], [1, -1], [0, 1]], b: [0, 0, 1], X: [[3, 2, 3, 2], [1, 3, 1, -2]], z: [[4, null, 4, 0], [2, -1, 2, 4], [2, 4, 2, -1]], y: [[4, null, 4, 0], [2, 0, 2, 4], [2, 4, 2, 0]], answers: { "z-0-1": 5, "y-0-1": 5 } },
  { id: 10, type: "linear_relu", W: [[1, 1], [1, -1], [0, 1]], b: [0, 0, 1], X: [[3, 2, 3, 2], [1, 1, 2, -2]], z: [[4, 3, 5, 0], [2, 1, null, 4], [2, 2, 3, -1]], y: [[4, 3, 5, 0], [2, 1, null, 4], [2, 2, 3, 0]], answers: { "z-1-2": 1, "y-1-2": 1 } },
  { id: 11, type: "linear_relu", W: [[1, 1], [1, -1], [0, 2]], b: [0, 0, -1], X: [[3, 2, 3, 2], [1, 2, 1, -2]], z: [[4, 4, 4, 0], [2, 0, 2, 4], [1, 3, 1, null]], y: [[4, 4, 4, 0], [2, 0, 2, 4], [1, 3, 1, null]], answers: { "z-2-3": -5, "y-2-3": 0 } },
  { id: 12, type: "batch_sum", Y: [[4, 0, 4, 0], [2, 0, 2, 6], [2, 3, 0, -3]], sum: [8, null, 2], answers: { "sum-1-0": 10 } },
  { id: 13, type: "batch_sum", Y: [[1, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 1, 0, 1, 0, 1], [0, 1, 0, 1, 1, 1, 1, 0, 0, 1]], sum: [3, 4, null], answers: { "sum-2-0": 6 } },
  { id: 14, type: "batch_sum", Y: [[0, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 1], [0, 1, 0, 1, 1, null, 1, 0, 0, 1]], sum: [2, 3, 5], answers: { "Y-2-5": 0 } },
  { id: 15, type: "batch_mean", Y: [[4, 0, 4, 0], [2, 2, 2, 6], [2, 3, 2, -3]], mean: [2, null, 1], answers: { "mean-1-0": 3 } },
  { id: 16, type: "batch_mean", Y: [[1, 1, 1, 0, 0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], [1, 1, 0, 1, 1, 1, 1, 0, 0, 1]], mean: [0.4, 0.5, null], answers: { "mean-2-0": 0.7 } },
  { id: 17, type: "batch_mean", Y: [[1, 1, 0, 0, 0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], [1, null, 0, 1, 1, 1, 1, 1, 0, 1]], mean: [0.3, 0.5, 0.8], answers: { "Y-2-1": 1 } },
  { id: 18, type: "batch_add", Y: [[4, 0, 4, 0], [2, 2, 2, 6], [2, 3, 2, -3]], vector: [2, 1, 2], out: [[6, 2, 6, 2], [3, 3, 3, 7], [4, 5, 4, null]], answers: { "out-2-3": -1 } },
  { id: 19, type: "batch_add", Y: [[4, 0, 4, 0], [2, 3, 1, 2], [2, 3, 2, 3]], vector: [2, null, 1], out: [[6, 2, 6, 2], [4, 5, 3, null], [3, 4, 3, 4]], answers: { "v-1-0": 2, "out-1-3": 4 } },
  { id: 20, type: "batch_subtract", Y: [[4, 0, 4, 0], [2, 2, 2, 6], [2, 3, 2, -3]], vector: [2, 1, 1], out: [[2, -2, 2, -2], [1, 1, 1, null], [1, 2, 1, -4]], answers: { "out-1-3": 5 } },
  { id: 21, type: "batch_subtract", Y: [[4, 0, 4, 0], [2, 2, 2, 4], [2, 3, 2, -3]], vector: [2, 1, null], out: [[2, -2, 2, -2], [1, 1, 1, 3], [3, 4, 3, null]], answers: { "v-2-0": -1, "out-2-3": -2 } },
  { id: 22, type: "batch_multiply", Y: [[4, 0, 4, 0], [2, 1, 2, -1], [2, 4, 3, -2]], vector: [2, 3, -1], out: [[8, 0, 8, 0], [6, 3, 6, -3], [-2, null, -3, 2]], answers: { "out-2-1": -4 } },
  { id: 23, type: "batch_multiply", Y: [[4, 0, 4, 0], [2, 1, 2, -1], [2, 4, 3, -2]], vector: [2, null, 1], out: [[8, 0, 8, 0], [4, 2, 4, null], [2, 4, 3, -2]], answers: { "v-1-0": 2, "out-1-3": -2 } },
  { id: 24, type: "batch_center", Y: [[-2, 0, -4, -2], [3, 6, 3, 0], [-1, 1, 1, -1]], mu: [-2, null, 0], out: [[0, 2, -2, 0], [0, 3, null, -3], [-1, 1, 1, -1]], answers: { "mu-1-0": 3, "out-1-2": 0 } },
  { id: 25, type: "batch_center", Y: [[4, 0, 4, 0], [4, 2, 1, 1], [1, 4, -1, 0]], mu: [2, 2, null], out: [[2, -2, 2, -2], [2, 0, -1, -1], [0, 3, null, -1]], answers: { "mu-2-0": 1, "out-2-2": -2 } },
];

const CONNECTION_EXERCISES = [{"id": 1, "W": [[1, 1]]}, {"id": 2, "W": [[0, 1]]}, {"id": 3, "W": [[1], [1]]}, {"id": 4, "W": [[0], [1]]}, {"id": 5, "W": [[1], [0]]}, {"id": 6, "W": [[0, 1, 1]]}, {"id": 7, "W": [[1, 0, 1]]}, {"id": 8, "W": [[0, 1], [1, 0]]}, {"id": 9, "W": [[1, 0], [0, 1]]}, {"id": 10, "W": [[1, 1], [1, 1]]}, {"id": 11, "W": [[1, 1, 1], [0, 0, 0]]}, {"id": 12, "W": [[0, 0, 0], [1, 1, 1]]}, {"id": 13, "W": [[0, 1, 0], [0, 1, 0]]}, {"id": 14, "W": [[0, 0, 1], [0, 0, 1]]}, {"id": 15, "W": [[0, 1, 0], [1, 0, 1]]}, {"id": 16, "W": [[0, 1], [0, 0], [1, 0]]}, {"id": 17, "W": [[0, 1], [0, 1], [0, 1]]}, {"id": 18, "W": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]}, {"id": 19, "W": [[0, 0, 0], [0, 0, 0], [1, 1, 1]]}, {"id": 20, "W": [[1, 0, 0], [1, 0, 0], [1, 0, 0]]}, {"id": 21, "W": [[0, 0, 1], [0, 1, 0], [1, 0, 0]]}, {"id": 22, "W": [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]}, {"id": 23, "W": [[0, 0, 0], [0, 0, 0], [1, 1, 1], [0, 0, 0]]}, {"id": 24, "W": [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]}, {"id": 25, "W": [[0, 0, 0], [1, 1, 0], [0, 0, 0], [0, 0, 0]]}];

const HIDDEN_LAYER_EXERCISES = [
  {
    id: 1,
    x: [3, 1],
    W1: [[1, 1]],
    b1: [0],
    z1: [null],
    h: [null],
    W2: [[1]],
    b2: [-1],
    z2: [3],
    y: [3],
    answers: {
      "z1-0-0": 4,
      "h-0-0": 4,
    },
  },
  {
    id: 2,
    x: [1, -1],
    W1: [[1, 2]],
    b1: [0],
    z1: [null],
    h: [null],
    W2: [[2]],
    b2: [-1],
    z2: [-1],
    y: [0],
    answers: {
      "z1-0-0": -1,
      "h-0-0": 0,
    },
  },
  {
    id: 3,
    x: [3, 1],
    W1: [[-1, 2]],
    b1: [1],
    z1: [null],
    h: [null],
    W2: [[2], [1]],
    b2: [1, 2],
    z2: [1, 2],
    y: [1, 2],
    answers: {
      "z1-0-0": 0,
      "h-0-0": 0,
    },
  },
  {
    id: 4,
    x: [3, 1],
    W1: [[1, -1]],
    b1: [0],
    z1: [2],
    h: [2],
    W2: [[1], [-1]],
    b2: [-1, 1],
    z2: [null, -1],
    y: [null, 0],
    answers: {
      "z2-0-0": 1,
      "y-0-0": 1,
    },
  },
  {
    id: 5,
    x: [2, 3],
    W1: [[2, -1], [1, 1]],
    b1: [1, -2],
    z1: [null, 3],
    h: [null, 3],
    W2: [[1, 1], [0, 1]],
    b2: [0, -1],
    z2: [5, 2],
    y: [5, 2],
    answers: {
      "z1-0-0": 2,
      "h-0-0": 2,
    },
  },
  {
    id: 6,
    x: [2, 3],
    W1: [[-1, 1], [2, -1]],
    b1: [0, 0],
    z1: [1, null],
    h: [1, null],
    W2: [[1, 1], [-1, 1]],
    b2: [0, 0],
    z2: [2, 0],
    y: [2, 0],
    answers: {
      "z1-1-0": 1,
      "h-1-0": 1,
    },
  },

  {"id":7,"x":[3,1],"W1":[[0,2],[1,1],[1,0]],"b1":[1,-1,-1],"z1":[null,3,2],"h":[null,3,2],"W2":[[1,1,0],[0,1,1]],"b2":[0,-1],"z2":[6,4],"y":[6,4],"answers":{"z1-0-0":3,"h-0-0":3}},
  {"id":8,"x":[3,1],"W1":[[2,0],[-1,1],[1,1]],"b1":[1,0,-1],"z1":[7,null,3],"h":[7,null,3],"W2":[[1,1,0],[0,1,1]],"b2":[0,-1],"z2":[7,2],"y":[7,2],"answers":{"z1-1-0":-2,"h-1-0":0}},
  {"id":9,"x":[2,1],"W1":[[2,0],[-1,1],[1,1]],"b1":[1,0,-1],"z1":[5,-1,null],"h":[5,0,null],"W2":[[1,0,-1],[0,1,1]],"b2":[0,-1],"z2":[3,1],"y":[3,1],"answers":{"z1-2-0":2,"h-2-0":2}},
  {"id":10,"x":[2,1],"W1":[[2,0],[-1,1],[1,1]],"b1":[1,0,0],"z1":[5,-1,3],"h":[5,0,3],"W2":[[1,0,-1],[0,1,1]],"b2":[-1,-1],"z2":[null,2],"y":[null,2],"answers":{"z2-0-0":1,"y-0-0":1}},
  {"id":11,"x":[3,1,2],"W1":[[0,1,1],[0,1,0],[1,0,2]],"b1":[-1,-2,-1],"z1":[null,-1,6],"h":[null,0,6],"W2":[[1,0,1],[0,1,-1]],"b2":[0,0],"z2":[8,-6],"y":[8,0],"answers":{"z1-0-0":2,"h-0-0":2}},
  {"id":12,"x":[2,1,-1],"W1":[[0,1,1],[-1,-1,0],[1,0,0]],"b1":[-1,0,-1],"z1":[-1,null,1],"h":[0,null,1],"W2":[[1,2,1],[0,1,0]],"b2":[1,1],"z2":[2,1],"y":[2,1],"answers":{"z1-1-0":-3,"h-1-0":0}},
  {"id":13,"x":[1,2,3],"W1":[[0,1,0],[1,1,1],[0,-1,1]],"b1":[-1,0,0],"z1":[1,6,null],"h":[1,6,null],"W2":[[1,1,0],[0,1,-1]],"b2":[0,0],"z2":[7,5],"y":[7,5],"answers":{"z1-2-0":1,"h-2-0":1}},
  {"id":14,"x":[1,2,3],"W1":[[0,1,0],[1,1,1],[-1,0,1]],"b1":[-1,0,0],"z1":[1,6,2],"h":[1,6,2],"W2":[[1,0,1],[0,1,-1]],"b2":[0,0],"z2":[3,null],"y":[3,null],"answers":{"z2-1-0":4,"y-1-0":4}},
  {"id":15,"x":[1,0,2],"W1":[[0,1,-1],[1,0,1],[1,1,1]],"b1":[-1,0,-1],"z1":[null,3,2],"h":[null,3,2],"W2":[[1,1,0],[0,-1,0],[1,1,1]],"b2":[0,1,-1],"z2":[3,-2,4],"y":[3,0,4],"answers":{"z1-0-0":-3,"h-0-0":0}},
  {"id":16,"x":[1,0,2],"W1":[[0,1,1],[1,0,1],[0,1,0]],"b1":[-1,0,-1],"z1":[1,3,null],"h":[1,3,null],"W2":[[1,1,0],[0,-1,0],[1,1,1]],"b2":[0,1,-1],"z2":[4,-2,3],"y":[4,0,3],"answers":{"z1-2-0":-1,"h-2-0":0}},
  {"id":17,"x":[2,1,3],"W1":[[0,1,1],[1,1,0],[1,0,1],[1,0,0]],"b1":[0,0,0,-1],"z1":[4,3,null,1],"h":[4,3,null,1],"W2":[[1,1,0,0],[0,0,1,1]],"b2":[0,-1],"z2":[7,5],"y":[7,5],"answers":{"z1-2-0":5,"h-2-0":5}},
  {"id":18,"x":[2,1,3],"W1":[[0,1,1],[1,1,0],[1,0,1],[1,0,0]],"b1":[0,0,1,-1],"z1":[4,3,6,1],"h":[4,3,6,1],"W2":[[1,1,0,0],[0,0,1,-1]],"b2":[0,-2],"z2":[7,null],"y":[7,null],"answers":{"z2-1-0":3,"y-1-0":3}},
  {"id":19,"x":[1,-2,3],"W1":[[0,1,1],[1,0,1],[0,0,1],[1,1,0]],"b1":[0,0,2,0],"z1":[null,4,5,-1],"h":[null,4,5,0],"W2":[[1,1,1,0]],"b2":[0],"z2":[10],"y":[10],"answers":{"z1-0-0":1,"h-0-0":1}},
  {"id":20,"x":[3,1],"W1":[[0,1],[1,1],[-1,0],[1,0]],"b1":[-1,0,0,-1],"z1":[0,4,null,2],"h":[0,4,null,2],"W2":[[1,1,1,1]],"b2":[0],"z2":[6],"y":[6],"answers":{"z1-2-0":-3,"h-2-0":0}},
  {"id":21,"x":[3,1],"W1":[[0,1],[1,1],[-1,0],[1,0]],"b1":[-1,0,2,-1],"z1":[0,4,-1,2],"h":[0,4,0,2],"W2":[[1,1,-1,-1]],"b2":[0],"z2":[null],"y":[null],"answers":{"z2-0-0":2,"y-0-0":2}},
  {"id":22,"x":[2,-1],"W1":[[0,0],[1,0],[0,1],[-1,0],[1,1]],"b1":[-1,1,1,3,2],"z1":[-1,3,0,1,null],"h":[0,3,0,1,null],"W2":[[1,1,1,1,1]],"b2":[0],"z2":[7],"y":[7],"answers":{"z1-4-0":3,"h-4-0":3}},
  {"id":23,"x":[2,-1],"W1":[[0,0],[1,0],[0,1],[-1,0],[1,1]],"b1":[-1,1,1,3,0],"z1":[-1,3,0,1,1],"h":[0,3,0,1,1],"W2":[[1,1,1,-1,-1]],"b2":[1],"z2":[null],"y":[null],"answers":{"z2-0-0":2,"y-0-0":2}},
  {"id":24,"x":[3,2],"W1":[[0,1],[1,0],[-1,1],[0,0],[0,-1],[1,-1]],"b1":[0,0,0,2,1,0],"z1":[2,3,-1,2,null,1],"h":[2,3,0,2,null,1],"W2":[[1,1,1,1,1,1]],"b2":[0],"z2":[8],"y":[8],"answers":{"z1-4-0":-1,"h-4-0":0}},
  {"id":25,"x":[3,2],"W1":[[0,1],[1,0],[-1,1],[0,0],[0,-1],[1,-1]],"b1":[0,0,0,2,0,0],"z1":[2,3,-1,2,-2,1],"h":[2,3,0,2,0,1],"W2":[[1,1,1,1,1,1]],"b2":[0],"z2":[null],"y":[null],"answers":{"z2-0-0":8,"y-0-0":8}},
];

const HIDDEN_WORKBOOK = [{"id": 1, "image": "assets/workbook_hidden/ex-01.png", "answers": [4.0]}, {"id": 2, "image": "assets/workbook_hidden/ex-02.png", "answers": [-1.0]}, {"id": 3, "image": "assets/workbook_hidden/ex-03.png", "answers": [0.0, 1.0, 2.0]}, {"id": 4, "image": "assets/workbook_hidden/ex-04.png", "answers": [2.0, 1.0, 0.0]}, {"id": 5, "image": "assets/workbook_hidden/ex-05.png", "answers": [1.0, 3.0, 5.0, 2.0]}, {"id": 6, "image": "assets/workbook_hidden/ex-06.png", "answers": [1.0, 0.0, 2.0, 0.0]}, {"id": 7, "image": "assets/workbook_hidden/ex-07.png", "answers": [0.0, 3.0, 2.0, 6.0, 4.0]}, {"id": 8, "image": "assets/workbook_hidden/ex-08.png", "answers": [7.0, 0.0, 3.0, 7.0, 2.0]}, {"id": 9, "image": "assets/workbook_hidden/ex-09.png", "answers": [5.0, 0.0, 0.0, 3.0, 1.0]}, {"id": 10, "image": "assets/workbook_hidden/ex-10.png", "answers": [5.0, 0.0, 3.0, 1.0, 1.0]}, {"id": 11, "image": "assets/workbook_hidden/ex-11.png", "answers": [0.0, 0.0, 6.0, 8.0, 0.0]}, {"id": 12, "image": "assets/workbook_hidden/ex-12.png", "answers": [0.0, 0.0, 1.0, 2.0, 1.0]}, {"id": 13, "image": "assets/workbook_hidden/ex-13.png", "answers": [1.0, 6.0, 0.0, 7.0, 5.0]}, {"id": 14, "image": "assets/workbook_hidden/ex-14.png", "answers": [1.0, 6.0, 2.0, 3.0, 4.0]}, {"id": 15, "image": "assets/workbook_hidden/ex-15.png", "answers": [0.0, 3.0, 2.0, 3.0, 0.0]}, {"id": 16, "image": "assets/workbook_hidden/ex-16.png", "answers": [1.0, 3.0, 0.0, 4.0, 0.0]}, {"id": 17, "image": "assets/workbook_hidden/ex-17.png", "answers": [4.0, 3.0, 0.0, 1.0, 7.0, 5.0]}, {"id": 18, "image": "assets/workbook_hidden/ex-18.png", "answers": [4.0, 3.0, 6.0, 1.0, 7.0, 1.0]}, {"id": 19, "image": "assets/workbook_hidden/ex-19.png", "answers": [0.0, 4.0, 5.0, 0.0, 10.0]}, {"id": 20, "image": "assets/workbook_hidden/ex-20.png", "answers": [0.0, 4.0, 0.0, 2.0, 6.0]}, {"id": 21, "image": "assets/workbook_hidden/ex-21.png", "answers": [0.0, 4.0, 0.0, 2.0, 2.0]}, {"id": 22, "image": "assets/workbook_hidden/ex-22.png", "answers": [0.0, 3.0, 0.0, 1.0, 0.0, 7.0]}, {"id": 23, "image": "assets/workbook_hidden/ex-23.png", "answers": [0.0, 3.0, 0.0, 1.0, 1.0, 2.0]}, {"id": 24, "image": "assets/workbook_hidden/ex-24.png", "answers": [2.0, 3.0, 0.0, 2.0, 0.0, 1.0, 8.0]}, {"id": 25, "image": "assets/workbook_hidden/ex-25.png", "answers": [2.0, 3.0, 0.0, 2.0, 0.0, 1.0, 8.0]}];

const DEEP_EXERCISES = [{"id": 1, "image": "assets/workbook_deep/ex-01.png", "answers": [2.0, 4.0]}, {"id": 2, "image": "assets/workbook_deep/ex-02.png", "answers": [2.0, 4.0, 1.0, 2.0]}, {"id": 3, "image": "assets/workbook_deep/ex-03.png", "answers": [2.0, 4.0, 1.0, 2.0, 0.0, 5.0]}, {"id": 4, "image": "assets/workbook_deep/ex-04.png", "answers": [2.0, 4.0, 1.0, 2.0, 0.0, 5.0, 6.0, 7.0]}, {"id": 5, "image": "assets/workbook_deep/ex-05.png", "answers": [3.0, 6.0, 1.0, 2.0, 0.0, 5.0, 6.0, 7.0]}, {"id": 6, "image": "assets/workbook_deep/ex-06.png", "answers": [3.0, 6.0, 1.0, 2.0, 0.0, 5.0, 6.0, 7.0]}, {"id": 7, "image": "assets/workbook_deep/ex-07.png", "answers": [3.0, 6.0, 1.0, 2.0, 0.0, 5.0, 6.0, 7.0]}, {"id": 8, "image": "assets/workbook_deep/ex-08.png", "answers": [3.0, 6.0, 1.0, 2.0, 0.0, 5.0, 6.0, 7.0]}, {"id": 9, "image": "assets/workbook_deep/ex-09.png", "answers": [3.0, 5.0]}, {"id": 10, "image": "assets/workbook_deep/ex-10.png", "answers": [3.0, 5.0, 0.0, 4.0]}, {"id": 11, "image": "assets/workbook_deep/ex-11.png", "answers": [3.0, 5.0, 0.0, 4.0, 4.0, 0.0]}, {"id": 12, "image": "assets/workbook_deep/ex-12.png", "answers": [3.0, 5.0, 0.0, 4.0, 4.0, 0.0, 1.0, 4.0]}, {"id": 13, "image": "assets/workbook_deep/ex-13.png", "answers": [3.0, 5.0, 0.0, 4.0, 4.0, 0.0, 1.0, 4.0, 3.0, 7.0]}, {"id": 14, "image": "assets/workbook_deep/ex-14.png", "answers": [3.0, 5.0, 0.0, 4.0, 4.0, 0.0, 1.0, 4.0, 3.0, 7.0, 8.0, 4.0]}, {"id": 15, "image": "assets/workbook_deep/ex-15.png", "answers": [1.0, 4.0, 0.0, 2.0, 2.0, 0.0, 1.0, 2.0, 3.0, 5.0, 6.0, 4.0]}, {"id": 16, "image": "assets/workbook_deep/ex-16.png", "answers": [1.0, 4.0, 0.0, 2.0, 2.0, 0.0, 1.0, 2.0, 3.0, 5.0, 6.0, 4.0]}, {"id": 17, "image": "assets/workbook_deep/ex-17.png", "answers": [1.0, 4.0, 0.0, 2.0, 2.0, 0.0, 1.0, 2.0, 3.0, 5.0, 6.0, 4.0]}, {"id": 18, "image": "assets/workbook_deep/ex-18.png", "answers": [3.0, 5.0, 4.0]}, {"id": 19, "image": "assets/workbook_deep/ex-19.png", "answers": [3.0, 5.0, 4.0, 7.0, 4.0, 1.0]}, {"id": 20, "image": "assets/workbook_deep/ex-20.png", "answers": [3.0, 5.0, 4.0, 7.0, 4.0, 1.0, 1.0, 4.0, 7.0]}, {"id": 21, "image": "assets/workbook_deep/ex-21.png", "answers": [3.0, 5.0, 4.0, 7.0, 4.0, 1.0, 1.0, 4.0, 7.0, 5.0, 11.0, 8.0]}, {"id": 22, "image": "assets/workbook_deep/ex-22.png", "answers": [1.0, 4.0, 2.0, 3.0, 3.0, 1.0, 1.0, 3.0, 3.0, 4.0, 6.0, 4.0]}, {"id": 23, "image": "assets/workbook_deep/ex-23.png", "answers": [1.0, 4.0, 2.0, 3.0, 3.0, 1.0, 1.0, 3.0, 3.0, 4.0, 6.0, 4.0]}, {"id": 24, "image": "assets/workbook_deep/ex-24.png", "answers": [1.0, 4.0, 2.0, 3.0, 3.0, 1.0, 1.0, 3.0, 3.0, 4.0, 6.0, 4.0]}, {"id": 25, "image": "assets/workbook_deep/ex-25.png", "answers": [1.0, 4.0, 2.0, 3.0, 3.0, 1.0, 1.0, 3.0, 3.0, 4.0, 6.0, 4.0]}];


const DEEP_NETWORK_EXERCISES = [{"id": 1, "input": [2.0], "layers": [{"name": "A", "inputs": [2.0], "weights": [[1.0]], "biases": [0.0], "outputs": [null]}, {"name": "B", "inputs": [2.0], "weights": [[2.0]], "biases": [0.0], "outputs": [null]}], "answers": {"L0-0-0": 2.0, "L1-0-0": 4.0}}, {"id": 2, "input": [2.0], "layers": [{"name": "A", "inputs": [2.0], "weights": [[1.0]], "biases": [0.0], "outputs": [2.0]}, {"name": "B", "inputs": [2.0], "weights": [[2.0]], "biases": [0.0], "outputs": [4.0]}, {"name": "C", "inputs": [4.0], "weights": [[0.0]], "biases": [1.0], "outputs": [null]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [null]}], "answers": {"L2-0-0": 1.0, "L3-0-0": 2.0}}, {"id": 3, "input": [2.0], "layers": [{"name": "A", "inputs": [2.0], "weights": [[1.0]], "biases": [0.0], "outputs": [2.0]}, {"name": "B", "inputs": [2.0], "weights": [[2.0]], "biases": [0.0], "outputs": [4.0]}, {"name": "C", "inputs": [4.0], "weights": [[0.0]], "biases": [1.0], "outputs": [1.0]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [2.0]}, {"name": "E", "inputs": [2.0], "weights": [[-1.0]], "biases": [0.0], "outputs": [null]}, {"name": "F", "inputs": [0.0], "weights": [[2.0]], "biases": [5.0], "outputs": [null]}], "answers": {"L4-0-0": 0.0, "L5-0-0": 5.0}}, {"id": 4, "input": [2.0], "layers": [{"name": "A", "inputs": [2.0], "weights": [[1.0]], "biases": [0.0], "outputs": [2.0]}, {"name": "B", "inputs": [2.0], "weights": [[2.0]], "biases": [0.0], "outputs": [4.0]}, {"name": "C", "inputs": [4.0], "weights": [[0.0]], "biases": [1.0], "outputs": [1.0]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [2.0]}, {"name": "E", "inputs": [2.0], "weights": [[-1.0]], "biases": [0.0], "outputs": [0.0]}, {"name": "F", "inputs": [0.0], "weights": [[2.0]], "biases": [5.0], "outputs": [5.0]}, {"name": "G", "inputs": [5.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}, {"name": "H", "inputs": [6.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}], "answers": {"L6-0-0": 6.0, "L7-0-0": 7.0}}, {"id": 5, "input": [3.0], "layers": [{"name": "A", "inputs": [3.0], "weights": [[1.0]], "biases": [0.0], "outputs": [null]}, {"name": "B", "inputs": [3.0], "weights": [[2.0]], "biases": [0.0], "outputs": [null]}, {"name": "C", "inputs": [6.0], "weights": [[0.0]], "biases": [1.0], "outputs": [null]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [null]}, {"name": "E", "inputs": [2.0], "weights": [[-1.0]], "biases": [0.0], "outputs": [null]}, {"name": "F", "inputs": [0.0], "weights": [[2.0]], "biases": [5.0], "outputs": [null]}, {"name": "G", "inputs": [5.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}, {"name": "H", "inputs": [6.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}], "answers": {"L0-0-0": 3.0, "L1-0-0": 6.0, "L2-0-0": 1.0, "L3-0-0": 2.0, "L4-0-0": 0.0, "L5-0-0": 5.0, "L6-0-0": 6.0, "L7-0-0": 7.0}}, {"id": 6, "input": [3.0], "layers": [{"name": "A", "inputs": [3.0], "weights": [[1.0]], "biases": [0.0], "outputs": [3.0]}, {"name": "B", "inputs": [3.0], "weights": [[2.0]], "biases": [0.0], "outputs": [6.0]}, {"name": "C", "inputs": [6.0], "weights": [[0.0]], "biases": [1.0], "outputs": [null]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [null]}, {"name": "E", "inputs": [2.0], "weights": [[-1.0]], "biases": [0.0], "outputs": [null]}, {"name": "F", "inputs": [0.0], "weights": [[2.0]], "biases": [5.0], "outputs": [null]}, {"name": "G", "inputs": [5.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}, {"name": "H", "inputs": [6.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}], "answers": {"L2-0-0": 1.0, "L3-0-0": 2.0, "L4-0-0": 0.0, "L5-0-0": 5.0, "L6-0-0": 6.0, "L7-0-0": 7.0}}, {"id": 7, "input": [3.0], "layers": [{"name": "A", "inputs": [3.0], "weights": [[1.0]], "biases": [0.0], "outputs": [3.0]}, {"name": "B", "inputs": [3.0], "weights": [[2.0]], "biases": [0.0], "outputs": [6.0]}, {"name": "C", "inputs": [6.0], "weights": [[0.0]], "biases": [1.0], "outputs": [1.0]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [2.0]}, {"name": "E", "inputs": [2.0], "weights": [[-1.0]], "biases": [0.0], "outputs": [null]}, {"name": "F", "inputs": [0.0], "weights": [[2.0]], "biases": [5.0], "outputs": [null]}, {"name": "G", "inputs": [5.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}, {"name": "H", "inputs": [6.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}], "answers": {"L4-0-0": 0.0, "L5-0-0": 5.0, "L6-0-0": 6.0, "L7-0-0": 7.0}}, {"id": 8, "input": [3.0], "layers": [{"name": "A", "inputs": [3.0], "weights": [[1.0]], "biases": [0.0], "outputs": [3.0]}, {"name": "B", "inputs": [3.0], "weights": [[2.0]], "biases": [0.0], "outputs": [6.0]}, {"name": "C", "inputs": [6.0], "weights": [[0.0]], "biases": [1.0], "outputs": [1.0]}, {"name": "D", "inputs": [1.0], "weights": [[0.0]], "biases": [2.0], "outputs": [2.0]}, {"name": "E", "inputs": [2.0], "weights": [[-1.0]], "biases": [0.0], "outputs": [0.0]}, {"name": "F", "inputs": [0.0], "weights": [[2.0]], "biases": [5.0], "outputs": [5.0]}, {"name": "G", "inputs": [5.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}, {"name": "H", "inputs": [6.0], "weights": [[1.0]], "biases": [1.0], "outputs": [null]}], "answers": {"L6-0-0": 6.0, "L7-0-0": 7.0}}, {"id": 9, "input": [2.0, 3.0], "layers": [{"name": "A", "inputs": [2.0, 3.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [null, null]}], "answers": {"L0-0-0": 3.0, "L0-1-0": 5.0}}, {"id": 10, "input": [2.0, 3.0], "layers": [{"name": "A", "inputs": [2.0, 3.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [3.0, 5.0]}, {"name": "B", "inputs": [3.0, 5.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [null, null]}], "answers": {"L1-0-0": 0.0, "L1-1-0": 4.0}}, {"id": 11, "input": [2.0, 3.0], "layers": [{"name": "A", "inputs": [2.0, 3.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [3.0, 5.0]}, {"name": "B", "inputs": [3.0, 5.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [0.0, 4.0]}, {"name": "C", "inputs": [0.0, 4.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [null, null]}], "answers": {"L2-0-0": 4.0, "L2-1-0": 0.0}}, {"id": 12, "input": [2.0, 3.0], "layers": [{"name": "A", "inputs": [2.0, 3.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [3.0, 5.0]}, {"name": "B", "inputs": [3.0, 5.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [0.0, 4.0]}, {"name": "C", "inputs": [0.0, 4.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [4.0, 0.0]}, {"name": "D", "inputs": [4.0, 0.0], "weights": [[0.0, 1.0], [1.0, -1.0]], "biases": [1.0, 0.0], "outputs": [null, null]}], "answers": {"L3-0-0": 1.0, "L3-1-0": 4.0}}, {"id": 13, "input": [2.0, 3.0], "layers": [{"name": "A", "inputs": [2.0, 3.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [3.0, 5.0]}, {"name": "B", "inputs": [3.0, 5.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [0.0, 4.0]}, {"name": "C", "inputs": [0.0, 4.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [4.0, 0.0]}, {"name": "D", "inputs": [4.0, 0.0], "weights": [[0.0, 1.0], [1.0, -1.0]], "biases": [1.0, 0.0], "outputs": [1.0, 4.0]}, {"name": "E", "inputs": [1.0, 4.0], "weights": [[1.0, 0.0], [1.0, 1.0]], "biases": [2.0, 2.0], "outputs": [null, null]}], "answers": {"L4-0-0": 3.0, "L4-1-0": 7.0}}, {"id": 14, "input": [2.0, 3.0], "layers": [{"name": "A", "inputs": [2.0, 3.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [3.0, 5.0]}, {"name": "B", "inputs": [3.0, 5.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [0.0, 4.0]}, {"name": "C", "inputs": [0.0, 4.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [4.0, 0.0]}, {"name": "D", "inputs": [4.0, 0.0], "weights": [[0.0, 1.0], [1.0, -1.0]], "biases": [1.0, 0.0], "outputs": [1.0, 4.0]}, {"name": "E", "inputs": [1.0, 4.0], "weights": [[1.0, 0.0], [1.0, 1.0]], "biases": [2.0, 2.0], "outputs": [3.0, 7.0]}, {"name": "F", "inputs": [3.0, 7.0], "weights": [[0.0, 1.0], [1.0, 0.0]], "biases": [1.0, 1.0], "outputs": [null, null]}], "answers": {"L5-0-0": 8.0, "L5-1-0": 4.0}}, {"id": 15, "input": [3.0, 1.0], "layers": [{"name": "A", "inputs": [3.0, 1.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [null, 4.0]}, {"name": "B", "inputs": [1.0, 4.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [null, 2.0]}, {"name": "C", "inputs": [0.0, 2.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [null, null]}, {"name": "D", "inputs": [2.0, 0.0], "weights": [[0.0, 1.0], [1.0, -1.0]], "biases": [1.0, 0.0], "outputs": [null, null]}, {"name": "E", "inputs": [1.0, 2.0], "weights": [[1.0, 0.0], [1.0, 1.0]], "biases": [2.0, 2.0], "outputs": [null, null]}, {"name": "F", "inputs": [3.0, 5.0], "weights": [[0.0, 1.0], [1.0, 0.0]], "biases": [1.0, 1.0], "outputs": [null, null]}], "answers": {"L0-0-0": 1.0, "L1-0-0": 0.0, "L2-0-0": 2.0, "L2-1-0": 0.0, "L3-0-0": 1.0, "L3-1-0": 2.0, "L4-0-0": 3.0, "L4-1-0": 5.0, "L5-0-0": 6.0, "L5-1-0": 4.0}}, {"id": 16, "input": [3.0, 1.0], "layers": [{"name": "A", "inputs": [3.0, 1.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [1.0, 4.0]}, {"name": "B", "inputs": [1.0, 4.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [0.0, 2.0]}, {"name": "C", "inputs": [0.0, 2.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [2.0, null]}, {"name": "D", "inputs": [2.0, 0.0], "weights": [[0.0, 1.0], [1.0, -1.0]], "biases": [1.0, 0.0], "outputs": [1.0, null]}, {"name": "E", "inputs": [1.0, 2.0], "weights": [[1.0, 0.0], [1.0, 1.0]], "biases": [2.0, 2.0], "outputs": [null, null]}, {"name": "F", "inputs": [3.0, 5.0], "weights": [[0.0, 1.0], [1.0, 0.0]], "biases": [1.0, 1.0], "outputs": [null, null]}], "answers": {"L2-1-0": 0.0, "L3-1-0": 2.0, "L4-0-0": 3.0, "L4-1-0": 5.0, "L5-0-0": 6.0, "L5-1-0": 4.0}}, {"id": 17, "input": [3.0, 1.0], "layers": [{"name": "A", "inputs": [3.0, 1.0], "weights": [[0.0, 1.0], [1.0, 1.0]], "biases": [0.0, 0.0], "outputs": [1.0, 4.0]}, {"name": "B", "inputs": [1.0, 4.0], "weights": [[1.0, -1.0], [1.0, 0.0]], "biases": [0.0, 1.0], "outputs": [0.0, 2.0]}, {"name": "C", "inputs": [0.0, 2.0], "weights": [[1.0, 1.0], [1.0, 0.0]], "biases": [0.0, -1.0], "outputs": [2.0, 0.0]}, {"name": "D", "inputs": [2.0, 0.0], "weights": [[0.0, 1.0], [1.0, -1.0]], "biases": [1.0, 0.0], "outputs": [1.0, 2.0]}, {"name": "E", "inputs": [1.0, 2.0], "weights": [[1.0, 0.0], [1.0, 1.0]], "biases": [2.0, 2.0], "outputs": [3.0, null]}, {"name": "F", "inputs": [3.0, 5.0], "weights": [[0.0, 1.0], [1.0, 0.0]], "biases": [1.0, 1.0], "outputs": [null, 4.0]}], "answers": {"L4-1-0": 5.0, "L5-0-0": 6.0}}, {"id": 18, "input": [3.0, 1.0, 2.0], "layers": [{"name": "A", "inputs": [3.0, 1.0, 2.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [null, null, 4.0]}], "answers": {"L0-0-0": 3.0, "L0-1-0": 5.0}}, {"id": 19, "input": [3.0, 1.0, 2.0], "layers": [{"name": "A", "inputs": [3.0, 1.0, 2.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [3.0, 5.0, 4.0]}, {"name": "B", "inputs": [3.0, 5.0, 4.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [7.0, null, null]}], "answers": {"L1-1-0": 4.0, "L1-2-0": 1.0}}, {"id": 20, "input": [3.0, 1.0, 2.0], "layers": [{"name": "A", "inputs": [3.0, 1.0, 2.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [3.0, 5.0, 4.0]}, {"name": "B", "inputs": [3.0, 5.0, 4.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [7.0, 4.0, 1.0]}, {"name": "C", "inputs": [7.0, 4.0, 1.0], "weights": [[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, 4.0, null]}], "answers": {"L2-0-0": 1.0, "L2-2-0": 7.0}}, {"id": 21, "input": [3.0, 1.0, 2.0], "layers": [{"name": "A", "inputs": [3.0, 1.0, 2.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [3.0, 5.0, 4.0]}, {"name": "B", "inputs": [3.0, 5.0, 4.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [7.0, 4.0, 1.0]}, {"name": "C", "inputs": [7.0, 4.0, 1.0], "weights": [[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]], "biases": [0.0, 0.0, 0.0], "outputs": [1.0, 4.0, 7.0]}, {"name": "D", "inputs": [1.0, 4.0, 7.0], "weights": [[1.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 0.0, 1.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, null, 8.0]}], "answers": {"L3-0-0": 5.0, "L3-1-0": 11.0}}, {"id": 22, "input": [2.0, 0.0, 1.0], "layers": [{"name": "A", "inputs": [2.0, 0.0, 1.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [1.0, null, null]}, {"name": "B", "inputs": [1.0, 4.0, 2.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [null, null, null]}, {"name": "C", "inputs": [3.0, 3.0, 1.0], "weights": [[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, null, null]}, {"name": "D", "inputs": [1.0, 3.0, 3.0], "weights": [[1.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 0.0, 1.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, null, null]}], "answers": {"L0-1-0": 4.0, "L0-2-0": 2.0, "L1-0-0": 3.0, "L1-1-0": 3.0, "L1-2-0": 1.0, "L2-0-0": 1.0, "L2-1-0": 3.0, "L2-2-0": 3.0, "L3-0-0": 4.0, "L3-1-0": 6.0, "L3-2-0": 4.0}}, {"id": 23, "input": [2.0, 0.0, 1.0], "layers": [{"name": "A", "inputs": [2.0, 0.0, 1.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [1.0, 4.0, 2.0]}, {"name": "B", "inputs": [1.0, 4.0, 2.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [null, null, 1.0]}, {"name": "C", "inputs": [3.0, 3.0, 1.0], "weights": [[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, null, null]}, {"name": "D", "inputs": [1.0, 3.0, 3.0], "weights": [[1.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 0.0, 1.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, null, null]}], "answers": {"L1-0-0": 3.0, "L1-1-0": 3.0, "L2-0-0": 1.0, "L2-1-0": 3.0, "L2-2-0": 3.0, "L3-0-0": 4.0, "L3-1-0": 6.0, "L3-2-0": 4.0}}, {"id": 24, "input": [2.0, 0.0, 1.0], "layers": [{"name": "A", "inputs": [2.0, 0.0, 1.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [1.0, 4.0, 2.0]}, {"name": "B", "inputs": [1.0, 4.0, 2.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [3.0, 3.0, 1.0]}, {"name": "C", "inputs": [3.0, 3.0, 1.0], "weights": [[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, 3.0, null]}, {"name": "D", "inputs": [1.0, 3.0, 3.0], "weights": [[1.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 0.0, 1.0]], "biases": [0.0, 0.0, 0.0], "outputs": [null, null, null]}], "answers": {"L2-0-0": 1.0, "L2-2-0": 3.0, "L3-0-0": 4.0, "L3-1-0": 6.0, "L3-2-0": 4.0}}, {"id": 25, "input": [2.0, 0.0, 1.0], "layers": [{"name": "A", "inputs": [2.0, 0.0, 1.0], "weights": [[0.0, 1.0, 1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 0.0]], "biases": [0.0, 3.0, 0.0], "outputs": [1.0, 4.0, 2.0]}, {"name": "B", "inputs": [1.0, 4.0, 2.0], "weights": [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 1.0]], "biases": [0.0, -1.0, 0.0], "outputs": [3.0, 3.0, 1.0]}, {"name": "C", "inputs": [3.0, 3.0, 1.0], "weights": [[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]], "biases": [0.0, 0.0, 0.0], "outputs": [1.0, 3.0, 3.0]}, {"name": "D", "inputs": [1.0, 3.0, 3.0], "weights": [[1.0, 1.0, 0.0], [0.0, 1.0, 1.0], [1.0, 0.0, 1.0]], "biases": [0.0, 0.0, 0.0], "outputs": [4.0, null, null]}], "answers": {"L3-1-0": 6.0, "L3-2-0": 4.0}}]


const WIDE_NETWORK_EXERCISES = [{"id": 1,"input": [2.0],"layers": [{"name": "Y","weights": [[1.0]],"biases": [0.0],"outputs": [2.0],"activation": "linear"}]},{"id": 2,"input": [2.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0]],"biases": [0.0],"outputs": [3.0],"activation": "linear"}]},{"id": 3,"input": [2.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0],[1.0,-1.0]],"biases": [0.0,1.0],"outputs": [3.0,2.0],"activation": "linear"}]},{"id": 4,"input": [2.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0],[1.0,-1.0],[-1.0,0.0]],"biases": [0.0,1.0,3.0],"outputs": [3.0,2.0,1.0],"activation": "linear"}]},{"id": 5,"input": [2.0,1.0,3.0],"layers": [{"name": "Y","weights": [[1.0,1.0,0.0],[1.0,-1.0,0.0],[-1.0,0.0,1.0]],"biases": [0.0,1.0,3.0],"outputs": [3.0,2.0,4.0],"activation": "linear"}]},{"id": 6,"input": [2.0,1.0,3.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0,0.0,1.0],[1.0,-1.0,0.0,0.0],[-1.0,0.0,1.0,0.0]],"biases": [0.0,1.0,3.0],"outputs": [4.0,2.0,4.0],"activation": "linear"}]},{"id": 7,"input": [2.0,1.0,3.0,1.0,2.0],"layers": [{"name": "Y","weights": [[1.0,1.0,0.0,1.0,0.0],[1.0,-1.0,0.0,0.0,0.0],[-1.0,0.0,1.0,0.0,1.0]],"biases": [0.0,1.0,3.0],"outputs": [4.0,2.0,6.0],"activation": "linear"}]},{"id": 8,"input": [2.0,1.0,3.0,1.0,2.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0,0.0,1.0,0.0,0.0],[1.0,-1.0,0.0,0.0,0.0,0.0],[-1.0,0.0,1.0,0.0,1.0,-1.0]],"biases": [0.0,1.0,3.0],"outputs": [4.0,2.0,5.0],"activation": "linear"}]},{"id": 9,"input": [2.0,1.0,3.0,1.0,2.0,1.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0,0.0,1.0,0.0,0.0,0.0],[1.0,-1.0,0.0,0.0,0.0,0.0,2.0],[-1.0,0.0,1.0,0.0,1.0,-1.0,0.0]],"biases": [0.0,0.0,3.0],"outputs": [4.0,3.0,5.0],"activation": "linear"}]},{"id": 10,"input": [2.0,1.0,3.0,1.0,2.0,1.0,1.0,1.0],"layers": [{"name": "Y","weights": [[1.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0],[1.0,-1.0,0.0,0.0,0.0,0.0,2.0,-1.0],[-1.0,0.0,1.0,0.0,1.0,-1.0,0.0,0.0]],"biases": [0.0,0.0,3.0],"outputs": [4.0,2.0,5.0],"activation": "linear"}]},{"id": 11,"input": [2.0],"layers": [{"name": "H","weights": [[1.0]],"biases": [1.0],"outputs": [3.0],"activation": "linear"},{"name": "Y","weights": [[1.0]],"biases": [2.0],"outputs": [5.0],"activation": "linear"}]},{"id": 12,"input": [2.0],"layers": [{"name": "H","weights": [[1.0],[1.0]],"biases": [1.0,0.0],"outputs": [3.0,2.0],"activation": "linear"},{"name": "Y","weights": [[1.0,1.0]],"biases": [2.0],"outputs": [7.0],"activation": "linear"}]},{"id": 13,"input": [2.0],"layers": [{"name": "H","weights": [[1.0],[1.0],[1.0]],"biases": [1.0,0.0,-1.0],"outputs": [3.0,2.0,1.0],"activation": "linear"},{"name": "Y","weights": [[1.0,1.0,0.0]],"biases": [2.0],"outputs": [7.0],"activation": "linear"}]},{"id": 14,"input": [2.0],"layers": [{"name": "H","weights": [[1.0],[1.0],[1.0],[1.0]],"biases": [1.0,0.0,-1.0,-2.0],"outputs": [3.0,2.0,1.0,0.0],"activation": "linear"},{"name": "Y","weights": [[1.0,1.0,0.0,2.0]],"biases": [2.0],"outputs": [7.0],"activation": "linear"}]},{"id": 15,"input": [2.0],"layers": [{"name": "H","weights": [[1.0],[1.0],[1.0],[1.0],[0.0],[-1.0]],"biases": [1.0,0.0,-1.0,-2.0,-1.0,3.0],"outputs": [3.0,2.0,1.0,0.0,-1.0,1.0],"activation": "linear"},{"name": "Y","weights": [[1.0,1.0,0.0,2.0,0.0,1.0]],"biases": [2.0],"outputs": [8.0],"activation": "linear"}]},{"id": 16,"input": [2.0],"layers": [{"name": "H","weights": [[1.0],[1.0],[1.0],[1.0],[0.0],[-1.0],[2.0],[3.0]],"biases": [1.0,0.0,-1.0,-2.0,-1.0,3.0,0.0,0.0],"outputs": [3.0,2.0,1.0,0.0,-1.0,1.0,4.0,6.0],"activation": "linear"},{"name": "Y","weights": [[1.0,1.0,0.0,2.0,0.0,1.0,0.0,-1.0]],"biases": [2.0],"outputs": [2.0],"activation": "linear"}]},{"id": 17,"input": [2.0,1.0],"layers": [{"name": "H","weights": [[1.0,0.0],[1.0,0.0],[1.0,0.0],[1.0,1.0],[0.0,0.0],[-1.0,1.0],[2.0,1.0],[3.0,1.0]],"biases": [1.0,0.0,-1.0,-2.0,-1.0,3.0,0.0,0.0],"outputs": [3.0,2.0,1.0,1.0,-1.0,2.0,5.0,7.0],"activation": "linear"},{"name": "Y","weights": [[1.0,1.0,0.0,2.0,0.0,1.0,0.0,-1.0]],"biases": [2.0],"outputs": [4.0],"activation": "linear"}]},{"id": 18,"input": [2.0],"layers": [{"name": "A","weights": [[1.0],[1.0]],"biases": [0.0,1.0],"outputs": [2.0,3.0],"activation": "relu"}]},{"id": 19,"input": [2.0],"layers": [{"name": "A","weights": [[1.0],[1.0]],"biases": [0.0,1.0],"outputs": [2.0,3.0],"activation": "relu"},{"name": "B","weights": [[1.0,-1.0],[1.0,1.0],[1.0,0.0]],"biases": [0.0,0.0,1.0],"outputs": [0.0,5.0,3.0],"activation": "relu"}]},{"id": 20,"input": [2.0],"layers": [{"name": "A","weights": [[1.0],[1.0]],"biases": [0.0,1.0],"outputs": [2.0,3.0],"activation": "relu"},{"name": "B","weights": [[1.0,-1.0],[1.0,1.0],[1.0,0.0]],"biases": [2.0,0.0,1.0],"outputs": [1.0,5.0,3.0],"activation": "relu"},{"name": "C","weights": [[1.0,0.0,-1.0],[0.0,1.0,-1.0],[1.0,1.0,0.0],[0.0,1.0,0.0]],"biases": [0.0,0.0,0.0,-1.0],"outputs": [0.0,2.0,6.0,4.0],"activation": "relu"}]},{"id": 21,"input": [2.0],"layers": [{"name": "A","weights": [[1.0],[1.0]],"biases": [0.0,1.0],"outputs": [2.0,3.0],"activation": "relu"},{"name": "B","weights": [[1.0,-1.0],[1.0,1.0],[1.0,0.0]],"biases": [2.0,0.0,1.0],"outputs": [1.0,5.0,3.0],"activation": "relu"},{"name": "C","weights": [[1.0,0.0,-1.0],[0.0,1.0,-1.0],[1.0,1.0,0.0],[0.0,1.0,0.0]],"biases": [0.0,0.0,0.0,-1.0],"outputs": [0.0,2.0,6.0,4.0],"activation": "relu"},{"name": "D","weights": [[1.0,0.0,0.0,1.0],[0.0,-2.0,0.0,0.0],[0.0,-1.0,0.0,1.0],[1.0,1.0,1.0,0.0],[0.0,0.0,1.0,1.0]],"biases": [0.0,5.0,0.0,0.0,1.0],"outputs": [4.0,1.0,2.0,8.0,11.0],"activation": "relu"}]},{"id": 22,"input": [2.0,1.0,3.0,0.0,-1.0],"layers": [{"name": "A","weights": [[1.0,0.0,0.0,0.0,-1.0],[0.0,1.0,1.0,0.0,0.0],[0.0,0.0,1.0,1.0,1.0],[0.0,0.0,0.0,0.0,2.0]],"biases": [0.0,0.0,0.0,1.0],"outputs": [3.0,4.0,2.0,0.0],"activation": "relu"}]},{"id": 23,"input": [2.0,1.0,3.0,0.0,-1.0],"layers": [{"name": "A","weights": [[1.0,0.0,0.0,0.0,-1.0],[0.0,1.0,1.0,0.0,0.0],[0.0,0.0,1.0,1.0,1.0],[0.0,0.0,0.0,0.0,2.0]],"biases": [0.0,0.0,0.0,1.0],"outputs": [3.0,4.0,2.0,0.0],"activation": "relu"},{"name": "B","weights": [[1.0,0.0,0.0,-1.0],[0.0,1.0,-1.0,0.0],[1.0,0.0,0.0,0.0]],"biases": [0.0,0.0,-2.0],"outputs": [3.0,2.0,1.0],"activation": "relu"}]},{"id": 24,"input": [2.0,1.0,3.0,0.0,-1.0],"layers": [{"name": "A","weights": [[1.0,0.0,0.0,0.0,-1.0],[0.0,1.0,1.0,0.0,0.0],[0.0,0.0,1.0,1.0,1.0],[0.0,0.0,0.0,0.0,2.0]],"biases": [0.0,0.0,0.0,1.0],"outputs": [3.0,4.0,2.0,0.0],"activation": "relu"},{"name": "B","weights": [[1.0,0.0,0.0,-1.0],[0.0,1.0,-1.0,0.0],[1.0,0.0,0.0,0.0]],"biases": [0.0,0.0,-2.0],"outputs": [3.0,2.0,1.0],"activation": "relu"},{"name": "C","weights": [[1.0,0.0,-1.0],[1.0,1.0,0.0]],"biases": [0.0,1.0],"outputs": [2.0,6.0],"activation": "relu"}]},{"id": 25,"input": [2.0,1.0,3.0,0.0,-1.0],"layers": [{"name": "A","weights": [[1.0,0.0,0.0,0.0,-1.0],[0.0,1.0,1.0,0.0,0.0],[0.0,0.0,1.0,1.0,1.0],[0.0,0.0,0.0,0.0,2.0]],"biases": [0.0,0.0,0.0,1.0],"outputs": [3.0,4.0,2.0,0.0],"activation": "relu"},{"name": "B","weights": [[1.0,0.0,0.0,-1.0],[0.0,1.0,-1.0,0.0],[1.0,0.0,0.0,0.0]],"biases": [0.0,0.0,-2.0],"outputs": [3.0,2.0,1.0],"activation": "relu"},{"name": "C","weights": [[1.0,0.0,-1.0],[1.0,1.0,0.0]],"biases": [0.0,1.0],"outputs": [2.0,6.0],"activation": "relu"},{"name": "D","weights": [[-1.0,1.0]],"biases": [1.0],"outputs": [5.0],"activation": "relu"}]}];

const WIDE_EXERCISES = [{"id": 1, "image": "assets/workbook_wide/ex-01.png", "answers": [2.0]}, {"id": 2, "image": "assets/workbook_wide/ex-02.png", "answers": [3.0]}, {"id": 3, "image": "assets/workbook_wide/ex-03.png", "answers": [3.0, 2.0]}, {"id": 4, "image": "assets/workbook_wide/ex-04.png", "answers": [3.0, 2.0, 1.0]}, {"id": 5, "image": "assets/workbook_wide/ex-05.png", "answers": [3.0, 2.0, 4.0]}, {"id": 6, "image": "assets/workbook_wide/ex-06.png", "answers": [4.0, 2.0, 4.0]}, {"id": 7, "image": "assets/workbook_wide/ex-07.png", "answers": [4.0, 2.0, 6.0]}, {"id": 8, "image": "assets/workbook_wide/ex-08.png", "answers": [4.0, 2.0, 5.0]}, {"id": 9, "image": "assets/workbook_wide/ex-09.png", "answers": [4.0, 3.0, 5.0]}, {"id": 10, "image": "assets/workbook_wide/ex-10.png", "answers": [4.0, 2.0, 5.0]}, {"id": 11, "image": "assets/workbook_wide/ex-11.png", "answers": [5.0]}, {"id": 12, "image": "assets/workbook_wide/ex-12.png", "answers": [7.0]}, {"id": 13, "image": "assets/workbook_wide/ex-13.png", "answers": [7.0]}, {"id": 14, "image": "assets/workbook_wide/ex-14.png", "answers": [7.0]}, {"id": 15, "image": "assets/workbook_wide/ex-15.png", "answers": [8.0]}, {"id": 16, "image": "assets/workbook_wide/ex-16.png", "answers": [2.0]}, {"id": 17, "image": "assets/workbook_wide/ex-17.png", "answers": [4.0]}, {"id": 18, "image": "assets/workbook_wide/ex-18.png", "answers": [2.0, 3.0]}, {"id": 19, "image": "assets/workbook_wide/ex-19.png", "answers": [0.0, 5.0, 3.0]}, {"id": 20, "image": "assets/workbook_wide/ex-20.png", "answers": [0.0, 2.0, 6.0, 4.0]}, {"id": 21, "image": "assets/workbook_wide/ex-21.png", "answers": [4.0, 1.0, 2.0, 8.0, 11.0]}, {"id": 22, "image": "assets/workbook_wide/ex-22.png", "answers": [3.0, 4.0, 2.0, 0.0]}, {"id": 23, "image": "assets/workbook_wide/ex-23.png", "answers": [3.0, 2.0, 1.0]}, {"id": 24, "image": "assets/workbook_wide/ex-24.png", "answers": [2.0, 6.0]}, {"id": 25, "image": "assets/workbook_wide/ex-25.png", "answers": [5.0]}];


const SOFTMAX_INTERACTIVE_EXERCISES = [{"id": 1,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [-1.0,-1.0],"linear": [2.0,0.0],"exp": [9.0,1.0],"softmax": [0.9,0.1]},{"id": 2,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [0.0,0.0],"linear": [3.0,1.0],"exp": [27.0,3.0],"softmax": [0.9,0.1]},{"id": 3,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [1.0,1.0],"linear": [4.0,2.0],"exp": [81.0,9.0],"softmax": [0.9,0.1]},{"id": 4,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [2.0,2.0],"linear": [5.0,3.0],"exp": [243.0,27.0],"softmax": [0.9,0.1]},{"id": 5,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [3.0,3.0],"linear": [6.0,4.0],"exp": [729.0,81.0],"softmax": [0.9,0.1]},{"id": 6,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [3.0,5.0],"linear": [6.0,6.0],"exp": [729.0,729.0],"softmax": [0.5,0.5]},{"id": 7,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [2.0,4.0],"linear": [5.0,5.0],"exp": [243.0,243.0],"softmax": [0.5,0.5]},{"id": 8,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [0.0,2.0],"linear": [3.0,3.0],"exp": [27.0,27.0],"softmax": [0.5,0.5]},{"id": 9,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [0.0,1.0],"linear": [3.0,2.0],"exp": [27.0,9.0],"softmax": [0.75,0.25]},{"id": 10,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0]],"biases": [-1.0,0.0],"linear": [2.0,1.0],"exp": [9.0,3.0],"softmax": [0.75,0.25]},{"id": 11,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [-3.0,-1.0,-2.0,-1.0],"linear": [0.0,0.0,0.0,0.0],"exp": [1.0,1.0,1.0,1.0],"softmax": [0.25,0.25,0.25,0.25]},{"id": 12,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [-4.0,-2.0,-3.0,-2.0],"linear": [-1.0,-1.0,-1.0,-1.0],"exp": [0.333333333333333,0.333333333333333,0.333333333333333,0.333333333333333],"softmax": [0.25,0.25,0.25,0.25]},{"id": 13,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [2.0,4.0,3.0,4.0],"linear": [5.0,5.0,5.0,5.0],"exp": [243.0,243.0,243.0,243.0],"softmax": [0.25,0.25,0.25,0.25]},{"id": 14,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [-3.0,0.0,-1.0,0.0],"linear": [0.0,1.0,1.0,1.0],"exp": [1.0,3.0,3.0,3.0],"softmax": [0.1,0.3,0.3,0.3]},{"id": 15,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [-1.0,2.0,1.0,2.0],"linear": [2.0,3.0,3.0,3.0],"exp": [9.0,27.0,27.0,27.0],"softmax": [0.1,0.3,0.3,0.3]},{"id": 16,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [1.0,4.0,3.0,4.0],"linear": [4.0,5.0,5.0,5.0],"exp": [81.0,243.0,243.0,243.0],"softmax": [0.1,0.3,0.3,0.3]},{"id": 17,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [6.0,8.0,7.0,8.0],"linear": [9.0,9.0,9.0,9.0],"exp": [6561.0,19683.0,19683.0,19683.0],"softmax": [0.1,0.3,0.3,0.3]},{"id": 18,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [-1.0,-1.0,-2.0,1.0],"linear": [2.0,0.0,0.0,2.0],"exp": [9.0,1.0,1.0,9.0],"softmax": [0.45,0.05,0.05,0.45]},{"id": 19,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [0.0,0.0,-1.0,2.0],"linear": [3.0,1.0,1.0,3.0],"exp": [27.0,3.0,3.0,27.0],"softmax": [0.45,0.05,0.05,0.45]},{"id": 20,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [3.0,4.0,3.0,5.0],"linear": [6.0,5.0,5.0,6.0],"exp": [729.0,243.0,243.0,729.0],"sumExp": 4860.0,"softmax": [0.45,0.05,0.05,0.45]},{"id": 21,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [-1.0,3.0,0.0,-1.0],"linear": [2.0,4.0,2.0,0.0],"exp": [9.0,81.0,9.0,1.0],"softmax": [0.09,0.81,0.09,0.01]},{"id": 22,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [0.0,4.0,1.0,0.0],"linear": [3.0,5.0,3.0,1.0],"exp": [27.0,243.0,27.0,3.0],"softmax": [0.09,0.81,0.09,0.01]},{"id": 23,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0]],"biases": [3.0,7.0,4.0,3.0],"linear": [6.0,8.0,6.0,4.0],"exp": [729.0,6561.0,729.0,81.0],"softmax": [0.09,0.81,0.09,0.01]},{"id": 24,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0],[1.0,2.0],[2.0,1.0]],"biases": [-3.0,-1.0,-1.0,0.0,-4.0,-5.0],"linear": [0.0,0.0,1.0,1.0,0.0,0.0],"exp": [1.0,1.0,3.0,3.0,1.0,1.0],"softmax": [0.1,0.1,0.3,0.3,0.1,0.1]},{"id": 25,"input": [2.0,1.0],"weights": [[1.0,1.0],[1.0,-1.0],[1.0,0.0],[0.0,1.0],[1.0,2.0],[2.0,1.0]],"biases": [-3.0,0.0,0.0,2.0,-4.0,-3.0],"linear": [0.0,1.0,2.0,3.0,0.0,2.0],"exp": [1.0,3.0,9.0,27.0,1.0,9.0],"softmax": [0.02,0.06,0.18,0.54,0.02,0.18]}];

const GRADIENT_INTERACTIVE_EXERCISES = [
  {"id": 1, "mode": "linear_dw", "x": 2, "w": 3, "w2": 3.1},
  {"id": 2, "mode": "linear_dw", "x": 3, "w": 3, "w2": 3.1},
  {"id": 3, "mode": "linear_dw", "x": 3, "w": 2, "w2": 2.1},
  {"id": 4, "mode": "linear_dw", "x": 4, "w": 2, "w2": 2.1},
  {"id": 5, "mode": "linear_dw", "x": 6, "w": 2, "w2": 2.1},
  {"id": 6, "mode": "linear_dw", "x": 9, "w": 2, "w2": 2.1},
  {"id": 7, "mode": "linear_dw", "x": 2, "w": 3, "w2": 2.9},
  {"id": 8, "mode": "linear_dw", "x": 2, "w": 3, "w2": 3.2},
  {"id": 9, "mode": "linear_dw", "x": 2, "w": 3, "w2": 5},
  {"id": 10, "mode": "linear_dx", "x": 2, "w": 3, "x2": 2.1},
  {"id": 11, "mode": "linear_dx", "x": 2, "w": 3, "x2": 3},
  {"id": 12, "mode": "linear_dx", "x": 2, "w": 4, "x2": 2.1},
  {"id": 13, "mode": "linear_dx", "x": 2, "w": 4, "x2": 0},
  {"id": 14, "mode": "relu", "param": "w", "x": 2, "w": 3, "w2": 3.1},
  {"id": 15, "mode": "relu", "param": "w", "x": 2, "w": 3, "w2": 3.1},
  {"id": 16, "mode": "relu", "param": "w", "x": -2, "w": 3, "w2": 3.1},
  {"id": 17, "mode": "relu", "param": "w", "x": -2, "w": 3, "w2": 3.1},
  {"id": 18, "mode": "relu", "param": "w", "x": 4, "w": 3, "w2": 3.1},
  {"id": 19, "mode": "relu", "param": "w", "x": 5, "w": 3, "w2": 3.1},
  {"id": 20, "mode": "relu", "param": "w", "x": 9, "w": 3, "w2": 3.1},
  {"id": 21, "mode": "relu", "param": "w", "x": -1, "w": 3, "w2": 3.1},
  {"id": 22, "mode": "relu", "param": "w", "needsParamGrad": true, "x": 4, "w": 3, "w2": 3.1},
  {"id": 23, "mode": "relu", "param": "w", "needsParamGrad": true, "x": -2, "w": 3, "w2": 3.1},
  {"id": 24, "mode": "relu", "param": "x", "needsParamGrad": true, "x": 4, "w": 3, "x2": 4.1},
  {"id": 25, "mode": "relu", "param": "x", "needsParamGrad": true, "x": 3, "w": -2, "x2": 3.1},
];

const SOFTMAX_EXERCISES = [{"id": 1, "image": "assets/workbook_softmax/ex-01.png", "answers": [0.9, 0.1]}, {"id": 2, "image": "assets/workbook_softmax/ex-02.png", "answers": [0.9, 0.1]}, {"id": 3, "image": "assets/workbook_softmax/ex-03.png", "answers": [0.9, 0.1]}, {"id": 4, "image": "assets/workbook_softmax/ex-04.png", "answers": [0.9, 0.1]}, {"id": 5, "image": "assets/workbook_softmax/ex-05.png", "answers": [0.9, 0.1]}, {"id": 6, "image": "assets/workbook_softmax/ex-06.png", "answers": [0.5, 0.5]}, {"id": 7, "image": "assets/workbook_softmax/ex-07.png", "answers": [0.5, 0.5]}, {"id": 8, "image": "assets/workbook_softmax/ex-08.png", "answers": [0.5, 0.5]}, {"id": 9, "image": "assets/workbook_softmax/ex-09.png", "answers": [0.75, 0.25]}, {"id": 10, "image": "assets/workbook_softmax/ex-10.png", "answers": [0.75, 0.25]}, {"id": 11, "image": "assets/workbook_softmax/ex-11.png", "answers": [0.25, 0.25, 0.25, 0.25]}, {"id": 12, "image": "assets/workbook_softmax/ex-12.png", "answers": [0.25, 0.25, 0.25, 0.25]}, {"id": 13, "image": "assets/workbook_softmax/ex-13.png", "answers": [0.25, 0.25, 0.25, 0.25]}, {"id": 14, "image": "assets/workbook_softmax/ex-14.png", "answers": [0.1, 0.3, 0.3, 0.3]}, {"id": 15, "image": "assets/workbook_softmax/ex-15.png", "answers": [0.1, 0.3, 0.3, 0.3]}, {"id": 16, "image": "assets/workbook_softmax/ex-16.png", "answers": []}, {"id": 17, "image": "assets/workbook_softmax/ex-17.png", "answers": []}, {"id": 18, "image": "assets/workbook_softmax/ex-18.png", "answers": []}, {"id": 19, "image": "assets/workbook_softmax/ex-19.png", "answers": []}, {"id": 20, "image": "assets/workbook_softmax/ex-20.png", "answers": []}, {"id": 21, "image": "assets/workbook_softmax/ex-21.png", "answers": []}, {"id": 22, "image": "assets/workbook_softmax/ex-22.png", "answers": []}, {"id": 23, "image": "assets/workbook_softmax/ex-23.png", "answers": []}, {"id": 24, "image": "assets/workbook_softmax/ex-24.png", "answers": []}, {"id": 25, "image": "assets/workbook_softmax/ex-25.png", "answers": []}];

const GRADIENT_EXERCISES = [{"id": 1, "image": "assets/workbook_gradient/ex-01.png", "answers": [0.1, 2.0]}, {"id": 2, "image": "assets/workbook_gradient/ex-02.png", "answers": [0.1, 3.0]}, {"id": 3, "image": "assets/workbook_gradient/ex-03.png", "answers": [0.1, 3.0]}, {"id": 4, "image": "assets/workbook_gradient/ex-04.png", "answers": [0.1, 4.0]}, {"id": 5, "image": "assets/workbook_gradient/ex-05.png", "answers": [0.1, 6.0]}, {"id": 6, "image": "assets/workbook_gradient/ex-06.png", "answers": [0.1, 9.0]}, {"id": 7, "image": "assets/workbook_gradient/ex-07.png", "answers": [-0.1, 2.0]}, {"id": 8, "image": "assets/workbook_gradient/ex-08.png", "answers": [0.2, 2.0]}, {"id": 9, "image": "assets/workbook_gradient/ex-09.png", "answers": [2.0, 2.0]}, {"id": 10, "image": "assets/workbook_gradient/ex-10.png", "answers": [0.0, 3.0]}, {"id": 11, "image": "assets/workbook_gradient/ex-11.png", "answers": [0.0, 3.0]}, {"id": 12, "image": "assets/workbook_gradient/ex-12.png", "answers": [0.0, 4.0]}, {"id": 13, "image": "assets/workbook_gradient/ex-13.png", "answers": [0.0, 4.0]}, {"id": 14, "image": "assets/workbook_gradient/ex-14.png", "answers": []}, {"id": 15, "image": "assets/workbook_gradient/ex-15.png", "answers": []}, {"id": 16, "image": "assets/workbook_gradient/ex-16.png", "answers": []}, {"id": 17, "image": "assets/workbook_gradient/ex-17.png", "answers": []}, {"id": 18, "image": "assets/workbook_gradient/ex-18.png", "answers": []}, {"id": 19, "image": "assets/workbook_gradient/ex-19.png", "answers": []}, {"id": 20, "image": "assets/workbook_gradient/ex-20.png", "answers": []}, {"id": 21, "image": "assets/workbook_gradient/ex-21.png", "answers": []}, {"id": 22, "image": "assets/workbook_gradient/ex-22.png", "answers": []}, {"id": 23, "image": "assets/workbook_gradient/ex-23.png", "answers": []}, {"id": 24, "image": "assets/workbook_gradient/ex-24.png", "answers": []}, {"id": 25, "image": "assets/workbook_gradient/ex-25.png", "answers": []}];

const DOT_WORKBOOK = DOT_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_dot", ex.id),
  answers: [ex.type === "find_result" ? ex.result : ex.answer],
}));

const MATMUL_WORKBOOK = MATMUL_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_matmul", ex.id),
  answers: flattenAnswer(ex.answer),
}));

const LINEAR_WORKBOOK = LINEAR_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_linear", ex.id),
  answers: Array.isArray(ex.answer) ? ex.answer : [ex.answer],
}));

const ACTIVATION_WORKBOOK = ACTIVATION_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_activation", ex.id),
  answers: [ex.answer],
}));

const ARTIFICIAL_WORKBOOK = ARTIFICIAL_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_neuron", ex.id),
  answers: valuesFromAnswerMap(ex.answers).map(normalizeWorkbookAnswer),
}));

const BATCH_WORKBOOK = BATCH_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_batch", ex.id),
  answers: valuesFromAnswerMap(ex.answers),
}));

const CONNECTION_WORKBOOK = CONNECTION_EXERCISES.map((ex) => ({
  id: ex.id,
  image: workbookImagePath("workbook_connection", ex.id),
  answers: [],
}));

const SectionHeader = ({ title, subtitle }) => (
  <div className="text-center mb-4">
    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
    {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
  </div>
);

const WorkbookOnlyNotice = ({ title, onSwitch }) => (
  <div className="bg-white rounded-2xl shadow p-8 text-center">
    <h2 className="text-xl font-bold text-slate-800 mb-2">{title} (Interactive)</h2>
    <p className="text-sm text-slate-600 mb-6">
      This workbook is available in image mode only. Switch to Workbook view to practice on the original pages.
    </p>
    <button
      onClick={onSwitch}
      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm"
    >
      Switch to Workbook View
    </button>
  </div>
);

const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
      active
        ? "bg-slate-900 text-white"
        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
    }`}
  >
    {children}
  </button>
);

function App() {
  const [tab, setTab] = useState("dot");
  const [viewMode, setViewMode] = useState("interactive");
  const isWorkbook = viewMode === "workbook";
  const data = {
    dot: DOT_EXERCISES,
    matmul: MATMUL_EXERCISES,
    linear: LINEAR_EXERCISES,
    activation: ACTIVATION_EXERCISES,
    neuron: ARTIFICIAL_EXERCISES,
    batch: BATCH_EXERCISES,
    connection: CONNECTION_EXERCISES,
    hidden: HIDDEN_LAYER_EXERCISES,
    deep: DEEP_NETWORK_EXERCISES,
    wide: WIDE_NETWORK_EXERCISES,
    softmax: SOFTMAX_INTERACTIVE_EXERCISES,
    gradient: GRADIENT_INTERACTIVE_EXERCISES,
  };
  const workbookData = {
    dot: DOT_WORKBOOK,
    matmul: MATMUL_WORKBOOK,
    linear: LINEAR_WORKBOOK,
    activation: ACTIVATION_WORKBOOK,
    neuron: ARTIFICIAL_WORKBOOK,
    batch: BATCH_WORKBOOK,
    connection: CONNECTION_WORKBOOK,
    hidden: HIDDEN_WORKBOOK,
    deep: DEEP_EXERCISES,
    wide: WIDE_EXERCISES,
    softmax: SOFTMAX_EXERCISES,
    gradient: GRADIENT_EXERCISES,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center mb-4">
          <div className="bg-white border border-slate-200 rounded-full p-1 flex gap-1 shadow-sm">
            <button
              onClick={() => setViewMode("interactive")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                viewMode === "interactive"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Interactive
            </button>
            <button
              onClick={() => setViewMode("workbook")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                viewMode === "workbook"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Workbook
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <TabButton active={tab === "dot"} onClick={() => setTab("dot")}>Dot Product</TabButton>
          <TabButton active={tab === "matmul"} onClick={() => setTab("matmul")}>Matrix Multiplication</TabButton>
          <TabButton active={tab === "linear"} onClick={() => setTab("linear")}>Linear Layer</TabButton>
          <TabButton active={tab === "activation"} onClick={() => setTab("activation")}>Activation</TabButton>
          <TabButton active={tab === "neuron"} onClick={() => setTab("neuron")}>Artificial Neuron</TabButton>
          <TabButton active={tab === "batch"} onClick={() => setTab("batch")}>Batch</TabButton>
          <TabButton active={tab === "connection"} onClick={() => setTab("connection")}>Connection</TabButton>
          <TabButton active={tab === "hidden"} onClick={() => setTab("hidden")}>Hidden Layer</TabButton>
          <TabButton active={tab === "deep"} onClick={() => setTab("deep")}>Deep</TabButton>
          <TabButton active={tab === "wide"} onClick={() => setTab("wide")}>Wide</TabButton>
          <TabButton active={tab === "softmax"} onClick={() => setTab("softmax")}>Softmax</TabButton>
          <TabButton active={tab === "gradient"} onClick={() => setTab("gradient")}>Gradient</TabButton>
        </div>

        {!isWorkbook && tab === "dot" && <DotProductSimulator exercises={data.dot} />}
        {!isWorkbook && tab === "matmul" && <MatrixMultiplicationSimulator exercises={data.matmul} />}
        {!isWorkbook && tab === "linear" && <LinearLayerSimulator exercises={data.linear} />}
        {!isWorkbook && tab === "activation" && <ActivationSimulator exercises={data.activation} />}
        {!isWorkbook && tab === "neuron" && <ArtificialNeuronSimulator exercises={data.neuron} />}
        {!isWorkbook && tab === "batch" && <BatchSimulator exercises={data.batch} />}
        {!isWorkbook && tab === "connection" && <ConnectionSimulator exercises={data.connection} />}

        {isWorkbook && tab === "dot" && (
          <ImageExerciseSimulator
            exercises={workbookData.dot}
            title="Dot Product"
            subtitle="Workbook view"
            theme="emerald"
          />
        )}
        {isWorkbook && tab === "matmul" && (
          <ImageExerciseSimulator
            exercises={workbookData.matmul}
            title="Matrix Multiplication"
            subtitle="Workbook view"
            theme="violet"
          />
        )}
        {isWorkbook && tab === "linear" && (
          <ImageExerciseSimulator
            exercises={workbookData.linear}
            title="Linear Layer"
            subtitle="Workbook view"
            theme="amber"
            answerLayout="column"
          />
        )}
        {isWorkbook && tab === "activation" && (
          <ImageExerciseSimulator
            exercises={workbookData.activation}
            title="Activation"
            subtitle="Workbook view"
            theme="sky"
          />
        )}
        {isWorkbook && tab === "neuron" && (
          <ImageExerciseSimulator
            exercises={workbookData.neuron}
            title="Artificial Neuron"
            subtitle="Workbook view"
            theme="lime"
          />
        )}
        {isWorkbook && tab === "batch" && (
          <ImageExerciseSimulator
            exercises={workbookData.batch}
            title="Batch"
            subtitle="Workbook view"
            theme="emerald"
          />
        )}
        {isWorkbook && tab === "connection" && (
          <ImageExerciseSimulator
            exercises={workbookData.connection}
            title="Connection"
            subtitle="Workbook view"
            theme="violet"
          />
        )}
        {!isWorkbook && tab === "hidden" && <HiddenLayerSimulator exercises={data.hidden} />}
        {isWorkbook && tab === "hidden" && (
          <ImageExerciseSimulator
            exercises={workbookData.hidden}
            title="Hidden Layer"
            subtitle="Workbook view"
            theme="emerald"
            labels={["Blue", "Peach"]}
            colors={["bg-sky-200 border-sky-400", "bg-orange-100 border-orange-300"]}
          />
        )}
        {!isWorkbook && tab === "deep" && <DeepNetworkSimulator exercises={data.deep} />}
        {isWorkbook && tab === "deep" && (
          <ImageExerciseSimulator
            exercises={workbookData.deep}
            title="Deep Network"
            subtitle="Linear + ReLU chains"
            theme="violet"
            labels={["Blue", "Peach"]}
            colors={["bg-sky-200 border-sky-400", "bg-orange-100 border-orange-300"]}
          />
        )}
        {!isWorkbook && tab === "wide" && <WideNetworkSimulator exercises={data.wide} />}
        {isWorkbook && tab === "wide" && (
          <ImageExerciseSimulator
            exercises={workbookData.wide}
            title="Wide Network"
            subtitle="Parallel neurons"
            theme="amber"
            labels={["Blue", "Peach"]}
            colors={["bg-sky-200 border-sky-400", "bg-orange-100 border-orange-300"]}
          />
        )}
        {!isWorkbook && tab === "softmax" && <SoftmaxSimulator exercises={data.softmax} />}
        {isWorkbook && tab === "softmax" && (
          <ImageExerciseSimulator
            exercises={workbookData.softmax}
            title="Softmax"
            subtitle="Use e≈3 and the worksheet shortcuts"
            theme="sky"
            labels={["Blue", "Peach"]}
            colors={["bg-sky-200 border-sky-400", "bg-orange-100 border-orange-300"]}
          />
        )}
        {tab === "gradient" && (
          isWorkbook ? (
            <ImageExerciseSimulator
              exercises={workbookData.gradient}
              title="Gradient"
              subtitle="Finite differences and derivatives"
              theme="lime"
              labels={["Blue", "Peach"]}
              colors={["bg-sky-200 border-sky-400", "bg-orange-100 border-orange-300"]}
            />
          ) : (
            <GradientSimulator exercises={data.gradient} />
          )
        )}
      </div>
    </div>
  );
}

// ---------------- Dot Product ----------------

const DotCell = ({ value, highlight, editable, onChange, isCorrect, isWrong }) => {
  const base = "w-12 h-12 flex items-center justify-center text-lg font-bold border-2 transition";
  let bg = "bg-white";
  let border = "border-slate-300";
  if (highlight) {
    bg = "bg-amber-100";
    border = "border-amber-400";
  }
  if (isCorrect) {
    bg = "bg-green-200";
    border = "border-green-500";
  }
  if (isWrong) {
    bg = "bg-red-200";
    border = "border-red-500";
  }

  if (editable) {
    return (
      <input
        type="number"
        value={value === null ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${base} ${bg} ${border} text-center outline-none focus:ring-2 focus:ring-indigo-400`}
        placeholder="?"
      />
    );
  }

  return <div className={`${base} ${bg} ${border}`}>{value === null ? "?" : formatNumber(value)}</div>;
};

const VectorDisplay = ({ vector, label, isColumn, highlight, editableIndex, onValueChange, isCorrect, isWrong }) => (
  <div className="flex flex-col items-center">
    <span className="text-sm font-semibold mb-1 text-slate-600">{label}</span>
    <div className={`flex ${isColumn ? "flex-col" : "flex-row"} gap-0`}>
      {vector.map((val, idx) => (
        <DotCell
          key={idx}
          value={val}
          highlight={highlight && val === null}
          editable={editableIndex === idx}
          onChange={(newVal) => onValueChange(idx, newVal)}
          isCorrect={isCorrect && editableIndex === idx}
          isWrong={isWrong && editableIndex === idx}
        />
      ))}
    </div>
  </div>
);

const DotExerciseDisplay = ({ exercise, userAnswer, setUserAnswer, submitted, isCorrect }) => {
  const editableInA = exercise.type === "find_a" ? exercise.a.findIndex((v) => v === null) : -1;
  const editableInB = exercise.type === "find_b" ? exercise.b.findIndex((v) => v === null) : -1;
  const editableResult = exercise.type === "find_result";
  const isWrong = submitted && !isCorrect;

  const displayA = exercise.a.map((v, i) => (i === editableInA ? userAnswer : v));
  const displayB = exercise.b.map((v, i) => (i === editableInB ? userAnswer : v));
  const displayResult = editableResult ? userAnswer : exercise.result;

  return (
    <div className="flex items-center justify-center gap-4 p-6">
      <VectorDisplay
        vector={displayA}
        label="a"
        isColumn={true}
        highlight={exercise.type === "find_a"}
        editableIndex={editableInA}
        onValueChange={(_, val) => setUserAnswer(val)}
        isCorrect={isCorrect && exercise.type === "find_a"}
        isWrong={isWrong && exercise.type === "find_a"}
      />
      <div className="text-2xl font-bold text-slate-400">·</div>
      <VectorDisplay
        vector={displayB}
        label="b"
        isColumn={false}
        highlight={exercise.type === "find_b"}
        editableIndex={editableInB}
        onValueChange={(_, val) => setUserAnswer(val)}
        isCorrect={isCorrect && exercise.type === "find_b"}
        isWrong={isWrong && exercise.type === "find_b"}
      />
      <div className="text-2xl font-bold text-slate-400">=</div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold mb-1 text-slate-600">a·b</span>
        {editableResult ? (
          <input
            type="number"
            value={userAnswer === null ? "" : userAnswer}
            onChange={(e) => setUserAnswer(e.target.value === "" ? null : Number(e.target.value))}
            className={`w-14 h-12 text-lg font-bold text-center border-2 outline-none focus:ring-2 focus:ring-indigo-400 ${
              isCorrect
                ? "bg-green-200 border-green-500"
                : isWrong
                ? "bg-red-200 border-red-500"
                : "bg-amber-100 border-amber-400"
            }`}
            placeholder="?"
          />
        ) : (
          <DotCell value={displayResult} />
        )}
      </div>
    </div>
  );
};

const DotExplanation = ({ exercise }) => {
  const a = exercise.a.map((v) => (v === null ? exercise.answer : v));
  const b = exercise.b.map((v) => (v === null ? exercise.answer : v));

  if (exercise.type === "find_result") {
    const terms = a.map((ai, i) => `(${ai} × ${b[i]})`).join(" + ");
    const products = a.map((ai, i) => ai * b[i]);
    const sum = products.reduce((acc, val) => acc + val, 0);
    return (
      <div className="space-y-2">
        <p><strong>Formula:</strong> a·b = Σ(aᵢ × bᵢ)</p>
        <p>a·b = {terms}</p>
        <p>a·b = {products.join(" + ")}</p>
        <p className="text-green-600 font-bold">a·b = {formatNumber(sum)}</p>
      </div>
    );
  }

  const missingIdx = exercise.type === "find_a"
    ? exercise.a.findIndex((v) => v === null)
    : exercise.b.findIndex((v) => v === null);

  const known = exercise.type === "find_a" ? b : a;
  const partial = exercise.type === "find_a" ? a : b;

  let partialSum = 0;
  const knownTerms = [];
  for (let i = 0; i < known.length; i++) {
    if (partial[i] !== null) {
      const term = known[i] * partial[i];
      partialSum += term;
      knownTerms.push(`(${known[i]} × ${partial[i]}) = ${formatNumber(term)}`);
    }
  }

  const missingCoeff = known[missingIdx];
  return (
    <div className="space-y-2">
      <p><strong>Find the missing value (x):</strong></p>
      <p>Known products: {knownTerms.join(", ") || "none"}</p>
      <p>Sum of known: {formatNumber(partialSum)}</p>
      <p>{formatNumber(partialSum)} + ({missingCoeff} × x) = {formatNumber(exercise.result)}</p>
      <p>{missingCoeff} × x = {formatNumber(exercise.result - partialSum)}</p>
      <p className="text-green-600 font-bold">x = {formatNumber(exercise.answer)}</p>
    </div>
  );
};

function DotProductSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const correctAnswer = exercise.type === "find_result" ? exercise.result : exercise.answer;
  const isCorrect = submitted && isClose(userAnswer, correctAnswer);

  const handleSubmit = () => {
    if (userAnswer === null) return;
    setSubmitted(true);
    setScore((prev) => ({
      correct: prev.correct + (isClose(userAnswer, correctAnswer) ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswer(null);
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswer(null);
    setSubmitted(false);
    setShowExplanation(false);
  };

  const getPromptText = () => {
    switch (exercise.type) {
      case "find_result":
        return "Calculate the dot product (a·b)";
      case "find_a":
        return "Find the missing value in vector a";
      case "find_b":
        return "Find the missing value in vector b";
      default:
        return "";
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl shadow p-6">
      <SectionHeader
        title="Dot Product Simulator"
        subtitle="Exercises loaded from the workbook"
      />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-indigo-600">{score.correct}/{score.total}</span>
        </div>
        <button
          onClick={() => setScore({ correct: 0, total: 0 })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Reset Score
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Exercise {exercise.id}</span>
            <span className="bg-indigo-400 px-2 py-1 rounded text-xs">{exercise.a.length}D</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded">Next →</button>
          </div>
        </div>

        <div className="px-6 py-3 bg-indigo-50 text-indigo-800 font-medium">{getPromptText()}</div>

        <DotExerciseDisplay
          exercise={exercise}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          submitted={submitted}
          isCorrect={isCorrect}
        />

        {submitted && (
          <div className={`px-6 py-3 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : `✗ Incorrect. The answer is ${formatNumber(correctAnswer)}`}
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={userAnswer === null}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-6 pb-4">
            <div className="mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-sm">
              <h4 className="font-bold text-indigo-800 mb-2">Solution</h4>
              <DotExplanation exercise={exercise} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Jump to Exercise</h3>
        <div className="flex flex-wrap gap-2">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswer(null);
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-9 h-9 rounded-lg font-bold transition ${
                idx === currentExercise
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Matrix Multiplication ----------------

const MatCell = ({ value, editable, onChange, highlight, isCorrect, isWrong, size = "normal" }) => {
  const sizeClasses = size === "small" ? "w-10 h-10 text-sm" : "w-12 h-12 text-base";
  const base = `${sizeClasses} flex items-center justify-center font-bold border-2 transition`;
  let bg = "bg-white";
  let border = "border-slate-300";
  if (highlight) {
    bg = "bg-amber-100";
    border = "border-amber-400";
  }
  if (isCorrect) {
    bg = "bg-green-200";
    border = "border-green-500";
  }
  if (isWrong) {
    bg = "bg-red-200";
    border = "border-red-500";
  }

  if (editable) {
    return (
      <input
        type="number"
        value={value === null ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${base} ${bg} ${border} text-center outline-none focus:ring-2 focus:ring-blue-400`}
        placeholder="?"
      />
    );
  }

  return <div className={`${base} ${bg} ${border}`}>{value === null ? "?" : formatNumber(value)}</div>;
};

const isHighlightedCell = (highlight, i, j) => {
  if (!highlight) return false;
  if (Array.isArray(highlight[0])) {
    return highlight.some(([r, c]) => r === i && c === j);
  }
  return highlight[0] === i && highlight[1] === j;
};

const Matrix = ({ data, label, editableMask, onChange, highlight, cellSize = "normal" }) => (
  <div className="flex flex-col items-center">
    <span className="text-sm font-semibold text-slate-600 mb-1">{label}</span>
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-md" />
      <div className="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-md" />
      <div className="px-3 py-1">
        {data.map((row, i) => (
          <div key={i} className="flex">
            {row.map((val, j) => {
              const editable = editableMask ? editableMask[i]?.[j] : false;
              const isTarget = isHighlightedCell(highlight, i, j);
              return (
                <MatCell
                  key={j}
                  value={val}
                  highlight={isTarget}
                  editable={editable}
                  onChange={(newVal) => onChange?.(i, j, newVal)}
                  size={cellSize}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EditableMatrix = ({ data, label, prefix, answers, onChange, cellSize = "normal" }) => {
  const display = fillData(data, prefix, answers);
  const editableMask = buildEditableMask(data);
  return (
    <Matrix
      data={display}
      label={label}
      editableMask={editableMask}
      onChange={(i, j, value) => onChange(prefix, i, j, value)}
      cellSize={cellSize}
    />
  );
};

const StaticMatrix = ({ data, label, cellSize = "normal" }) => (
  <Matrix
    data={data}
    label={label}
    editableMask={data.map((row) => row.map(() => false))}
    cellSize={cellSize}
  />
);

const MatExplanation = ({ exercise }) => {
  const leftLabel = exercise.labels?.left ?? "A";
  const rightLabel = exercise.labels?.right ?? "B";
  const resultLabel = exercise.labels?.result ?? `${leftLabel}×${rightLabel}`;
  const a = exercise.a;
  const b = exercise.b;

  if (exercise.type === "inputs") {
    const entries = Object.entries(exercise.inputAnswers || {});
    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
        <h4 className="font-bold text-blue-800 mb-2">Missing Value{entries.length === 1 ? "" : "s"}</h4>
        {entries.map(([key, value]) => {
          const [prefix, i, j] = key.split("-");
          const label = prefix === "A" ? leftLabel : rightLabel;
          return (
            <p key={key}>
              {label}[{Number(i) + 1}][{Number(j) + 1}] = <span className="font-bold">{formatNumber(value)}</span>
            </p>
          );
        })}
      </div>
    );
  }

  if (exercise.type === "element") {
    const [row, col] = exercise.target;
    const rowA = a[row];
    const colB = b.map((r) => r[col]);
    const terms = rowA.map((val, k) => `(${val}×${b[k][col]})`).join(" + ");
    const products = rowA.map((val, k) => val * b[k][col]);

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
        <h4 className="font-bold text-blue-800 mb-2">
          Solution for {resultLabel}[{row + 1}][{col + 1}]
        </h4>
        <p>Row {row + 1} of {leftLabel}: [{rowA.map(formatNumber).join(", ")}]</p>
        <p>Column {col + 1} of {rightLabel}: [{colB.map(formatNumber).join(", ")}]</p>
        <p className="mt-2">
          {resultLabel}[{row + 1}][{col + 1}] = {terms}
        </p>
        <p>= {products.map(formatNumber).join(" + ")}</p>
        <p className="font-bold text-green-700">= {formatNumber(exercise.answer)}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm max-h-64 overflow-y-auto">
      <h4 className="font-bold text-blue-800 mb-2">Solution</h4>
      <p className="mb-2">{resultLabel}[i][j] = Σ {leftLabel}[i][k] × {rightLabel}[k][j]</p>
      {exercise.answer.map((row, i) =>
        row.map((val, j) => {
          const rowA = a[i];
          const terms = rowA.map((v, k) => `${formatNumber(v)}×${formatNumber(b[k][j])}`).join(" + ");
          return (
            <p key={`${i}-${j}`} className="text-xs">
              {resultLabel}[{i + 1}][{j + 1}] = {terms} = <span className="font-bold">{formatNumber(val)}</span>
            </p>
          );
        })
      )}
    </div>
  );
};

function MatrixMultiplicationSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showTutorial, setShowTutorial] = useState(false);

  const exercise = exercises[currentExercise];
  const leftLabel = exercise.labels?.left ?? "A";
  const rightLabel = exercise.labels?.right ?? "B";
  const resultLabel = exercise.labels?.result ?? `${leftLabel}×${rightLabel}`;
  const resultShape = [exercise.a.length, exercise.b[0].length];

  const fullResult = useMemo(() => {
    if (!exercise.inputAnswers) {
      return multiplyMatrices(exercise.a, exercise.b);
    }
    const filledA = fillData(exercise.a, "A", exercise.inputAnswers);
    const filledB = fillData(exercise.b, "B", exercise.inputAnswers);
    return multiplyMatrices(filledA, filledB);
  }, [exercise]);

  const emptyResult = useMemo(() =>
    Array(resultShape[0]).fill(null).map(() => Array(resultShape[1]).fill(null)),
  [resultShape]);

  const editableMask = useMemo(() => {
    if (submitted) return null;
    if (exercise.type === "element") {
      return emptyResult.map((row, i) =>
        row.map((_, j) => i === exercise.target[0] && j === exercise.target[1])
      );
    }
    if (exercise.type === "full") {
      return emptyResult.map((row) => row.map(() => true));
    }
    return null;
  }, [exercise, emptyResult, submitted]);

  const editableMaskA = useMemo(() => {
    if (submitted) return null;
    return exercise.a.some((row) => row.some((val) => val === null)) ? buildEditableMask(exercise.a) : null;
  }, [exercise, submitted]);

  const editableMaskB = useMemo(() => {
    if (submitted) return null;
    return exercise.b.some((row) => row.some((val) => val === null)) ? buildEditableMask(exercise.b) : null;
  }, [exercise, submitted]);

  const highlightA = useMemo(() => {
    if (exercise.type !== "inputs") return null;
    const coords = [];
    exercise.a.forEach((row, i) => row.forEach((val, j) => {
      if (val === null) coords.push([i, j]);
    }));
    return coords.length ? coords : null;
  }, [exercise]);

  const highlightB = useMemo(() => {
    if (exercise.type !== "inputs") return null;
    const coords = [];
    exercise.b.forEach((row, i) => row.forEach((val, j) => {
      if (val === null) coords.push([i, j]);
    }));
    return coords.length ? coords : null;
  }, [exercise]);

  const getResultDisplay = () => {
    if (exercise.type === "element") {
      const display = fullResult.map((row) => row.slice());
      const [r, c] = exercise.target;
      if (!submitted) {
        display[r][c] = userAnswers[keyFor("C", r, c)] ?? null;
      }
      return display;
    }
    if (exercise.type === "inputs") {
      return fullResult;
    }
    if (submitted && exercise.type === "full") return exercise.answer;
    return emptyResult.map((row, i) => row.map((_, j) => userAnswers[keyFor("C", i, j)] ?? null));
  };

  const checkAnswer = () => {
    let correct = false;
    if (exercise.type === "inputs") {
      const entries = Object.entries(exercise.inputAnswers || {});
      correct = entries.length > 0 && entries.every(([key, value]) => isClose(userAnswers[key], value));
    } else if (exercise.type === "element") {
      const [r, c] = exercise.target;
      correct = isClose(userAnswers[keyFor("C", r, c)], exercise.answer);
    } else {
      correct = true;
      for (let i = 0; i < resultShape[0]; i++) {
        for (let j = 0; j < resultShape[1]; j++) {
          if (!isClose(userAnswers[keyFor("C", i, j)], exercise.answer[i][j])) {
            correct = false;
          }
        }
      }
    }
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const isCorrect = useMemo(() => {
    if (!submitted) return null;
    if (exercise.type === "inputs") {
      const entries = Object.entries(exercise.inputAnswers || {});
      return entries.length > 0 && entries.every(([key, value]) => isClose(userAnswers[key], value));
    }
    if (exercise.type === "element") {
      const [r, c] = exercise.target;
      return isClose(userAnswers[keyFor("C", r, c)], exercise.answer);
    }
    for (let i = 0; i < resultShape[0]; i++) {
      for (let j = 0; j < resultShape[1]; j++) {
        if (!isClose(userAnswers[keyFor("C", i, j)], exercise.answer[i][j])) return false;
      }
    }
    return true;
  }, [submitted, userAnswers, exercise, resultShape]);

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handleAnswerChange = (i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor("C", i, j)]: value }));
  };

  const handleInputChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const aDisplay = fillData(exercise.a, "A", userAnswers);
  const bDisplay = fillData(exercise.b, "B", userAnswers);

  const cellSize = resultShape[0] > 2 || resultShape[1] > 2 ? "small" : "normal";

  if (showTutorial) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow p-6">
        <SectionHeader title="Matrix Multiplication Tutorial" />
        <div className="space-y-4 text-slate-700">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-bold text-indigo-700">Rule 1: Dimensions</h3>
            <p>If A is (m×n) and B is (n×p), then C = A×B is (m×p)</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-bold text-green-700">Rule 2: Each Element</h3>
            <p>C[i][j] = dot(row i of A, column j of B)</p>
            <p className="font-mono text-sm mt-1">C[i][j] = Σ A[i][k] × B[k][j]</p>
          </div>
          <button
            onClick={() => setShowTutorial(false)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Start Practicing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow p-6">
      <SectionHeader
        title="Matrix Multiplication"
        subtitle="Exercises loaded from the workbook"
      />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-indigo-600">{score.correct}/{score.total}</span>
        </div>
        <button onClick={() => setShowTutorial(true)} className="text-sm text-indigo-600 hover:text-indigo-800">
          Tutorial
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-indigo-400 px-2 py-0.5 rounded text-xs">
              {exercise.a.length}×{exercise.a[0].length} × {exercise.b.length}×{exercise.b[0].length}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="px-4 py-2 bg-indigo-50 text-indigo-800 text-sm">
          {exercise.type === "inputs"
            ? `Fill in the missing value(s) so ${resultLabel} is correct`
            : exercise.type === "element"
              ? `Find element ${resultLabel}[${exercise.target[0] + 1}][${exercise.target[1] + 1}]`
              : `Calculate the full result matrix ${resultLabel}`}
        </div>

        <div className="p-4 flex flex-wrap items-center justify-center gap-2">
          <Matrix
            data={aDisplay}
            label={leftLabel}
            highlight={highlightA}
            editableMask={editableMaskA}
            onChange={(i, j, value) => handleInputChange("A", i, j, value)}
            cellSize={cellSize}
          />
          <span className="text-2xl font-bold text-slate-400 mx-2">×</span>
          <Matrix
            data={bDisplay}
            label={rightLabel}
            highlight={highlightB}
            editableMask={editableMaskB}
            onChange={(i, j, value) => handleInputChange("B", i, j, value)}
            cellSize={cellSize}
          />
          <span className="text-2xl font-bold text-slate-400 mx-2">=</span>
          <Matrix
            data={getResultDisplay()}
            label={resultLabel}
            highlight={exercise.type === "element" ? exercise.target : null}
            editableMask={editableMask}
            onChange={handleAnswerChange}
            cellSize={cellSize}
          />
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={checkAnswer}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <MatExplanation exercise={exercise} />
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswers({});
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Linear Layer ----------------

const LinearCell = ({ value, editable, onChange, highlight, size = "normal" }) => {
  const sizeClass = size === "small" ? "w-10 h-10 text-sm" : "w-12 h-12 text-base";
  const bgClass = highlight ? "bg-emerald-100 border-emerald-400" : "bg-white border-slate-300";
  if (editable) {
    return (
      <input
        type="number"
        value={value === null ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${sizeClass} ${bgClass} border-2 text-center font-bold outline-none focus:ring-2 focus:ring-emerald-400 rounded`}
        placeholder="?"
      />
    );
  }
  return (
    <div className={`${sizeClass} ${bgClass} border-2 flex items-center justify-center font-bold rounded`}>
      {value === null ? "?" : formatNumber(value)}
    </div>
  );
};

const LinearMatrix = ({ data, label, cellSize = "normal" }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs font-semibold text-slate-500 mb-1">{label}</span>
    <div className="border-l-2 border-r-2 border-slate-500 px-1 rounded">
      {data.map((row, i) => (
        <div key={i} className="flex">
          {row.map((val, j) => (
            <LinearCell key={j} value={val} size={cellSize} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const LinearVector = ({ data, label, vertical = true, editable, onChange, highlight, cellSize = "normal" }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs font-semibold text-slate-500 mb-1">{label}</span>
    <div className={`border-l-2 border-r-2 border-slate-500 px-1 rounded ${vertical ? "" : "flex"}`}>
      {data.map((val, i) => (
        <LinearCell
          key={i}
          value={val}
          editable={editable}
          onChange={onChange ? (v) => onChange(i, v) : undefined}
          highlight={highlight?.[i]}
          size={cellSize}
        />
      ))}
    </div>
  </div>
);

const LinearExplanation = ({ exercise }) => {
  const { W, x, b } = exercise;
  const hasBias = b !== null;

  const computeNeuron = (i) => {
    const weights = W[i];
    const terms = weights.map((w, j) => `(${formatNumber(w)}×${formatNumber(x[j])})`).join(" + ");
    const products = weights.map((w, j) => w * x[j]);
    const dot = products.reduce((a, c) => a + c, 0);
    const bias = hasBias ? b[i] : 0;
    const output = dot + bias;
    return { terms, products, dot, bias, output };
  };

  return (
    <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-sm">
      <h4 className="font-bold text-emerald-800 mb-2">Solution: y = Wx + b</h4>
      {W.map((row, i) => {
        const { terms, products, dot, bias, output } = computeNeuron(i);
        return (
          <div key={i} className="mb-2 p-2 bg-white rounded">
            <p className="font-medium text-slate-700">Neuron {i + 1}:</p>
            <p className="text-xs">W[{i + 1}] · x = {terms}</p>
            <p className="text-xs">= {products.map(formatNumber).join(" + ")} = {formatNumber(dot)}</p>
            {hasBias && <p className="text-xs">+ b[{i + 1}] = {formatNumber(dot)} + {formatNumber(bias)} = {formatNumber(output)}</p>}
            <p className="font-bold text-emerald-700">y[{i + 1}] = {formatNumber(output)}</p>
          </div>
        );
      })}
    </div>
  );
};

const NeuralNetworkDiagram = ({ inFeatures, outFeatures }) => {
  const height = 140;
  const inputY = (i) => layoutY(i, inFeatures, height, 18, 18);
  const outputY = (i) => layoutY(i, outFeatures, height, 18, 18);

  return (
    <svg viewBox={`0 0 200 ${height}`} className="w-60 h-40">
      {Array(inFeatures).fill(0).map((_, i) =>
        Array(outFeatures).fill(0).map((_, j) => (
          <line
            key={`${i}-${j}`}
            x1="50" y1={inputY(i)}
            x2="150" y2={outputY(j)}
            stroke="#CBD5E1"
            strokeWidth="1"
          />
        ))
      )}
      {Array(inFeatures).fill(0).map((_, i) => (
        <g key={`in-${i}`}>
          <circle cx="50" cy={inputY(i)} r="12" fill="#34D399" />
          <text x="50" y={inputY(i) + 4} textAnchor="middle" fill="white" fontSize="10">x{i + 1}</text>
        </g>
      ))}
      {Array(outFeatures).fill(0).map((_, i) => (
        <g key={`out-${i}`}>
          <circle cx="150" cy={outputY(i)} r="12" fill="#0EA5E9" />
          <text x="150" y={outputY(i) + 4} textAnchor="middle" fill="white" fontSize="10">y{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

const ArtificialNeuronDiagram = ({ inFeatures, outFeatures, activation }) => {
  const height = 140;
  const inputY = (i) => layoutY(i, inFeatures, height, 18, 18);
  const midY = (i) => layoutY(i, outFeatures, height, 18, 18);
  const outY = midY;
  const activationLabel = activationLabels[activation] || "Activation";

  return (
    <svg viewBox={`0 0 220 ${height}`} className="w-72 h-44">
      {Array(inFeatures).fill(0).map((_, i) =>
        Array(outFeatures).fill(0).map((_, j) => (
          <line
            key={`in-${i}-mid-${j}`}
            x1="40" y1={inputY(i)}
            x2="110" y2={midY(j)}
            stroke="#CBD5E1"
            strokeWidth="1"
          />
        ))
      )}
      {Array(outFeatures).fill(0).map((_, i) => (
        <line
          key={`mid-${i}-out`}
          x1="110" y1={midY(i)}
          x2="180" y2={outY(i)}
          stroke="#94A3B8"
          strokeWidth="1"
        />
      ))}

      {Array(inFeatures).fill(0).map((_, i) => (
        <g key={`in-${i}`}>
          <circle cx="40" cy={inputY(i)} r="12" fill="#34D399" />
          <text x="40" y={inputY(i) + 4} textAnchor="middle" fill="white" fontSize="10">x{i + 1}</text>
        </g>
      ))}

      {Array(outFeatures).fill(0).map((_, i) => (
        <g key={`mid-${i}`}>
          <circle cx="110" cy={midY(i)} r="12" fill="#BFDBFE" />
        </g>
      ))}

      {Array(outFeatures).fill(0).map((_, i) => (
        <g key={`out-${i}`}>
          <circle cx="180" cy={outY(i)} r="12" fill="#FED7AA" />
          <text x="180" y={outY(i) + 4} textAnchor="middle" fill="#7C2D12" fontSize="10">y{i + 1}</text>
        </g>
      ))}

      <text x="110" y="16" textAnchor="middle" fill="#64748B" fontSize="9">Linear</text>
      <text x="180" y="16" textAnchor="middle" fill="#64748B" fontSize="9">{activationLabel}</text>
    </svg>
  );
};

const HiddenLayerDiagram = ({ inFeatures, hiddenFeatures, outFeatures }) => {
  const height = 150;
  const inputY = (i) => layoutY(i, inFeatures, height, 16, 16);
  const hiddenY = (i) => layoutY(i, hiddenFeatures, height, 16, 16);
  const outY = (i) => layoutY(i, outFeatures, height, 16, 16);

  return (
    <svg viewBox={`0 0 280 ${height}`} className="w-80 h-48">
      {Array(inFeatures).fill(0).map((_, i) =>
        Array(hiddenFeatures).fill(0).map((_, j) => (
          <line
            key={`in-${i}-hid-${j}`}
            x1="40" y1={inputY(i)}
            x2="140" y2={hiddenY(j)}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
        ))
      )}
      {Array(hiddenFeatures).fill(0).map((_, i) =>
        Array(outFeatures).fill(0).map((_, j) => (
          <line
            key={`hid-${i}-out-${j}`}
            x1="140" y1={hiddenY(i)}
            x2="240" y2={outY(j)}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
        ))
      )}

      {Array(inFeatures).fill(0).map((_, i) => (
        <g key={`in-${i}`}>
          <circle cx="40" cy={inputY(i)} r="12" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="2" />
          <text x="40" y={inputY(i) + 4} textAnchor="middle" fontSize="10" fill="#0F172A">X{i + 1}</text>
        </g>
      ))}

      {Array(hiddenFeatures).fill(0).map((_, i) => (
        <g key={`hid-${i}`}>
          <circle cx="140" cy={hiddenY(i)} r="12" fill="#FED7AA" stroke="#F59E0B" strokeWidth="2" />
          <text x="140" y={hiddenY(i) + 4} textAnchor="middle" fontSize="10" fill="#7C2D12">H{i + 1}</text>
        </g>
      ))}

      {Array(outFeatures).fill(0).map((_, i) => (
        <g key={`out-${i}`}>
          <circle cx="240" cy={outY(i)} r="12" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
          <text x="240" y={outY(i) + 4} textAnchor="middle" fontSize="10" fill="#0F172A">Y{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

const DeepNetworkDiagram = ({ inputCount, layerSizes, layerLabels }) => {
  const layers = [inputCount, ...layerSizes];
  const maxNodes = Math.max(...layers);
  const height = Math.max(160, maxNodes * 32);
  const layerCount = layers.length;
  const width = Math.max(220, 80 + (layerCount - 1) * 70);
  const layerX = (idx) => 40 + ((width - 80) * idx) / Math.max(1, layerCount - 1);
  const nodeY = (idx, count) => layoutY(idx, count, height, 16, 16);

  const inputStyle = { fill: "#E0F2FE", stroke: "#0EA5E9", text: "#0F172A" };
  const layerStyles = [
    { fill: "#BFDBFE", stroke: "#3B82F6", text: "#1E3A8A" },
    { fill: "#FED7AA", stroke: "#F59E0B", text: "#7C2D12" },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-96">
      {layers.slice(0, -1).map((count, layerIdx) =>
        Array(count).fill(0).map((_, i) =>
          Array(layers[layerIdx + 1]).fill(0).map((_, j) => (
            <line
              key={`l-${layerIdx}-${i}-${j}`}
              x1={layerX(layerIdx)}
              y1={nodeY(i, count)}
              x2={layerX(layerIdx + 1)}
              y2={nodeY(j, layers[layerIdx + 1])}
              stroke="#CBD5E1"
              strokeWidth="1"
            />
          ))
        )
      )}

      {layers.map((count, layerIdx) => {
        const label = layerIdx === 0 ? "Input" : layerLabels[layerIdx - 1] || `L${layerIdx}`;
        return (
          <text
            key={`label-${layerIdx}`}
            x={layerX(layerIdx)}
            y="12"
            textAnchor="middle"
            fill="#64748B"
            fontSize="9"
          >
            {label}
          </text>
        );
      })}

      {layers.map((count, layerIdx) => {
        const style = layerIdx === 0 ? inputStyle : layerStyles[(layerIdx - 1) % layerStyles.length];
        const nodePrefix = layerIdx === 0 ? "X" : (layerLabels[layerIdx - 1] || `L${layerIdx}`);
        return Array(count).fill(0).map((_, i) => (
          <g key={`node-${layerIdx}-${i}`}>
            <circle
              cx={layerX(layerIdx)}
              cy={nodeY(i, count)}
              r="12"
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth="2"
            />
            <text
              x={layerX(layerIdx)}
              y={nodeY(i, count) + 4}
              textAnchor="middle"
              fontSize="10"
              fill={style.text}
            >
              {nodePrefix}{i + 1}
            </text>
          </g>
        ));
      })}
    </svg>
  );
};

const BatchNetworkDiagram = ({ inFeatures, outFeatures }) => {
  const height = 140;
  const inputY = (i) => layoutY(i, inFeatures, height, 18, 18);
  const midY = (i) => layoutY(i, outFeatures, height, 18, 18);
  const outY = midY;

  return (
    <svg viewBox={`0 0 240 ${height}`} className="w-72 h-44">
      {Array(inFeatures).fill(0).map((_, i) =>
        Array(outFeatures).fill(0).map((_, j) => (
          <line
            key={`in-${i}-mid-${j}`}
            x1="40" y1={inputY(i)}
            x2="120" y2={midY(j)}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
        ))
      )}
      {Array(outFeatures).fill(0).map((_, i) => (
        <line
          key={`mid-${i}-out`}
          x1="120" y1={midY(i)}
          x2="200" y2={outY(i)}
          stroke="#94A3B8"
          strokeWidth="1.5"
        />
      ))}

      {Array(inFeatures).fill(0).map((_, i) => (
        <g key={`in-${i}`}>
          <circle cx="40" cy={inputY(i)} r="12" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="2" />
          <text x="40" y={inputY(i) + 4} textAnchor="middle" fontSize="10" fill="#0F172A">X{i + 1}</text>
        </g>
      ))}

      {Array(outFeatures).fill(0).map((_, i) => (
        <g key={`mid-${i}`}>
          <circle cx="120" cy={midY(i)} r="12" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
          <text x="120" y={midY(i) + 4} textAnchor="middle" fontSize="10" fill="#0F172A">Z{i + 1}</text>
        </g>
      ))}

      {Array(outFeatures).fill(0).map((_, i) => (
        <g key={`out-${i}`}>
          <circle cx="200" cy={outY(i)} r="12" fill="#FED7AA" stroke="#F59E0B" strokeWidth="2" />
          <text x="200" y={outY(i) + 4} textAnchor="middle" fontSize="10" fill="#7C2D12">Y{i + 1}</text>
        </g>
      ))}

      <text x="120" y="16" textAnchor="middle" fill="#64748B" fontSize="9">Linear</text>
      <text x="200" y="16" textAnchor="middle" fill="#64748B" fontSize="9">ReLU</text>
    </svg>
  );
};

function LinearLayerSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showTutorial, setShowTutorial] = useState(false);

  const exercise = exercises[currentExercise];
  const inFeatures = exercise.x.length;
  const outFeatures = exercise.W.length;
  const hasBias = exercise.b !== null;

  const emptyOutput = useMemo(() => Array(outFeatures).fill(null), [outFeatures]);

  const checkAnswer = () => {
    const correct = exercise.answer.every((val, i) => isClose(userAnswers[i], val));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const isCorrect = useMemo(() => {
    if (!submitted) return null;
    return exercise.answer.every((val, i) => isClose(userAnswers[i], val));
  }, [submitted, userAnswers, exercise]);

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const getOutputDisplay = () => {
    if (submitted) return exercise.answer;
    return emptyOutput.map((_, i) => userAnswers[i] ?? null);
  };

  const cellSize = inFeatures > 2 || outFeatures > 2 ? "small" : "normal";

  if (showTutorial) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow p-6">
        <SectionHeader title="Linear Layer Tutorial" />
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="font-bold text-emerald-700">Formula</h3>
            <p className="text-sm mt-1">y = Wx + b</p>
          </div>
          <button
            onClick={() => setShowTutorial(false)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Start Practicing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow p-6">
      <SectionHeader
        title="Linear Layer (Fully Connected)"
        subtitle="Exercises loaded from the workbook"
      />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-emerald-600">{score.correct}/{score.total}</span>
        </div>
        <button onClick={() => setShowTutorial(true)} className="text-sm text-emerald-600 hover:text-emerald-800">
          Tutorial
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-emerald-400 px-2 py-0.5 rounded text-xs">{inFeatures}→{outFeatures}</span>
            {!hasBias && <span className="bg-amber-400 px-2 py-0.5 rounded text-xs">No Bias</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="px-4 py-2 bg-emerald-50 text-emerald-800 text-sm">
          Calculate the output vector y = Wx{hasBias ? " + b" : ""}
        </div>

        <div className="p-4 flex flex-col items-center gap-2">
          <NeuralNetworkDiagram inFeatures={inFeatures} outFeatures={outFeatures} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <LinearMatrix data={exercise.W} label="W (weights)" cellSize={cellSize} />
            <span className="text-xl font-bold text-slate-400">×</span>
            <LinearVector data={exercise.x} label="x (input)" vertical={true} cellSize={cellSize} />
            {hasBias && (
              <>
                <span className="text-xl font-bold text-slate-400">+</span>
                <LinearVector data={exercise.b} label="b (bias)" vertical={true} cellSize={cellSize} />
              </>
            )}
            <span className="text-xl font-bold text-slate-400">=</span>
            <LinearVector
              data={getOutputDisplay()}
              label="y (output)"
              vertical={true}
              editable={!submitted}
              onChange={(idx, val) => setUserAnswers((prev) => ({ ...prev, [idx]: val }))}
              cellSize={cellSize}
            />
          </div>
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : `✗ Incorrect. Answer: [${exercise.answer.map(formatNumber).join(", ")}]`}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={checkAnswer}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <LinearExplanation exercise={exercise} />
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswers({});
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Activation ----------------

const activationLabels = {
  relu: "ReLU",
  sigmoid3: "Sigmoid σ{3}",
  tanh3: "Tanh{3}",
  sigmoid5: "Sigmoid σ{5}",
  tanh5: "Tanh{5}",
};

const activationFormulaLines = {
  relu: ["f(x) = max(0, x)"],
  sigmoid3: [
    "real: σ(x) = 1 / (1 + e^{-x})",
    "monotonic increasing",
    "σ{3} quantized:",
    "x ≥ 2 → 1",
    "x ≤ -2 → 0",
    "else → 0.5",
  ],
  tanh3: [
    "real: tanh(x) = (e^{x} - e^{-x}) / (e^{x} + e^{-x})",
    "monotonic increasing",
    "tanh{3}:",
    "x ≥ 2 → 1",
    "x ≤ -2 → -1",
    "else → 0",
  ],
  sigmoid5: [
    "real: σ(x) = 1 / (1 + e^{-x})",
    "monotonic increasing",
    "σ{5} quantized:",
    "x ≥ 2 → 1",
    "x = 1 → 0.7",
    "x = 0 → 0.5",
    "x = -1 → 0.3",
    "else → 0",
  ],
  tanh5: [
    "real: tanh(x) = (e^{x} - e^{-x}) / (e^{x} + e^{-x})",
    "monotonic increasing",
    "tanh{5}:",
    "x ≥ 2 → 1",
    "x = 1 → 0.8",
    "x = 0 → 0",
    "x = -1 → -0.8",
    "else → -1",
  ],
};

const ActivationLabel = ({ type, align = "left", showFormula = false }) => {
  const lines = activationFormulaLines[type] || [];
  const nameClass = showFormula ? "text-base font-semibold text-amber-800" : "text-sm font-semibold text-slate-500";
  const formulaClass = showFormula ? "text-sm leading-snug text-amber-800" : "text-[10px] leading-snug text-slate-500";
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end" : "items-start"}`}>
      <span className={nameClass}>{activationLabels[type] || type}</span>
      {showFormula && lines.length > 0 && (
        <div className={formulaClass}>
          {lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActivationFormulaPanel = ({ types }) => {
  const list = Array.isArray(types) ? types : [types];
  return (
    <div className="flex flex-col gap-3 w-full">
      {list.map((type) => (
        <div key={type} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <ActivationLabel type={type} showFormula={true} align="left" />
        </div>
      ))}
    </div>
  );
};


const applyActivationValue = (type, x) => {
  switch (type) {
    case "relu":
      return Math.max(0, x);
    case "sigmoid3":
      if (x >= 2) return 1;
      if (x <= -2) return 0;
      return 0.5;
    case "tanh3":
      if (x >= 2) return 1;
      if (x <= -2) return -1;
      return 0;
    case "sigmoid5":
      if (x >= 2) return 1;
      if (x === 1) return 0.7;
      if (x === 0) return 0.5;
      if (x === -1) return 0.3;
      return 0;
    case "tanh5":
      if (x >= 2) return 1;
      if (x === 1) return 0.8;
      if (x === 0) return 0;
      if (x === -1) return -0.8;
      return -1;
    default:
      return x;
  }
};

const applyActivationVector = (type, vec) => vec.map((v) => applyActivationValue(type, v));

const computeLinear = (W, x, b) =>
  W.map((row, i) => row.reduce((sum, w, j) => sum + w * x[j], 0) + (b ? b[i] : 0));

const ActivationVector = ({ data, label, editableIndex, userAnswer, onChange, submitted, isCorrect, cellSize }) => {
  const isWrong = submitted && !isCorrect;
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-semibold text-slate-500 mb-1">{label}</span>
      <div className="border-l-2 border-r-2 border-slate-500 px-1 rounded">
        {data.map((val, i) => {
          const display = val === null ? (i === editableIndex ? userAnswer : null) : val;
          return (
            <MatCell
              key={i}
              value={display}
              editable={!submitted && i === editableIndex}
              onChange={(v) => onChange(v)}
              highlight={i === editableIndex}
              isCorrect={submitted && isCorrect && i === editableIndex}
              isWrong={submitted && isWrong && i === editableIndex}
              size={cellSize}
            />
          );
        })}
      </div>
    </div>
  );
};

function ActivationSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const missingIndex = exercise.output.findIndex((v) => v === null);
  const isCorrect = submitted && isClose(userAnswer, exercise.answer);

  const { inputVector, zVector, outputFull } = useMemo(() => {
    if (exercise.mode === "linear") {
      const z = computeLinear(exercise.W, exercise.x, exercise.b);
      return {
        inputVector: exercise.x,
        zVector: z,
        outputFull: applyActivationVector(exercise.activation, z),
      };
    }
    if (exercise.mode === "chain") {
      const first = applyActivationVector(exercise.chain[0], exercise.input);
      const out = applyActivationVector(exercise.chain[1], first);
      return { inputVector: exercise.input, zVector: first, outputFull: out };
    }
    const out = applyActivationVector(exercise.activation, exercise.input);
    return { inputVector: exercise.input, zVector: exercise.input, outputFull: out };
  }, [exercise]);

  const handleSubmit = () => {
    if (userAnswer === null || userAnswer === undefined) return;
    setSubmitted(true);
    setScore((prev) => ({
      correct: prev.correct + (isClose(userAnswer, exercise.answer) ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswer(null);
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswer(null);
    setSubmitted(false);
    setShowExplanation(false);
  };

  const outputDisplay = exercise.output.map((v, i) => (v === null ? userAnswer : v));
  const cellSize = cellSizeFor(outputDisplay.length, 1);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow p-6">
      <SectionHeader title="Activation Functions" subtitle="ReLU, Sigmoid, and Tanh exercises" />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-amber-600">{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-amber-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-amber-400 px-2 py-0.5 rounded text-xs">
              {exercise.mode === "chain" ? "Chain" : activationLabels[exercise.activation]}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start">
            <div className="md:w-64 w-full">
              <ActivationFormulaPanel types={exercise.mode === "chain" ? exercise.chain : exercise.activation} />
            </div>
            <div className="flex-1 flex flex-col gap-2 items-center">
              {exercise.mode === "linear" && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Matrix data={exercise.W} label="W" cellSize={cellSizeFor(exercise.W.length, exercise.W[0].length)} />
                  <span className="text-xl font-bold text-slate-400">×</span>
                  <Matrix data={toColumn(exercise.x)} label="x" cellSize={cellSizeFor(exercise.x.length, 1)} />
                  <span className="text-xl font-bold text-slate-400">+</span>
                  <Matrix data={toColumn(exercise.b)} label="b" cellSize={cellSizeFor(exercise.b.length, 1)} />
                  <span className="text-xl font-bold text-slate-400">=</span>
                  <Matrix data={toColumn(zVector)} label="z" cellSize={cellSizeFor(zVector.length, 1)} />
                  <span className="text-sm font-semibold text-slate-500">{activationLabels[exercise.activation]}</span>
                  <ActivationVector
                    data={outputDisplay}
                    label="output"
                    editableIndex={missingIndex}
                    userAnswer={userAnswer}
                    onChange={setUserAnswer}
                    submitted={submitted}
                    isCorrect={isCorrect}
                    cellSize={cellSize}
                  />
                </div>
              )}

              {exercise.mode === "vector" && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Matrix data={toColumn(zVector)} label="z" cellSize={cellSizeFor(zVector.length, 1)} />
                  <span className="text-sm font-semibold text-slate-500">{activationLabels[exercise.activation]}</span>
                  <ActivationVector
                    data={outputDisplay}
                    label="output"
                    editableIndex={missingIndex}
                    userAnswer={userAnswer}
                    onChange={setUserAnswer}
                    submitted={submitted}
                    isCorrect={isCorrect}
                    cellSize={cellSize}
                  />
                </div>
              )}

              {exercise.mode === "chain" && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Matrix data={toColumn(inputVector)} label="input" cellSize={cellSizeFor(inputVector.length, 1)} />
                  <span className="text-sm font-semibold text-slate-500">{activationLabels[exercise.chain[0]]}</span>
                  <Matrix data={toColumn(zVector)} label="intermediate" cellSize={cellSizeFor(zVector.length, 1)} />
                  <span className="text-sm font-semibold text-slate-500">{activationLabels[exercise.chain[1]]}</span>
                  <ActivationVector
                    data={outputDisplay}
                    label="output"
                    editableIndex={missingIndex}
                    userAnswer={userAnswer}
                    onChange={setUserAnswer}
                    submitted={submitted}
                    isCorrect={isCorrect}
                    cellSize={cellSize}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : `✗ Incorrect. Answer: ${formatNumber(exercise.answer)}`}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-amber-700 hover:text-amber-900 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={userAnswer === null}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm disabled:bg-slate-300"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <div className="mt-2 p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm">
              <h4 className="font-bold text-amber-800 mb-2">Solution</h4>
              <p>Full output: [{outputFull.map(formatNumber).join(", ")}]</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswer(null);
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Artificial Neuron ----------------

const activationOptions = [
  { value: "relu", label: "ReLU" },
  { value: "sigmoid3", label: "Sigmoid σ{3}" },
];

const isAnswerCorrect = (expected, actual) => {
  if (expected === null || expected === undefined) return false;
  if (typeof expected === "string") return expected === actual;
  return isClose(expected, actual);
};

function ArtificialNeuronSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const inFeatures = exercise.x.length;
  const outFeatures = exercise.W.length;
  const answerKeys = Object.keys(exercise.answers);

  const handleChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const handleSubmit = () => {
    const correct = answerKeys.every((key) => isAnswerCorrect(exercise.answers[key], userAnswers[key]));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const isCorrect = useMemo(() => {
    if (!submitted) return null;
    return answerKeys.every((key) => isAnswerCorrect(exercise.answers[key], userAnswers[key]));
  }, [submitted, userAnswers, answerKeys, exercise]);

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const xCol = toColumn(exercise.x);
  const bCol = toColumn(exercise.b);
  const zCol = toColumn(exercise.z);
  const yCol = toColumn(exercise.y);

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl shadow p-6">
      <SectionHeader title="Artificial Neuron" subtitle="Solve missing weights, inputs, and outputs" />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-sky-600">{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-sky-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-sky-400 px-2 py-0.5 rounded text-xs">
              {exercise.activation ? activationLabels[exercise.activation] : "Choose Activation"}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-sky-500 hover:bg-sky-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-sky-500 hover:bg-sky-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-2 items-center">
          <ArtificialNeuronDiagram
            inFeatures={inFeatures}
            outFeatures={outFeatures}
            activation={exercise.activation}
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <EditableMatrix
              data={exercise.W}
              label="W"
              prefix="W"
              answers={userAnswers}
              onChange={handleChange}
              cellSize={cellSizeFor(exercise.W.length, exercise.W[0].length)}
            />
            <span className="text-xl font-bold text-slate-400">×</span>
            <EditableMatrix
              data={xCol}
              label="x"
              prefix="x"
              answers={userAnswers}
              onChange={handleChange}
              cellSize={cellSizeFor(xCol.length, 1)}
            />
            <span className="text-xl font-bold text-slate-400">+</span>
            <EditableMatrix
              data={bCol}
              label="b"
              prefix="b"
              answers={userAnswers}
              onChange={handleChange}
              cellSize={cellSizeFor(bCol.length, 1)}
            />
            <span className="text-xl font-bold text-slate-400">=</span>
            <EditableMatrix
              data={zCol}
              label="z"
              prefix="z"
              answers={userAnswers}
              onChange={handleChange}
              cellSize={cellSizeFor(zCol.length, 1)}
            />
            <span className="text-sm font-semibold text-slate-500">Activation</span>
            {exercise.activation ? (
              <span className="text-sm font-semibold text-slate-600">{activationLabels[exercise.activation]}</span>
            ) : (
              <select
                value={userAnswers.activation ?? ""}
                onChange={(e) => setUserAnswers((prev) => ({ ...prev, activation: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select</option>
                {activationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <EditableMatrix
              data={yCol}
              label="y"
              prefix="y"
              answers={userAnswers}
              onChange={handleChange}
              cellSize={cellSizeFor(yCol.length, 1)}
            />
          </div>
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-sky-700 hover:text-sky-900 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <div className="mt-2 p-4 bg-sky-50 rounded-lg border border-sky-200 text-sm">
              <h4 className="font-bold text-sky-800 mb-2">Correct Values</h4>
              {Object.entries(exercise.answers).map(([key, value]) => (
                <p key={key}>{key}: {typeof value === "number" ? formatNumber(value) : value}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswers({});
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Hidden Layer ----------------

function HiddenLayerSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const answerKeys = Object.keys(exercise.answers || {});
  const inFeatures = exercise.x.length;
  const hiddenFeatures = exercise.W1.length;
  const outFeatures = exercise.W2.length;

  const handleChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const handleSubmit = () => {
    const correct = answerKeys.every((key) => isAnswerCorrect(exercise.answers[key], userAnswers[key]));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const isCorrect = useMemo(() => {
    if (!submitted) return null;
    return answerKeys.every((key) => isAnswerCorrect(exercise.answers[key], userAnswers[key]));
  }, [submitted, userAnswers, answerKeys, exercise]);

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const xCol = toColumn(exercise.x);
  const b1Col = toColumn(exercise.b1);
  const z1Col = toColumn(exercise.z1);
  const hCol = toColumn(exercise.h);
  const b2Col = toColumn(exercise.b2);
  const z2Col = toColumn(exercise.z2);
  const yCol = toColumn(exercise.y);
  const hDisplay = fillData(hCol, "h", userAnswers);

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow p-6">
      <SectionHeader title="Hidden Layer" subtitle="Two-layer forward pass with ReLU" />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-emerald-600">{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-emerald-400 px-2 py-0.5 rounded text-xs">
              {inFeatures}→{hiddenFeatures}→{outFeatures}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="px-4 py-2 bg-emerald-50 text-emerald-800 text-sm">
          Solve the missing values for the hidden layer H and final output y.
        </div>

        <div className="p-4 flex flex-col gap-2 items-center">
          <HiddenLayerDiagram
            inFeatures={inFeatures}
            hiddenFeatures={hiddenFeatures}
            outFeatures={outFeatures}
          />
          <div className="flex flex-col gap-3 items-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <EditableMatrix
                data={exercise.W1}
                label="W1"
                prefix="W1"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(exercise.W1.length, exercise.W1[0].length)}
              />
              <span className="text-xl font-bold text-slate-400">×</span>
              <EditableMatrix
                data={xCol}
                label="x"
                prefix="x"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(xCol.length, 1)}
              />
              <span className="text-xl font-bold text-slate-400">+</span>
              <EditableMatrix
                data={b1Col}
                label="b1"
                prefix="b1"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(b1Col.length, 1)}
              />
              <span className="text-xl font-bold text-slate-400">=</span>
              <EditableMatrix
                data={z1Col}
                label="z"
                prefix="z1"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(z1Col.length, 1)}
              />
              <span className="text-sm font-semibold text-slate-500">ReLU</span>
              <EditableMatrix
                data={hCol}
                label="H"
                prefix="h"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(hCol.length, 1)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <EditableMatrix
                data={exercise.W2}
                label="W2"
                prefix="W2"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(exercise.W2.length, exercise.W2[0].length)}
              />
              <span className="text-xl font-bold text-slate-400">×</span>
              <StaticMatrix
                data={hDisplay}
                label="H"
                cellSize={cellSizeFor(hDisplay.length, 1)}
              />
              <span className="text-xl font-bold text-slate-400">+</span>
              <EditableMatrix
                data={b2Col}
                label="b2"
                prefix="b2"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(b2Col.length, 1)}
              />
              <span className="text-xl font-bold text-slate-400">=</span>
              <EditableMatrix
                data={z2Col}
                label="z"
                prefix="z2"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(z2Col.length, 1)}
              />
              <span className="text-sm font-semibold text-slate-500">ReLU</span>
              <EditableMatrix
                data={yCol}
                label="y"
                prefix="y"
                answers={userAnswers}
                onChange={handleChange}
                cellSize={cellSizeFor(yCol.length, 1)}
              />
            </div>
          </div>
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <div className="mt-2 p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-sm">
              <h4 className="font-bold text-emerald-800 mb-2">Correct Values</h4>
              {Object.entries(exercise.answers || {}).map(([key, value]) => (
                <p key={key}>{key}: {typeof value === "number" ? formatNumber(value) : value}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswers({});
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Deep Network ----------------

function DeepNetworkSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const expectedMap = useMemo(() => exercise.answers || {}, [exercise]);

  const answerKeys = Object.keys(expectedMap);
  const isComplete = answerKeys.every((key) => {
    const value = userAnswers[key];
    return value !== null && value !== undefined && value !== "";
  });
  const isCorrect = submitted && answerKeys.every((key) => matchesAnswer(userAnswers[key], expectedMap[key]));

  const layerSizes = exercise.layers.map((layer) => layer.outputs.length);
  const layerLabels = exercise.layers.map((layer) => layer.name);
  const formatAnswerLabel = (key) => {
    const [prefix, i] = key.split("-");
    if (!prefix?.startsWith("L")) return key;
    const layerIdx = Number(prefix.slice(1));
    const neuronIdx = Number(i);
    const layerName = exercise.layers[layerIdx]?.name ?? prefix;
    return `${layerName}${neuronIdx + 1}`;
  };

  const handleChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const handleSubmit = () => {
    if (!isComplete) return;
    const correct = answerKeys.every((key) => matchesAnswer(userAnswers[key], expectedMap[key]));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const resetExercise = (idx) => {
    setCurrentExercise(idx);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => resetExercise((currentExercise - 1 + exercises.length) % exercises.length);
  const handleNext = () => resetExercise((currentExercise + 1) % exercises.length);

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl shadow p-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader title="Deep Network" subtitle="Stacked linear + ReLU layers" />

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 lg:max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-slate-600">
                Score: <span className="font-bold text-violet-600">{score.correct}/{score.total}</span>
              </div>
              <div className="text-xs text-slate-500">
                Input x = [{exercise.input.map(formatNumber).join(", ")}]
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-violet-600 text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Exercise {exercise.id}</span>
                  <span className="bg-violet-400 px-2 py-0.5 rounded text-xs">{exercise.layers.length} layers</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrev} className="px-3 py-1 bg-violet-500 hover:bg-violet-400 rounded text-sm">← Prev</button>
                  <button onClick={handleNext} className="px-3 py-1 bg-violet-500 hover:bg-violet-400 rounded text-sm">Next →</button>
                </div>
              </div>

              <div className="px-4 py-2 bg-violet-50 text-violet-800 text-sm">
                Compute each layer's ReLU output. Use the previous layer's output as the next layer's input.
              </div>

              <div className="p-4 flex flex-col gap-4">
                {exercise.layers.map((layer, layerIdx) => {
                  const inputs = layer.inputs ?? (layerIdx === 0 ? exercise.input : []);
                  const outputData = toColumn(layer.outputs);
                  const inputLabel = layerIdx === 0 ? "x" : exercise.layers[layerIdx - 1].name;

                  return (
                    <div key={`${exercise.id}-${layerIdx}`} className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-semibold text-slate-700">Layer {layer.name}</div>
                        <div className="text-xs text-slate-500">{layer.outputs.length} neuron{layer.outputs.length === 1 ? "" : "s"}</div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <StaticMatrix
                          data={layer.weights}
                          label="W"
                          cellSize={cellSizeFor(layer.weights.length, layer.weights[0].length)}
                        />
                        <span className="text-xl font-bold text-slate-400">×</span>
                        <StaticMatrix
                          data={toColumn(inputs)}
                          label={inputLabel}
                          cellSize={cellSizeFor(inputs.length, 1)}
                        />
                        <span className="text-xl font-bold text-slate-400">+</span>
                        <StaticMatrix
                          data={toColumn(layer.biases)}
                          label="b"
                          cellSize={cellSizeFor(layer.biases.length, 1)}
                        />
                        <span className="text-sm font-semibold text-slate-500">ReLU</span>
                        <EditableMatrix
                          data={outputData}
                          label={layer.name}
                          prefix={`L${layerIdx}`}
                          answers={userAnswers}
                          onChange={handleChange}
                          cellSize={cellSizeFor(layer.outputs.length, 1)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {submitted && (
                <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </div>
              )}

              <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="text-violet-700 hover:text-violet-900 text-sm font-medium"
                >
                  {showExplanation ? "Hide" : "Show"} Solution
                </button>
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!isComplete}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Next Exercise
                  </button>
                )}
              </div>

              {showExplanation && (
                <div className="px-4 pb-4">
                  <div className="mt-2 p-4 bg-violet-50 rounded-lg border border-violet-200 text-sm">
                    <h4 className="font-bold text-violet-800 mb-2">Expected Values</h4>
                    {Object.entries(expectedMap).map(([key, value]) => (
                      <p key={key}>
                        {formatAnswerLabel(key)} = {formatNumber(value)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Network</div>
              <DeepNetworkDiagram
                inputCount={exercise.input.length}
                layerSizes={layerSizes}
                layerLabels={layerLabels}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-xl shadow p-3">
          <div className="flex flex-wrap gap-1 justify-center">
            {exercises.map((ex, idx) => (
              <button
                key={ex.id}
                onClick={() => resetExercise(idx)}
                className={`w-8 h-8 rounded text-sm font-bold transition ${
                  idx === currentExercise
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {ex.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Wide Network ----------------

function WideNetworkSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const expectedMap = useMemo(() => {
    const map = {};
    exercise.layers.forEach((layer, layerIdx) => {
      layer.outputs.forEach((value, neuronIdx) => {
        map[keyFor(`L${layerIdx}`, neuronIdx, 0)] = value;
      });
    });
    return map;
  }, [exercise]);

  const answerKeys = Object.keys(expectedMap);
  const isComplete = answerKeys.every((key) => {
    const value = userAnswers[key];
    return value !== null && value !== undefined && value !== "";
  });
  const isCorrect = submitted && answerKeys.every((key) => matchesAnswer(userAnswers[key], expectedMap[key]));

  const layerUserOutputs = exercise.layers.map((layer, layerIdx) =>
    layer.outputs.map((_, neuronIdx) => {
      const key = keyFor(`L${layerIdx}`, neuronIdx, 0);
      return userAnswers[key] ?? null;
    })
  );
  const layerSizes = exercise.layers.map((layer) => layer.outputs.length);
  const layerLabels = exercise.layers.map((layer) => layer.name);

  const outputLabelFor = (name) => {
    if (name === "Y") return "y";
    if (name === "H") return "h";
    return `y${name}`;
  };
  const inputLabelFor = (name) => {
    if (name === "Y") return "y";
    if (name === "H") return "h";
    return `y${name}`;
  };

  const handleChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const handleSubmit = () => {
    if (!isComplete) return;
    const correct = answerKeys.every((key) => matchesAnswer(userAnswers[key], expectedMap[key]));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const resetExercise = (idx) => {
    setCurrentExercise(idx);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => resetExercise((currentExercise - 1 + exercises.length) % exercises.length);
  const handleNext = () => resetExercise((currentExercise + 1) % exercises.length);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow p-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader title="Wide Network" subtitle="Parallel neurons and stacked layers" />

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 lg:max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-slate-600">
                Score: <span className="font-bold text-amber-600">{score.correct}/{score.total}</span>
              </div>
              <div className="text-xs text-slate-500">
                Input x = [{exercise.input.map(formatNumber).join(", ")}]
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-amber-600 text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Exercise {exercise.id}</span>
                  <span className="bg-amber-400 px-2 py-0.5 rounded text-xs">{exercise.layers.length} layers</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrev} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 rounded text-sm">← Prev</button>
                  <button onClick={handleNext} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 rounded text-sm">Next →</button>
                </div>
              </div>

              <div className="px-4 py-2 bg-amber-50 text-amber-800 text-sm">
                Compute each layer's output. Use the previous layer's result as the next layer's input.
              </div>

              <div className="p-4 flex flex-col gap-4">
                {exercise.layers.map((layer, layerIdx) => {
                  const inputSize = layer.weights[0].length;
                  const rawInputs = layerIdx === 0 ? exercise.input : layerUserOutputs[layerIdx - 1];
                  const inputs = Array.from({ length: inputSize }, (_, i) =>
                    rawInputs && rawInputs[i] !== undefined ? rawInputs[i] : null
                  );
                  const outputData = Array.from({ length: layer.outputs.length }, () => [null]);
                  const inputLabel = layerIdx === 0 ? "x" : inputLabelFor(exercise.layers[layerIdx - 1].name);
                  const outputLabel = outputLabelFor(layer.name);
                  const activationLabel = layer.activation === "relu" ? "ReLU" : null;

                  return (
                    <div key={`${exercise.id}-${layerIdx}`} className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-semibold text-slate-700">Layer {layer.name}</div>
                        <div className="text-xs text-slate-500">{layer.outputs.length} neuron{layer.outputs.length === 1 ? "" : "s"}</div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <StaticMatrix
                          data={layer.weights}
                          label="W"
                          cellSize={cellSizeFor(layer.weights.length, layer.weights[0].length)}
                        />
                        <span className="text-xl font-bold text-slate-400">×</span>
                        <StaticMatrix
                          data={toColumn(inputs)}
                          label={inputLabel}
                          cellSize={cellSizeFor(inputSize, 1)}
                        />
                        <span className="text-xl font-bold text-slate-400">+</span>
                        <StaticMatrix
                          data={toColumn(layer.biases)}
                          label="b"
                          cellSize={cellSizeFor(layer.biases.length, 1)}
                        />
                        <span className="text-xl font-bold text-slate-400">=</span>
                        <div className="flex flex-col items-center gap-1">
                          {activationLabel && (
                            <span className="text-xs font-semibold text-slate-500">{activationLabel}</span>
                          )}
                          <EditableMatrix
                            data={outputData}
                            label={outputLabel}
                            prefix={`L${layerIdx}`}
                            answers={userAnswers}
                            onChange={handleChange}
                            cellSize={cellSizeFor(layer.outputs.length, 1)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {submitted && (
                <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </div>
              )}

              <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="text-amber-700 hover:text-amber-900 text-sm font-medium"
                >
                  {showExplanation ? "Hide" : "Show"} Solution
                </button>
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!isComplete}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Next Exercise
                  </button>
                )}
              </div>

              {showExplanation && (
                <div className="px-4 pb-4">
                  <div className="mt-2 p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm">
                    <h4 className="font-bold text-amber-800 mb-2">Expected Outputs</h4>
                    {exercise.layers.map((layer) => (
                      <p key={layer.name}>
                        Layer {layer.name}: [{layer.outputs.map(formatNumber).join(", ")}]
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Network</div>
              <DeepNetworkDiagram
                inputCount={exercise.input.length}
                layerSizes={layerSizes}
                layerLabels={layerLabels}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-xl shadow p-3">
          <div className="flex flex-wrap gap-1 justify-center">
            {exercises.map((ex, idx) => (
              <button
                key={ex.id}
                onClick={() => resetExercise(idx)}
                className={`w-8 h-8 rounded text-sm font-bold transition ${
                  idx === currentExercise
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {ex.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Softmax ----------------

function SoftmaxSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const expected = exercise.softmax;
  const softmaxKeys = expected.map((_, idx) => keyFor("S", idx, 0));
  const isComplete = softmaxKeys.every((key) => {
    const value = userAnswers[key];
    return value !== null && value !== undefined && value !== "";
  });
  const isCorrect =
    submitted &&
    expected.every((ans, idx) => matchesAnswer(userAnswers[softmaxKeys[idx]], ans));

  const handleChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const resetExercise = (idx) => {
    setCurrentExercise(idx);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => resetExercise((currentExercise - 1 + exercises.length) % exercises.length);
  const handleNext = () => resetExercise((currentExercise + 1) % exercises.length);

  const handleSubmit = () => {
    if (!isComplete) return;
    const correct = expected.every((ans, idx) => matchesAnswer(userAnswers[softmaxKeys[idx]], ans));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const sumExp = exercise.sumExp ?? exercise.exp.reduce((acc, val) => acc + val, 0);
  const outputData = Array.from({ length: expected.length }, () => [null]);

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl shadow p-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader title="Softmax" subtitle="Use e≈3 and the worksheet shortcuts" />

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 lg:max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-slate-600">
                Score: <span className="font-bold text-sky-600">{score.correct}/{score.total}</span>
              </div>
              <div className="text-xs text-slate-500">
                Input x = [{exercise.input.map(formatNumber).join(", ")}]
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-sky-600 text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Exercise {exercise.id}</span>
                  <span className="bg-sky-400 px-2 py-0.5 rounded text-xs">{expected.length} outputs</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrev} className="px-3 py-1 bg-sky-500 hover:bg-sky-400 rounded text-sm">← Prev</button>
                  <button onClick={handleNext} className="px-3 py-1 bg-sky-500 hover:bg-sky-400 rounded text-sm">Next →</button>
                </div>
              </div>

              <div className="px-4 py-2 bg-sky-50 text-sky-800 text-sm">
                Compute softmax outputs from the linear scores (use e≈3).
              </div>

              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <StaticMatrix
                    data={exercise.weights}
                    label="W"
                    cellSize={cellSizeFor(exercise.weights.length, exercise.weights[0].length)}
                  />
                  <span className="text-xl font-bold text-slate-400">×</span>
                  <StaticMatrix
                    data={toColumn(exercise.input)}
                    label="x"
                    cellSize={cellSizeFor(exercise.input.length, 1)}
                  />
                  <span className="text-xl font-bold text-slate-400">+</span>
                  <StaticMatrix
                    data={toColumn(exercise.biases)}
                    label="b"
                    cellSize={cellSizeFor(exercise.biases.length, 1)}
                  />
                  <span className="text-xl font-bold text-slate-400">=</span>
                  <StaticMatrix
                    data={toColumn(exercise.linear)}
                    label="Linear"
                    cellSize={cellSizeFor(exercise.linear.length, 1)}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <StaticMatrix
                      data={toColumn(exercise.exp)}
                      label="e^Linear"
                      cellSize={cellSizeFor(exercise.exp.length, 1)}
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-slate-500">Sum</span>
                      <div className="w-24 h-10 flex items-center justify-center text-sm font-bold border-2 rounded bg-white border-slate-300">
                        {formatNumber(sumExp)}
                      </div>
                    </div>
                  </div>
                  <EditableMatrix
                    data={outputData}
                    label="Softmax"
                    prefix="S"
                    answers={userAnswers}
                    onChange={handleChange}
                    cellSize={cellSizeFor(expected.length, 1)}
                  />
                </div>
              </div>

              {submitted && (
                <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </div>
              )}

              <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="text-sky-700 hover:text-sky-900 text-sm font-medium"
                >
                  {showExplanation ? "Hide" : "Show"} Solution
                </button>
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!isComplete}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Next Exercise
                  </button>
                )}
              </div>

              {showExplanation && (
                <div className="px-4 pb-4">
                  <div className="mt-2 p-4 bg-sky-50 rounded-lg border border-sky-200 text-sm">
                    <h4 className="font-bold text-sky-800 mb-2">Expected Softmax</h4>
                    <p>[{expected.map(formatNumber).join(", ")}]</p>
                    <p className="mt-2">Sum e^Linear: <span className="font-semibold">{formatNumber(sumExp)}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Network</div>
              <NeuralNetworkDiagram inFeatures={exercise.input.length} outFeatures={expected.length} />
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-xl shadow p-3">
          <div className="flex flex-wrap gap-1 justify-center">
            {exercises.map((ex, idx) => (
              <button
                key={ex.id}
                onClick={() => resetExercise(idx)}
                className={`w-8 h-8 rounded text-sm font-bold transition ${
                  idx === currentExercise
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {ex.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Gradient ----------------

const GRADIENT_TONES = {
  neutral: "bg-white border-slate-300",
  blue: "bg-sky-100 border-sky-300",
  peach: "bg-orange-100 border-orange-300",
  lime: "bg-lime-100 border-lime-300",
};

const GradientValueBox = ({ value, editable, onChange, tone = "neutral", submitted, isCorrect }) => {
  const base = "w-16 h-12 flex items-center justify-center border-2 rounded font-bold text-sm";
  let styles = GRADIENT_TONES[tone] || GRADIENT_TONES.neutral;
  if (editable && submitted) {
    styles = isCorrect ? "bg-green-200 border-green-500" : "bg-red-200 border-red-500";
  }

  if (editable) {
    return (
      <input
        type="number"
        value={value === null || value === undefined ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${base} ${styles} text-center outline-none focus:ring-2 focus:ring-lime-300`}
        placeholder="?"
      />
    );
  }

  return <div className={`${base} ${styles}`}>{formatNumber(value)}</div>;
};

const GradientField = ({ label, value, editable, onChange, tone, submitted, isCorrect }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <GradientValueBox
      value={value}
      editable={editable}
      onChange={onChange}
      tone={tone}
      submitted={submitted}
      isCorrect={isCorrect}
    />
  </div>
);

const computeGradientValues = (exercise) => {
  const param = exercise.param || (exercise.mode === "linear_dx" ? "x" : "w");
  const x1 = exercise.x;
  const w1 = exercise.w;
  const x2 = exercise.x2 !== undefined ? exercise.x2 : x1;
  const w2 = exercise.w2 !== undefined ? exercise.w2 : w1;
  const delta = param === "x" ? x2 - x1 : w2 - w1;
  const z1 = w1 * x1;
  const z2 = w2 * x2;
  const a1 = Math.max(0, z1);
  const a2 = Math.max(0, z2);
  const dz = z2 - z1;
  const dA = a2 - a1;
  const grad = delta === 0 ? 0 : dz / delta;
  const dAdZ = dz === 0 ? 0 : dA / dz;
  const dAdParam = delta === 0 ? 0 : dA / delta;

  return { param, x1, w1, x2, w2, delta, z1, z2, a1, a2, dz, dA, grad, dAdZ, dAdParam };
};

function GradientSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const computed = useMemo(() => computeGradientValues(exercise), [exercise]);
  const paramLabel = computed.param === "x" ? "X" : "W";
  const deltaLabel = computed.param === "x" ? "dX" : "dW";
  const modeLabel = exercise.mode.startsWith("linear")
    ? `Compute dZ/d${paramLabel}`
    : `ReLU gradients (dA/d${paramLabel})`;

  const expectedMap = useMemo(() => {
    if (exercise.mode.startsWith("linear")) {
      return { dz: computed.dz, grad: computed.grad };
    }
    const base = { dA: computed.dA, dAdZ: computed.dAdZ };
    if (exercise.needsParamGrad) {
      return { ...base, dAdParam: computed.dAdParam };
    }
    return base;
  }, [exercise, computed]);

  const answerKeys = useMemo(() => Object.keys(expectedMap), [expectedMap]);
  const isComplete = answerKeys.every((key) => userAnswers[key] !== null && userAnswers[key] !== undefined && userAnswers[key] !== "");
  const isCorrect = submitted && answerKeys.every((key) => matchesAnswer(userAnswers[key], expectedMap[key]));

  const handleChange = (key, value) => {
    setUserAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const resetExercise = (idx) => {
    setCurrentExercise(idx);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => resetExercise((currentExercise - 1 + exercises.length) % exercises.length);
  const handleNext = () => resetExercise((currentExercise + 1) % exercises.length);

  const handleSubmit = () => {
    if (!isComplete) return;
    const correct = answerKeys.every((key) => matchesAnswer(userAnswers[key], expectedMap[key]));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const changedX = computed.x2 !== computed.x1;
  const changedW = computed.w2 !== computed.w1;
  const showReLU = !exercise.mode.startsWith("linear");

  const renderPass = (title, xVal, wVal, zVal, aVal, isPrime) => (
    <div className="p-3 bg-slate-50 rounded-xl">
      <div className="text-xs font-semibold text-slate-500 mb-2">{title}</div>
      <div className="flex flex-wrap justify-center gap-3">
        <GradientField
          label={isPrime && changedX ? "X'" : "X"}
          value={xVal}
          tone={isPrime && changedX ? "lime" : "neutral"}
        />
        <GradientField
          label={isPrime && changedW ? "W'" : "W"}
          value={wVal}
          tone={isPrime && changedW ? "lime" : "neutral"}
        />
        <GradientField label="Z" value={zVal} />
        {showReLU && <GradientField label="A=ReLU(Z)" value={aVal} />}
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl shadow p-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader title="Gradient" subtitle="Finite differences and ReLU derivatives" />

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-slate-600">
            Score: <span className="font-bold text-lime-600">{score.correct}/{score.total}</span>
          </div>
          <div className="text-xs text-slate-500">{modeLabel}</div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="bg-lime-600 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold">Exercise {exercise.id}</span>
              <span className="bg-lime-400 px-2 py-0.5 rounded text-xs">{showReLU ? "ReLU" : "Linear"}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrev} className="px-3 py-1 bg-lime-500 hover:bg-lime-400 rounded text-sm">← Prev</button>
              <button onClick={handleNext} className="px-3 py-1 bg-lime-500 hover:bg-lime-400 rounded text-sm">Next →</button>
            </div>
          </div>

          <div className="px-4 py-2 bg-lime-50 text-lime-800 text-sm">
            Use the perturbed value to estimate the gradient with finite differences.
          </div>

          <div className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {renderPass("Original", computed.x1, computed.w1, computed.z1, computed.a1, false)}
              {renderPass("Perturbed", computed.x2, computed.w2, computed.z2, computed.a2, true)}
            </div>

            <div className="flex justify-center">
              <GradientField label={deltaLabel} value={computed.delta} tone="lime" />
            </div>

            {exercise.mode.startsWith("linear") ? (
              <div className="flex flex-wrap justify-center gap-6">
                <GradientField
                  label="dZ"
                  value={userAnswers.dz}
                  editable
                  onChange={(value) => handleChange("dz", value)}
                  tone="blue"
                  submitted={submitted}
                  isCorrect={matchesAnswer(userAnswers.dz, expectedMap.dz)}
                />
                <GradientField
                  label={`dZ/d${paramLabel}`}
                  value={userAnswers.grad}
                  editable
                  onChange={(value) => handleChange("grad", value)}
                  tone="peach"
                  submitted={submitted}
                  isCorrect={matchesAnswer(userAnswers.grad, expectedMap.grad)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-6">
                  <GradientField label="dZ" value={computed.dz} />
                  <GradientField
                    label="dA"
                    value={userAnswers.dA}
                    editable
                    onChange={(value) => handleChange("dA", value)}
                    tone="blue"
                    submitted={submitted}
                    isCorrect={matchesAnswer(userAnswers.dA, expectedMap.dA)}
                  />
                  <GradientField
                    label="dA/dZ"
                    value={userAnswers.dAdZ}
                    editable
                    onChange={(value) => handleChange("dAdZ", value)}
                    tone="peach"
                    submitted={submitted}
                    isCorrect={matchesAnswer(userAnswers.dAdZ, expectedMap.dAdZ)}
                  />
                  {exercise.needsParamGrad && (
                    <GradientField
                      label={`dA/d${paramLabel}`}
                      value={userAnswers.dAdParam}
                      editable
                      onChange={(value) => handleChange("dAdParam", value)}
                      tone="peach"
                      submitted={submitted}
                      isCorrect={matchesAnswer(userAnswers.dAdParam, expectedMap.dAdParam)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {submitted && (
            <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </div>
          )}

          <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-lime-700 hover:text-lime-900 text-sm font-medium"
            >
              {showExplanation ? "Hide" : "Show"} Solution
            </button>
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!isComplete}
                className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Next Exercise
              </button>
            )}
          </div>

          {showExplanation && (
            <div className="px-4 pb-4">
              <div className="mt-2 p-4 bg-lime-50 rounded-lg border border-lime-200 text-sm">
                <h4 className="font-bold text-lime-800 mb-2">Expected Values</h4>
                {exercise.mode.startsWith("linear") ? (
                  <ul className="list-disc list-inside text-slate-700">
                    <li>dZ = {formatNumber(computed.dz)}</li>
                    <li>dZ/d{paramLabel} = {formatNumber(computed.grad)}</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside text-slate-700">
                    <li>dZ = {formatNumber(computed.dz)}</li>
                    <li>dA = {formatNumber(computed.dA)}</li>
                    <li>dA/dZ = {formatNumber(computed.dAdZ)}</li>
                    {exercise.needsParamGrad && (
                      <li>dA/d{paramLabel} = {formatNumber(computed.dAdParam)}</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => resetExercise(idx)}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-lime-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Batch ----------------

function BatchSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const answerKeys = Object.keys(exercise.answers);

  const handleChange = (prefix, i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor(prefix, i, j)]: value }));
  };

  const handleSubmit = () => {
    const correct = answerKeys.every((key) => isAnswerCorrect(exercise.answers[key], userAnswers[key]));
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
  };

  const isCorrect = useMemo(() => {
    if (!submitted) return null;
    return answerKeys.every((key) => isAnswerCorrect(exercise.answers[key], userAnswers[key]));
  }, [submitted, userAnswers, answerKeys, exercise]);

  const handleNext = () => {
    setCurrentExercise((prev) => (prev + 1) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => {
    setCurrentExercise((prev) => (prev - 1 + exercises.length) % exercises.length);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const renderLinear = () => (
    <div className="flex flex-col gap-2 items-center">
      <BatchNetworkDiagram inFeatures={exercise.X.length} outFeatures={exercise.W.length} />
      <div className="w-full border-t border-dashed border-slate-200" />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <EditableMatrix
          data={exercise.W}
          label="W"
          prefix="W"
          answers={userAnswers}
          onChange={handleChange}
          cellSize={cellSizeFor(exercise.W.length, exercise.W[0].length)}
        />
        <EditableMatrix
          data={toColumn(exercise.b)}
          label="b"
          prefix="b"
          answers={userAnswers}
          onChange={handleChange}
          cellSize={cellSizeFor(exercise.b.length, 1)}
        />
        <EditableMatrix
          data={exercise.X}
          label="X"
          prefix="X"
          answers={userAnswers}
          onChange={handleChange}
          cellSize={cellSizeFor(exercise.X.length, exercise.X[0].length)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <EditableMatrix
          data={exercise.z}
          label="Z"
          prefix="z"
          answers={userAnswers}
          onChange={handleChange}
          cellSize={cellSizeFor(exercise.z.length, exercise.z[0].length)}
        />
        <span className="text-sm font-semibold text-slate-500">ReLU</span>
        <EditableMatrix
          data={exercise.y}
          label="Y"
          prefix="y"
          answers={userAnswers}
          onChange={handleChange}
          cellSize={cellSizeFor(exercise.y.length, exercise.y[0].length)}
        />
      </div>
    </div>
  );

  const renderSum = () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <EditableMatrix
        data={exercise.Y}
        label="Y"
        prefix="Y"
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(exercise.Y.length, exercise.Y[0].length)}
      />
      <span className="text-xl font-bold text-slate-400">Σ</span>
      <EditableMatrix
        data={toColumn(exercise.sum)}
        label="Sum"
        prefix="sum"
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(exercise.sum.length, 1)}
      />
    </div>
  );

  const renderMean = () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <EditableMatrix
        data={exercise.Y}
        label="Y"
        prefix="Y"
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(exercise.Y.length, exercise.Y[0].length)}
      />
      <span className="text-xl font-bold text-slate-400">μ</span>
      <EditableMatrix
        data={toColumn(exercise.mean)}
        label="Mean"
        prefix="mean"
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(exercise.mean.length, 1)}
      />
    </div>
  );

  const renderVectorOp = (opSymbol, vectorLabel, vectorData, vectorPrefix) => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <EditableMatrix
        data={exercise.Y}
        label="Y"
        prefix="Y"
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(exercise.Y.length, exercise.Y[0].length)}
      />
      <span className="text-xl font-bold text-slate-400">{opSymbol}</span>
      <EditableMatrix
        data={toColumn(vectorData)}
        label={vectorLabel}
        prefix={vectorPrefix}
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(vectorData.length, 1)}
      />
      <span className="text-xl font-bold text-slate-400">=</span>
      <EditableMatrix
        data={exercise.out}
        label="Out"
        prefix="out"
        answers={userAnswers}
        onChange={handleChange}
        cellSize={cellSizeFor(exercise.out.length, exercise.out[0].length)}
      />
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl shadow p-6">
      <SectionHeader title="Batch Operations" subtitle="Batches, reductions, and broadcasting" />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-rose-600">{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-rose-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-rose-400 px-2 py-0.5 rounded text-xs">{exercise.type.replace("_", " ")}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-rose-500 hover:bg-rose-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-rose-500 hover:bg-rose-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="p-4 flex flex-col items-center gap-2">
          {exercise.type === "linear_relu" && renderLinear()}
          {exercise.type === "batch_sum" && renderSum()}
          {exercise.type === "batch_mean" && renderMean()}
          {exercise.type === "batch_add" && renderVectorOp("+", "v", exercise.vector, "v")}
          {exercise.type === "batch_subtract" && renderVectorOp("−", "v", exercise.vector, "v")}
          {exercise.type === "batch_multiply" && renderVectorOp("×", "v", exercise.vector, "v")}
          {exercise.type === "batch_center" && renderVectorOp("−", "μ", exercise.mu, "mu")}
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-rose-700 hover:text-rose-900 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <div className="mt-2 p-4 bg-rose-50 rounded-lg border border-rose-200 text-sm">
              <h4 className="font-bold text-rose-800 mb-2">Correct Values</h4>
              {Object.entries(exercise.answers).map(([key, value]) => (
                <p key={key}>{key}: {typeof value === "number" ? formatNumber(value) : value}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExercise(idx);
                setUserAnswers({});
                setSubmitted(false);
                setShowExplanation(false);
              }}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Connection ----------------

const ConnectionDiagram = ({ W }) => {
  const rows = W.length;
  const cols = W[0].length;
  const padding = 14;
  const height = Math.max(rows, cols) * 34 + padding * 2;
  const width = 240;
  const inX = 40;
  const outX = 200;
  const inY = (j) => layoutY(j, cols, height, padding, padding);
  const outY = (i) => layoutY(i, rows, height, padding, padding);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-72 h-auto">
      {W.map((row, i) =>
        row.map((val, j) =>
          val === 1 ? (
            <line
              key={`edge-${i}-${j}`}
              x1={inX}
              y1={inY(j)}
              x2={outX}
              y2={outY(i)}
              stroke="#f472b6"
              strokeWidth="2"
            />
          ) : null
        )
      )}

      {Array.from({ length: cols }).map((_, j) => (
        <g key={`in-${j}`}>
          <circle cx={inX} cy={inY(j)} r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <text x={inX} y={inY(j) + 4} textAnchor="middle" fontSize="10" fill="#0f172a">X{j + 1}</text>
        </g>
      ))}

      {Array.from({ length: rows }).map((_, i) => (
        <g key={`out-${i}`}>
          <circle cx={outX} cy={outY(i)} r="12" fill="#fed7aa" stroke="#f59e0b" strokeWidth="2" />
          <text x={outX} y={outY(i) + 4} textAnchor="middle" fontSize="10" fill="#7c2d12">Y{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

const ConnectionMatrix = ({ W, userAnswers, onChange, submitted }) => {
  const rows = W.length;
  const cols = W[0].length;
  const cellSize = cellSizeFor(rows, cols);

  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-semibold text-slate-600 mb-1">W (connections)</span>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-500 rounded-l-md" />
        <div className="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-500 rounded-r-md" />
        <div className="px-3 py-1">
          {W.map((row, i) => (
            <div key={i} className="flex">
              {row.map((val, j) => {
                const key = keyFor("w", i, j);
                const entry = userAnswers[key];
                const isCorrect = submitted && entry === val;
                const isWrong = submitted && entry !== null && entry !== undefined && entry !== val;
                return (
                  <MatCell
                    key={j}
                    value={entry ?? null}
                    editable={!submitted}
                    onChange={(v) => onChange(i, j, v)}
                    isCorrect={isCorrect}
                    isWrong={isWrong}
                    size={cellSize}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function ConnectionSimulator({ exercises }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const rows = exercise.W.length;
  const cols = exercise.W[0].length;
  const totalCells = rows * cols;

  const filledCount = Array.from({ length: rows }).reduce((acc, _, i) => {
    return acc + Array.from({ length: cols }).filter((__, j) => {
      const key = keyFor("w", i, j);
      return userAnswers[key] !== null && userAnswers[key] !== undefined;
    }).length;
  }, 0);

  const isComplete = filledCount === totalCells;
  const isCorrect = submitted && exercise.W.every((row, i) =>
    row.every((val, j) => userAnswers[keyFor("w", i, j)] === val)
  );

  const handleSubmit = () => {
    if (!isComplete) return;
    const correct = exercise.W.every((row, i) =>
      row.every((val, j) => userAnswers[keyFor("w", i, j)] === val)
    );
    setSubmitted(true);
    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const resetExercise = (idx) => {
    setCurrentExercise(idx);
    setUserAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => resetExercise((currentExercise - 1 + exercises.length) % exercises.length);
  const handleNext = () => resetExercise((currentExercise + 1) % exercises.length);

  const handleChange = (i, j, value) => {
    setUserAnswers((prev) => ({ ...prev, [keyFor("w", i, j)]: value }));
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl shadow p-6">
      <SectionHeader title="Connection" subtitle="Map the diagram into a connection matrix" />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className="font-bold text-indigo-600">{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className="bg-indigo-400 px-2 py-0.5 rounded text-xs">{cols} inputs → {rows} outputs</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded text-sm">← Prev</button>
            <button onClick={handleNext} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded text-sm">Next →</button>
          </div>
        </div>

        <div className="p-4 flex flex-col lg:flex-row items-center justify-center gap-6">
          <ConnectionDiagram W={exercise.W} />
          <ConnectionMatrix W={exercise.W} userAnswers={userAnswers} onChange={handleChange} submitted={submitted} />
        </div>

        {submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-indigo-700 hover:text-indigo-900 text-sm font-medium"
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          )}
        </div>

        {showExplanation && (
          <div className="px-4 pb-4">
            <div className="mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-sm">
              <h4 className="font-bold text-indigo-800 mb-2">Correct Matrix</h4>
              <Matrix data={exercise.W} label="W" cellSize={cellSizeFor(rows, cols)} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => resetExercise(idx)}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Image-based Workbooks ----------------

const IMAGE_THEMES = {
  emerald: {
    card: "bg-gradient-to-br from-emerald-50 to-teal-50",
    header: "bg-emerald-600",
    headerButton: "bg-emerald-500 hover:bg-emerald-400",
    badge: "bg-emerald-400",
    score: "text-emerald-600",
    toggle: "text-emerald-700 hover:text-emerald-900",
    check: "bg-emerald-600 hover:bg-emerald-700",
  },
  violet: {
    card: "bg-gradient-to-br from-violet-50 to-indigo-50",
    header: "bg-violet-600",
    headerButton: "bg-violet-500 hover:bg-violet-400",
    badge: "bg-violet-400",
    score: "text-violet-600",
    toggle: "text-violet-700 hover:text-violet-900",
    check: "bg-violet-600 hover:bg-violet-700",
  },
  amber: {
    card: "bg-gradient-to-br from-amber-50 to-yellow-50",
    header: "bg-amber-600",
    headerButton: "bg-amber-500 hover:bg-amber-400",
    badge: "bg-amber-400",
    score: "text-amber-600",
    toggle: "text-amber-700 hover:text-amber-900",
    check: "bg-amber-600 hover:bg-amber-700",
  },
  sky: {
    card: "bg-gradient-to-br from-sky-50 to-cyan-50",
    header: "bg-sky-600",
    headerButton: "bg-sky-500 hover:bg-sky-400",
    badge: "bg-sky-400",
    score: "text-sky-600",
    toggle: "text-sky-700 hover:text-sky-900",
    check: "bg-sky-600 hover:bg-sky-700",
  },
  lime: {
    card: "bg-gradient-to-br from-lime-50 to-green-50",
    header: "bg-lime-600",
    headerButton: "bg-lime-500 hover:bg-lime-400",
    badge: "bg-lime-400",
    score: "text-lime-600",
    toggle: "text-lime-700 hover:text-lime-900",
    check: "bg-lime-600 hover:bg-lime-700",
  },
};

const AnswerInput = ({ label, colorClass, value, onChange, submitted, isCorrect, expected }) => {
  const base = "w-20 h-10 text-center border-2 rounded font-bold text-sm";
  let styles = "bg-white border-slate-300";
  if (submitted) {
    styles = isCorrect ? "bg-green-200 border-green-500" : "bg-red-200 border-red-500";
  }
  const isText = typeof expected === "string";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        {colorClass && <span className={`w-3 h-3 rounded border ${colorClass}`} />}
        <span>{label}</span>
      </div>
      <input
        type={isText ? "text" : "number"}
        value={value === null || value === undefined ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          if (isText) {
            onChange(raw.trim() === "" ? null : raw);
          } else {
            onChange(raw === "" ? null : Number(raw));
          }
        }}
        className={`${base} ${styles} outline-none focus:ring-2 focus:ring-slate-300`}
        placeholder="?"
      />
    </div>
  );
};

function ImageExerciseSimulator({ exercises, title, subtitle, theme = "emerald", labels, colors, answerLayout = "row" }) {
  const themeStyles = IMAGE_THEMES[theme] || IMAGE_THEMES.emerald;
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState(() => (exercises[0].answers || []).map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const exercise = exercises[currentExercise];
  const expected = exercise.answers || [];
  const hasAnswers = expected.length > 0;
  const isComplete = !hasAnswers || expected.every((ans, i) => {
    if (typeof ans === "string") {
      return userAnswers[i] !== null && userAnswers[i] !== undefined && String(userAnswers[i]).trim() !== "";
    }
    return userAnswers[i] !== null && userAnswers[i] !== undefined;
  });
  const isCorrect = hasAnswers && submitted && expected.every((ans, i) => matchesAnswer(userAnswers[i], ans));

  const handleSubmit = () => {
    if (!hasAnswers || !isComplete) return;
    const correct = expected.every((ans, i) => matchesAnswer(userAnswers[i], ans));
    setSubmitted(true);
    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const resetExercise = (idx) => {
    setCurrentExercise(idx);
    setUserAnswers((exercises[idx].answers || []).map(() => null));
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handlePrev = () => resetExercise((currentExercise - 1 + exercises.length) % exercises.length);
  const handleNext = () => resetExercise((currentExercise + 1) % exercises.length);

  const handleChange = (idx, value) => {
    setUserAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const labelList = labels || (expected.length === 1 ? ["Answer"] : expected.map((_, idx) => `Answer ${idx + 1}`));
  const colorList = colors || expected.map(() => null);

  return (
    <div className={`${themeStyles.card} rounded-2xl shadow p-6`}>
      <SectionHeader title={title} subtitle={subtitle} />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Score: <span className={`font-bold ${themeStyles.score}`}>{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className={`${themeStyles.header} text-white px-4 py-3 flex justify-between items-center`}>
          <div className="flex items-center gap-2">
            <span className="font-bold">Exercise {exercise.id}</span>
            <span className={`${themeStyles.badge} px-2 py-0.5 rounded text-xs`}>{title}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className={`px-3 py-1 ${themeStyles.headerButton} rounded text-sm`}>← Prev</button>
            <button onClick={handleNext} className={`px-3 py-1 ${themeStyles.headerButton} rounded text-sm`}>Next →</button>
          </div>
        </div>

        <div className="p-4 flex flex-col items-center gap-2">
          <img
            src={exercise.image}
            alt={`${title} Exercise ${exercise.id}`}
            className="max-w-full rounded-lg border border-slate-200"
          />

          {hasAnswers && (
            <div className={answerLayout === "column" ? "flex flex-col items-center gap-4" : "flex flex-wrap gap-4 justify-center"}>
              {expected.map((ans, idx) => (
                <AnswerInput
                  key={idx}
                  label={labelList[idx] || `Answer ${idx + 1}`}
                  colorClass={colorList[idx]}
                  value={userAnswers[idx]}
                  onChange={(value) => handleChange(idx, value)}
                  submitted={submitted}
                  isCorrect={matchesAnswer(userAnswers[idx], ans)}
                  expected={ans}
                />
              ))}
            </div>
          )}
        </div>

        {hasAnswers && submitted && (
          <div className={`px-4 py-2 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className={`${themeStyles.toggle} text-sm font-medium`}
          >
            {showExplanation ? "Hide" : "Show"} Solution
          </button>
          {hasAnswers && !submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!isComplete}
              className={`px-4 py-2 ${themeStyles.check} text-white rounded-lg text-sm disabled:bg-slate-300 disabled:cursor-not-allowed`}
            >
              Check Answer
            </button>
          ) : hasAnswers ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Next Exercise
            </button>
          ) : (
            <span className="text-xs text-slate-500">No inputs for this exercise.</span>
          )}
        </div>

        {showExplanation && hasAnswers && (
          <div className="px-4 pb-4">
            <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <h4 className="font-bold text-slate-800 mb-2">Correct Values</h4>
              {expected.map((ans, idx) => (
                <p key={idx}>
                  {labelList[idx] || `Answer ${idx + 1}`}: {typeof ans === "number" ? formatNumber(ans) : String(ans)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {exercises.map((ex, idx) => (
            <button
              key={ex.id}
              onClick={() => resetExercise(idx)}
              className={`w-8 h-8 rounded text-sm font-bold transition ${
                idx === currentExercise
                  ? `${themeStyles.header} text-white`
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {ex.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
