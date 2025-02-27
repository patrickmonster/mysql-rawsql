# mysql-rowquery

쿼리 심플 관리

### 목적
TS 에서 타입 관리가 힘들어서 공통부 제작

### 효과
쿼리식이 간편해지고, 뭐시기 편해짐

### 특징
커넥션 풀 사용을 통해서, 오토스케일링 대응됨
과도한 연결로 디비 부하를 줄임
간결한 코드 작성이 가능합니다 (추측)


### 사용법 (기본설명)
```
import getConnection, {createPool} from 'mysql-rowsql'

const pool = createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    port: Number(env.DB_PORT || 3306),
    password: env.DB_PASSWD,
    database: env.DB_DATABASE,
    connectionLimit: 4, // 연결 개수 제한
});

getConnection(pool, async query => {
    await query('SELECT * FROM table_name');

    /// ......
    await query('SELECT * FROM table_name');
    return 'result';
}, true) /* 트랜젝션 모드 */
    .then(result => {
        console.log(result);
    })
    .catch(e => {});
```

### 그러나... 내 생각은
```
// database.ts (공공유틸 - 연결을 정의합니다)
import _getConnection, {
    query as _query,
    selectOne as _selectOne,
    selectPaging as _selectPaging,
    createPool,
    Paging,
    queryFunctionType,
} from 'mysql-rowsql';

const pool = createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    port: Number(env.DB_PORT || 3306),
    password: env.DB_PASSWD,
    database: env.DB_DATABASE,
    connectionLimit: 4, // 연결 개수 제한
});

export const query = <T>(query: string, ...params: any[]) => _query<T>(pool, query, ...params);
export const selectOne = <T>(query: string, ...params: any[]) => _selectOne<T>(pool, query, ...params);
export const selectPaging = <T>(query: string, paging: Paging | number, ...params: any[]) =>
    _selectPaging<T>(pool, query, paging, ...params);
const getConnection = <T>(
    connectionPool: (queryFunction: queryFunctionType) => Promise<T>,
    isTransaction = false
) => _getConnection<T>(pool, connectionPool, isTransaction);

export default getConnection;
```

-> 실제 러닝 코드 (컨트롤러 단)
```
import getConnection from 'database';

getConnection(pool, async query => {
    await query('SELECT * FROM table_name');

    /// ......
    await query('SELECT * FROM table_name');
    return 'result';
}, true)
    .then(result => {
        console.log(result);
    })
    .catch(e => {});
```


# SQL 사용예시

## SELECT
```
export const selectMessage = async (message_id?: number) =>
    query<{
        message_id : string
        message : string
        create_at : string
        update_at : string
    }>(
        pool,
        `
SELECT 
    message_id
    , message
    , create_at
    , update_at
FROM message
WHERE 1=1
${calTo('AND message_id = ?', message_id)} /* 해당 함수는 message_id 가 생략된 경우 주석 처리 됩니다. */
        `
    );
```

## SELECT_PAGE
```
export const selectMessageList = async (message_id : string) =>
    selectOne<{
        message_id : string
        message : string
        create_at : string
        update_at : string
    }>(
        pool,
        `
SELECT 
    message_id
    , message
    , create_at
    , update_at
FROM message
WHERE message_id = ?
        `,
        message_id
    );
```

## SELECT_PERSENT
```
// division [length] of [index]
export const selectMessage = async (index : number, length = 1000) =>
    query<{
        message_id : string
        message : string
        create_at : string
        update_at : string
    }>(
        pool,
        `
SELECT 
    message_id
    , message
    , create_at
    , update_at
FROM message
WHERE 1=1
        `, {
            index,
            length
        }
    );
```


## SELECT_ONE
```
export const selectMessage = async (message_id?: number) =>
    query<{
        message_id : string
        message : string
        create_at : string
        update_at : string
    }>(
        pool,
        `
SELECT 
    message_id
    , message
    , create_at
    , update_at
FROM message
WHERE 1=1
${calTo('AND message_id = ?', message_id)} /* 해당 함수는 message_id 가 생략된 경우 주석 처리 됩니다. */
        `
    );
```
## UPDATE / DELETE
```
export const updateMessage = async (message_id: number, message: MessageCreate) =>
    query<SqlInsertUpdate>(
        pool,
        `
UPDATE message
SET ?, update_at=CURRENT_TIMESTAMP
WHERE message_id=?`,
        message,
        message_id
    );
```


### UPSERT 
```
export const upsertSMSLog = async (id: SmsId, sms: SmsLogUpdate) =>
    query<SqlInsertUpdate>(
        pool,
        `
INSERT INTO sms_log 
SET ?
ON DUPLICATE KEY UPDATE ?, update_at=CURRENT_TIMESTAMP
        `,
        { ...sms, message_id: id },
        sms
    );
```

## Transaction
자주쓰는 함수인데, 처리 방식이 복잡하여 간단하게 축약했습니다.
```
getConnection(
    pool,
    async (query : queryFunctionType) => {
        const users = awat query<{...}>(`SELECT * FROM authUser WHERE 1=1`); // 일반 쿼리와 동일합니다.

        for (const {user_id} : users){
            await query<SqlInsertUpdate>(
                `UPDATE authUser SET ?, update_at=CURRENT_TIMESTAMP WHERE user_id=?`, user_id
            ); // 실행하다 박살나면 트랜젝션이 내부적으로 롤백을 합니다.
        }
        return users; /* getConnection 리턴값은 users 로 내보냅니다. */
    }, 
    true /* 코드 내부에 트렌젝션 처리를 진행하는 코드가 내장됨 (True로 실행하면 됩니다.) */
).then(users => {
    console.log('업데이트 대상 사용자 ::', users)
}).catch(e => {
    console.error('ERROR :: 코드가 박살나 롤백을 진행하였습니다.\n', e)
})
```

