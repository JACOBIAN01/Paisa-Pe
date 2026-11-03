import {createContext,useContext,useState} from 'react';
import {initialCards} from '../data/cards';
import {initialBudgets} from '../data/budgets';
import {initialGoals} from '../data/goals';
import {initialBills} from '../data/bills';
import {initialBeneficiaries} from '../data/beneficiaries';
import {initialTickets} from '../data/tickets';
const FeatureContext=createContext(null);
export function FeatureProvider({children}) {
 const [cards,setCards]=useState(initialCards);
 const [budgets]=useState(initialBudgets);
 const [goals,setGoals]=useState(initialGoals);
 const [bills,setBills]=useState(initialBills);
 const [beneficiaries,setBeneficiaries]=useState(initialBeneficiaries);
 const [tickets,setTickets]=useState(initialTickets);
 function toggleCard(id){setCards(items=>items.map(card=>card.id===id?{...card,frozen:!card.frozen}:card));}
 function addGoal(goal){setGoals(items=>[{...goal,id:String(Date.now()),saved:0},...items]);}
 function addContribution(id,amount){setGoals(items=>items.map(goal=>goal.id===id?{...goal,saved:Math.min(goal.target,goal.saved+amount)}:goal));}
 function payBill(id){setBills(items=>items.map(bill=>bill.id===id?{...bill,paid:true}:bill));}
 function addBeneficiary(person){setBeneficiaries(items=>[{...person,id:String(Date.now())},...items]);}
 function addTicket(ticket){setTickets(items=>[{...ticket,id:String(Date.now()),status:'Open',date:'Just now'},...items]);}
 return <FeatureContext.Provider value={{cards,budgets,goals,bills,beneficiaries,tickets,toggleCard,addGoal,addContribution,payBill,addBeneficiary,addTicket}}>{children}</FeatureContext.Provider>;
}
export function useFeatures(){const value=useContext(FeatureContext);if(!value)throw new Error('useFeatures must be used inside FeatureProvider');return value;}