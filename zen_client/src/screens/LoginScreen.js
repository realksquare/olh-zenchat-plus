import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, ROUNDING, SHADOWS } from '../theme';
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react-native';
import { AuthContext } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, register } = useContext(AuthContext);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    let result;
    
    if (isLoginMode) {
      result = await login(email, password);
    } else {
      result = await register(email, password);
    }
    
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Authentication Failed', result.error || 'Please check your credentials');
    }
  };

  const toggleMode = () => {
    setIsLoginMode((prev) => !prev);
    setEmail('');
    setPassword('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[COLORS.background, COLORS.surface, COLORS.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ZenChat<Text style={styles.titlePlus}>+</Text></Text>
          <Text style={styles.subtitle}>{isLoginMode ? 'Welcome back.' : 'Create an account.'}</Text>
        </View>

        <View style={[styles.card, SHADOWS.card]}>
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Mail color={COLORS.textMuted} size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              selectionColor={COLORS.primary}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Lock color={COLORS.textMuted} size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              selectionColor={COLORS.primary}
            />
          </View>

          <TouchableOpacity 
            style={styles.buttonContainer}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  {isLoginMode ? (
                    <LogIn color={COLORS.text} size={20} style={styles.icon} />
                  ) : (
                    <UserPlus color={COLORS.text} size={20} style={styles.icon} />
                  )}
                  <Text style={styles.buttonText}>{isLoginMode ? 'Log In' : 'Sign Up'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.switchButton} onPress={toggleMode}>
          <Text style={styles.switchTextContainer}>
            <Text style={styles.switchButtonText}>
              {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Text style={styles.switchButtonHighlight}>
              {isLoginMode ? 'Sign Up' : 'Log In'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryHover,
    opacity: 0.15,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryHover,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -0.5,
  },
  titlePlus: {
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.md,
    marginTop: SPACING.sm,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.xl,
    padding: SPACING.xl,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  buttonContainer: {
    marginTop: SPACING.sm,
    borderRadius: ROUNDING.md,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    height: 56,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  switchButton: {
    marginTop: SPACING.xxl,
    padding: SPACING.sm,
  },
  switchTextContainer: {
    textAlign: 'center',
  },
  switchButtonText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  switchButtonHighlight: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
