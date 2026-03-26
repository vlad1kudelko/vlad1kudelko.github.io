---
title: "Kotlin Multiplatform: кроссплатформа"
description: "Kotlin Multiplatform: написание общего кода для Android, iOS, Backend и Web"
heroImage: "../../../../assets/imgs/2025/12/24-kotlin-multiplatform.webp"
pubDate: "2025-12-24"
---

Kotlin Multiplatform (KMP) позволяет делиться кодом между различными платформами.

## Настройка проекта

```kotlin
// build.gradle.kts
plugins {
    kotlin("multiplatform") version "1.9.20"
}

kotlin {
    android()
    ios()
    jvm()
    js()
    
    sourceSets {
        commonMain {
            dependencies {
                // Общий код
            }
        }
        androidMain {
            dependencies {
                // Android специфичный
            }
        }
    }
}
```

## Shared Code

```kotlin
// commonMain/kotlin/SharedCode.kt
expect class Logger() {
    fun log(message: String)
}

actual class Logger {
    actual fun log(message: String) {
        console.log(message)
    }
}
```

## Ожидаемые объявления

```kotlin
// common
expect fun getPlatform(): String

// Android
actual fun getPlatform(): String = "Android"

// iOS  
actual fun getPlatform(): String = "iOS"
```

## Koin для KMP

```kotlin
// common
expect val module: Module

// Android
actual val module = module {
    single { AndroidPlatform() }
}

// iOS
actual val module = module {
    single { IOSPlatform() }
}
```

## Ktor Client

```kotlin
val httpClient = HttpClient {
    install(ContentNegotiation) {
        json()
    }
}

val data: Data = httpClient.get("https://api.example.com/data").body()
```

## SQLDelight

```kotlin
// common
expect val database: Database

// Android
actual val database = Database(
    AndroidSqliteDriver(Schema, context, "db")
)

// iOS
actual val database = Database(
    IosSimulatorDriver(Schema, "db")
)
```

## Заключение

KMP позволяет эффективно делиться кодом между платформами, сохраняя нативную производительность.