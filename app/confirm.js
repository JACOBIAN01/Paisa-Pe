import { useLocalSearchParams,router } from 'expo-router';
import { Alert,StyleSheet,Text,View } from 'react-native';
import { Screen,Card,PrimaryButton,BackHeader } from '../src/components/UI';
import { useWallet } from '../src/context/WalletContext';
import { money } from '../src/utils/money';
export default function ConfirmScreen(){
 const {recipient,amount,note}=useLocalSearchParams();
 const {sendMoney}=useWallet();
 function confirm(){
  const result=sendMoney(String(recipient),Number(amount),String(note||''));
  if(!result.ok) return Alert.alert('Payment failed',result.message);
  Alert.alert('Payment successful','Your payment has been recorded.',[{text:'Done',onPress:()=>router.replace('/(tabs)/home')}]);
 }
 return <Screen><BackHeader title="Confirm payment"/><View style={styles.content}><Card style={styles.card}>
  <Text style={styles.label}>You are sending</Text><Text style={styles.amount}>{money(Number(amount))}</Text>
  <Text style={styles.label}>To</Text><Text style={styles.value}>{recipient}</Text>
  {!!note&&<><Text style={styles.label}>Note</Text><Text style={styles.value}>{note}</Text></>}
 </Card><PrimaryButton label="Confirm and pay" onPress={confirm}/></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20,gap:20},card:{padding:24,gap:12},label:{fontSize:12,color:'#85869A'},amount:{fontSize:34,fontWeight:'800',color:'#222238'},value:{fontSize:16,fontWeight:'700',color:'#303047'}});
