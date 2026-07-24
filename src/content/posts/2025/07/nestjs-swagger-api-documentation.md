---
title: "NestJS + Swagger: документация API"
description: "Подробное руководство по интеграции Swagger/OpenAPI с NestJS: автоматическая генерация документации API, декораторы, схемы, аутентификация и лучшие практики."
heroImage: "../../../../assets/imgs/2025/07/nestjs-swagger-api-documentation.webp"
pubDate: "2025-07-31"
---

# Документация API: NestJS + Swagger

**Swagger/OpenAPI** — это мощный инструмент для автоматической генерации интерактивной документации API. В сочетании с NestJS он предоставляет элегантный способ создания, тестирования и документирования ваших API endpoints. В этой статье мы рассмотрим, как эффективно интегрировать Swagger с NestJS для создания профессиональной документации API.

## 1. Установка и базовая настройка

Для начала работы с Swagger в NestJS необходимо установить необходимые пакеты:

```bash
npm install @nestjs/swagger swagger-ui-express
npm install --save-dev @types/swagger-ui-express
```

**Объяснение пакетов:**
- `@nestjs/swagger` — модуль для интеграции Swagger с NestJS
- `swagger-ui-express` — Express middleware для отображения Swagger UI
- `@types/swagger-ui-express` — TypeScript типы для swagger-ui-express

## 2. Настройка Swagger в приложении

Первым шагом является настройка Swagger в главном файле приложения. Это включает в себя конфигурацию основных параметров документации, таких как заголовок, описание, версия и контактная информация.

**Основные компоненты настройки:**

1. **DocumentBuilder** — класс для создания конфигурации Swagger документа
2. **SwaggerModule** — модуль NestJS для интеграции Swagger
3. **setup** — метод для настройки Swagger UI

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('Описание API для NestJS приложения')
    .setVersion('1.0')
    .addTag('users', 'Операции с пользователями')
    .addTag('auth', 'Аутентификация и авторизация')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

**Пояснения к конфигурации:**
- `setTitle()` — устанавливает заголовок документации
- `setDescription()` — добавляет общее описание API
- `setVersion()` — указывает версию API
- `addTag()` — добавляет теги для группировки endpoints
- `addBearerAuth()` — добавляет поддержку Bearer токенов для аутентификации

## 3. Создание DTO с декораторами Swagger

DTO (Data Transfer Objects) — это объекты, которые определяют структуру данных для входящих запросов. В NestJS с Swagger мы можем использовать специальные декораторы для автоматической генерации схем.

**Основные декораторы для DTO:**

1. **@ApiProperty()** — описывает свойства объекта
2. **@ApiPropertyOptional()** — для необязательных свойств
3. **@ApiHideProperty()** — скрывает свойство из документации

```typescript
// src/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Имя пользователя',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'john@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Пароль пользователя',
    example: 'securePassword123',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Полное имя пользователя',
    example: 'John Doe'
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Возраст пользователя',
    example: 25,
    minimum: 13,
    maximum: 120
  })
  @IsOptional()
  age?: number;
}
```

**Пояснения к декораторам:**
- `description` — описание поля для документации
- `example` — пример значения для демонстрации
- `minLength/maxLength` — ограничения длины строки
- `minimum/maximum` — ограничения для числовых значений

## 4. Настройка контроллеров с Swagger

Контроллеры в NestJS обрабатывают HTTP-запросы. С помощью декораторов Swagger мы можем детально описать каждый endpoint, включая параметры, ответы и возможные ошибки.

**Основные декораторы для контроллеров:**

1. **@ApiTags()** — группирует endpoints по тегам
2. **@ApiOperation()** — описывает операцию
3. **@ApiResponse()** — описывает возможные ответы
4. **@ApiParam()** — описывает параметры пути
5. **@ApiQuery()** — описывает query параметры
6. **@ApiBody()** — описывает тело запроса

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Создать нового пользователя',
    description: 'Создаёт нового пользователя в системе'
  })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно создан',
    type: User
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные данные пользователя'
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким email уже существует'
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Получить список пользователей',
    description: 'Возвращает список всех пользователей с пагинацией'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Номер страницы',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Количество элементов на странице',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/User' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' }
      }
    }
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить пользователя по ID',
    description: 'Возвращает информацию о пользователе по его ID'
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    example: '1'
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о пользователе',
    type: User
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден'
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Обновить пользователя',
    description: 'Обновляет информацию о пользователе'
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    example: '1'
  })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно обновлён',
    type: User
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден'
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Удалить пользователя',
    description: 'Удаляет пользователя из системы'
  })
  @ApiParam({
    name: 'id',
    description: 'ID пользователя',
    example: '1'
  })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно удалён'
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь не найден'
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

