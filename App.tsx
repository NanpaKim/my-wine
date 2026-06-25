import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation/types';
import { colors, font } from './src/ui/theme';
import HomeScreen from './src/screens/HomeScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import WineDetailScreen from './src/screens/WineDetailScreen';
import AddTastingScreen from './src/screens/AddTastingScreen';
import EditWineScreen from './src/screens/EditWineScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** 다크 디자인 시스템에 맞춘 네비게이션 테마. */
const navTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: 'transparent',
    notification: colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.gold,
            headerTitleStyle: { color: colors.text, fontSize: font.heading.fontSize, fontWeight: '800' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'my·wine' }} />
          <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: '라벨 촬영' }} />
          <Stack.Screen name="WineDetail" component={WineDetailScreen} options={{ title: '와인 상세' }} />
          <Stack.Screen name="AddTasting" component={AddTastingScreen} options={{ title: '기록 추가' }} />
          <Stack.Screen name="EditWine" component={EditWineScreen} options={{ title: '와인 정보 수정' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
