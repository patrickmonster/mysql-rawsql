# typed-sql

🚀 TypeScript SQL query parser with **compile-time column type extraction**

[![npm version](https://badge.fury.io/js/typed-sql.svg)](https://badge.fury.io/js/typed-sql)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.1+-blue.svg)](https://www.typescriptlang.org/)

## 개요

typed-sql은 TypeScript에서 SQL 쿼리의 컬럼 타입을 **컴파일 타임에 추출**할 수 있는 혁신적인 라이브러리입니다. 실행 없이도 SQL 쿼리에서 정확한 컬럼 타입을 추론하여 타입 안전한 개발을 가능하게 합니다.

### 🌟 주요 특징

- 🚀 **컴파일 타임 타입 추론**: 실행 없이 SQL 쿼리에서 컬럼 타입 자동 추출
- 🔒 **타입 안전성**: 잘못된 컬럼 사용 시 컴파일 에러로 사전 방지
- ⚡ **제로 런타임 오버헤드**: 타입 추론은 컴파일 타임에만 발생
- 🎯 **IDE 지원**: 자동완성, 타입 힌트, 리팩토링 지원
- 📦 **제로 의존성**: 외부 라이브러리 없이 순수 TypeScript 타입만 사용
- 📝 **다양한 SQL 지원**: 별칭, 함수, 집계, 표현식 등 포괄적 지원

### 🎯 v1.2.0의 주요 기능

- **🚀 컴파일 타임 SQL 파싱**: TypeScript 템플릿 리터럴 타입을 사용한 타입 레벨 SQL 분석
- **🔒 타입 안전성 극대화**: 실행 없이도 컴파일 타임에 SQL 컬럼 타입 추론
- **⚡ 제로 런타임 비용**: 타입 추론은 빌드 타임에만 발생, 런타임 의존성 없음
- **🎯 개발 경험 향상**: IDE 자동완성 및 타입 힌트 지원
- **📦 순수 TypeScript**: 외부 라이브러리 의존성 없이 타입 시스템만 활용
- **📝 포괄적 SQL 지원**: 별칭, 함수, 집계, 표현식, 테이블 조인 등

## 📦 설치

```bash
npm install typed-sql
# 또는
yarn add typed-sql
# 또는
pnpm add typed-sql
```

> **요구사항**: TypeScript 4.1+ (템플릿 리터럴 타입 지원)
> 
> **제로 의존성**: 외부 라이브러리 없이 순수 TypeScript 타입만 사용합니다!

## 🚀 빠른 시작

### 컴파일 타임 타입 추론

```typescript
import { ExtractColumns, createTypedQuery } from 'typed-sql';

// 1. 타입만 추출 (실행 없이 컴파일 타임에 추론!)
type UserColumns = ExtractColumns<'SELECT id, name, email FROM users'>;
// UserColumns 타입: ["id", "name", "email"]

// 2. 타입 안전한 쿼리 생성
const query = createTypedQuery('SELECT id, name, email FROM users');
// query.columns의 타입이 자동으로 ["id", "name", "email"]로 추론됨

// 3. 별칭 처리
type AliasColumns = ExtractColumns<'SELECT id as user_id, name as user_name FROM users'>;
// AliasColumns 타입: ["user_id", "user_name"]

// 4. 집계 함수
type AggColumns = ExtractColumns<'SELECT COUNT(*) as total, SUM(amount) as sum_amount FROM orders'>;
// AggColumns 타입: ["total", "sum_amount"]
```

### 타입 안전한 쿼리 빌더

```typescript
import { createTypedQuery, select } from 'typed-sql';

// 타입 안전한 쿼리 생성
const query = createTypedQuery('SELECT id, name, email FROM users');
// query.columns의 타입이 자동으로 ["id", "name", "email"]로 추론됨

// SELECT 쿼리 빌더
const selectQuery = select('SELECT id as user_id, name FROM users WHERE status = ?');
// selectQuery.columns의 타입이 자동으로 ["user_id", "name"]로 추론됨
```

## 📚 상세 사용법

### 컴파일 타임 SQL 파싱 (TypeScript)

**🚀 핵심 기능**: TypeScript의 템플릿 리터럴 타입을 사용하여 **실행 없이도** 컴파일 타임에 SQL 쿼리에서 컬럼 타입을 추출할 수 있습니다!

```typescript
import { ExtractColumns, ExtractTables, createTypedQuery } from 'typed-sql';

// 1. 컴파일 타임에 컬럼 타입 추론
type UserColumns = ExtractColumns<'SELECT id, name, email FROM users'>;
// UserColumns 타입: ["id", "name", "email"]

type AliasColumns = ExtractColumns<'SELECT id as user_id, name as user_name FROM users'>;
// AliasColumns 타입: ["user_id", "user_name"]

type AggColumns = ExtractColumns<'SELECT COUNT(*) as total, SUM(amount) as sum_amount FROM orders'>;
// AggColumns 타입: ["total", "sum_amount"]

// 2. 타입 안전한 쿼리 생성
const typedQuery = createTypedQuery('SELECT id, name, email FROM users');
// typedQuery.columns의 타입이 자동으로 ["id", "name", "email"]로 추론됨

// 3. 타입 검증 함수
function expectColumns<Expected extends readonly string[]>(expected: Expected) {
    return function<T extends string>(sql: T): ExtractColumns<T> extends Expected ? T : never {
        return sql as any;
    };
}

// 컴파일 타임에 타입 검증
const validQuery = expectColumns(['id', 'name', 'email'])('SELECT id, name, email FROM users');
// ✅ 통과

const invalidQuery = expectColumns(['id', 'name'])('SELECT id, name, email FROM users');
// ❌ 컴파일 에러: 타입이 맞지 않음

// 4. WITH 절 (CTE) 지원
type WithColumns = ExtractColumns<'WITH v_tmp AS (SELECT user_idx, level FROM users) SELECT idx, level FROM v_tmp'>;
// WithColumns 타입: ["idx", "level"]

// 5. 실용적인 사용 예제
function createTypedSelectQuery<T extends string>(sql: T) {
    type Columns = ExtractColumns<T>;
    
    return {
        sql,
        columns: null as any as Columns,
        execute: async <TRecord = Record<string, any>>(): Promise<TRecord[]> => {
            // 실제 쿼리 실행 로직
            return [] as TRecord[];
        }
    };
}

const query = createTypedSelectQuery('SELECT id, name, created_at FROM users WHERE status = ?');
// query.columns의 타입: ["id", "name", "created_at"]

// WITH 절을 사용한 복잡한 쿼리도 지원
const withQuery = createTypedSelectQuery(`
    WITH user_stats AS (
        SELECT user_id, COUNT(*) as order_count, SUM(amount) as total_amount 
        FROM orders GROUP BY user_id
    )
    SELECT user_id as id, order_count, total_amount as total FROM user_stats
`);
// withQuery.columns의 타입: ["id", "order_count", "total"]
```



## 🔧 지원하는 SQL 기능

### 컴파일 타임 기능 (TypeScript)
- **타입 추론**: 실행 없이 컴파일 타임에 컬럼 타입 추출
- **타입 안전성**: 잘못된 컬럼 타입 사용 시 컴파일 에러
- **IDE 지원**: 자동완성 및 타입 힌트 제공
- **제로 런타임 비용**: 런타임 오버헤드 및 의존성 없음
- **개발 경험**: 타입 기반 개발로 버그 사전 방지
- **순수 TypeScript**: 외부 라이브러리 없이 타입 시스템만 활용

### 지원하는 SQL 패턴

```typescript
// ✅ 기본 컬럼
ExtractColumns<'SELECT id, name FROM users'>
// ["id", "name"]

// ✅ 별칭
ExtractColumns<'SELECT id as user_id FROM users'>
// ["user_id"]

// ✅ 집계 함수
ExtractColumns<'SELECT COUNT(*) as total FROM users'>
// ["total"]

// ✅ 일반 함수
ExtractColumns<'SELECT UPPER(name) FROM users'>
// ["UPPER(...)"]

// ✅ 테이블 접두사
ExtractColumns<'SELECT u.id FROM users u'>
// ["id"]

// ✅ 표현식
ExtractColumns<'SELECT age + 1 as next_age FROM users'>
// ["next_age"]

// ✅ WITH 절 (CTE - Common Table Expression)
ExtractColumns<'WITH v_tmp AS (SELECT user_idx, level FROM users) SELECT idx, level FROM v_tmp'>
// ["idx", "level"]

// ✅ 복잡한 WITH 절
ExtractColumns<'WITH stats AS (SELECT user_id, COUNT(*) as cnt FROM orders GROUP BY user_id) SELECT user_id as id, cnt as total FROM stats'>
// ["id", "total"]
```

## 🎯 고급 사용법

### 타입 안전성 검증

```typescript
import { ExtractColumns } from 'typed-sql';

// 타입 검증 함수
function expectColumns<Expected extends readonly string[]>(expected: Expected) {
    return function<T extends string>(sql: T): ExtractColumns<T> extends Expected ? T : never {
        return sql as any;
    };
}

// 컴파일 타임 검증 예제
const validQuery1 = expectColumns(['id', 'name', 'email'])('SELECT id, name, email FROM users');
console.log('✅ 유효한 쿼리:', validQuery1);

// 다음 줄의 주석을 해제하면 컴파일 에러가 발생합니다:
// const invalidQuery = expectColumns(['id', 'name'])('SELECT id, name, email FROM users');
// ❌ 컴파일 에러: 3개 컬럼을 2개로 검증하려고 함

// 조건부 타입을 사용한 쿼리 검증
type IsValidUserQuery<T extends string> = ExtractColumns<T> extends readonly string[]
    ? ExtractColumns<T>[number] extends 'id' | 'name' | 'email' | 'created_at' | 'updated_at'
        ? T
        : never
    : never;

function createUserQuery<T extends string>(sql: T): IsValidUserQuery<T> {
    // 사용자 테이블의 유효한 컬럼만 허용
    return sql as any;
}

const validUserQuery = createUserQuery('SELECT id, name FROM users');
console.log('✅ 유효한 사용자 쿼리:', validUserQuery);

// 다음 줄의 주석을 해제하면 컴파일 에러가 발생합니다:
// const invalidUserQuery = createUserQuery('SELECT invalid_column FROM users');
// ❌ 컴파일 에러: 유효하지 않은 컬럼
```

## 📖 예제

더 많은 예제는 [examples](./examples) 디렉토리를 참고하세요.

- [기본 사용법](./examples/basic-usage.ts)
- [타입 안전성](./examples/type-safety.ts)

## 🧪 테스트

```bash
npm test                # 모든 테스트 실행
npm run test:watch      # 변경사항 감시하며 테스트
npm run test:coverage   # 커버리지 포함 테스트
```

## 📄 라이선스

ISC License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 변경 로그

### v1.2.0
- **🚀 컴파일 타임 SQL 파싱**: `ExtractColumns`, `ExtractTables` 타입 추가
- **🔧 런타임 SQL 파싱**: `extractColumns`, `extractTables` 함수 추가
- TypeScript 템플릿 리터럴 타입을 사용한 타입 레벨 SQL 분석
- 실행 없이 컴파일 타임에 SQL 컬럼 타입 추론
- 타입 안전한 쿼리 빌더 및 검증 함수 제공
- node-sql-parser를 사용한 런타임 SQL 쿼리 분석 기능
- 컬럼 별칭, 집계 함수, 일반 함수 지원
- 테이블 별칭 및 JOIN 테이블 추출 지원
- 포괄적인 테스트 케이스 추가

---

**typed-sql**로 타입 안전한 SQL 개발을 시작하세요! 🚀