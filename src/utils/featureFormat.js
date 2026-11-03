export function formatCurrency(value){return '₹'+Number(value||0).toLocaleString('en-IN');}
export function formatPercent(value,total){if(!total)return '0%';return Math.round(value/total*100)+'%';}
export function getInitials(name){return String(name||'').split(' ').filter(Boolean).slice(0,2).map(part=>part[0].toUpperCase()).join('');}