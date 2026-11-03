import { useState } from 'react';
import { Alert,StyleSheet,TextInput,View } from 'react-native';
import { router } from 'expo-router';
import { Screen,Card,PrimaryButton,FieldLabel,BackHeader } from '../src/components/UI';
import { useWallet } from '../src/context/WalletContext';
export default function RequestScreen(){
 const [from,setFrom]=useState(''),[amount,setAmount]=useState('');
 const {requestMoney}=useWallet();
 function submit(){
  if(!from.trim()||!amount) return Alert.alert('Missing details','Enter a person and amount.');
  requestMoney(from,Number(amount));
  Alert.alert('Request created','Your money request has been saved.',[{text:'OK',onPress:()=>router.back()}]);
 }
 return <Screen><BackHeader title="Request money"/><View style={styles.content}><Card style={styles.card}>
  <FieldLabel>Request from</FieldLabel><TextInput value={from} onChangeText={setFrom} placeholder="Name or mobile number" style={styles.input}/>
  <FieldLabel>Amount (₹)</FieldLabel><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" style={styles.input}/>
 </Card><PrimaryButton label="Send request" onPress={submit}/></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20,gap:18},card:{padding:20,gap:10},input:{height:52,borderWidth:1,borderColor:'#E7E7EF',borderRadius:13,paddingHorizontal:14,marginBottom:12}});
