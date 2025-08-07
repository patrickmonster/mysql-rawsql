import { ExtractColumns, ExtractTables, TypedQuery } from './sql-types';

/**
 * 타입 안전한 SQL 쿼리 빌더
 * 컴파일 타임에 컬럼 타입을 추출합니다.
 */
export function createTypedQuery<T extends string>(sql: T): TypedQuery<T> {
    return {
        sql,
        columns: null as any, // 타입만 중요하므로 런타임 값은 null
        tables: null as any,  // 타입만 중요하므로 런타임 값은 null
    };
}

/**
 * SQL 쿼리에서 컬럼 타입만 추출하는 헬퍼 함수
 */
export type GetColumns<T extends string> = ExtractColumns<T>;

/**
 * SQL 쿼리에서 테이블 타입만 추출하는 헬퍼 함수
 */
export type GetTables<T extends string> = ExtractTables<T>;

/**
 * 타입 안전한 SELECT 쿼리 함수
 */
export function select<T extends string>(
    sql: T
): {
    sql: T;
    columns: ExtractColumns<T>;
    execute: <TRecord = Record<string, any>>() => Promise<TRecord[]>;
} {
    return {
        sql,
        columns: null as any,
        execute: async <TRecord = Record<string, any>>() => {
            // 실제 쿼리 실행 로직은 여기에 구현
            // 지금은 타입 추론에 집중
            return [] as TRecord[];
        },
    };
}

/**
 * 컬럼 타입을 문자열 배열로 변환하는 유틸리티
 */
export type ColumnsToStringArray<T> = T extends readonly (infer U)[]
    ? U extends string
    ? T
    : never
    : never;

/**
 * 타입 검증을 위한 헬퍼 함수
 */
export function assertColumns<T extends string, Expected extends readonly string[]>(
    sql: T,
    expected: Expected
): ExtractColumns<T> extends Expected ? true : false {
    return null as any;
}

// 예제 사용을 위한 타입 테스트
export type TestQuery1 = ExtractColumns<'SELECT id, name, email FROM users'>;
export type TestQuery2 = ExtractColumns<'SELECT u.id as user_id, u.name, p.title FROM users u'>;
export type TestQuery3 = ExtractColumns<'SELECT COUNT(*) as total, SUM(amount) as sum_amount FROM orders'>;
export type TestQuery4 = ExtractColumns<'SELECT UPPER(name), LOWER(email) as lower_email FROM users'>;

// 타입 검증 예제
type Test1 = TestQuery1; // ["id", "name", "email"]
type Test2 = TestQuery2; // ["user_id", "name", "title"]  
type Test3 = TestQuery3; // ["total", "sum_amount"]
type Test4 = TestQuery4; // ["UPPER(...)", "lower_email"]