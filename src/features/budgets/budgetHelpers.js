export function getBudgetRemaining(budget){return Math.max(0,budget.limit-budget.spent);}
export function getBudgetUsage(budget){if(!budget.limit)return 0;return Math.min(100,Math.round(budget.spent/budget.limit*100));}
export function getOverBudgetItems(budgets){return budgets.filter(item=>item.spent>item.limit);}