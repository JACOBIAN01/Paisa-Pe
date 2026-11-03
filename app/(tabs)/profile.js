import { StyleSheet,Text,View,Pressable,ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen,Card } from '../../src/components/UI';
import { useWallet } from '../../src/context/WalletContext';
const options=[{label:'Personal information',icon:'person-outline',href:'/personal-info'},{label:'Money requests',icon:'cash-outline',href:'/requests'},{label:'Notifications',icon:'notifications-outline',href:'/notifications'},{label:'Device information',icon:'phone-portrait-outline',href:'/device-info'},{label:'App settings',icon:'settings-outline',href:'/settings'}];
export default function ProfileScreen(){
 const {profile}=useWallet();
 return <Screen><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Profile</Text>
  <Card style={styles.identity}><View style={styles.avatar}><Ionicons name="person" size={30} color="#5B5CE2"/></View><Text style={styles.name}>{profile.name}</Text><Text style={styles.phone}>{profile.phone}</Text></Card>
  <Card style={styles.menu}>{options.map(item=><Link href={item.href} key={item.label} asChild><Pressable style={styles.option}><Ionicons name={item.icon} size={21} color="#5B5CE2"/><Text style={styles.optionText}>{item.label}</Text><Ionicons name="chevron-forward" size={18} color="#A1A1B2"/></Pressable></Link>)}</Card>
 </ScrollView></Screen>;
}
const styles=StyleSheet.create({content:{padding:20,paddingTop:40,gap:22},title:{fontSize:28,fontWeight:'800',color:'#222238'},identity:{alignItems:'center',padding:25},avatar:{width:70,height:70,borderRadius:24,backgroundColor:'#EEEEFF',alignItems:'center',justifyContent:'center'},name:{fontSize:19,fontWeight:'800',color:'#222238',marginTop:13},phone:{color:'#85869A',marginTop:4},menu:{paddingHorizontal:16},option:{flexDirection:'row',alignItems:'center',gap:13,paddingVertical:17,borderBottomColor:'#F0F0F4',borderBottomWidth:1},optionText:{flex:1,color:'#303047',fontWeight:'600'}});
