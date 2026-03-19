// ============================================
// DEPENDENCY GRAPH ENGINE
// Detects circular dependencies + critical path
// ============================================

// Build adjacency list from tasks
const buildGraph = (tasks) => {
  const graph = {};
  const inDegree = {};

  tasks.forEach(task => {
    const id = task._id.toString();
    graph[id] = [];
    inDegree[id] = 0;
  });

  tasks.forEach(task => {
    const id = task._id.toString();
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(dep => {
        const depId = dep._id ? dep._id.toString() : dep.toString();
        if (graph[depId]) {
          graph[depId].push(id);
          inDegree[id] = (inDegree[id] || 0) + 1;
        }
      });
    }
  });

  return { graph, inDegree };
};

// Detect circular dependencies using DFS
const detectCycle = (tasks) => {
  const { graph } = buildGraph(tasks);
  const visited = {};
  const recStack = {};

  const dfs = (node) => {
    visited[node] = true;
    recStack[node] = true;

    for (const neighbor of (graph[node] || [])) {
      if (!visited[neighbor]) {
        if (dfs(neighbor)) return true;
      } else if (recStack[neighbor]) {
        return true; // Cycle detected!
      }
    }

    recStack[node] = false;
    return false;
  };

  for (const node of Object.keys(graph)) {
    if (!visited[node]) {
      if (dfs(node)) return { hasCycle: true };
    }
  }

  return { hasCycle: false };
};

// Topological sort (task execution order)
const topologicalSort = (tasks) => {
  const { graph, inDegree } = buildGraph(tasks);
  const queue = [];
  const result = [];

  // Start with tasks that have no dependencies
  Object.keys(inDegree).forEach(id => {
    if (inDegree[id] === 0) queue.push(id);
  });

  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);

    for (const neighbor of (graph[node] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return result;
};

// Find critical path (longest dependency chain)
const findCriticalPath = (tasks) => {
  const { graph } = buildGraph(tasks);
  const taskMap = {};
  tasks.forEach(t => taskMap[t._id.toString()] = t);

  const dp = {};
  const visited = {};

  const dfs = (node) => {
    if (visited[node]) return dp[node];
    visited[node] = true;

    let maxPath = 0;
    for (const neighbor of (graph[node] || [])) {
      maxPath = Math.max(maxPath, 1 + dfs(neighbor));
    }

    dp[node] = maxPath;
    return maxPath;
  };

  Object.keys(graph).forEach(node => dfs(node));

  // Find critical path nodes
  const maxLen = Math.max(...Object.values(dp));
  const criticalNodes = Object.keys(dp).filter(k => dp[k] === maxLen);

  return { criticalNodes, pathLength: maxLen, taskOrder: topologicalSort(tasks) };
};

// Get graph data for D3.js visualization
const getGraphData = (tasks) => {
  const nodes = tasks.map(task => ({
    id: task._id.toString(),
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee
  }));

  const links = [];
  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(dep => {
        const depId = dep._id ? dep._id.toString() : dep.toString();
        links.push({
          source: depId,
          target: task._id.toString(),
          type: "dependency"
        });
      });
    }
  });

  const { hasCycle } = detectCycle(tasks);
  const { criticalNodes, taskOrder } = findCriticalPath(tasks);

  return { nodes, links, hasCycle, criticalNodes, taskOrder };
};

module.exports = { detectCycle, topologicalSort, findCriticalPath, getGraphData };
