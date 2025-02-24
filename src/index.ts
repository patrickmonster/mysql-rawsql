'use strict';
import mysql, { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { env } from 'process';

export interface SqlInsertUpdateResult {
    affectedRows: number;
    changedRows: number;
    insertId: number;
}

export enum SQLType {
    select = 'select',
    insert = 'insert',
    update = 'update',
    delete = 'delete',
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
export type seleceQueryOption = {
    query: string;
    page?: number;
    limit?: number;
};

export type SelectPagingResult<E> = {
    total: number;
    totalPage: number;
    limit: number;
    page: number;
    list: E[];
};

export interface Present {
    index: number;
    length: number;
}

// SQL 타입 - insert / update / delete 인 경우  queryFunctionType 의 리턴 타입이 sqlInsertUpdate
export type SqlInsertUpdate = SQLType.insert | SQLType.update | SQLType.delete;

export type ResqultQuery<E> = E extends SqlInsertUpdate ? SqlInsertUpdateResult : Array<E>;
export type QueryFunctionType = <E>(query: string, ...params: any[]) => Promise<ResqultQuery<E>>;

export type SqlResultParser = (k: string, v: any) => any;
export type ErrorLog = (query: string, params: any[]) => void;

///////////////////////////////////////////////////////////////////////////////////////////

let limit = 10; // 기본 페이징 사이즈 (페이징 쿼리에 파라메타가 생략된 경우)
let _log: LogType = LogType.ALL;
const newLine = /\n/g;

export const format = mysql.format;
let _parser: SqlResultParser = (k, v) => v;
let _errorLog: (query: string, params: any[]) => void = () => {};

export const setLog = (log: LogType) => {
    _log = log;
};
export const setParser = (parser: SqlResultParser) => {
    _parser = parser;
};

export const setErrorLog = (errorLog: ErrorLog) => {
    _errorLog = errorLog;
};

export const createPool = mysql.createPool;

export const setLimit = (l: number) => (limit = l);
const sqlLogger = (query: string, params: any[], rows: any[] | any) => {
    if (_log == LogType.NONE) return rows;
    console.log('=======================================================');
    if (_log == LogType.ALL)
        console.log('SQL] ', mysql.format(query, params).replace(newLine, ' '), ':: \n', JSON.stringify(rows));
    else console.log('SQL] ', mysql.format(query, params), ':: \n', rows);
    console.log('=======================================================');
    return rows;
};

const resultParser = (rows: any[] | any) => JSON.parse(JSON.stringify(rows, _parser || ((k, v) => v)));

/**
 * 트렌젝션 모드로 커넥션을 가져옵니다.
 * @param connectionPool
 * @param isTransaction
 * @returns
 */
const getConnection = async <T>(
    pool: Pool,
    connectionPool: (queryFunction: QueryFunctionType) => Promise<T>,
    isTransaction = false
) => {
    let connect: PoolConnection | null = null;
    const errorQuerys: { query: string; params: any }[] = [];
    try {
        connect = await pool.getConnection();
        if (isTransaction) await connect.beginTransaction(); // 트렌젝션 시작
        return await connectionPool(async (query: string, ...params: any[]) => {
            try {
                const [rows] = await connect!.query(query, params);
                sqlLogger(query, params, rows);
                return Array.isArray(rows)
                    ? resultParser(rows)
                    : {
                          affectedRows: rows.affectedRows,
                          changedRows: rows.changedRows,
                          insertId: rows.insertId,
                      };
            } catch (e) {
                if (env.DB_HOST == 'localhost') console.error('SQL]', format(query, params));
                if (!query.includes('IGNORE')) {
                    // 중복키 에러 예외처리
                    if (!isTransaction) {
                        _errorLog && _errorLog(query, params);
                    } else {
                        errorQuerys.push({ query, params });
                    }
                }
                throw e;
            }
        }).then(async (result: T) => {
            if (isTransaction && connect) await connect.commit(); // 커밋
            return result;
        });
    } catch (e) {
        if (isTransaction && connect) {
            await connect.rollback(); // 롤백

            /// 에러 쿼리 로그
            for (const { query, params } of errorQuerys) _errorLog && _errorLog(query, params);
        }
        throw e;
    } finally {
        if (connect) connect.release(); // 커넥션 반환
    }
};

export default getConnection;
///////////////////////////////////////////////////////////////////////////////////////////

export const query = async <E>(pool: Pool, query: string, ...params: any[]): Promise<ResqultQuery<E>> =>
    await getConnection(pool, async (c: QueryFunctionType) => c(query, ...params));

export const selectOne = async <E>(pool: Pool, _query: string, ...params: any[]) =>
    query<E>(pool, _query, ...params).then(([row]: any) => (Array.isArray(row) ? row[0] : row));

/**
 *
 * @param pool
 * @param query
 * @param paging Pageing | number (only number is page number)
 * @param params
 * @returns
 */
export const selectPaging = async <E>(
    pool: Pool,
    query: string,
    paging: Paging | number,
    ...params: any[]
): Promise<SelectPagingResult<E>> => {
    let connect: PoolConnection | null = null;
    if (!pool) throw new Error('Not found pool');
    try {
        connect = await pool.getConnection();
        const page = typeof paging == 'number' ? paging : paging.page;
        const size = typeof paging == 'number' ? limit : ((paging.limit || limit) as number);
        const [rows] = await connect.query<(E & RowDataPacket)[]>(`${query}\nlimit ?, ?`, [
            ...params,
            page <= 0 ? 0 : page * size,
            size,
        ]);
        sqlLogger(query, params, [`${page} /${size}`, ...rows]);
        const cnt = await connect
            .query<({ total: number } & RowDataPacket)[]>(`SELECT COUNT(1) AS total FROM (\n${query}\n) A`, params)
            .then(([[rows]]) => rows.total);

        return {
            total: cnt,
            totalPage: Math.ceil(cnt / size) - 1,
            limit: size,
            page,
            list: rows,
        };
    } catch (e) {
        _log == LogType.NONE || console.error('SQL]', e);
        throw e;
    } finally {
        if (connect) connect.release();
    }
};

/**
 * 페이징 처리된 결과를 반환합니다.
 * @param pool
 * @param _query
 * @param present
 * @param params
 * @returns
 */
export const selectPersent = async <E>(pool: Pool, _query: string, present: Present, ...params: any[]) =>
    await getConnection(
        pool,
        async query => {
            /// 전체 카운트
            const cnt = await query<{ total: number }[]>(
                `SELECT COUNT(1) AS total FROM (\n${_query}\n) A`,
                params
            ).then(([[rows]]) => rows.total);

            const { index, length } = present;
            const limit = Math.ceil(cnt / length); // 테스크당 데이터 처리에 필요한 개수
            const rows = await query<E>(`${_query}\nlimit ?, ?`, ...params, index <= 0 ? 0 : index * limit, limit);

            return {
                total: cnt,
                totalPage: Math.ceil(cnt / limit) - 1,
                limit,
                index,
                list: rows,
            };
        },
        true
    );

/**
 * 쿼리의 해시키를 생성합니다.
 * @param query
 * @param params
 * @returns
 */
export const getQueryKey = (query: string, ...params: any[]) => {
    const queryOrigin = format(query, params);
    let hash = 0;
    for (let i = 0; i < queryOrigin.length; i++) hash += queryOrigin.charCodeAt(i);
    return hash;
};

/**
 * 쿼리 파라메타 예외식
 * @param query
 * @param value
 * @returns
 */
export const calTo = (query: string, ...value: any[]) =>
    value.filter(v => v != null && v != undefined && v != '').length ? format(`${query}`, value) : '-- calTo';

export const calLikeTo = (query: string, ...value: any[]) =>
    value.filter(v => v != null && v != undefined && v != '').length
        ? format(
              `${query}`,
              value.map(v => `%${v}%`)
          )
        : '/* calTo */';

export const objectToAndQury = (obj: { [key: string]: any }) =>
    Object.keys(obj)
        .map(key => (obj[key] ? `AND ${key} = ${obj[key]}` : `/* SKIP :: ${key} */`))
        .join('\n');
