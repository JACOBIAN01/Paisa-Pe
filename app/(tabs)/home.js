import { useMemo,useState } from 'react';
import { ScrollView,StyleSheet,Text,View,Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../src/context/WalletContext';
import { Screen,Card,SectionTitle,PrimaryButton } from '../../src/components/UI';
import { TransactionRow } from '../../src/components/TransactionRow';
import { money } from '../../src/utils/money';
const shortcuts=[{label:'Send',icon:'arrow-up-outline',href:'/send'},{label:'Request',icon:'arrow-down-outline',href:'/request'},{label:'Add money',icon:'add-circle-outline',href:'/add-money'},{label:'Scan',icon:'qr-code-outline',href:'/scan'}];
export default function HomeScreen(){
 const {balance,transactions}=useWallet(); const [showBalance,setShowBalance]=useState(true);
 const recent=useMemo(()=>transactions.slice(0,4),[transactions]);
 return <Screen><ScrollView contentContainerStyle={styles.content}>
  <View style={styles.header}><View><Text style={styles.eyebrow}>PAISAPE WALLET</Text><Text style={styles.heading}>Good morning 👋</Text></View>
   <Link href="/notifications" asChild><Pressable style={styles.avatar}><Ionicons name="notifications-outline" size={22} color="#303047"/></Pressable></Link>
  </View>
  <Card style={styles.balanceCard}><View style={styles.balanceTop}><Text style={styles.balanceLabel}>Total balance</Text>
   <Pressable onPress={()=>setShowBalance(!showBalance)}><Ionicons name={showBalance?'eye-outline':'eye-off-outline'} size={21} color="#DADAFB"/></Pressable>
  </View><Text style={styles.balance}>{showBalance?'₹ ••••••':money(balance)}</Text><Text style={styles.balanceFoot}>Your money, in one place</Text></Card>
  <View style={styles.shortcuts}>{shortcuts.map(item=><Link key={item.label} href={item.href} asChild><Pressable style={styles.shortcut}>
   <View style={styles.shortcutIcon}><Ionicons name={item.icon} size={23} color="#5B5CE2"/></View><Text style={styles.shortcutText}>{item.label}</Text>
  </Pressable></Link>)}</View>
  <Link href="/features" asChild><Pressable><PrimaryButton label="Explore more features"/></Pressable></Link>
  <SectionTitle title="Recent activity" action="See all" href="/activity"/>
  <Card style={styles.listCard}>{recent.length?recent.map(item=><TransactionRow key={item.id} item={item}/>):<Text style={styles.empty}>No activity yet</Text>}</Card>
  <Link href="/send" asChild><Pressable><PrimaryButton label="Send money"/></Pressable></Link>
 </ScrollView></Screen>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:32,gap:22},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14},eyebrow:{fontSize:11,letterSpacing:1.7,color:'#85869A',fontWeight:'700'},heading:{fontSize:25,fontWeight:'800',color:'#222238',marginTop:5},avatar:{width:44,height:44,borderRadius:15,backgroundColor:'#F1F1FA',alignItems:'center',justifyContent:'center'},balanceCard:{backgroundColor:'#5556D9',padding:23,borderRadius:24},balanceTop:{flexDirection:'row',justifyContent:'space-between'},balanceLabel:{color:'#E4E4FF',fontSize:14},balance:{color:'#FFFFFF',fontSize:34,fontWeight:'800',marginTop:18},balanceFoot:{color:'#DADAFB',marginTop:7,fontSize:12},shortcuts:{flexDirection:'row',justifyContent:'space-between'},shortcut:{alignItems:'center',gap:8,width:'23%'},shortcutIcon:{width:58,height:58,borderRadius:19,backgroundColor:'#F0F0FF',alignItems:'center',justifyContent:'center'},shortcutText:{fontSize:12,color:'#45455B',fontWeight:'600'},listCard:{paddingHorizontal:16},empty:{color:'#85869A',padding:18,textAlign:'center'}});