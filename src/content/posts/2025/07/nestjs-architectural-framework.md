---
title: "NestJS: архитектурный фреймворк"
description: "Подробное руководство по NestJS: архитектура, модули, контроллеры, сервисы, декораторы и создание масштабируемых приложений на Node.js."
heroImage: "../../../../assets/imgs/2025/07/nestjs-architectural-framework.webp"
pubDate: "2025-07-28"
---

# NestJS: архитектурный фреймворк

**NestJS** — это прогрессивный Node.js фреймворк для создания эффективных, масштабируемых и надёжных серверных приложений. Он использует TypeScript и вдохновлён архитектурой Angular, предоставляя мощную систему модулей, декораторов и внедрения зависимостей. NestJS идеально подходит для создания корпоративных приложений с чёткой архитектурой и поддерживает как REST API, так и GraphQL, микросервисы и WebSockets.

## Архитектура NestJS

NestJS построен на принципах архитектуры, которая обеспечивает модульность, тестируемость и масштабируемость:

- **Модули** — основная единица организации кода, которая инкапсулирует связанную функциональность
- **Контроллеры** — обрабатывают входящие HTTP-запросы и возвращают ответы
- **Сервисы** — содержат бизнес-логику и могут быть переиспользованы в разных частях приложения
- **Провайдеры** — классы, которые могут быть внедрены в другие классы (сервисы, контроллеры и т.д.)
- **Middleware** — функции, выполняемые перед обработкой запроса
- **Guards** — защищают маршруты на основе определённых условий
- **Interceptors** — перехватывают и модифицируют запросы и ответы
- **Pipes** — валидируют и трансформируют данные

## Установка и настройка

Для начала работы с NestJS необходимо установить CLI и создать новый проект:

```bash
npm i -g @nestjs/cli
nest new nestjs-app
cd nestjs-app
```

После создания проекта у вас будет следующая структура:

```
nestjs-app/
├── src/
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── package.json
└── nest-cli.json
```

## Основные компоненты

### Модули (Modules)

Модули — это способ организации кода в NestJS. Каждое приложение имеет как минимум один корневой модуль:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Пояснения:**
- `@Module()` — декоратор, который определяет модуль
- `imports` — массив других модулей, которые импортируются в текущий
- `controllers` — массив контроллеров, принадлежащих модулю
- `providers` — массив сервисов и других провайдеров

### Контроллеры (Controllers)

Контроллеры обрабатывают входящие HTTP-запросы и возвращают ответы клиенту:

```typescript
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

**Пояснения:**
- `@Controller('users')` — определяет базовый путь для всех маршрутов контроллера
- `@Get()`, `@Post()`, `@Put()`, `@Delete()` — HTTP-методы
- `@Body()` — извлекает данные из тела запроса
- `@Param()` — извлекает параметры из URL

### Сервисы (Services)

Сервисы содержат бизнес-логику и могут быть переиспользованы в разных контроллерах:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private users = [
    { id: 1, name: 'Иван', email: 'ivan@example.com' },
    { id: 2, name: 'Мария', email: 'maria@example.com' },
  ];

  create(createUserDto: CreateUserDto) {
    const newUser = {
      id: this.users.length + 1,
      ...createUserDto,
    };
    this.users.push(newUser);
    return newUser;
  }

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    const user = this.users.find(user => user.id === id);
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    
    this.users[userIndex] = { ...this.users[userIndex], ...updateUserDto };
    return this.users[userIndex];
  }

  remove(id: number) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    
    const deletedUser = this.users[userIndex];
    this.users.splice(userIndex, 1);
    return deletedUser;
  }
}
```

**Пояснения:**
- `@Injectable()` — декоратор, который позволяет внедрять сервис в другие классы
- `NotFoundException` — встроенный класс исключений для обработки ошибок
- Методы сервиса содержат бизнес-логику и не зависят от HTTP-слоя

### DTO (Data Transfer Objects)

DTO используются для валидации входящих данных:

```typescript
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

**Пояснения:**
- `@IsString()` — валидатор, проверяющий, что поле является строкой
- `@IsEmail()` — валидатор для email
- `@IsOptional()` — делает поле необязательным

## Внедрение зависимостей

NestJS использует мощную систему внедрения зависимостей (DI), которая автоматически создаёт и внедряет экземпляры классов:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  // NestJS автоматически создаст экземпляр UsersService и внедрит его
}
```

## Middleware

Middleware — это функции, которые выполняются перед обработкой запроса:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  }
}
```

Для использования middleware нужно зарегистрировать его в модуле:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './logger.middleware';

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
```

## Guards

Guards используются для защиты маршрутов:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    
    // Проверка токена
    return token && token.startsWith('Bearer ');
  }
}
```

Использование guard:

```typescript
@Controller('users')
export class UsersController {
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile() {
    return { message: 'Защищённый маршрут' };
  }
}
```

## Interceptors

Interceptors позволяют перехватывать и модифицировать запросы и ответы:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        data,
        timestamp: new Date().toISOString(),
        success: true
      })),
    );
  }
}
```

## Pipes

Pipes используются для валидации и трансформации данных:

```typescript
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('Значение не может быть пустым');
    }
    return value;
  }
}
```

## Конфигурация и переменные окружения

NestJS поддерживает работу с переменными окружения через `@nestjs/config`:

```bash
npm install @nestjs/config
```

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
```

## База данных с TypeORM

Для работы с базой данных в NestJS часто используется TypeORM:

```bash
npm install @nestjs/typeorm typeorm pg
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'nestjs_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Только для разработки!
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

## Тестирование

NestJS предоставляет мощные инструменты для тестирования:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [UsersService],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all users', () => {
    const result = [{ id: 1, name: 'Test' }];
    jest.spyOn(service, 'findAll').mockImplementation(() => result);
    expect(controller.findAll()).toBe(result);
  });
});
```

## Запуск приложения

Для запуска приложения используйте команды:

```bash
# Режим разработки
npm run start:dev

# Продакшн режим
npm run start:prod

# Отладка
npm run start:debug
```

## Преимущества NestJS

1. **Архитектурная ясность** — чёткое разделение ответственности между компонентами
2. **TypeScript** — полная поддержка типизации из коробки
3. **Модульность** — возможность создавать переиспользуемые модули
4. **Внедрение зависимостей** — автоматическое управление зависимостями
5. **Тестируемость** — встроенные инструменты для unit и e2e тестирования
6. **Масштабируемость** — поддержка микросервисной архитектуры
7. **Экосистема** — богатая экосистема пакетов и интеграций

## Заключение

NestJS — это мощный фреймворк, который предоставляет архитектурные решения для создания масштабируемых серверных приложений. Благодаря использованию TypeScript, внедрению зависимостей и модульной архитектуре, NestJS позволяет создавать надёжные и поддерживаемые приложения. Фреймворк особенно хорошо подходит для корпоративных проектов, где важны архитектурная ясность и возможность масштабирования.

Для изучения NestJS рекомендуется начать с официальной документации и постепенно осваивать различные концепции: модули, контроллеры, сервисы, middleware, guards и interceptors. Это поможет создать прочную основу для разработки сложных приложений. 
