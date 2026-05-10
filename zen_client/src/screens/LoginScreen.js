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
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, ROUNDING, SHADOWS } from '../theme';
import { Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react-native';
import { AuthContext } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { login, register } = useContext(AuthContext);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const criteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains a special char', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (!isLoginMode && !criteria.every(c => c.met)) {
      Alert.alert('Incomplete', 'Password does not meet all criteria.');
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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ZenChat+</Text>
          <Text style={styles.subtitle}>{isLoginMode ? 'Welcome back.' : 'Create an account.'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={COLORS.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              selectionColor={COLORS.primary}
            />
          </View>

          <View style={[styles.inputGroup, styles.passwordGroup]}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              selectionColor={COLORS.primary}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? <EyeOff size={18} color={COLORS.textDim} /> : <Eye size={18} color={COLORS.textDim} />}
            </TouchableOpacity>
          </View>

          {!isLoginMode && (
            <View style={styles.criteriaBox}>
              {criteria.map((c, i) => (
                <View key={i} style={styles.criteriaRow}>
                  {c.met 
                    ? <CheckCircle2 size={12} color={COLORS.success} /> 
                    : <Circle size={12} color={COLORS.textDim} />}
                  <Text style={[styles.criteriaText, c.met && styles.criteriaMet]}>{c.label}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            activeOpacity={0.7}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>{isLoginMode ? 'Log In' : 'Sign Up'}</Text>
            )}
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    marginTop: SPACING.xs,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.xl,
    padding: SPACING.xxl,
    ...SHADOWS.card,
  },
  inputGroup: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  passwordGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.sm,
  },
  eyeBtn: {
    padding: SPACING.xs,
  },
  criteriaBox: {
    marginBottom: SPACING.lg,
    gap: 6,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criteriaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  criteriaMet: {
    color: COLORS.success,
  },
  input: {
    color: COLORS.text,
    height: 48,
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDING.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSizes.sm,
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
