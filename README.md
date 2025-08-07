# mysql-rowquery

🚀 TypeScript SQL query parser with **compile-time column type extraction**

[![npm version](https://badge.fury.io/js/mysql-rowquery.svg)](https://badge.fury.io/js/mysql-rowquery)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.1+-blue.svg)](https://www.typescriptlang.org/)

## 개요

mysql-rowquery는 TypeScript 프로젝트에서 MySQL 데이터베이스를 쉽고 안전하게 사용할 수 있도록 도와주는 라이브러리입니다.

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
npm install mysql-rowquery
# 또는
yarn add mysql-rowquery
```

> **요구사항**: TypeScript 4.1+ (템플릿 리터럴 타입 지원)
> 
> **제로 의존성**: 외부 라이브러리 없이 순수 TypeScript 타입만 사용합니다!

## 🚀 빠른 시작

### 컴파일 타임 타입 추론

```typescript
import { createPool, setLog, setLimit, LogType } from 'mysql-rowquery';

// 1. 타입만 추출 (실행 없이 컴파일 타임에 추론!)
type UserColumns = ExtractColumns<'SELECT id, name, email FROM users'>;
// UserColumns 타입: ["id", "name", "email"]

// 2. 타입 안전한 쿼리 생성
const query = createTypedQuery('SELECT id, name, email FROM users');
// query.columns의 타입이 자동으로 ["id", "name", "email"]로 추론됨

// 3. 별칭 처리
type AliasColumns = ExtractColumns<'SELECT id as user_id, name as user_name FROM users'>;
// AliasColumns 타입: ["user_id", "user_name"]

// 슬로우 쿼리 모니터링 설정
import { setSlowQuery, setSlowQueryTime } from 'mysql-rowquery';
setSlowQuery(true);
setSlowQueryTime(1000); // 1초 이상 쿼리를 슬로우 쿼리로 간주
```

### 타입 안전한 쿼리 빌더

```typescript
// database.ts - 공통 데이터베이스 유틸리티
import _getConnection, {
    query as _query,
    selectOne as _selectOne,
    selectPaging as _selectPaging,
    selectPersent as _selectPersent,
    createPool,
    Paging,
    Present,
    QueryFunctionType,
} from 'mysql-rowquery';

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

// INSERT/UPDATE/DELETE 쿼리
import { SqlInsertUpdateResult } from 'mysql-rowquery';
const result = await query<SqlInsertUpdateResult>(
    'INSERT INTO users SET ?',
    { name: 'John', email: 'john@example.com' }
);
console.log('삽입된 ID:', result.insertId);
```

// 4. WITH 절 (CTE) 지원
type WithColumns = ExtractColumns<'WITH v_tmp AS (SELECT user_idx, level FROM users) SELECT idx, level FROM v_tmp'>;
// WithColumns 타입: ["idx", "level"]

단일 레코드를 조회합니다.

```typescript
const user = await selectOne<User>(
    'SELECT * FROM users WHERE id = ?',
    userId
);
```

#### `selectPaging<T>(pool, query, paging, ...params): Promise<SelectPagingResult<T>>`

페이지네이션을 적용하여 데이터를 조회합니다.

```typescript
import { Paging, SelectPagingResult } from 'mysql-rowquery';

// 페이지 번호만 지정 (기본 limit 사용)
const result1 = await selectPaging<User>(
    'SELECT * FROM users WHERE status = ?',
    0, // 첫 번째 페이지
    'active'
);

// Paging 객체 사용
const paging: Paging = { page: 2, limit: 20 };
const result2 = await selectPaging<User>(
    'SELECT * FROM users WHERE status = ?',
    paging,
    'active'
);

console.log('전체 개수:', result2.total);
console.log('전체 페이지:', result2.totalPage);
console.log('현재 페이지:', result2.page);
console.log('페이지 크기:', result2.limit);
console.log('데이터:', result2.list);
```

#### `selectPersent<T>(pool, query, present, ...params): Promise<SelectPagingResult<T> & { index: number }>`

비율 기반으로 데이터를 조회합니다. 대용량 데이터를 여러 작업자가 분할 처리할 때 유용합니다.

```typescript
import { Present } from 'mysql-rowquery';

// 전체 데이터를 10개 구간으로 나누어 첫 번째 구간 조회
const present: Present = { index: 0, length: 10 };
const result = await selectPersent<User>(
    'SELECT * FROM users WHERE status = ?',
    present,
    'active'
);

console.log('처리 인덱스:', result.index);
console.log('전체 개수:', result.total);
console.log('이 구간의 데이터:', result.list);
```

### 유틸리티 함수

#### `calTo(query, ...values): string`

값이 유효한 경우에만 쿼리를 반환합니다.

```typescript
import { calTo } from 'mysql-rowquery';

const buildQuery = (userId?: number, status?: string) => `
SELECT * FROM users 
WHERE 1=1
${calTo('AND user_id = ?', userId)}
${calTo('AND status = ?', status)}
`;

// userId가 null이면 해당 조건은 주석 처리됨
const query1 = buildQuery(123, 'active');
// SELECT * FROM users WHERE 1=1 AND user_id = 123 AND status = 'active'

const query2 = buildQuery(null, 'active');
// SELECT * FROM users WHERE 1=1 -- calTo AND status = 'active'
```

#### `calLikeTo(query, ...values): string`

LIKE 조건을 위한 쿼리를 생성합니다.

```typescript
import { calLikeTo } from 'mysql-rowquery';

const searchQuery = (keyword?: string) => `
SELECT * FROM users
WHERE 1=1
${calLikeTo('AND name LIKE ?', keyword)}
`;

// keyword가 'john'이면 '%john%'으로 변환
const query = searchQuery('john');
// SELECT * FROM users WHERE 1=1 AND name LIKE '%john%'
```

#### `objectToAndQury(obj): string`

객체를 AND 조건 쿼리로 변환합니다.

```typescript
import { objectToAndQury } from 'mysql-rowquery';

const conditions = { 
    status: 'active', 
    age: 25, 
    city: null,  // null 값은 스킵됨
    country: 'Korea' 
};

const whereClause = objectToAndQury(conditions);
// AND status = active
// AND age = 25
// /* SKIP :: city */
// AND country = Korea
```
### 트랜잭션 처리

#### `getConnection<T>(pool, connectionPool, isTransaction): Promise<T>`

트랜잭션을 포함한 복잡한 데이터베이스 작업을 처리합니다.

```typescript
// 트랜잭션 예시
const transferMoney = async (fromUserId: number, toUserId: number, amount: number) => {
    return await getConnection(async (query) => {
        // 송신자 잔액 확인
        const fromUser = await query<User[]>(
            'SELECT balance FROM users WHERE id = ? FOR UPDATE',
            fromUserId
        );
        
        if (fromUser[0].balance < amount) {
            throw new Error('잔액이 부족합니다');
        }
        
        // 송신자 잔액 차감
        await query<SqlInsertUpdateResult>(
            'UPDATE users SET balance = balance - ? WHERE id = ?',
            amount, fromUserId
        );
        
        // 수신자 잔액 증가
        await query<SqlInsertUpdateResult>(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            amount, toUserId
        );
        
        // 거래 내역 기록
        const result = await query<SqlInsertUpdateResult>(
            'INSERT INTO transactions SET ?',
            { from_user_id: fromUserId, to_user_id: toUserId, amount, created_at: new Date() }
        );
        
        return { transactionId: result.insertId, amount };
    }, true); // 트랜잭션 모드
};

// 사용
transferMoney(1, 2, 1000)
    .then(result => {
        console.log('이체 성공:', result);
    })
    .catch(error => {
        console.error('이체 실패, 자동 롤백됨:', error);
    });
```

### INSERT/UPDATE/DELETE 예시

```typescript
import { SqlInsertUpdateResult } from 'mysql-rowquery';

// INSERT
const createUser = async (userData: Partial<User>) => {
    const result = await query<SqlInsertUpdateResult>(
        'INSERT INTO users SET ?',
        userData
    );
    return result.insertId;
};

// UPDATE
const updateUser = async (userId: number, userData: Partial<User>) => {
    const result = await query<SqlInsertUpdateResult>(
        'UPDATE users SET ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        userData,
        userId
    );
    return result.affectedRows;
};

// UPSERT
const upsertUserProfile = async (userId: number, profileData: any) => {
    const result = await query<SqlInsertUpdateResult>(
        `INSERT INTO user_profiles SET ?
         ON DUPLICATE KEY UPDATE ?, updated_at = CURRENT_TIMESTAMP`,
        { ...profileData, user_id: userId },
        profileData
    );
    return result;
};

// DELETE
const deleteUser = async (userId: number) => {
    const result = await query<SqlInsertUpdateResult>(
        'DELETE FROM users WHERE id = ?',
        userId
    );
    return result.affectedRows > 0;
};
```

## 설정 함수

### 로깅 설정

```typescript
import { setLog, LogType } from 'mysql-rowquery';

// 모든 SQL과 결과를 JSON으로 출력
setLog(LogType.ALL);

// SQL과 간단한 결과만 출력
setLog(LogType.SIMPLE);

// 로그 출력 안함
setLog(LogType.NONE);
```

### 슬로우 쿼리 모니터링

```typescript
import { 
    setSlowQuery, 
    setSlowQueryTime, 
    getSlowQueryList, 
    clearSlowQueryList 
} from 'mysql-rowquery';

// 슬로우 쿼리 모니터링 활성화
setSlowQuery(true);

// 슬로우 쿼리 기준 시간 설정 (밀리초)
setSlowQueryTime(2000); // 2초 이상

// 감지된 슬로우 쿼리 목록 조회
const slowQueries = getSlowQueryList();
if (slowQueries) {
    for (const slowQuery of slowQueries) {
        console.log(`슬로우 쿼리: ${slowQuery.time}ms`, slowQuery.query);
    }
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
import { setLimit, setParser, setErrorLog } from 'mysql-rowquery';

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