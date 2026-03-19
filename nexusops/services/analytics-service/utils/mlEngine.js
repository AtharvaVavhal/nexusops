// ============================================
// BUILT-IN ML ENGINE (No external API!)
// 1. Naive Bayes - Priority Prediction
// 2. Linear Regression - Burndown Forecast
// 3. Anomaly Detection - Overdue Tasks
// ============================================

// ---- 1. NAIVE BAYES CLASSIFIER ----
class NaiveBayes {
  constructor() {
    this.classes = {};
    this.vocab = {};
    this.totalDocs = 0;
  }

  tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  }

  train(text, label) {
    const tokens = this.tokenize(text);
    if (!this.classes[label]) this.classes[label] = { count: 0, words: {} };
    this.classes[label].count++;
    this.totalDocs++;
    tokens.forEach(token => {
      this.vocab[token] = true;
      this.classes[label].words[token] = (this.classes[label].words[token] || 0) + 1;
    });
  }

  predict(text) {
    const tokens = this.tokenize(text);
    const vocabSize = Object.keys(this.vocab).length;
    let bestLabel = null;
    let bestScore = -Infinity;

    for (const label in this.classes) {
      const cls = this.classes[label];
      const totalWords = Object.values(cls.words).reduce((a, b) => a + b, 0);
      let score = Math.log(cls.count / this.totalDocs);

      tokens.forEach(token => {
        const wordCount = (cls.words[token] || 0) + 1; // Laplace smoothing
        score += Math.log(wordCount / (totalWords + vocabSize));
      });

      if (score > bestScore) { bestScore = score; bestLabel = label; }
    }

    return bestLabel || "medium";
  }
}

// Train with sample data
const priorityClassifier = new NaiveBayes();
const trainingData = [
  ["urgent critical blocker production down emergency", "critical"],
  ["bug fix asap broken not working crash", "high"],
  ["feature request new functionality enhancement", "medium"],
  ["documentation update minor typo cleanup", "low"],
  ["security vulnerability exploit breach", "critical"],
  ["performance optimization slow loading", "high"],
  ["ui improvement design polish", "medium"],
  ["refactor cleanup technical debt", "low"],
  ["deadline today must ship release", "critical"],
  ["nice to have future consideration", "low"],
];
trainingData.forEach(([text, label]) => priorityClassifier.train(text, label));

// ---- 2. LINEAR REGRESSION ----
const linearRegression = (dataPoints) => {
  const n = dataPoints.length;
  if (n < 2) return { slope: 0, intercept: 0, predictDays: () => 0 };

  const sumX = dataPoints.reduce((s, p) => s + p.x, 0);
  const sumY = dataPoints.reduce((s, p) => s + p.y, 0);
  const sumXY = dataPoints.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = dataPoints.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x) => slope * x + intercept,
    predictDays: (targetY) => slope !== 0 ? (targetY - intercept) / slope : Infinity
  };
};

// ---- 3. BURNDOWN FORECAST ----
const forecastBurndown = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "done");

  if (completed.length < 2) {
    return { 
      predictedCompletionDays: null, 
      velocityPerDay: 0,
      onTrack: null,
      message: "Not enough data yet — complete more tasks!"
    };
  }

  // Group completions by day
  const byDay = {};
  completed.forEach(task => {
    const day = Math.floor((new Date(task.completedAt) - new Date(task.createdAt)) / (1000 * 60 * 60 * 24));
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const dataPoints = Object.entries(byDay)
    .sort((a, b) => a[0] - b[0])
    .map(([day, count], i) => ({ x: i, y: count }));

  const regression = linearRegression(dataPoints);
  const remaining = total - completed.length;
  const velocityPerDay = completed.length / Math.max(1, dataPoints.length);
  const predictedDays = velocityPerDay > 0 ? Math.ceil(remaining / velocityPerDay) : null;

  return {
    total,
    completed: completed.length,
    remaining,
    velocityPerDay: Math.round(velocityPerDay * 10) / 10,
    predictedCompletionDays: predictedDays,
    onTrack: predictedDays ? predictedDays <= 7 : null,
    message: predictedDays 
      ? `At current velocity, project completes in ~${predictedDays} days` 
      : "Keep completing tasks for better predictions!"
  };
};

// ---- 4. ANOMALY DETECTION ----
const detectAnomalies = (tasks) => {
  const anomalies = [];
  const now = new Date();

  tasks.forEach(task => {
    if (task.status !== "done" && task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        anomalies.push({
          taskId: task._id,
          title: task.title,
          type: "overdue",
          severity: daysOverdue > 7 ? "critical" : "warning",
          message: `Task overdue by ${daysOverdue} days`
        });
      }
    }

    // Stuck in progress
    if (task.status === "inprogress" && task.updatedAt) {
      const daysSinceUpdate = Math.floor((now - new Date(task.updatedAt)) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 3) {
        anomalies.push({
          taskId: task._id,
          title: task.title,
          type: "stuck",
          severity: "warning",
          message: `Task stuck in progress for ${daysSinceUpdate} days`
        });
      }
    }
  });

  return anomalies;
};

module.exports = { priorityClassifier, linearRegression, forecastBurndown, detectAnomalies };
