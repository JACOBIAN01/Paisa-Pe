import { useState } from 'react';
import { Alert,StyleSheet,Text,TextInput,View } from 'react-native';
import { router } from 'expo-router';
import { Screen,Card,PrimaryButton,FieldLabel,BackHeader } from '../src/components/UI';
import { useWallet } from '../src/context/WalletContext';
export default function AddMoneyScreen(){
 const [amount,setAmount]=useState(''); const {addMoney}=useWallet();
 function submit(){
  const result=addMoney(Number(amount));
  if(!result.ok) return Alert.alert('Invalid amount',result.message);
  Alert.alert('Money added','Your wallet balance has been updated.',[{text:'Done',onPress:()=>router.replace('/(tabs)/home')}]);
 }
 return <Screen><BackHeader title="Add money"/><View style={styles.content}><Card style={styles.card}>
  <FieldLabel>Amount to add (₹)</FieldLabel><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" style={styles.input}/>
  <Text style={styles.hint}>Demo mode: no real money is transferred.</Text>
 </Card><PrimaryButton label="Add to wallet" onPress={submit}/></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20,gap:18},card:{padding:20,gap:12},input:{height:54,borderWidth:1,borderColor:'#E7E7EF',borderRadius:13,paddingHorizontal:14,fontSize:18},hint:{color:'#85869A',fontSize:12}});
