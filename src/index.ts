'use strict';
import mysql, { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

// ====================================
// Type Definitions
// ====================================

export interface SqlInsertUpdateResult {
    affectedRows: number;
    changedRows: number;
    insertId: number;
}

export enum SQLType {
    SELECT = 'select',
    INSERT = 'insert',
    UPDATE = 'update',
    DELETE = 'delete',
}

export enum LogType {
    ALL = 'ALL',
    SIMPLE = 'SIMPLE',
    NONE = 'NONE',
}

export interface Paging {
    page: number;
    limit?: number;
}

export interface SelectQueryOption {
    query: string;
    page?: number;
    limit?: number;
}

export interface SelectPagingResult<T> {
    total: number;
    totalPage: number;
    limit: number;
    page: number;
    list: T[];
}

export interface Present {
    index: number;
    length: number;
}

export interface SlowQueryInfo {
    query: string;
    params: any[];
    time: number;
}

export type SqlInsertUpdate = SQLType.INSERT | SQLType.UPDATE | SQLType.DELETE;
export type ResultQuery<T> = T extends SqlInsertUpdate ? SqlInsertUpdateResult : Array<T>;
export type QueryFunctionType = <T>(query: string, ...params: any[]) => Promise<ResultQuery<T>>;
export type SqlResultParser = (k: string, v: any) => any;
export type ErrorLog = (query: string, params: any[]) => void;

// ====================================
// Configuration State
// ====================================

interface AppConfig {
    defaultLimit: number;
    logType: LogType;
    isSlowQueryEnabled: boolean;
    slowQueryTime: number;
    parser: SqlResultParser;
    errorLog: ErrorLog;
}

const config: AppConfig = {
    defaultLimit: 10,
    logType: LogType.ALL,
    isSlowQueryEnabled: false,
    slowQueryTime: 5000,
    parser: (k, v) => v,
    errorLog: () => {},
};

const slowQueryList = new Map<number, SlowQueryInfo>();
const newLine = /\n/g;

export const format = mysql.format;

// ====================================
// Configuration Functions
// ====================================

export const setSlowQueryTime = (time: number): void => {
    config.slowQueryTime = time;
};

export const getSlowQueryList = (): IterableIterator<SlowQueryInfo> | false => {
    return config.isSlowQueryEnabled && slowQueryList.values();
};

export const clearSlowQueryList = (): void => {
    slowQueryList.clear();
};

export const setSlowQuery = (isSlowQuery: boolean): void => {
    config.isSlowQueryEnabled = isSlowQuery;
};

export const setLog = (log: LogType): void => {
    config.logType = log;
};

export const setParser = (parser: SqlResultParser): void => {
    config.parser = parser;
};

export const setErrorLog = (errorLog: ErrorLog): void => {
    config.errorLog = errorLog;
};

export const setLimit = (limit: number): void => {
    config.defaultLimit = limit;
};

export const createPool = mysql.createPool;

// ====================================
// Utility Functions
// ====================================
const sqlLogger = (query: string, params: any[], rows: any[] | any): any => {
    if (config.logType === LogType.NONE) return rows;

    console.log('=======================================================');
    const formattedQuery = mysql.format(query, params);

    if (config.logType === LogType.ALL) {
        console.log('SQL] ', formattedQuery.replace(newLine, ' '), ':: \n', JSON.stringify(rows));
    } else {
        console.log('SQL] ', formattedQuery, ':: \n', rows);
    }

    console.log('=======================================================');
    return rows;
};

const resultParser = (rows: any[] | any): any => {
    return JSON.parse(JSON.stringify(rows, (k, v) => config.parser(k, v)));
};

const handleSlowQuery = (query: string, params: any[], runningTime: number): void => {
    if (!config.isSlowQueryEnabled || runningTime <= config.slowQueryTime) return;

    const key = getQueryKey(query, ...params);
    if (slowQueryList.has(key)) return;

    slowQueryList.set(key, {
        query,
        params,
        time: runningTime,
    });

    const formattedQuery = mysql.format(query, params).replace(newLine, ' ');
    console.log(`Slow Query ${runningTime}ms ::`, formattedQuery);
};

// ====================================
// Connection Management
// ====================================

export const getPoolConnection = async <T>(
    pool: Pool,
    run: (connect: PoolConnection) => Promise<T>,
    isTransaction = false
): Promise<T> => {
    if (!pool) {
        throw new Error('Pool is required');
    }

    let connection: PoolConnection | null = null;

    try {
        connection = await pool.getConnection();

        if (isTransaction) {
            await connection.beginTransaction();
        }

        const result = await run(connection);

        if (isTransaction && connection) {
            await connection.commit();
        }

        return result;
    } catch (error) {
        if (config.logType !== LogType.NONE) {
            console.error('SQL]', error);
        }

        if (isTransaction && connection) {
            await connection.rollback();
        }

        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
/**
 * 트랜잭션 모드로 커넥션을 가져옵니다.
 * @param pool - MySQL 연결 풀
 * @param connectionPool - 실행할 함수
 * @param isTransaction - 트랜잭션 사용 여부
 * @returns Promise<T>
 */
const getConnection = async <T>(
    pool: Pool,
    connectionPool: (queryFunction: QueryFunctionType) => Promise<T>,
    isTransaction = false
): Promise<T> => {
    return await getPoolConnection(
        pool,
        async connection => {
            const queryFunction: QueryFunctionType = async (query: string, ...params: any[]) => {
                const startTime = Date.now();
                const [rows] = await connection.query(query, params);
                const runningTime = Date.now() - startTime;

                handleSlowQuery(query, params, runningTime);

                const queryWithTime = `/* RUNNING ${runningTime}ms */ ${query}`;
                sqlLogger(queryWithTime, params, rows);

                return Array.isArray(rows)
                    ? resultParser(rows)
                    : {
                          affectedRows: rows.affectedRows,
                          changedRows: rows.changedRows || 0,
                          insertId: rows.insertId,
                      };
            };

            return await connectionPool(queryFunction);
        },
        isTransaction
    );
};

export default getConnection;

// ====================================
// Query Functions
// ====================================

export const query = async <T>(pool: Pool, query: string, ...params: any[]): Promise<ResultQuery<T>> => {
    return await getConnection(pool, async (queryFunction: QueryFunctionType) => {
        return queryFunction(query, ...params);
    });
};

export const selectOne = async <T>(pool: Pool, queryString: string, ...params: any[]): Promise<T> => {
    const result = await query<T[]>(pool, queryString, ...params);
    return Array.isArray(result) ? (result[0] as T) : (result as any);
};

/**
 * 페이지네이션을 적용하여 데이터를 조회합니다.
 * @param pool - MySQL 연결 풀
 * @param query - 실행할 쿼리
 * @param paging - 페이지 정보 (Paging 객체 또는 페이지 번호)
 * @param params - 쿼리 파라미터
 * @returns Promise<SelectPagingResult<T>>
 */
export const selectPaging = async <T>(
    pool: Pool,
    queryString: string,
    paging: Paging | number,
    ...params: any[]
): Promise<SelectPagingResult<T>> => {
    return await getPoolConnection(pool, async connection => {
        const page = typeof paging === 'number' ? paging : paging.page;
        const size = typeof paging === 'number' ? config.defaultLimit : paging.limit || config.defaultLimit;

        const offset = page <= 0 ? 0 : page * size;
        const limitQuery = `${queryString}\nlimit ?, ?`;

        const [rows] = await connection.query<(T & RowDataPacket)[]>(limitQuery, [...params, offset, size]);

        sqlLogger(queryString, params, [`${page} /${size}`, ...rows]);

        const countQuery = `SELECT COUNT(1) AS total FROM (\n${queryString}\n) A`;
        const total = await connection
            .query<({ total: number } & RowDataPacket)[]>(countQuery, params)
            .then(([[result]]) => result.total);

        return {
            total,
            totalPage: Math.ceil(total / size) - 1,
            limit: size,
            page,
            list: rows,
        };
    });
};

/**
 * 비율 기반으로 데이터를 조회합니다.
 * @param pool - MySQL 연결 풀
 * @param query - 실행할 쿼리
 * @param present - 비율 정보
 * @param params - 쿼리 파라미터
 * @returns Promise<SelectPagingResult<T> & { index: number }>
 */
export const selectPersent = async <T>(
    pool: Pool,
    queryString: string,
    present: Present,
    ...params: any[]
): Promise<SelectPagingResult<T> & { index: number }> => {
    return await getConnection(
        pool,
        async queryFunction => {
            const countQuery = `SELECT COUNT(1) AS total FROM (\n${queryString}\n) A`;
            const totalCount = await queryFunction<{ total: number }[]>(countQuery, params).then(
                ([[result]]) => result.total
            );

            if (!totalCount) {
                return {
                    total: 0,
                    totalPage: 0,
                    limit: 0,
                    page: 0,
                    index: 0,
                    list: [] as T[],
                };
            }

            const { index, length } = present;
            const limit = Math.ceil(totalCount / length);
            const offset = index <= 0 ? 0 : index * limit;

            const limitQuery = `${queryString}\nlimit ?, ?`;
            const rows = await queryFunction<T>(limitQuery, ...params, offset, limit);

            return {
                total: totalCount,
                totalPage: Math.ceil(totalCount / limit) - 1,
                limit,
                page: index,
                index,
                list: Array.isArray(rows) ? rows : [],
            };
        },
        false
    );
};

// ====================================
// Helper Functions
// ====================================

/**
 * 쿼리의 해시키를 생성합니다.
 * @param query - SQL 쿼리
 * @param params - 쿼리 파라미터
 * @returns 해시 키
 */
export const getQueryKey = (query: string, ...params: any[]): number => {
    const formattedQuery = format(query, params);
    let hash = 0;

    for (let i = 0; i < formattedQuery.length; i++) {
        hash += formattedQuery.charCodeAt(i);
    }

    return hash;
};

/**
 * 값이 유효한 경우에만 쿼리를 반환합니다.
 * @param query - SQL 쿼리
 * @param values - 검증할 값들
 * @returns 포맷된 쿼리 또는 주석
 */
export const calTo = (query: string, ...values: any[]): string => {
    const validValues = values.filter(v => v != null && v !== undefined && v !== '');
    return validValues.length > 0 ? format(query, values) : '-- calTo';
};

/**
 * LIKE 조건을 위한 쿼리를 생성합니다.
 * @param query - SQL 쿼리
 * @param values - LIKE 조건에 사용할 값들
 * @returns 포맷된 LIKE 쿼리 또는 주석
 */
export const calLikeTo = (query: string, ...values: any[]): string => {
    const validValues = values.filter(v => v != null && v !== undefined && v !== '');

    if (validValues.length === 0) {
        return '/* calTo */';
    }

    const likeValues = values.map(v => `%${v}%`);
    return format(query, likeValues);
};

/**
 * 객체를 AND 조건 쿼리로 변환합니다.
 * @param obj - 변환할 객체
 * @returns AND 조건 쿼리 문자열
 */
export const objectToAndQury = (obj: Record<string, any>): string => {
    return Object.keys(obj)
        .map(key => {
            const value = obj[key];
            return value ? `AND ${key} = ${value}` : `/* SKIP :: ${key} */`;
        })
        .join('\n');
};
