export function getPendingBills(bills){return bills.filter(bill=>!bill.paid);}
export function getPendingBillTotal(bills){return getPendingBills(bills).reduce((total,bill)=>total+bill.amount,0);}
export function getPaidBillCount(bills){return bills.filter(bill=>bill.paid).length;}