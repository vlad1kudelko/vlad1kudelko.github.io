+++
lang = "ru"
title = "NestJS + TypeORM: работа с базой данных"
description = "Подробное руководство по интеграции NestJS с TypeORM: настройка подключения к БД, создание сущностей, репозитории, миграции и лучшие практики."
template = "posts"
thumb = "/imgs/2025/07/nestjs-typeorm-database-guide.webp"
publication_date = "2025-07-29"
+++

# NestJS + TypeORM: работа с базой данных

> **Читайте также:**
> - [FastAPI + SQLAlchemy: работа с базой данных](/posts/fastapi-sqlalchemy-database-guide)
> - [Django ORM: продвинутые запросы и оптимизация](/posts/django-orm-advanced-queries-optimization)
> - [FastAPI: современный фреймворк для API](/posts/fastapi-modern-api-framework)

**TypeORM** — это мощная ORM (Object-Relational Mapping) библиотека для TypeScript и JavaScript, которая предоставляет элегантный способ работы с базами данных. В сочетании с NestJS она создаёт идеальную пару для разработки масштабируемых серверных приложений с надёжной работой с данными. В этой статье мы рассмотрим, как эффективно интегрировать TypeORM с NestJS для создания полноценных API с базой данных.

## 1. Установка и настройка

Для работы с TypeORM в NestJS потребуется установить несколько пакетов:

```bash
npm install @nestjs/typeorm typeorm pg
npm install --save-dev @types/node
```

**Объяснение пакетов:**
- `@nestjs/typeorm` — модуль для интеграции TypeORM с NestJS
- `typeorm` — основная ORM библиотека
- `pg` — драйвер для PostgreSQL (можно заменить на `mysql2` для MySQL)
- `@types/node` — типы для Node.js

## 2. Базовая структура проекта

Создадим структуру проекта для демонстрации интеграции NestJS с TypeORM:

```
nestjs-typeorm-project/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── modules/
│   │   └── users/
│   │       ├── users.module.ts
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       └── dto/
│   │           ├── create-user.dto.ts
│   │           └── update-user.dto.ts
│   └── main.ts
├── ormconfig.ts
├── package.json
└── tsconfig.json
```

## 3. Настройка подключения к базе данных

Первым шагом в интеграции NestJS с TypeORM является настройка подключения к базе данных. Это фундаментальный компонент, который определяет, как ваше приложение будет взаимодействовать с базой данных.

**Основные компоненты настройки:**

1. **Конфигурация TypeORM** — содержит всю необходимую информацию для подключения к базе данных: тип СУБД, имя пользователя, пароль, хост, порт и имя базы данных.

2. **Модуль TypeORM** — специальный модуль NestJS, который инициализирует подключение к базе данных и предоставляет репозитории для работы с сущностями.

3. **Синхронизация схемы** — автоматическое создание таблиц на основе сущностей (только для разработки).

4. **Логирование** — отображение SQL-запросов для отладки.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'nestjs_db',
      entities: [User],
      synchronize: true, // Только для разработки!
      logging: true,
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Важные моменты настройки:**

- Параметр `synchronize: true` автоматически создаёт таблицы на основе сущностей. Это удобно для разработки, но **категорически запрещено** в продакшене, так как может привести к потере данных.
- `logging: true` включает логирование всех SQL-запросов, что очень полезно для отладки.
- `entities` — массив всех сущностей, которые должны быть зарегистрированы в TypeORM.

## 4. Создание сущностей (Entities)

Сущности — это сердце TypeORM. Они представляют собой TypeScript-классы, которые автоматически отображаются на таблицы в базе данных. Это позволяет работать с данными в объектно-ориентированном стиле, не заботясь о написании SQL-запросов.

**Основные принципы создания сущностей:**

1. **Декоратор @Entity()** — помечает класс как сущность TypeORM.
2. **Первичный ключ** — каждое поле с декоратором `@PrimaryGeneratedColumn()` становится первичным ключом.
3. **Типы данных** — TypeORM автоматически определяет тип столбца на основе типа TypeScript.
4. **Связи** — декораторы `@OneToMany`, `@ManyToOne`, `@OneToOne`, `@ManyToMany` определяют связи между сущностями.

```typescript
// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Популярные декораторы TypeORM:**

- `@Column()` — обычное поле таблицы
- `@PrimaryGeneratedColumn()` — автоинкрементное первичное поле
- `@PrimaryColumn()` — первичное поле без автоинкремента
- `@CreateDateColumn()` — автоматически заполняется датой создания
- `@UpdateDateColumn()` — автоматически обновляется при изменении записи
- `@VersionColumn()` — поле для оптимистичной блокировки

## 5. Создание DTO (Data Transfer Objects)

DTO — это объекты, которые определяют структуру данных для входящих и исходящих запросов. Они обеспечивают валидацию данных и типизацию API.

```typescript
// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsString()
  password?: string;
}
```

```typescript
// src/modules/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

**Преимущества использования DTO:**

- Валидация входящих данных
- Типизация API
- Документация API (Swagger)
- Безопасность (контроль над тем, какие поля можно изменять)

## 6. Создание сервисов

Сервисы содержат бизнес-логику приложения и используют репозитории TypeORM для работы с базой данных.

```typescript
// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
```

**Ключевые моменты в сервисах:**

