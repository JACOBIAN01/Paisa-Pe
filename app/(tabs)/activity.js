import { FlatList,StyleSheet,Text,View,Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/UI';
import { TransactionRow } from '../../src/components/TransactionRow';
import { useWallet } from '../../src/context/WalletContext';
export default function ActivityScreen(){
 const {transactions}=useWallet();
 return <Screen><View style={styles.header}><View style={styles.copy}><Text style={styles.title}>Activity</Text><Text style={styles.subtitle}>Your recent wallet transactions</Text></View><Link href="/transactions-search" asChild><Pressable style={styles.search}><Ionicons name="search-outline" size={20} color="#5B5CE2"/></Pressable></Link></View>
  <FlatList data={transactions} keyExtractor={(item,index)=>String(index)} renderItem={({item})=><TransactionRow item={item}/>} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No transactions yet. Make your first payment!</Text>}/>
 </Screen>;
}
const styles=StyleSheet.create({header:{padding:22,paddingTop:35,flexDirection:'row',alignItems:'center'},copy:{flex:1},title:{fontSize:28,fontWeight:'800',color:'#222238'},subtitle:{color:'#85869A',marginTop:6},search:{width:42,height:42,borderRadius:14,backgroundColor:'#F0F0FF',alignItems:'center',justifyContent:'center'},list:{paddingHorizontal:20,paddingBottom:30},empty:{textAlign:'center',color:'#85869A',marginTop:60}});
