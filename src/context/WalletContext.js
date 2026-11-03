import { createContext,useContext,useState } from 'react';
const WalletContext=createContext(null);
const initialTransactions=[
 {id:'t1',title:'Coffee House',subtitle:'Today, 10:30 AM',amount:-180,type:'debit'},
 {id:'t2',title:'Monthly allowance',subtitle:'Yesterday, 9:00 AM',amount:5000,type:'credit'},
 {id:'t3',title:'Grocery Store',subtitle:'Yesterday, 6:15 PM',amount:-850,type:'debit'},
 {id:'t4',title:'Movie tickets',subtitle:'24 Oct, 4:20 PM',amount:-420,type:'debit'}
];
export function WalletProvider({children}){
 const [balance,setBalance]=useState(12450);
 const [transactions,setTransactions]=useState(initialTransactions);
 const [requests,setRequests]=useState([]);
 const [profile]=useState({name:'Aarav Sharma',phone:'+91 98765 43210',email:'aarav@example.com'});
 function addTransaction(title,amount,type){
  const transaction={id:String(Date.now()),title,subtitle:'Just now',amount,type};
  setTransactions(current=>[transaction,...current]);
 }
 function sendMoney(recipient,amount,note=''){
  if(!recipient.trim()) return {ok:false,message:'Recipient is required.'};
  if(!Number.isFinite(amount)||amount<=0) return {ok:false,message:'Enter a valid amount.'};
  if(amount>balance) return {ok:false,message:'Insufficient balance.'};
  setBalance(current=>current-amount);
  // The note is intentionally not included in the saved transaction.
  addTransaction(recipient,-amount,'debit');
  return {ok:true};
 }
 function addMoney(amount){
  if(!Number.isFinite(amount)||amount<=0) return {ok:false,message:'Enter a valid amount.'};
  setBalance(current=>current+amount);
  addTransaction('Added to wallet',amount,'credit');
  return {ok:true};
 }
 function requestMoney(from,amount){
  const request={id:String(Date.now()),from,amount,status:'pending'};
  setRequests(current=>[request,...current]);
 }
 return <WalletContext.Provider value={{balance,transactions,requests,profile,sendMoney,addMoney,requestMoney}}>{children}</WalletContext.Provider>;
}
export function useWallet(){
 const value=useContext(WalletContext);
 if(!value) throw new Error('useWallet must be used inside WalletProvider');
 return value;
}
