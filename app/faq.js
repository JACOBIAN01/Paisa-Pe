import {useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {faqs} from '../src/data/faqs';
export default function FAQScreen(){const [expanded,setExpanded]=useState('faq-1');return <Screen><ScreenHeader title="FAQs" subtitle="Answers to common questions"/><ScrollView contentContainerStyle={s.content}>{faqs.map(item=><View key={item.id} style={s.card}><Pressable onPress={()=>setExpanded(expanded===item.id?'':item.id)} style={s.question}><Text style={s.questionText}>{item.question}</Text><Ionicons name={expanded===item.id?'chevron-up':'chevron-down'} size={18} color="#7777A0"/></Pressable>{expanded===item.id?<Text style={s.answer}>{item.answer}</Text>:null}</View>)}</ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:11},card:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#EEEEF4',borderRadius:15,padding:15,gap:10},question:{flexDirection:'row',alignItems:'center',gap:10},questionText:{flex:1,color:'#303047',fontWeight:'700',fontSize:13},answer:{color:'#77778C',fontSize:12,lineHeight:19,paddingRight:18}});