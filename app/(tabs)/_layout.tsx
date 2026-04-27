import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform, View } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/Colors';

type TabIconName = 'home' | 'checkmark-circle' | 'happy' | 'person';
type TabIconOutline = 'home-outline' | 'checkmark-circle-outline' | 'happy-outline' | 'person-outline';

const TAB_CONFIG: {
  name: string;
  title: string;
  iconFocused: TabIconName | 'barbell';
  iconDefault: TabIconOutline | 'barbell-outline';
}[] = [
  { name: 'index', title: 'Home', iconFocused: 'home', iconDefault: 'home-outline' },
  { name: 'habits', title: 'Habits', iconFocused: 'checkmark-circle', iconDefault: 'checkmark-circle-outline' },
  { name: 'mood', title: 'Mood', iconFocused: 'happy', iconDefault: 'happy-outline' },
  { name: 'workout-guide', title: 'Guide', iconFocused: 'barbell', iconDefault: 'barbell-outline' },
  { name: 'profile', title: 'Profil', iconFocused: 'person', iconDefault: 'person-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#34D399',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <View style={[
                styles.iconContainer,
                focused && styles.activeIconContainer
              ]}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.iconDefault}
                  size={24}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1A2535',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: Spacing.xs,
    // Modern deep shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
});

