# mysql-rowquery

TypeScript를 위한 간편한 MySQL 쿼리 라이브러리

[![npm version](https://badge.fury.io/js/mysql-rowquery.svg)](https://badge.fury.io/js/mysql-rowquery)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## 개요

mysql-rowquery는 TypeScript 프로젝트에서 MySQL 데이터베이스를 쉽고 안전하게 사용할 수 있도록 도와주는 라이브러리입니다.

### 주요 특징

- 🔥 **타입 안전성**: TypeScript 제네릭을 활용한 완전한 타입 지원
- 🚀 **성능 최적화**: 커넥션 풀 관리 및 슬로우 쿼리 모니터링
- 🛡️ **트랜잭션 지원**: 자동 롤백/커밋 처리
- 📄 **페이지네이션**: 간편한 페이지네이션 및 비율 기반 조회
- 🔧 **유틸리티 함수**: 조건부 쿼리 생성 및 다양한 헬퍼 함수
- 📊 **로깅**: 상세한 SQL 로깅 및 실행 시간 추적

### 이전 버전과의 주요 변경사항 (v1.1.1)

- **코드 구조 개선**: 모듈화된 구조로 리팩토링
- **타입 안전성 향상**: 더욱 정확한 타입 정의
- **성능 최적화**: 슬로우 쿼리 감지 및 처리 개선
- **에러 핸들링 개선**: 더욱 명확한 에러 메시지
- **Jest 테스트 추가**: 24개의 테스트 케이스로 안정성 보장


## 설치

```bash
npm install mysql-rowquery
# 또는
yarn add mysql-rowquery
```

## 기본 설정

```typescript
import { createPool, setLog, setLimit, LogType } from 'mysql-rowquery';

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: Number(process.env.DB_PORT || 3306),
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: 10, // 연결 개수 제한
});

// 로그 설정
setLog(LogType.ALL); // ALL, SIMPLE, NONE

// 기본 페이지 크기 설정
setLimit(20);

// 슬로우 쿼리 모니터링 설정
import { setSlowQuery, setSlowQueryTime } from 'mysql-rowquery';
setSlowQuery(true);
setSlowQueryTime(1000); // 1초 이상 쿼리를 슬로우 쿼리로 간주
```

## 권장 사용 패턴

### database.ts (데이터베이스 유틸리티 모듈)

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

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: Number(process.env.DB_PORT || 3306),
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: 10,
});

// 간편한 래퍼 함수들
export const query = <T>(query: string, ...params: any[]) => 
    _query<T>(pool, query, ...params);

export const selectOne = <T>(query: string, ...params: any[]) => 
    _selectOne<T>(pool, query, ...params);

export const selectPaging = <T>(query: string, paging: Paging | number, ...params: any[]) =>
    _selectPaging<T>(pool, query, paging, ...params);

export const selectPersent = <T>(query: string, present: Present, ...params: any[]) =>
    _selectPersent<T>(pool, query, present, ...params);

export const getConnection = <T>(
    connectionPool: (queryFunction: QueryFunctionType) => Promise<T>,
    isTransaction = false
) => _getConnection<T>(pool, connectionPool, isTransaction);

export default getConnection;
```

### 실제 사용 예시

```typescript
import { getConnection, query, selectOne } from './database';

// 트랜잭션을 사용한 복잡한 작업
getConnection(async (queryFunction) => {
    const user = await queryFunction<User[]>('SELECT * FROM users WHERE id = ?', userId);
    
    await queryFunction('UPDATE users SET last_login = NOW() WHERE id = ?', userId);
    await queryFunction('INSERT INTO login_log SET ?', { user_id: userId, login_time: new Date() });
    
    return user[0];
}, true) // 트랜잭션 모드
.then(user => {
    console.log('로그인 처리 완료:', user);
})
.catch(error => {
    console.error('트랜잭션 실패, 롤백됨:', error);
});
```


## API 문서

### 기본 쿼리 함수

#### `query<T>(pool, query, ...params): Promise<ResultQuery<T>>`

기본 쿼리 실행 함수입니다.

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    created_at: Date;
}

// SELECT 쿼리
const users = await query<User[]>(
    'SELECT id, name, email, created_at FROM users WHERE status = ?',
    'active'
);

// INSERT/UPDATE/DELETE 쿼리
import { SqlInsertUpdateResult } from 'mysql-rowquery';
const result = await query<SqlInsertUpdateResult>(
    'INSERT INTO users SET ?',
    { name: 'John', email: 'john@example.com' }
);
console.log('삽입된 ID:', result.insertId);
```

#### `selectOne<T>(pool, query, ...params): Promise<T>`

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

// 슬로우 쿼리 목록 초기화
clearSlowQueryList();
```

### 기타 설정

```typescript
import { setLimit, setParser, setErrorLog } from 'mysql-rowquery';

// 기본 페이지 크기 설정
setLimit(50);

// 결과 파싱 함수 설정
setParser((key, value) => {
    // Date 타입 변환 예시
    if (key.endsWith('_at') && typeof value === 'string') {
        return new Date(value);
    }
    return value;
});

// 에러 로그 함수 설정
setErrorLog((query, params) => {
    console.error('SQL 에러:', { query, params });
    // 외부 로깅 시스템에 전송 등
});
```

## 테스트

```bash
npm test        # 모든 테스트 실행
npm run test:watch    # 변경사항 감시하며 테스트
npm run test:coverage # 커버리지 포함 테스트
```

## 라이선스

ISC License

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 변경 로그

### v1.1.1
- 코드 구조 개선 및 리팩토링
- 타입 안전성 향상
- Jest 테스트 추가
- 성능 최적화
- 문서 개선

### v1.1.0
- 슬로우 쿼리 모니터링 기능 추가
- 페이지네이션 기능 개선

### v1.0.0
- 초기 릴리스

