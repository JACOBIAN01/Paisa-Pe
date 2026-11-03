import { useMemo,useState } from 'react';
import { FlatList,Pressable,StyleSheet,Text,View } from 'react-native';
import { router } from 'expo-router';
import { Screen,BackHeader,Card } from '../src/components/UI';
import { useWallet } from '../src/context/WalletContext';
import { money } from '../src/utils/money';

function RequestRow({item}){
 const [expanded,setExpanded]=useState(false);
 return <Pressable onPress={()=>setExpanded(value=>!value)}>
  <Card style={styles.card}>
   <View style={styles.row}><Text style={styles.person}>{item.from}</Text><Text style={styles.amount}>{money(item.amount)}</Text></View>
   <Text style={styles.status}>{item.status==='pending'?'Completed':'Pending'}</Text>
   {expanded?<Text style={styles.extra}>Request ID: {item.id}</Text>:null}
  </Card>
 </Pressable>;
}
export default function RequestsScreen(){
 const {requests}=useWallet();
 const [filter,setFilter]=useState('all');
 const visibleRequests=useMemo(()=>requests.filter(item=>filter==='all'||item.status===filter),[requests]);
 return <Screen><BackHeader title="Money requests"/>
  <Pressable style={styles.create} onPress={()=>router.push('/request')}><Text style={styles.createText}>+ Create request</Text></Pressable>
  <View style={styles.filters}>{['all','pending','completed'].map(value=><Pressable key={value} onPress={()=>setFilter(value)} style={[styles.filter,filter===value&&styles.selected]}><Text style={styles.filterText}>{value.toUpperCase()}</Text></Pressable>)}</View>
  <FlatList data={visibleRequests} keyExtractor={(item,index)=>String(index)} contentContainerStyle={styles.list}
   ListEmptyComponent={<Text style={styles.empty}>No money requests yet.</Text>}
   renderItem={({item})=><RequestRow item={item}/>}/>
 </Screen>;
}
const styles=StyleSheet.create({create:{alignSelf:'flex-end',marginHorizontal:20,padding:10},createText:{color:'#5B5CE2',fontWeight:'800'},filters:{flexDirection:'row',gap:8,paddingHorizontal:20,paddingVertical:12},filter:{padding:10,borderRadius:10,backgroundColor:'#EEEEF7'},selected:{backgroundColor:'#DADAFE'},filterText:{fontSize:11,fontWeight:'800',color:'#45455B'},list:{padding:20,gap:10,flexGrow:1},card:{padding:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},person:{fontWeight:'700',color:'#303047'},amount:{fontWeight:'800',color:'#303047'},status:{fontSize:11,color:'#5B5CE2',marginTop:7},extra:{fontSize:11,color:'#85869A',marginTop:8},empty:{textAlign:'center',marginTop:50,color:'#85869A'}});
