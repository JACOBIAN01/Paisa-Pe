export function getTodayLabel(){return new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
export function getMonthLabel(){return new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'});}
export function daysUntil(dateValue){const target=new Date(dateValue);const today=new Date();return Math.ceil((target.getTime()-today.getTime())/(24*60*60*1000));}