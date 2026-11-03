import { useState } from 'react';
import { StyleSheet,TextInput,View,Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen,Card,PrimaryButton,FieldLabel,BackHeader } from '../src/components/UI';
export default function SendScreen(){
 const [recipient,setRecipient]=useState(''),[amount,setAmount]=useState(''),[note,setNote]=useState('');
 function continuePayment(){
  if(!recipient.trim()||!amount.trim()) return Alert.alert('Missing details','Enter a recipient and amount.');
  router.push({pathname:'/confirm',params:{recipient,amount,note}});
 }
 return <Screen><BackHeader title="Send money"/><View style={styles.content}><Card style={styles.card}>
  <FieldLabel>Mobile number or UPI ID</FieldLabel><TextInput value={recipient} onChangeText={setRecipient} placeholder="e.g. 9876543210" style={styles.input} autoCapitalize="none"/>
  <FieldLabel>Amount (₹)</FieldLabel><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" style={styles.input} keyboardType="decimal-pad"/>
  <FieldLabel>Note (optional)</FieldLabel><TextInput value={note} onChangeText={setNote} placeholder="What's this for?" style={styles.input}/>
 </Card><PrimaryButton label="Continue" onPress={continuePayment}/></View></Screen>;
}
const styles=StyleSheet.create({content:{padding:20,gap:18},card:{padding:20,gap:10},input:{height:52,borderWidth:1,borderColor:'#E7E7EF',borderRadius:13,paddingHorizontal:14,fontSize:15,color:'#222238',marginBottom:12}});
