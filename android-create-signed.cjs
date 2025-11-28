const fs = require('fs');
const path = require('path');

// Define paths
const androidRoot = path.join(process.cwd(), 'src-tauri', 'gen', 'android');
const gradlePath = path.join(androidRoot, 'app', 'build.gradle.kts');

// Configuration content strings
const IMPORTS_TO_ADD = [
  'import java.io.FileInputStream',
  'import java.util.Properties' // Added for safety as Properties() requires this
];

const SIGNING_CONFIG_BLOCK = `
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
`;

const RELEASE_CONFIG_LINE = '            signingConfig = signingConfigs.getByName("release")';

function main() {
  // Check if the Android project exists
  if (!fs.existsSync(gradlePath)) {
    console.error(`❌ Error: Could not find file at ${gradlePath}`);
    console.error('   Make sure you have run "tauri android init" and are in the project root.');
    process.exit(1);
  }

  // --- Step 1: Copy keystore.properties ---
  const keystoreSource = path.join(process.cwd(), 'keystore.properties');
  const keystoreDest = path.join(androidRoot, 'keystore.properties');

  if (fs.existsSync(keystoreSource)) {
    try {
      fs.copyFileSync(keystoreSource, keystoreDest);
      console.log(`✅ Copied keystore.properties to ${keystoreDest}`);
    } catch (err) {
      console.error(`❌ Error copying keystore.properties: ${err.message}`);
    }
  } else {
    console.warn(`⚠️  Warning: keystore.properties not found in project root.`);
    console.warn(`   Expected at: ${keystoreSource}`);
    console.warn(`   The build usually fails if this file is missing during a release build.`);
  }

  // --- Step 2: Modify build.gradle.kts ---
  console.log(`\nReading ${gradlePath}...`);
  let content = fs.readFileSync(gradlePath, 'utf-8');
  let originalContent = content;

  // 2.1 Add Imports
  // We prepend them to the file if they aren't already there
  let importsString = '';
  IMPORTS_TO_ADD.forEach((imp) => {
    if (!content.includes(imp)) {
      importsString += `${imp}\n`;
    }
  });

  if (importsString.length > 0) {
    content = importsString + content;
    console.log('✅ Added imports.');
  } else {
    console.log('ℹ️  Imports already present.');
  }

  // 2.2 Add Signing Config Block
  // We look for 'buildTypes {' and insert the signing config before it
  if (!content.includes('create("release")') || !content.includes('keystore.properties')) {
    const buildTypesRegex = /(buildTypes\s*\{)/;
    if (buildTypesRegex.test(content)) {
      content = content.replace(buildTypesRegex, `${SIGNING_CONFIG_BLOCK}\n    $1`);
      console.log('✅ Added signingConfigs block.');
    } else {
      console.error('❌ Error: Could not find "buildTypes {" block to insert signing config.');
    }
  } else {
    console.log('ℹ️  Signing config block already appears to be present.');
  }

  // 2.3 Apply Signing Config to Release Build
  // We look for 'getByName("release") {' and insert the config line immediately after
  if (!content.includes('signingConfig = signingConfigs.getByName("release")')) {
    // This regex looks for: getByName("release") {
    // It handles potential whitespace variations
    const releaseBlockRegex = /(getByName\("release"\)\s*\{)/;
    
    if (releaseBlockRegex.test(content)) {
      content = content.replace(releaseBlockRegex, `$1\n${RELEASE_CONFIG_LINE}`);
      console.log('✅ Applied signing config to release build type.');
    } else {
      console.error('❌ Error: Could not find "getByName("release") {" block.');
    }
  } else {
    console.log('ℹ️  Release build type already configured.');
  }

  // Write changes if any were made
  if (content !== originalContent) {
    fs.writeFileSync(gradlePath, content, 'utf-8');
    console.log('🎉 build.gradle.kts updated successfully!');
  } else {
    console.log('👍 build.gradle.kts is already up to date.');
  }
}

main();