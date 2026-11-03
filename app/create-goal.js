import {useState} from 'react';
import {Alert,ScrollView,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {Screen,PrimaryButton} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {FormField} from '../src/components/FormField';
import {useFeatures} from '../src/context/FeatureContext';
export default function CreateGoalScreen(){const {addGoal}=useFeatures();const [name,setName]=useState('');const [target,setTarget]=useState('');const [due,setDue]=useState('');function submit(){if(!name.trim()||!Number.isFinite(Number(target))||Number(target)<=0)return Alert.alert('Check your details','Enter a goal name and a valid target amount.');addGoal({name:name.trim(),target:Number(target),due:due.trim()||'Not set',emoji:'🎯'});Alert.alert('Goal created','Your new savings goal is ready.',[{text:'Done',onPress:()=>router.back()}]);}return <Screen><ScreenHeader title="New savings goal" subtitle="Choose something worth saving for"/><ScrollView contentContainerStyle={s.content}><FormField label="Goal name" value={name} onChangeText={setName} placeholder="e.g. New headphones"/><FormField label="Target amount" value={target} onChangeText={setTarget} placeholder="e.g. 12000" keyboardType="numeric"/><FormField label="Target date (optional)" value={due} onChangeText={setDue} placeholder="e.g. 30 Jun 2027"/><PrimaryButton label="Create goal" onPress={submit}/></ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:18}});