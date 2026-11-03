import {useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Screen,PrimaryButton} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {SearchField} from '../src/components/SearchField';
import {ActionRow} from '../src/components/ActionRow';
import {useFeatures} from '../src/context/FeatureContext';
export default function BeneficiariesScreen(){const {beneficiaries}=useFeatures();const [query,setQuery]=useState('');const filtered=beneficiaries.filter(person=>person.name.toLowerCase().includes(query.toLowerCase()));return <Screen><ScreenHeader title="Beneficiaries" subtitle="People you send money to"/><ScrollView contentContainerStyle={s.content}><SearchField value={query} onChangeText={setQuery} placeholder="Search name or UPI ID"/>{filtered.map(person=><View key={person.id} style={s.person}><ActionRow title={person.name} subtitle={person.upi+' · '+person.bank} icon="person-circle-outline" trailing={<Text style={s.star}>{person.favorite?'★':''}</Text>}/></View>)}<PrimaryButton label="Add beneficiary" onPress={()=>router.push('/add-beneficiary')}/></ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:12},person:{backgroundColor:'#FFFFFF',paddingHorizontal:14,borderRadius:15,borderWidth:1,borderColor:'#EEEEF4'},star:{color:'#E9A12C',fontSize:20}});