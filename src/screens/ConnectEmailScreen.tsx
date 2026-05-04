import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { colors, spacing } from "@/theme/colors";
import type { EmailProviderId } from "@/types/domain";

import * as Linking from "expo-linking";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useAppData } from "@/providers/AppDataProvider";

const PROVIDERS: { id: EmailProviderId | "custom"; label: string }[] = [
  { id: "gmail", label: "Gmail (via Google)" },
  { id: "outlook", label: "Outlook" },
  { id: "yahoo", label: "Yahoo" },
  { id: "custom", label: "Custom IMAP/SMTP" },
];

export function ConnectEmailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { runInboxScan } = useAppData();
  
  const initialProvider = route.params?.providerId ?? "gmail";
  const [provider, setProvider] = useState<EmailProviderId | "custom">(initialProvider);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [loading, setLoading] = useState(false);

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL("/auth/callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
          },
        },
      });

      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      Alert.alert("Google Auth Error", error instanceof Error ? error.message : "Could not start Google login.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to connect an email account.");
      return;
    }

    if (provider === "gmail") {
      await handleGoogleConnect();
      return;
    }

    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    if (provider === "custom" && (!imapHost || !smtpHost)) {
      Alert.alert("Missing Server Details", "Please enter IMAP and SMTP host details.");
      return;
    }

    setLoading(true);
    console.log("[ConnectEmail] Attempting to connect...", { email, provider });
    try {
      const connectionData = {
        user_id: user.id,
        email,
        provider,
        password_encrypted: password, 
        imap_host: provider === "gmail" ? "imap.gmail.com" : provider === "outlook" ? "outlook.office365.com" : provider === "yahoo" ? "imap.mail.yahoo.com" : imapHost,
        imap_port: provider === "custom" ? parseInt(imapPort) : 993,
        smtp_host: provider === "gmail" ? "smtp.gmail.com" : provider === "outlook" ? "smtp.office365.com" : provider === "yahoo" ? "smtp.mail.yahoo.com" : smtpHost,
        smtp_port: provider === "custom" ? parseInt(smtpPort) : 465,
        is_active: true,
      };
      
      console.log("[ConnectEmail] Inserting into email_connections:", connectionData);
      
      const { data, error } = await supabase.from("email_connections").insert(connectionData).select();

      if (error) {
        console.error("[ConnectEmail] Supabase Error:", error);
        throw error;
      }

      console.log("[ConnectEmail] Success:", data);

      // Automatically trigger a scan to fetch receipts for the new connection
      try {
        console.log("[ConnectEmail] Triggering initial scan...");
        if (provider !== "custom") {
          runInboxScan([provider as any]).catch((e) => console.error("Initial scan error:", e));
        } else {
          runInboxScan().catch((e) => console.error("Initial scan error:", e));
        }
      } catch (scanErr) {
        console.error("[ConnectEmail] Scan trigger failed:", scanErr);
      }

      Alert.alert("Connected", `Successfully connected to ${email}.\n\nScanning for receipts now...`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("[ConnectEmail] Catch Error:", error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      Alert.alert("Connection Error", message + "\n\nMake sure you have run the database migration script provided.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SectionTitle
            title="Connect Email"
            subtitle="Link your inbox to automatically scan for receipts."
          />

          <Card>
            <Text style={styles.label}>Select Provider</Text>
            <View style={styles.providerGrid}>
              {PROVIDERS.map((p) => {
                const selected = provider === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setProvider(p.id)}
                    style={[styles.providerChip, selected && styles.providerChipActive]}
                  >
                    <Text style={[styles.providerChipText, selected && styles.providerChipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card>
            {provider !== "gmail" ? (
              <>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. name@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.label}>App Password / Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </>
            ) : (
              <View style={styles.googleInfo}>
                <Text style={styles.googleInfoText}>
                  Connect your Google account to securely scan your Gmail inbox for receipts.
                </Text>
              </View>
            )}

            {provider === "custom" && (
              <View style={styles.customSection}>
                <Text style={styles.groupTitle}>Server Settings</Text>

                <View style={styles.row}>
                  <View style={{ flex: 3 }}>
                    <Text style={styles.label}>IMAP Host</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="imap.example.com"
                      placeholderTextColor={colors.textMuted}
                      value={imapHost}
                      onChangeText={setImapHost}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.label}>Port</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="993"
                      placeholderTextColor={colors.textMuted}
                      value={imapPort}
                      onChangeText={setImapPort}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 3 }}>
                    <Text style={styles.label}>SMTP Host</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="smtp.example.com"
                      placeholderTextColor={colors.textMuted}
                      value={smtpHost}
                      onChangeText={setSmtpHost}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.label}>Port</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="465"
                      placeholderTextColor={colors.textMuted}
                      value={smtpPort}
                      onChangeText={setSmtpPort}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}
          </Card>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Tip: For Gmail, Yahoo, and Outlook, you must create an "App Password" in your account security settings to connect successfully.
            </Text>
            <View style={styles.helpLinks}>
              <Pressable onPress={() => Linking.openURL("https://support.google.com/accounts/answer/185833")}>
                <Text style={styles.helpLinkText}>Gmail Help</Text>
              </Pressable>
              <Text style={styles.bullet}>•</Text>
              <Pressable onPress={() => Linking.openURL("https://help.yahoo.com/kb/SLN15241.html")}>
                <Text style={styles.helpLinkText}>Yahoo Help</Text>
              </Pressable>
              <Text style={styles.bullet}>•</Text>
              <Pressable onPress={() => Linking.openURL("https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-58018d96-5812-4d1d-ad19-62d55f7574e2")}>
                <Text style={styles.helpLinkText}>Outlook Help</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.connectButton, loading && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.connectButtonText}>
                {provider === "gmail" ? "Continue with Google" : "Connect Account"}
              </Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  providerChip: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  providerChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  providerChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  providerChipTextActive: {
    color: colors.primary,
  },
  customSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  groupTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 15,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
  },
  googleInfo: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  googleInfoText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: colors.infoSoft,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.info,
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.infoStrong,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  helpLinks: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  helpLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bullet: {
    color: colors.textMuted,
    fontSize: 12,
  },
  connectButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },
});
