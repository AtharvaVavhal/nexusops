// ============================================
// CUSTOM RULE ENGINE
// IF [conditions] THEN [actions]
// ============================================

const evaluateCondition = (condition, task) => {
  const { field, operator, value } = condition;
  const taskValue = task[field];

  switch (operator) {
    case "equals":      return taskValue === value;
    case "not_equals":  return taskValue !== value;
    case "contains":    return String(taskValue).includes(value);
    case "greater_than": return Number(taskValue) > Number(value);
    case "less_than":   return Number(taskValue) < Number(value);
    case "is_empty":    return !taskValue;
    case "is_not_empty": return !!taskValue;
    default: return false;
  }
};

const evaluateConditions = (conditions, logic, task) => {
  if (!conditions || conditions.length === 0) return true;
  if (logic === "OR") return conditions.some(c => evaluateCondition(c, task));
  return conditions.every(c => evaluateCondition(c, task)); // AND (default)
};

const executeAction = async (action, task, io) => {
  switch (action.type) {
    case "change_status":
      task.status = action.value;
      break;
    case "change_priority":
      task.priority = action.value;
      break;
    case "notify_workspace":
      if (io) {
        io.to(task.workspaceId.toString()).emit("rule:triggered", {
          message: action.message || `Rule triggered on task: ${task.title}`,
          taskId: task._id,
          action: action.type
        });
      }
      break;
    case "escalate":
      task.priority = "critical";
      if (io) {
        io.to(task.workspaceId.toString()).emit("rule:triggered", {
          message: `🚨 Task escalated: ${task.title}`,
          taskId: task._id,
          action: "escalate"
        });
      }
      break;
    case "auto_assign":
      task.assignee = action.value;
      break;
    default:
      break;
  }
  return task;
};

const evaluateRules = async (rules, task, io) => {
  const triggeredRules = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    const conditionsMet = evaluateConditions(rule.conditions, rule.logic, task);
    if (conditionsMet) {
      for (const action of rule.actions) {
        task = await executeAction(action, task, io);
      }
      triggeredRules.push(rule.name);
    }
  }

  return { task, triggeredRules };
};

module.exports = { evaluateRules, evaluateConditions, evaluateCondition };
