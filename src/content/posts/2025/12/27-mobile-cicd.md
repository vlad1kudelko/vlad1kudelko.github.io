---
title: "Mobile CI/CD: Fastlane и EAS — автоматизация билдов"
description: "Автоматизируйте сборку и релиз мобильных приложений: GitHub Actions, Fastlane, EAS, Firebase App Distribution. Ускорьте доставку обновлений."
heroImage: "../../../../assets/imgs/2025/12/27-mobile-cicd.webp"
pubDate: "2025-12-27"
---

# CI/CD для мобильных приложений

CI/CD для мобильных приложений требует специальных инструментов и подходов. В отличие от веба, мобильные приложения требуют сборки под конкретную платформу, подписи и прохождения ревью в сторах. Автоматизация этих процессов критически важна для частых релизов.

## GitHub Actions для iOS

GitHub Actions позволяет автоматизировать сборку iOS приложений на macOS runner'ах.

```yaml
name: iOS CI/CD

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_15.0.app

      - name: Cache Pods
        uses: actions/cache@v3
        with:
          path: Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}

      - name: Install dependencies
        run: pod install

      - name: Build
        run: xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug build

      - name: Upload Build
        uses: actions/upload-artifact@v3
        with:
          name: app.ipa
          path: build/App.ipa
```

Кэширование Pods ускоряет сборку на 2-3 минуты. Указывайте конкретную версию Xcode для воспроизводимости.

## Fastlane

Fastlane — инструмент для автоматизации рутинных задач: сборка, скриншоты, публикация.

```ruby
# Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    match(type: "appstore")
    gym(scheme: "App")
    pilot(distribute_external: false)
  end

  desc "Build and upload to Firebase App Distribution"
  lane :firebase do
    match(type: "development")
    gym(scheme: "App")
    firebase_app_distribution(
      app: "1:123456789:ios:abc123",
      testers: "tester@example.com",
      groups: "qa-team"
    )
  end
end
```

`match` синхронизирует сертификаты через Git. `gym` собирает IPA, `pilot` загружает в TestFlight.

Fastlane автоматизирует рутинные задачи: подпись, сборку, загрузку в сторы.

## Android CI/CD

```yaml
name: Android CI/CD

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Gradle
        uses: gradle/wrapper-validation-action@v1
      
      - name: Cache Gradle
        uses: actions/cache@v3
        with:
          path: ~/.gradle/caches
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}
      
      - name: Build
        run: ./gradlew assembleDebug
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-debug.apk
          path: app/build/outputs/apk/debug/app-debug.apk
```

## Firebase App Distribution

```yaml
- name: Upload to Firebase
  uses: wzieba/Firebase-Distribution-Github-Action@v1
  with:
    appId: ${{ secrets.FIREBASE_APP_ID }}
    serviceCredentialsFileContent: ${{ secrets.FIREBASE_SERVICE_JSON }}
    groups: testers
    file: app/build/outputs/apk/debug/app-debug.apk
```

## GitHub Actions для Flutter

```yaml
name: Flutter CI/CD

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      
      - name: Install dependencies
        run: flutter pub get
      
      - name: Analyze
        run: flutter analyze
      
      - name: Build APK
        run: flutter build apk --debug
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app.apk
          path: build/app/outputs/flutter-apk/app.apk
```

## Code Signing

### iOS

```yaml
- name: Import Certificate
  env:
    CERTIFICATE: ${{ secrets.CERTIFICATE }}
    KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
    CERTIFICATE_PWD: ${{ secrets.CERTIFICATE_PWD }}
  run: |
    # create keychain
    security create-keychain -p mykeychainpass
    security set-keychain-settings -lut 21600
    security unlock-keychain -p mykeychainpass
    
    # import certificate
    echo -n "$CERTIFICATE" | base64 --decode -o certificate.p12
    security import certificate.p12 -P $CERTIFICATE_PWD -A -t cert
```

### Android

```yaml
- name: Decode keystore
  run: echo ${{ secrets.ANDROID_KEYSTORE }} | base64 --decode > keystore.jks
```

## Заключение

Автоматизация CI/CD значительно ускоряет разработку и доставку мобильных приложений.