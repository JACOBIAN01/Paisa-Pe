import {useState} from 'react';
import {Alert,ScrollView,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {Screen,PrimaryButton} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {FormField} from '../src/components/FormField';
import {useFeatures} from '../src/context/FeatureContext';
export default function AddBeneficiaryScreen(){const {addBeneficiary}=useFeatures();const [name,setName]=useState('');const [upi,setUpi]=useState('');const [bank,setBank]=useState('');function submit(){if(!name.trim()||!upi.trim())return Alert.alert('Missing details','Enter a name and UPI ID.');addBeneficiary({name:name.trim(),upi:upi.trim(),bank:bank.trim()||'Not specified',favorite:false});Alert.alert('Beneficiary added','The person has been added to your local list.',[{text:'Done',onPress:()=>router.back()}]);}return <Screen><ScreenHeader title="Add beneficiary" subtitle="Save a person for later"/><ScrollView contentContainerStyle={s.content}><FormField label="Full name" value={name} onChangeText={setName} placeholder="Enter name"/><FormField label="UPI ID" value={upi} onChangeText={setUpi} placeholder="name@mockupi"/><FormField label="Bank (optional)" value={bank} onChangeText={setBank} placeholder="Bank name"/><PrimaryButton label="Save beneficiary" onPress={submit}/></ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:18}});