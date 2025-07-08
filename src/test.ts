import {
    calLikeTo,
    calTo,
    clearSlowQueryList,
    createPool,
    format,
    getQueryKey,
    LogType,
    objectToAndQury,
    Paging,
    Present,
    setLimit,
    setLog,
    setSlowQuery,
    setSlowQueryTime,
} from './index';

describe('MySQL RowSQL Library Tests', () => {
    describe('Format Function', () => {
        it('should format SQL query with parameters', () => {
            const result = format('SELECT * FROM users WHERE id = ? AND name = ?', [1, 'John']);
            expect(result).toBe("SELECT * FROM users WHERE id = 1 AND name = 'John'");
        });

        it('should handle empty parameters', () => {
            const result = format('SELECT * FROM users', []);
            expect(result).toBe('SELECT * FROM users');
        });
    });

    describe('Query Key Generation', () => {
        it('should generate consistent keys for same query and parameters', () => {
            const key1 = getQueryKey('SELECT * FROM users WHERE id = ?', 1);
            const key2 = getQueryKey('SELECT * FROM users WHERE id = ?', 1);
            expect(key1).toBe(key2);
        });

        it('should generate different keys for different parameters', () => {
            const key1 = getQueryKey('SELECT * FROM users WHERE id = ?', 1);
            const key2 = getQueryKey('SELECT * FROM users WHERE id = ?', 2);
            expect(key1).not.toBe(key2);
        });

        it('should generate different keys for different queries', () => {
            const key1 = getQueryKey('SELECT * FROM users WHERE id = ?', 1);
            const key2 = getQueryKey('SELECT * FROM products WHERE id = ?', 1);
            expect(key1).not.toBe(key2);
        });
    });

    describe('calTo Function', () => {
        it('should return formatted query when value is provided', () => {
            const result = calTo('WHERE id = ?', 1);
            expect(result).toBe('WHERE id = 1');
        });

        it('should return comment when value is null', () => {
            const result = calTo('WHERE id = ?', null);
            expect(result).toBe('-- calTo');
        });

        it('should return comment when value is undefined', () => {
            const result = calTo('WHERE id = ?', undefined);
            expect(result).toBe('-- calTo');
        });

        it('should return comment when value is empty string', () => {
            const result = calTo('WHERE id = ?', '');
            expect(result).toBe('-- calTo');
        });

        it('should handle multiple parameters', () => {
            const result = calTo('WHERE id = ? AND name = ?', 1, 'John');
            expect(result).toBe("WHERE id = 1 AND name = 'John'");
        });
    });

    describe('calLikeTo Function', () => {
        it('should return formatted LIKE query when value is provided', () => {
            const result = calLikeTo('WHERE name LIKE ?', 'John');
            expect(result).toBe("WHERE name LIKE '%John%'");
        });

        it('should return comment when value is null', () => {
            const result = calLikeTo('WHERE name LIKE ?', null);
            expect(result).toBe('/* calTo */');
        });

        it('should return comment when value is undefined', () => {
            const result = calLikeTo('WHERE name LIKE ?', undefined);
            expect(result).toBe('/* calTo */');
        });

        it('should handle multiple parameters', () => {
            const result = calLikeTo('WHERE name LIKE ? AND city LIKE ?', 'John', 'Seoul');
            expect(result).toBe("WHERE name LIKE '%John%' AND city LIKE '%Seoul%'");
        });
    });

    describe('objectToAndQury Function', () => {
        it('should convert object to AND query', () => {
            const result = objectToAndQury({ id: 1, name: 'John' });
            expect(result).toContain('AND id = 1');
            expect(result).toContain('AND name = John');
        });

        it('should skip null values', () => {
            const result = objectToAndQury({ id: 1, name: null, age: 25 });
            expect(result).toContain('AND id = 1');
            expect(result).toContain('/* SKIP :: name */');
            expect(result).toContain('AND age = 25');
        });

        it('should handle empty object', () => {
            const result = objectToAndQury({});
            expect(result).toBe('');
        });
    });

    describe('Configuration Functions', () => {
        it('should set log type', () => {
            expect(() => setLog(LogType.ALL)).not.toThrow();
            expect(() => setLog(LogType.SIMPLE)).not.toThrow();
            expect(() => setLog(LogType.NONE)).not.toThrow();
        });

        it('should set limit', () => {
            expect(() => setLimit(20)).not.toThrow();
            expect(() => setLimit(50)).not.toThrow();
        });

        it('should set slow query settings', () => {
            expect(() => setSlowQuery(true)).not.toThrow();
            expect(() => setSlowQuery(false)).not.toThrow();
            expect(() => setSlowQueryTime(1000)).not.toThrow();
            expect(() => clearSlowQueryList()).not.toThrow();
        });
    });

    describe('Type Definitions', () => {
        it('should create Present object correctly', () => {
            const present: Present = { index: 0, length: 10 };
            expect(present.index).toBe(0);
            expect(present.length).toBe(10);
        });

        it('should create Paging object correctly', () => {
            const paging: Paging = { page: 1, limit: 15 };
            expect(paging.page).toBe(1);
            expect(paging.limit).toBe(15);
        });

        it('should create Paging object without limit', () => {
            const paging: Paging = { page: 2 };
            expect(paging.page).toBe(2);
            expect(paging.limit).toBeUndefined();
        });
    });

    describe('Pool Creation', () => {
        it('should create pool without throwing', () => {
            expect(() => {
                const pool = createPool({
                    host: 'localhost',
                    user: 'testuser',
                    password: 'testpass',
                    database: 'testdb',
                    connectionLimit: 1,
                });
                pool.end();
            }).not.toThrow();
        });
    });
});
