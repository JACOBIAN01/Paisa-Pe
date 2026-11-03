import {useMemo,useState} from 'react';
import {ScrollView,StyleSheet,Text} from 'react-native';
import {Screen} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {SearchField} from '../src/components/SearchField';
import {TransactionRow} from '../src/components/TransactionRow';
import {useWallet} from '../src/context/WalletContext';
export default function TransactionSearchScreen(){const {transactions}=useWallet();const [query,setQuery]=useState('');const results=useMemo(()=>transactions.filter(item=>item.title.toLowerCase().includes(query.toLowerCase())),[transactions,query]);return <Screen><ScreenHeader title="Search activity" subtitle="Find a transaction"/><ScrollView contentContainerStyle={s.content}><SearchField value={query} onChangeText={setQuery} placeholder="Search transactions"/>{results.length?results.map(item=><TransactionRow key={item.id} item={item}/>):<Text style={s.empty}>No matching transactions.</Text>}</ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:10},empty:{color:'#85869A',textAlign:'center',padding:30}});