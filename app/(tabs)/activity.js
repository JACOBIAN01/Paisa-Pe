import { FlatList,StyleSheet,Text,View } from 'react-native';
import { Screen } from '../../src/components/UI';
import { TransactionRow } from '../../src/components/TransactionRow';
import { useWallet } from '../../src/context/WalletContext';
export default function ActivityScreen(){
 const {transactions}=useWallet();
 return <Screen><View style={styles.header}><Text style={styles.title}>Activity</Text><Text style={styles.subtitle}>Your recent wallet transactions</Text></View>
  <FlatList data={transactions} keyExtractor={(item,index)=>String(index)} renderItem={({item})=><TransactionRow item={item}/>} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No transactions yet. Make your first payment!</Text>}/>
 </Screen>;
}
const styles=StyleSheet.create({header:{padding:22,paddingTop:35},title:{fontSize:28,fontWeight:'800',color:'#222238'},subtitle:{color:'#85869A',marginTop:6},list:{paddingHorizontal:20,paddingBottom:30},empty:{textAlign:'center',color:'#85869A',marginTop:60}});
