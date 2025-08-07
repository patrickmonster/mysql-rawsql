// SQL 파싱을 위한 유틸리티 타입들

type SELECT = 'SELECT' | 'select'
type WITH = 'WITH' | 'with'
type WHERE = 'WHERE' | 'where'
type FROM = 'FROM' | 'from'
type JOIN = 'JOIN' | 'join'
type JOIN_DIRECTION = 'INNER' | 'inner' | 'LEFT' | 'left' | 'RIGHT' | 'right'

type Trim<T extends string> = T extends ` ${infer Rest}`
    ? Trim<Rest>
    : T extends `${infer Rest} `
    ? Trim<Rest>
    : T;


// WITH 절 처리 (CTE - Common Table Expression)
// 더 정확한 WITH 절 파싱을 위해 괄호 매칭을 고려
type RemoveWithClause<T extends string> =
    // WITH ... ) SELECT 패턴 매칭
    T extends `${WITH} ${infer _CTEPart}) ${SELECT} ${infer Rest}`
    ? Rest
    // 기본 WITH ... SELECT 패턴 (괄호 없는 경우)
    : T extends `${WITH} ${string} ${SELECT} ${infer Rest}`
    ? Rest
    : T;

// SELECT 키워드 제거 (WITH 절 처리 후)
type RemoveSelect<T extends string> = RemoveWithClause<T> extends infer WithProcessed
    ? WithProcessed extends `${SELECT} ${infer Rest}`
    ? Rest
    : WithProcessed extends string
    ? WithProcessed
    : never
    : never;

// FROM 키워드 이후 제거
type RemoveFromClause<T extends string> = T extends `${infer Before} ${FROM} ${string}`
    ? Before
    : T;

// 컬럼 분리 (콤마 기준)
type SplitColumns<T extends string> = T extends `${infer First},${infer Rest}`
    ? [Trim<First>, ...SplitColumns<Trim<Rest>>]
    : [Trim<T>];

// AS 별칭 처리
type ExtractAlias<T extends string> = T extends `${string} AS ${infer Alias}`
    ? Trim<Alias>
    : T extends `${string} as ${infer Alias}`
    ? Trim<Alias>
    : T extends `${string}.${infer Column}`
    ? Column
    : T;

// 함수 처리 (괄호 제거)
type ExtractFromFunction<T extends string> = T extends `${infer FuncName}(${string})`
    ? `${FuncName}(...)`
    : T;

// 최종 컬럼명 추출
type ProcessColumn<T extends string> = ExtractAlias<ExtractFromFunction<T>>;

// 메인 타입: SQL에서 컬럼 추출
export type ExtractColumns<T extends string> = T extends string
    ? SplitColumns<RemoveFromClause<RemoveSelect<Trim<T>>>> extends infer Columns
    ? Columns extends readonly string[]
    ? {
        [K in keyof Columns]: Columns[K] extends string ? ProcessColumn<Columns[K]> : never
    }
    : never
    : never
    : never;

// 테이블 추출을 위한 타입들
type ExtractFromClause<T extends string> = T extends `${string} ${FROM} ${infer Rest}`
    ? Rest
    : T extends `${string} from ${infer Rest}`
    ? Rest
    : never;

type RemoveWhereClause<T extends string> = T extends `${infer Before} ${WHERE} ${string}`
    ? Before
    : T extends `${infer Before} where ${string}`
    ? Before
    : T;

type RemoveJoinClause<T extends string> = T extends `${infer Before} ${'' | `${JOIN_DIRECTION} `}${JOIN} ${string}`
    ? Before
    : T;

type ExtractTableName<T extends string> = T extends `${string} ${infer Alias}`
    ? Alias
    : T;

export type ExtractTables<T extends string> = T extends string
    ? ExtractFromClause<T> extends infer FromClause
    ? FromClause extends string
    ? ExtractTableName<Trim<RemoveJoinClause<RemoveWhereClause<FromClause>>>>
    : never
    : never
    : never;

// 헬퍼 타입: SQL 쿼리의 결과 타입 정의
export type SqlResult<T extends string, TRecord = Record<string, any>> = {
    columns: ExtractColumns<T>;
    query: T;
    data: TRecord[];
};

// 타입 안전한 쿼리 함수를 위한 타입
export type TypedQuery<T extends string> = {
    sql: T;
    columns: ExtractColumns<T>;
    tables: ExtractTables<T>;
};