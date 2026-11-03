import { StyleSheet,Text,View } from 'react-native';
import { Screen,BackHeader,Card } from '../src/components/UI';
import { useWallet } from '../src/context/WalletContext';
export default function PersonalInfoScreen(){
 const {profile}=useWallet();
 return <Screen><BackHeader title="Personal information"/><View style={styles.content}><Card style={styles.card}>
  <Text style={styles.label}>Name</Text><Text style={styles.value}>{profile.name}</Text>
  <Text style={styles.label}>Mobile</Text><Text style={styles.value}>{profile.phone}</Text>
  <Text style={styles.label}>Email</Text><Text style={styles.value}>{profile.email}</Text>
 </Card></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20},card:{padding:20,gap:9},label:{fontSize:12,color:'#85869A'},value:{fontSize:16,color:'#222238',fontWeight:'700',marginBottom:12}});
