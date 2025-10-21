---
title: "NestJS + Passport: аутентификация"
description: "Подробное руководство по реализации аутентификации в NestJS с использованием Passport: JWT, сессии, OAuth, Guards и стратегии безопасности."
heroImage: "../../../../assets/imgs/2025/07/nestjs-passport-authentication.webp"
pubDate: "2025-07-30"
---

# NestJS + Passport: аутентификация

**Passport** — это популярная библиотека для Node.js, которая предоставляет гибкую и модульную систему аутентификации. В сочетании с NestJS она создаёт мощную платформу для реализации различных стратегий аутентификации: JWT токены, сессии, OAuth, локальная аутентификация и многое другое. В этой статье мы рассмотрим, как эффективно интегрировать Passport с NestJS для создания надёжной системы аутентификации.

## 1. Установка и настройка

Для работы с Passport в NestJS потребуется установить несколько пакетов:

```bash
npm install @nestjs/passport passport passport-jwt passport-local
npm install @nestjs/jwt bcryptjs
npm install --save-dev @types/passport-jwt @types/passport-local @types/bcryptjs
```

**Объяснение пакетов:**
- `@nestjs/passport` — модуль для интеграции Passport с NestJS
- `passport` — основная библиотека аутентификации
- `passport-jwt` — стратегия для JWT токенов
- `passport-local` — стратегия для локальной аутентификации
- `@nestjs/jwt` — модуль для работы с JWT в NestJS
- `bcryptjs` — библиотека для хеширования паролей

## 2. Базовая структура проекта

Создадим структуру проекта для демонстрации аутентификации:

```
nestjs-auth-project/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── local-auth.guard.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

## 3. Настройка JWT аутентификации

JWT (JSON Web Token) — это популярный стандарт для создания токенов аутентификации. Рассмотрим, как реализовать JWT аутентификацию в NestJS.

### 3.1. Конфигурация JWT модуля

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### 3.2. JWT стратегия

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### 3.3. JWT Guard

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

## 4. Локальная аутентификация

Локальная аутентификация используется для входа пользователей с помощью логина и пароля.

### 4.1. Локальная стратегия

```typescript
// src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }
    return user;
  }
}
```

### 4.2. Локальный Guard

```typescript
// src/auth/guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

## 5. Сервис аутентификации

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async register(createUserDto: any) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });
    
    return this.login(user);
  }
}
```

## 6. Контроллер аутентификации

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    // В JWT аутентификации logout обычно обрабатывается на клиенте
    // путем удаления токена из localStorage
    return { message: 'Успешный выход' };
  }
}
```

## 7. DTO для аутентификации

```typescript
// src/auth/dto/login.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

```typescript
// src/auth/dto/register.dto.ts
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
```

## 8. Модуль пользователей

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
```

## 9. Сущность пользователя

```typescript
// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## 10. Защищенные маршруты

Для защиты маршрутов используйте `@UseGuards(JwtAuthGuard)`:

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  findAll() {
    return this.usersService.findAll();
  }
}
```

## 11. Обработка ошибок

Создайте кастомные исключения для лучшей обработки ошибок:

```typescript
// src/auth/exceptions/auth.exceptions.ts
import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Неверные учетные данные');
  }
}

export class UserAlreadyExistsException extends UnauthorizedException {
  constructor() {
    super('Пользователь уже существует');
  }
}
```

## 12. Middleware для логирования

```typescript
// src/auth/middleware/auth-logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[AUTH] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  }
}
```

## 13. Тестирование аутентификации

```typescript
// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object when credentials are valid', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: await bcrypt.hash('password', 10),
      };

      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'password');
      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
    });

    it('should return null when credentials are invalid', async () => {
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(null);

      const result = await service.validateUser('testuser', 'wrongpassword');
      expect(result).toBeNull();
    });
  });
});
```

## 14. Конфигурация окружения

Создайте файл `.env` для хранения секретных ключей:

```env
# .env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=1h
DATABASE_URL=postgresql://username:password@localhost:5432/database
```

## 15. Лучшие практики безопасности

### 15.1. Хеширование паролей

Всегда используйте bcrypt для хеширования паролей:

```typescript
import * as bcrypt from 'bcryptjs';

// Хеширование пароля
const hashedPassword = await bcrypt.hash(password, 10);

// Проверка пароля
const isPasswordValid = await bcrypt.compare(password, hashedPassword);
```

### 15.2. Валидация токенов

Регулярно проверяйте срок действия токенов:

```typescript
// В JWT стратегии
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // Проверка срока действия
    if (payload.exp < Date.now() / 1000) {
      throw new UnauthorizedException('Токен истёк');
    }
    
    return payload;
  }
}
```

### 15.3. Rate Limiting

Добавьте ограничение скорости для предотвращения брутфорс атак:

```typescript
// src/auth/guards/throttle.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    return req.ips.length ? req.ips[0] : req.ip;
  }
}
```

## 16. OAuth интеграция

Для интеграции с OAuth провайдерами (Google, Facebook, GitHub):

```bash
npm install passport-google-oauth20 passport-facebook passport-github2
```

```typescript
// src/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      accessToken,
    };
    done(null, user);
  }
}
```

## Заключение

NestJS + Passport предоставляет мощную и гибкую систему аутентификации, которая может быть адаптирована под различные требования проекта. Основные преимущества:

- **Модульность** — легко добавлять новые стратегии аутентификации
- **Безопасность** — встроенные механизмы защиты от распространённых атак
- **Гибкость** — поддержка различных типов аутентификации
- **Интеграция** — отличная совместимость с экосистемой NestJS
- **Тестируемость** — простое написание unit и integration тестов

При правильной реализации аутентификации в NestJS с Passport вы получаете надёжную, масштабируемую и безопасную систему управления пользователями для вашего приложения. 
