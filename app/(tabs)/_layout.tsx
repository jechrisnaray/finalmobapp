import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/Colors';

type TabIconName = 'home' | 'checkmark-circle' | 'happy' | 'person';
type TabIconOutline = 'home-outline' | 'checkmark-circle-outline' | 'happy-outline' | 'person-outline';

const TAB_CONFIG: {
  name: string;
  title: string;
  iconFocused: TabIconName;
  iconDefault: TabIconOutline;
}[] = [
  { name: 'index', title: 'Home', iconFocused: 'home', iconDefault: 'home-outline' },
  { name: 'habits', title: 'Habits', iconFocused: 'checkmark-circle', iconDefault: 'checkmark-circle-outline' },
  { name: 'mood', title: 'Mood', iconFocused: 'happy', iconDefault: 'happy-outline' },
  { name: 'profile', title: 'Profil', iconFocused: 'person', iconDefault: 'person-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
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
              <View style={focused ? styles.activeIconContainer : undefined}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.iconDefault}
                  size={focused ? 26 : 24}
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
    backgroundColor: Colors.backgroundLight,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  activeIconContainer: {
    backgroundColor: Colors.primaryFaded,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
