import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
const icons={home:'home-outline',activity:'receipt-outline',profile:'person-outline'};
export default function TabsLayout(){
 return <Tabs screenOptions={({route})=>({headerShown:false,tabBarActiveTintColor:'#5B5CE2',tabBarInactiveTintColor:'#85869A',tabBarIcon:({color,size})=><Ionicons name={icons[route.name]} size={size} color={color}/>})}>
  <Tabs.Screen name="home" options={{title:'Home'}}/><Tabs.Screen name="activity" options={{title:'Activity'}}/><Tabs.Screen name="profile" options={{title:'Profile'}}/>
 </Tabs>;
}
