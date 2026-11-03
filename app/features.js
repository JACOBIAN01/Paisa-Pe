import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Screen} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {FeatureTile} from '../src/components/FeatureTile';
const features=[
 {title:'Cards',description:'Manage virtual cards',icon:'card-outline',href:'/cards'},
 {title:'Budgets',description:'Track monthly spending',icon:'pie-chart-outline',href:'/budgets'},
 {title:'Savings',description:'Plan your savings goals',icon:'flag-outline',href:'/savings'},
 {title:'Bill payments',description:'View sample bills',icon:'receipt-outline',href:'/bills'},
 {title:'Beneficiaries',description:'Manage saved people',icon:'people-outline',href:'/beneficiaries'},
 {title:'Reports',description:'Review spending summaries',icon:'bar-chart-outline',href:'/reports'},
 {title:'Recurring payments',description:'Review scheduled payments',icon:'calendar-outline',href:'/recurring'},
 {title:'Help & support',description:'FAQs and support tickets',icon:'help-circle-outline',href:'/support'},
 {title:'Notification history',description:'Review wallet updates',icon:'notifications-outline',href:'/notifications-center'}
];
export default function FeaturesScreen(){return <Screen><ScreenHeader title="Explore Paisa-Pe" subtitle="Simple tools for everyday money management"/><ScrollView contentContainerStyle={s.content}><View style={s.note}><Text style={s.noteTitle}>A demo wallet, built for learning</Text><Text style={s.noteText}>All cards, bills and balances are sample data. No real money moves through this app.</Text></View><View style={s.grid}>{features.map(item=><FeatureTile key={item.title} {...item} onPress={()=>router.push(item.href)}/>)}</View></ScrollView></Screen>;}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:18},note:{backgroundColor:'#F0F0FF',borderRadius:17,padding:18,gap:5},noteTitle:{color:'#3737A3',fontWeight:'800',fontSize:14},noteText:{color:'#66669A',fontSize:12,lineHeight:18},grid:{flexDirection:'row',flexWrap:'wrap',gap:12}});