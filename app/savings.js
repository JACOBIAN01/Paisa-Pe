import {ScrollView,StyleSheet,Text,View,Pressable} from 'react-native';
import {Link,router} from 'expo-router';
import {Screen,PrimaryButton} from '../src/components/UI';
import {ScreenHeader} from '../src/components/ScreenHeader';
import {ProgressBar} from '../src/components/ProgressBar';
import {useFeatures} from '../src/context/FeatureContext';
export default function SavingsScreen(){
 const {goals}=useFeatures();
 return <Screen><ScreenHeader title="Savings goals" subtitle="Small steps add up"/><ScrollView contentContainerStyle={s.content}>
  {goals.map(goal=><View key={goal.id} style={s.card}>
   <View style={s.top}><Text style={s.emoji}>{goal.emoji||'🎯'}</Text><View style={{flex:1}}><Text style={s.name}>{goal.name}</Text><Text style={s.due}>Target date: {goal.due}</Text></View></View>
   <Text style={s.saved}>₹{goal.saved.toLocaleString('en-IN')} <Text style={s.target}>of ₹{goal.target.toLocaleString('en-IN')}</Text></Text>
   <ProgressBar value={goal.saved} total={goal.target} color="#16A36A"/>
   <Text style={s.due}>{Math.min(100,Math.round(goal.saved/goal.target*100))}% completed</Text>
   <Link href={'/goal-contribution?id='+goal.id} asChild><Pressable style={s.action}><Text style={s.actionText}>Add contribution</Text></Pressable></Link>
  </View>)}
  <Pressable onPress={()=>router.push('/create-goal')}><PrimaryButton label="Create a savings goal"/></Pressable>
 </ScrollView></Screen>;
}
const s=StyleSheet.create({content:{padding:20,paddingTop:4,gap:15},card:{backgroundColor:'#FFFFFF',borderRadius:18,borderWidth:1,borderColor:'#EEEEF4',padding:17,gap:12},top:{flexDirection:'row',alignItems:'center',gap:12},emoji:{fontSize:28},name:{fontWeight:'800',color:'#303047',fontSize:15},due:{fontSize:11,color:'#85869A'},saved:{fontSize:22,fontWeight:'800',color:'#16A36A'},target:{color:'#85869A',fontSize:12,fontWeight:'400'},action:{alignSelf:'flex-start',backgroundColor:'#F0F0FF',paddingHorizontal:13,paddingVertical:9,borderRadius:10},actionText:{color:'#5B5CE2',fontSize:11,fontWeight:'800'}});