## 5. Создание сущностей с Swagger

Сущности (Entities) представляют модели данных в базе данных. С помощью декораторов Swagger мы можем автоматически генерировать схемы для этих моделей.

```typescript
// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty({
    description: 'Уникальный идентификатор пользователя',
    example: 1
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'john_doe'
  })
  @Column({ unique: true })
  username: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'john@example.com'
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    description: 'Полное имя пользователя',
    example: 'John Doe'
  })
  @Column({ nullable: true })
  fullName: string;

  @ApiProperty({
    description: 'Возраст пользователя',
    example: 25
  })
  @Column({ nullable: true })
  age: number;

  @ApiProperty({
    description: 'Дата создания пользователя',
    example: '2025-07-30T10:00:00Z'
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Дата последнего обновления пользователя',
    example: '2025-07-30T10:00:00Z'
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
```

## 6. Настройка аутентификации в Swagger

Для API с аутентификацией важно правильно настроить Swagger для работы с токенами и защищёнными endpoints.

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Вход в систему',
    description: 'Аутентификация пользователя и получение JWT токена'
  })
  @ApiResponse({
    status: 200,
    description: 'Успешная аутентификация',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@example.com' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Неверные учётные данные'
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Регистрация пользователя',
    description: 'Создание нового пользователя в системе'
  })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
    type: User
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные данные для регистрации'
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Выход из системы',
    description: 'Выход пользователя из системы'
  })
  @ApiResponse({
    status: 200,
    description: 'Успешный выход из системы'
  })
  @ApiResponse({
    status: 401,
    description: 'Неавторизованный доступ'
  })
  async logout() {
    return { message: 'Успешный выход из системы' };
  }
}
```

## 7. Настройка глобальных параметров

Для улучшения документации можно настроить глобальные параметры, которые будут применяться ко всем endpoints.

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка глобальных префиксов
  app.setGlobalPrefix('api/v1');

  // Настройка CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    credentials: true,
  });

  // Настройка Swagger с расширенной конфигурацией
  const config = new DocumentBuilder()
    .setTitle('NestJS API Documentation')
    .setDescription(`
      ## Описание API

      Это API для управления пользователями и аутентификации.

      ### Основные возможности:
      - Регистрация и аутентификация пользователей
      - Управление профилями пользователей
      - JWT токены для безопасной аутентификации
      - Пагинация для списков

      ### Аутентификация:
      Для доступа к защищённым endpoints используйте Bearer токен в заголовке Authorization.
    `)
    .setVersion('1.0.0')
    .setContact('Разработчик', 'https://github.com/yourusername', 'dev@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Локальная среда разработки')
    .addServer('https://api.production.com', 'Продакшн сервер')
    .addTag('auth', 'Аутентификация и авторизация')
    .addTag('users', 'Управление пользователями')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Введите JWT токен',
        in: 'header',
      },
      'JWT-auth', // Это имя здесь должно соответствовать тому, что указано в @ApiBearerAuth()
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [], // Дополнительные модели для документации
    deepScanRoutes: true, // Глубокое сканирование маршрутов
  });

  // Настройка Swagger UI с кастомными опциями
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Сохранять токен между запросами
      docExpansion: 'none', // Сворачивать все секции по умолчанию
      filter: true, // Показывать поле поиска
      showRequestDuration: true, // Показывать время выполнения запросов
    },
    customSiteTitle: 'NestJS API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6; }
    `,
  });

  await app.listen(3000);
  console.log('🚀 Приложение запущено на http://localhost:3000');
  console.log('📚 Документация API доступна на http://localhost:3000/api/docs');
}
bootstrap();
```

## 8. Создание кастомных схем и ответов

Для сложных API может потребоваться создание кастомных схем и ответов.

```typescript
// src/common/schemas/api-response.schema.ts
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseSchema<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Операция выполнена успешно' })
  message: string;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: '2025-07-30T10:00:00Z' })
  timestamp: string;
}

