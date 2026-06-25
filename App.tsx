import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation/types';
import HomeScreen from './src/screens/HomeScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import WineDetailScreen from './src/screens/WineDetailScreen';
import AddTastingScreen from './src/screens/AddTastingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#7b2d44' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'my-wine' }} />
          <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: '라벨 촬영' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: '인식 결과 확인' }} />
          <Stack.Screen name="WineDetail" component={WineDetailScreen} options={{ title: '와인 상세' }} />
          <Stack.Screen name="AddTasting" component={AddTastingScreen} options={{ title: '기록 추가' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
