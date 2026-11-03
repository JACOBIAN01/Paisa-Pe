import {useState} from 'react';
import {Alert,ScrollView,StyleSheet,Text} from 'react-native';
import {useLocalSearchParams,router} from 'expo-router';
import {Screen,PrimaryButton} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {FormField} from '../src/components/FormField';
import {useFeatures} from '../src/context/FeatureContext';
export default function GoalContributionScreen(){const {id}=useLocalSearchParams();const {goals,addContribution}=useFeatures();const goal=goals.find(item=>item.id===id);const [amount,setAmount]=useState('');function submit(){const value=Number(amount);if(!Number.isFinite(value)||value<=0)return Alert.alert('Invalid amount','Enter an amount greater than zero.');if(!goal)return Alert.alert('Goal not found','Go back and select a goal.');addContribution(goal.id,value);Alert.alert('Contribution added','Your goal has been updated.',[{text:'Done',onPress:()=>router.back()}]);}return <Screen><ScreenHeader title="Add contribution" subtitle={goal?goal.name:'Savings goal'}/><ScrollView contentContainerStyle={s.content}>{goal?<Text style={s.info}>Saved ₹{goal.saved.toLocaleString('en-IN')} of ₹{goal.target.toLocaleString('en-IN')}</Text>:null}<FormField label="Contribution amount" value={amount} onChangeText={setAmount} placeholder="Enter amount" keyboardType="numeric"/><PrimaryButton label="Add to goal" onPress={submit}/></ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:18},info:{fontSize:13,color:'#77778C'}});