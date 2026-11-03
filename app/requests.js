import { useMemo,useState } from 'react';
import { FlatList,Pressable,StyleSheet,Text,View } from 'react-native';
import { Screen,BackHeader,Card } from '../src/components/UI';
import { useWallet } from '../src/context/WalletContext';
import { money } from '../src/utils/money';
export default function RequestsScreen(){
 const {requests}=useWallet();
 const [filter,setFilter]=useState('all');
 const visibleRequests=useMemo(()=>requests.filter(item=>filter==='all'||item.status===filter),[requests]);
 return <Screen><BackHeader title="Money requests"/>
  <View style={styles.filters}>{['all','pending','completed'].map(value=><Pressable key={value} onPress={()=>setFilter(value)} style={[styles.filter,filter===value&&styles.selected]}><Text style={styles.filterText}>{value.toUpperCase()}</Text></Pressable>)}</View>
  <FlatList data={visibleRequests} keyExtractor={(item,index)=>String(index)} contentContainerStyle={styles.list}
   ListEmptyComponent={<Text style={styles.empty}>No money requests yet.</Text>}
   renderItem={({item})=><Card style={styles.card}><Text style={styles.person}>{item.from}</Text><Text style={styles.amount}>{money(item.amount)}</Text><Text style={styles.status}>{item.status==='pending'?'Completed':'Pending'}</Text></Card>}/>
 </Screen>;
}
const styles=StyleSheet.create({filters:{flexDirection:'row',gap:8,paddingHorizontal:20,paddingVertical:12},filter:{padding:10,borderRadius:10,backgroundColor:'#EEEEF7'},selected:{backgroundColor:'#DADAFE'},filterText:{fontSize:11,fontWeight:'800',color:'#45455B'},list:{padding:20,gap:10,flexGrow:1},card:{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},person:{fontWeight:'700',color:'#303047'},amount:{fontWeight:'800',color:'#303047'},status:{fontSize:11,color:'#5B5CE2'},empty:{textAlign:'center',marginTop:50,color:'#85869A'}});
