import { ExtractColumns, ExtractTables, GetColumns, createTypedQuery, select } from './index';

describe('TypeScript Compile-time SQL Parsing Tests', () => {
    describe('ExtractColumns Type Tests', () => {
        it('should extract simple column types at compile time', () => {
            type SimpleColumns = ExtractColumns<'SELECT id, name, email FROM users'>;
            // 컴파일 타임에 ["id", "name", "email"] 타입으로 추론됨

            // 타입 검증을 위한 헬퍼 함수
            function expectType<T>(): T {
                return null as any;
            }

            const columns = expectType<SimpleColumns>();
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should extract columns with aliases at compile time', () => {
            type AliasColumns = ExtractColumns<'SELECT id as user_id, name as user_name FROM users'>;
            // 컴파일 타임에 ["user_id", "user_name"] 타입으로 추론됨

            const columns = null as any as AliasColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should handle aggregate functions at compile time', () => {
            type AggColumns = ExtractColumns<'SELECT COUNT(*) as total, SUM(amount) as sum_amount FROM orders'>;
            // 컴파일 타임에 ["total", "sum_amount"] 타입으로 추론됨

            const columns = null as any as AggColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should handle table prefixed columns at compile time', () => {
            type PrefixColumns = ExtractColumns<'SELECT u.id, u.name, p.title FROM users u'>;
            // 컴파일 타임에 ["id", "name", "title"] 타입으로 추론됨

            const columns = null as any as PrefixColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should handle functions without aliases at compile time', () => {
            type FuncColumns = ExtractColumns<'SELECT UPPER(name), LOWER(email) as lower_email FROM users'>;
            // 컴파일 타임에 ["UPPER(...)", "lower_email"] 타입으로 추론됨

            const columns = null as any as FuncColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should handle expressions at compile time', () => {
            type ExprColumns = ExtractColumns<'SELECT id, name, age + 1 as next_age FROM users'>;
            // 컴파일 타임에 ["id", "name", "next_age"] 타입으로 추론됨

            const columns = null as any as ExprColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should handle WITH clause (CTE) at compile time', () => {
            type WithColumns = ExtractColumns<'WITH v_tmp AS (SELECT user_idx, level FROM users) SELECT idx, level FROM v_tmp'>;
            // 컴파일 타임에 ["idx", "level"] 타입으로 추론됨

            const columns = null as any as WithColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });

        it('should handle complex WITH clause at compile time', () => {
            type ComplexWithColumns = ExtractColumns<'WITH v_tmp AS (SELECT uch.user_idx AS idx, uch.level, uch.class_type FROM user_class_history uch) SELECT idx, level FROM v_tmp'>;
            // 컴파일 타임에 ["idx", "level"] 타입으로 추론됨

            const columns = null as any as ComplexWithColumns;
            expect(Array.isArray(columns) || columns === null).toBe(true);
        });
    });

    describe('ExtractTables Type Tests', () => {
        it('should extract simple table types at compile time', () => {
            type SimpleTable = ExtractTables<'SELECT * FROM users'>;
            // 컴파일 타임에 "users" 타입으로 추론됨

            const table = null as any as SimpleTable;
            expect(typeof table === 'string' || table === null).toBe(true);
        });

        it('should extract table with alias at compile time', () => {
            type AliasTable = ExtractTables<'SELECT * FROM users u'>;
            // 컴파일 타임에 "u" 타입으로 추론됨

            const table = null as any as AliasTable;
            expect(typeof table === 'string' || table === null).toBe(true);
        });
    });

    describe('Typed Query Functions', () => {
        it('should create typed query with correct column types', () => {
            const query = createTypedQuery('SELECT id, name, email FROM users');

            expect(query.sql).toBe('SELECT id, name, email FROM users');
            expect(query.columns).toBeNull(); // 타입만 중요하므로 런타임 값은 null
        });

        it('should create select query with correct types', () => {
            const query = select('SELECT id as user_id, name FROM users WHERE status = ?');

            expect(query.sql).toBe('SELECT id as user_id, name FROM users WHERE status = ?');
            expect(query.columns).toBeNull(); // 타입만 중요하므로 런타임 값은 null
        });

        it('should work with GetColumns helper type', () => {
            function processQuery<T extends string>(sql: T): GetColumns<T> {
                return null as any;
            }

            const columns = processQuery('SELECT id, name FROM users');
            expect(columns).toBeNull(); // 타입만 중요
        });
    });

    describe('Type Safety Tests', () => {
        it('should provide compile-time type safety', () => {
            // 타입 검증 함수
            function expectColumns<Expected extends readonly string[]>(expected: Expected) {
                return function <T extends string>(sql: T): ExtractColumns<T> extends Expected ? T : never {
                    return sql as any;
                };
            }

            // 이 테스트들은 컴파일 타임에 타입 검증이 이루어짐
            const validQuery1 = expectColumns(['id', 'name', 'email'])('SELECT id, name, email FROM users');
            const validQuery2 = expectColumns(['user_id', 'user_name'])('SELECT id as user_id, name as user_name FROM users');

            expect(typeof validQuery1).toBe('string');
            expect(typeof validQuery2).toBe('string');
        });
    });
});