- `@InjectRepository()` — внедрение репозитория TypeORM
- `Repository<User>` — типизированный репозиторий для работы с сущностью User
- Обработка ошибок с помощью встроенных исключений NestJS
- Использование методов репозитория: `find()`, `findOne()`, `save()`, `remove()`

## 7. Создание контроллеров

Контроллеры обрабатывают HTTP-запросы и используют сервисы для выполнения бизнес-логики.

```typescript
// src/modules/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

**Важные моменты в контроллерах:**

- `@Controller('users')` — определяет базовый путь для всех маршрутов
- `ParseIntPipe` — автоматически преобразует строковые параметры в числа
- Декораторы HTTP-методов: `@Get()`, `@Post()`, `@Patch()`, `@Delete()`
- `@Body()` — извлекает данные из тела запроса
- `@Param()` — извлекает параметры из URL

## 8. Настройка модулей

Модули организуют код в логические блоки и определяют зависимости между компонентами.

```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

**Ключевые моменты в модулях:**

- `TypeOrmModule.forFeature([User])` — регистрирует сущность в модуле
- `exports: [UsersService]` — делает сервис доступным для других модулей
- Импорт модуля в `AppModule` делает его доступным в приложении

## 9. Связи между сущностями

TypeORM предоставляет мощные возможности для работы со связями между сущностями. Рассмотрим пример с пользователями и их постами.

```typescript
// src/entities/post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column()
  authorId: number;

  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// Обновлённая сущность User
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Типы связей в TypeORM:**

- `@OneToMany` — один ко многим (один пользователь имеет много постов)
- `@ManyToOne` — многие к одному (много постов принадлежат одному пользователю)
- `@OneToOne` — один к одному
- `@ManyToMany` — многие ко многим

## 10. Запросы с связями

При работе со связанными данными важно правильно загружать связи, чтобы избежать проблемы N+1 запросов.

```typescript
// В UsersService
async findAllWithPosts(): Promise<User[]> {
  return await this.usersRepository.find({
    relations: ['posts'],
  });
}

async findOneWithPosts(id: number): Promise<User> {
  const user = await this.usersRepository.findOne({
    where: { id },
    relations: ['posts'],
  });
  
  if (!user) {
    throw new NotFoundException(`Пользователь с ID ${id} не найден`);
  }
  
  return user;
}
```

**Методы загрузки связей:**

- `relations: ['posts']` — загружает связанные посты
- `select: ['id', 'firstName', 'lastName']` — выбирает только нужные поля
- `where: { isActive: true }` — фильтрует записи
- `order: { createdAt: 'DESC' }` — сортирует результаты

## 11. Миграции

Миграции позволяют управлять схемой базы данных в версионированном виде, что критически важно для продакшена.

**Настройка миграций:**

```typescript
// ormconfig.ts
import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';
import { Post } from './src/entities/post.entity';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'nestjs_db',
  entities: [User, Post],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Отключаем для продакшена
});
```

**Создание миграции:**

```bash
npm run typeorm migration:generate -- -n CreateUsersTable
```

**Пример миграции:**

```typescript
// src/migrations/1640995200000-CreateUsersTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1640995200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

## 12. Валидация и обработка ошибок

NestJS предоставляет мощные инструменты для валидации данных и обработки ошибок.

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  await app.listen(3000);
}
bootstrap();
```

**Настройки ValidationPipe:**

- `whitelist: true` — удаляет свойства, не определённые в DTO
- `forbidNonWhitelisted: true` — выбрасывает ошибку при наличии лишних свойств
- `transform: true` — автоматически преобразует типы данных

## 13. Лучшие практики

### Безопасность

1. **Никогда не используйте `synchronize: true` в продакшене**
2. **Используйте переменные окружения для конфигурации**
3. **Валидируйте все входящие данные**
4. **Используйте параметризованные запросы (TypeORM делает это автоматически)**

### Производительность

1. **Используйте `select` для загрузки только нужных полей**
2. **Применяйте пагинацию для больших списков**
3. **Используйте индексы для часто запрашиваемых полей**
4. **Кэшируйте результаты запросов при необходимости**

### Архитектура

1. **Разделяйте бизнес-логику и доступ к данным**
2. **Используйте DTO для всех входящих и исходящих данных**
3. **Создавайте отдельные модули для разных доменов**
4. **Используйте dependency injection для тестируемости**

## 14. Тестирование

NestJS предоставляет мощные инструменты для тестирования приложений с TypeORM.

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user', async () => {
    const createUserDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    const user = { id: 1, ...createUserDto };
    jest.spyOn(repository, 'create').mockReturnValue(user);
    jest.spyOn(repository, 'save').mockResolvedValue(user);

    const result = await service.create(createUserDto);
    expect(result).toEqual(user);
  });
});
```

## Заключение

Интеграция NestJS с TypeORM предоставляет мощную и элегантную платформу для разработки серверных приложений. Сочетание декларативного подхода TypeORM с архитектурными принципами NestJS создаёт основу для создания масштабируемых и поддерживаемых приложений.

**Ключевые преимущества:**

- **Типобезопасность** — полная поддержка TypeScript
- **Производительность** — оптимизированные запросы и кэширование
- **Гибкость** — поддержка различных баз данных
- **Масштабируемость** — модульная архитектура
- **Тестируемость** — встроенные инструменты для тестирования

Используя описанные в этой статье подходы и лучшие практики, вы сможете создавать надёжные и эффективные приложения с современной архитектурой и надёжной работой с данными. 