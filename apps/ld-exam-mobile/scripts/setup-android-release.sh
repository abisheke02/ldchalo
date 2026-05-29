#!/bin/bash
# ─── Android Release Signing Setup ─────────────────────────────────────────────
# Run this ONCE after `npx react-native init` generates the android/ directory.
# It creates a keystore and wires it into Gradle.

set -e

PACKAGE_NAME="${1:-com.ldplatform.india}"
KEY_ALIAS="${2:-ld-release-key}"
KEYSTORE_FILE="android/app/ld-release.keystore"

echo "=== LD Platform — Android Release Setup ==="
echo "Package:   $PACKAGE_NAME"
echo "Alias:     $KEY_ALIAS"
echo ""

# 1. Generate keystore
echo "Generating release keystore…"
keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=LD Platform, OU=Mobile, O=LD Support, L=India, S=India, C=IN"

echo ""
echo "Keystore created at: $KEYSTORE_FILE"
echo ""

# 2. Prompt for passwords
read -s -p "Keystore password (you just set it): " STORE_PASS
echo ""
read -s -p "Key password (same or different):   " KEY_PASS
echo ""

# 3. Write android/key.properties
cat > android/key.properties <<EOF
storePassword=$STORE_PASS
keyPassword=$KEY_PASS
keyAlias=$KEY_ALIAS
storeFile=ld-release.keystore
EOF

echo "Written: android/key.properties"
echo ""

# 4. Remind about build.gradle changes
echo "=== Next: add signing config to android/app/build.gradle ==="
echo ""
echo "Add this BEFORE the android { block:"
echo ""
echo "  def keystoreProps = new Properties()"
echo "  def keystoreFile = rootProject.file('key.properties')"
echo "  if (keystoreFile.exists()) keystoreProps.load(new FileInputStream(keystoreFile))"
echo ""
echo "Then inside android { add:"
echo ""
echo "  signingConfigs {"
echo "    release {"
echo "      storeFile file(keystoreProps['storeFile'])"
echo "      storePassword keystoreProps['storePassword']"
echo "      keyAlias keystoreProps['keyAlias']"
echo "      keyPassword keystoreProps['keyPassword']"
echo "    }"
echo "  }"
echo "  buildTypes {"
echo "    release {"
echo "      signingConfig signingConfigs.release"
echo "      minifyEnabled true"
echo "      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'"
echo "    }"
echo "  }"
echo ""

# 5. Build release AAB
echo "=== Build release AAB (for Play Store) ==="
echo "  cd android && ./gradlew bundleRelease"
echo ""
echo "Output: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "=== Done! Upload app-release.aab to Google Play Console ==="