export class PaginatedResponseSchema<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class ErrorResponseSchema {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Ошибка валидации' })
  message: string;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: ['email должен быть валидным email адресом'] })
  details?: string[];
}
```

## 9. Использование кастомных схем в контроллерах

```typescript
// src/users/users.controller.ts
import { ApiResponse } from '@nestjs/swagger';
import { ApiResponseSchema, PaginatedResponseSchema, ErrorResponseSchema } from '../common/schemas/api-response.schema';

@Controller('users')
export class UsersController {
  // ... другие методы

  @Get()
  @ApiOperation({
    summary: 'Получить список пользователей',
    description: 'Возвращает пагинированный список всех пользователей'
  })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей',
    type: PaginatedResponseSchema<User>
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные параметры запроса',
    type: ErrorResponseSchema
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<PaginatedResponseSchema<User>> {
    const result = await this.usersService.findAll(page, limit);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit)
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Создать нового пользователя',
    description: 'Создаёт нового пользователя в системе'
  })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно создан',
    type: ApiResponseSchema<User>
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные данные пользователя',
    type: ErrorResponseSchema
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<ApiResponseSchema<User>> {
    const user = await this.usersService.create(createUserDto);
    return {
      success: true,
      message: 'Пользователь успешно создан',
      data: user,
      statusCode: 201,
      timestamp: new Date().toISOString()
    };
  }
}
```

## 10. Лучшие практики и рекомендации

### Организация документации

1. **Группировка по тегам** — используйте `@ApiTags()` для логической группировки endpoints
2. **Последовательное именование** — придерживайтесь единого стиля именования операций
3. **Детальные описания** — предоставляйте подробные описания для каждого endpoint

### Безопасность

1. **Аутентификация** — всегда документируйте требования аутентификации
2. **Авторизация** — указывайте необходимые права доступа
3. **Валидация** — документируйте требования к входным данным

### Производительность

1. **Пагинация** — используйте пагинацию для больших списков
2. **Кэширование** — документируйте возможности кэширования
3. **Rate Limiting** — указывайте ограничения на количество запросов

### Примеры использования

```typescript
// Пример с полной документацией
@Get('search')
@ApiOperation({
  summary: 'Поиск пользователей',
  description: `
    Поиск пользователей по различным критериям.
    
    Поддерживаемые фильтры:
    - name: поиск по имени (частичное совпадение)
    - email: поиск по email (точное совпадение)
    - age: диапазон возраста (min-max)
    - createdAfter: пользователи созданные после указанной даты
    
    Примеры запросов:
    - GET /users/search?name=john&age=18-30
    - GET /users/search?email=john@example.com
    - GET /users/search?createdAfter=2025-01-01
  `
})
@ApiQuery({
  name: 'name',
  required: false,
  description: 'Имя пользователя (частичное совпадение)',
  example: 'john'
})
@ApiQuery({
  name: 'email',
  required: false,
  description: 'Email пользователя (точное совпадение)',
  example: 'john@example.com'
})
@ApiQuery({
  name: 'age',
  required: false,
  description: 'Диапазон возраста (формат: min-max)',
  example: '18-30'
})
@ApiQuery({
  name: 'createdAfter',
  required: false,
  description: 'Дата создания (ISO формат)',
  example: '2025-01-01T00:00:00Z'
})
@ApiResponse({
  status: 200,
  description: 'Результаты поиска',
  type: PaginatedResponseSchema<User>
})
async searchUsers(
  @Query('name') name?: string,
  @Query('email') email?: string,
  @Query('age') age?: string,
  @Query('createdAfter') createdAfter?: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10
) {
  return this.usersService.search({
    name,
    email,
    age,
    createdAfter,
    page,
    limit
  });
}
```

## Заключение

Интеграция Swagger с NestJS предоставляет мощный инструмент для создания профессиональной документации API. Автоматическая генерация схем, интерактивный интерфейс для тестирования и детальное описание всех endpoints значительно упрощают разработку и поддержку API.

**Ключевые преимущества:**

- **Автоматическая генерация** — схемы создаются автоматически на основе DTO и сущностей
- **Интерактивное тестирование** — возможность тестировать API прямо из документации
- **Детальное описание** — полная информация о параметрах, ответах и ошибках
- **Группировка** — логическая организация endpoints по тегам
- **Безопасность** — встроенная поддержка различных типов аутентификации

Используя описанные в этой статье подходы, вы сможете создать качественную документацию API, которая будет полезна как для разработчиков, так и для клиентов вашего API. 