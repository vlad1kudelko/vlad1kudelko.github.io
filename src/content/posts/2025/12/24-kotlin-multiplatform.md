---
title: "Kotlin Multiplatform: кроссплатформа — общий код"
description: "Пишите общий код для Android, iOS, Backend и Web с Kotlin Multiplatform. Настройка проекта, shared code, UI — начните с нуля."
heroImage: "../../../../assets/imgs/2025/12/24-kotlin-multiplatform.webp"
pubDate: "2025-12-24"
---

# Kotlin Multiplatform: общий код для всех платформ

Kotlin Multiplatform (KMP) позволяет делиться кодом между различными платформами. Вы можете писать бизнес-логику на Kotlin и использовать её в Android, iOS, backend и web приложениях. При этом UI остаётся нативным для каждой платформы.

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

## Преимущества KMP

**Экономия времени:**
- До 70% кода может быть общим
- Единая бизнес-логика для всех платформ
- Синхронизация фич между iOS и Android

**Нативная производительность:**
- Компиляция в нативный код (не WebView)
- Прямой доступ к API платформы
- Никаких мостов для выполнения кода

**Гибкость:**
- Постепенное внедрение в существующие проекты
- Выбор уровня шаринга (логика, UI, данные)
- Совместимость с любыми нативными библиотеками

## Архитектура KMP проекта

```
shared/                    # Общий модуль
├── commonMain/           # Код для всех платформ
│   ├── kotlin/
│   │   ├── data/        # Модели данных
│   │   ├── domain/      # Бизнес-логика
│   │   └── utils/       # Утилиты
│   └── resources/       # Общие ресурсы
├── androidMain/         # Android реализация
├── iosMain/            # iOS реализация
├── jvmMain/            # JVM реализация
└── jsMain/             # JS реализация
```

## Паттерны в KMP

**Expect/Actual:**
```kotlin
// commonMain
expect class Platform {
    val name: String
}

// androidMain
actual class Platform {
    actual val name: String = "Android ${Build.VERSION.SDK_INT}"
}

// iosMain
actual class Platform {
    actual val name: String = "iOS ${UIDevice.currentDevice.systemVersion()}"
}
```

**Dependency Injection:**
- Koin — лёгкий DI для KMP
- Kodein — альтернатива с похожим API
- Руной сборка графа зависимостей

## Тестирование

```kotlin
// commonTest
class SharedTests {
    @Test
    fun testBusinessLogic() {
        val repo = UserRepository()
        assertEquals("John", repo.getUserName(1))
    }
}

// Запуск тестов
./gradlew jvmTest
./gradlew androidTest
./gradlew iosTest
```

## Публикация библиотеки

```kotlin
// build.gradle.kts
plugins {
    id("com.vanniktech.maven.publish")
}

mavenPublishing {
    publishToMavenCentral()
    signAllPublications()
}

// Публикация
./gradlew publishToMavenLocal
```

## Популярные KMP библиотеки

- **Ktor** — HTTP клиент/сервер
- **SQLDelight** — типобезопасная работа с БД
- **Kotlinx Serialization** — сериализация JSON/XML
- **Kotlinx Coroutines** — асинхронность
- **Kermit** — логирование
- **Moko** — набор библиотек для KMP

## Ограничения

- UI требует нативной реализации или Compose Multiplatform
- Некоторые платформы имеют ограниченную поддержку
- Увеличенное время сборки при большом количестве платформ
- Меньше готовых решений по сравнению с чистым Kotlin

## Когда использовать KMP

**Подходит:**
- Кроссплатформенное приложение с общей логикой
- Существующие нативные приложения нужно объединить
- Команда знает Kotlin

**Не подходит:**
- Приложение только для одной платформы
- Требуется максимальная производительность UI
- Команда не знает Kotlin
